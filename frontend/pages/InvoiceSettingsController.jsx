import {
  Page,
  Layout,
  InlineStack,
  Card,
  Text,
  Spinner,
} from '@shopify/polaris';
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { ShopContext } from "../providers";
import { getTemplate, getPreviewData } from '../utilities/emailTemplate2';
import useApiService from "../utils/ApiService";
import { baseUrl } from '../utils/Constent';

const isDeepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isDeepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
};

const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

const SettingsController = ({ pageTitle, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shop } = useContext(ShopContext);
  const apiService = useApiService();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [settingsData, setSettingsData] = useState(null);
  const [languageData, setLanguageData] = useState(null);
  const [fetchingLanguage, setFetchingLanguage] = useState(true);
  const [fetchSettingData, setFetchSettingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [templateHTML, setTemplateHTML] = useState('');
  const [settingsPayload, setSettingsPayload] = useState({});
  const [initialPayload, setInitialPayload] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Fetch settings and language data on mount/shop change
  useEffect(() => {
    const loadData = async () => {
      if (!shop?.id) return;
      
      try {
        setFetchSettingData(true);
        const settingsRes = await apiService.getInvoiceSettings();
        if (settingsRes && settingsRes.apiStatus !== 404) {
          setSettingsData(settingsRes);
        } else {
          setSettingsData({});
        }
      } catch (err) {
        console.error("Error fetching invoice settings:", err);
      } finally {
        setFetchSettingData(false);
      }

      try {
        setFetchingLanguage(true);
        const languageRes = await apiService.getInvoiceLanguage();
        if (languageRes && languageRes.apiStatus !== 404) {
          setLanguageData(languageRes);
        } else {
          setLanguageData({});
        }
      } catch (err) {
        console.error("Error fetching invoice language:", err);
      } finally {
        setFetchingLanguage(false);
      }
    };

    loadData();
  }, [shop?.id]);

  useEffect(() => {
    if (settingsData) {
      const templateSettings = settingsData.templateSettings || {};

      const payload = {
        logoUrl: (settingsData.logoUrl === '' || settingsData.logoUrl === undefined) ? null : settingsData.logoUrl,
        logoUrlId: (settingsData.logoUrlId === '' || settingsData.logoUrlId === undefined) ? null : settingsData.logoUrlId,
        pdfUrlId: (settingsData.pdfUrlId === '' || settingsData.pdfUrlId === undefined) ? null : settingsData.pdfUrlId,
        primaryColor: settingsData.primaryColor || '#8257d0',
        primaryTextColor: settingsData.primaryTextColor || '#ffffff',
        secondaryColor: settingsData.secondaryColor || '#f0ecf9',
        invoiceTextColor: settingsData.invoiceTextColor || '#000000',
        bodyFont: settingsData.bodyFont || 'Open Sans',
        headingFont: settingsData.headingFont || 'Roboto',
        invoice_template: settingsData.invoice_template || 'Design 1',
        date_format: settingsData.date_format || 'MM/dd/yyyy',
        brandName: settingsData.brandName || '',
        businessName: settingsData.businessName || '',
        companyWebsite: settingsData.companyWebsite || '',
        supportEmail: settingsData.supportEmail || '',
        phone: settingsData.phone || '',
        street: settingsData.street || '',
        apartment: settingsData.apartment || '',
        city: settingsData.city || '',
        state: settingsData.state || '',
        zipCode: settingsData.zipCode || '',
        country: settingsData.country || '',
        additionalInfo: settingsData.additionalInfo || '',
        paperSize: settingsData.paperSize || 'A4',
        templateSettings: {
          taxes: {
            taxNumber: templateSettings?.taxes?.taxNumber ?? '',
            taxEachProduct: templateSettings?.taxes?.taxEachProduct ?? true,
            taxIndividual: templateSettings?.taxes?.taxIndividual ?? true,
            taxHideZero: templateSettings?.taxes?.taxHideZero ?? false
          },
          shipping: {
            showShippingMethod: templateSettings?.shipping?.showShippingMethod ?? true,
            hideShippingFreeDelivery: templateSettings?.shipping?.hideShippingFreeDelivery ?? false
          },
          discount: {
            showDiscountAppliedOriginalPrice: templateSettings?.discount?.showDiscountAppliedOriginalPrice ?? false,
            hideDiscountZero: templateSettings?.discount?.hideDiscountZero ?? false,
            hideDiscountTotalPriceZero: templateSettings?.discount?.hideDiscountTotalPriceZero ?? false,
            showDiscountAfterSubtotal: templateSettings?.discount?.showDiscountAfterSubtotal ?? false
          }
        },
        showSku: settingsData.showSku ?? false,
        showBarcode: settingsData.showBarcode ?? false,
        showWeight: settingsData.showWeight ?? false,
        showCountry: settingsData.showCountry ?? false,
        showHsCode: settingsData.showHsCode ?? false,
        showCurrencyCode: settingsData.showCurrencyCode ?? false,
        showItemTotal: settingsData.showItemTotal ?? false,
        notShowZeroOutstanding: settingsData.notShowZeroOutstanding ?? false,
        showPaymentDetails: !!(settingsData.showCardLastDigit || settingsData.showCardType || settingsData.showPaymentGateway || settingsData.showPaymentDetails),
        showPaymentLink: settingsData.showPaymentLink ?? false,
        showPaymentGateway: settingsData.showPaymentGateway ?? false,
        showCardType: settingsData.showCardType ?? false,
        showCardLastDigit: settingsData.showCardLastDigit ?? false,
        showOrderNote: settingsData.showOrderNote ?? false,
        showImage: settingsData.showImage ?? false,
        showTotalQuantity: settingsData.showTotalQuantity ?? false,
      };

      setSettingsPayload(payload);
      setInitialPayload(deepClone(payload));
    }
  }, [settingsData]);

  useEffect(() => {
    // Get sample data for preview
    const previewData = getPreviewData();
    const templateSettings = settingsPayload.templateSettings;
    const html = getTemplate(templateSettings, previewData.order, previewData.invoice, settingsPayload, languageData);
    setTemplateHTML(html);
  }, [settingsPayload, settingsData, languageData]);

  const updateSettings = useCallback(async (payload) => {
    setIsSaving(true);
    try {
      const res = await apiService.updateInvoiceSettings(payload);
      if (res && res.apiStatus === 200) {
        setSettingsData(res);
        return res;
      } else {
        throw new Error(res.error || 'Failed to update settings');
      }
    } finally {
      setIsSaving(false);
    }
  }, [apiService]);

  const handleSave = useCallback(async () => {
    setFormErrors({});
    const errors = {};

    if (settingsPayload.supportEmail && settingsPayload.supportEmail.trim() && !emailRegex.test(settingsPayload.supportEmail)) {
      errors.supportEmail = "Please enter a valid email address";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (typeof shopify !== 'undefined') {
        shopify.toast.show("Please fix the errors in the form", { isError: true });
      }
      return;
    }

    try {
      setIsSaving(true);
      const saveData = {
        ...settingsPayload,
      };

      if (saveData.logoUrl === '') {
        delete saveData.logoUrl;
      }

      await updateSettings(saveData);

      if (typeof shopify !== 'undefined') {
        shopify.toast.show("Settings saved successfully");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      if (typeof shopify !== 'undefined') {
        shopify.toast.show("Failed to save settings", { isError: true });
      }
    } finally {
      setIsSaving(false);
    }
  }, [settingsPayload, updateSettings]);

  const isDirty = initialPayload && !isDeepEqual(settingsPayload, initialPayload);

  if (fetchSettingData || fetchingLanguage) {
    return (
      <Page
        title={pageTitle || "Settings"}
        backAction={{
          content: "Back to Settings",
          onAction: () => navigate(`${baseUrl}settings${location.search}`)
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack gap={100} align="center">
                <Spinner size="small" />
                <Text as="p">Loading settings...</Text>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title={pageTitle || "Settings"} fullWidth={false}
      backAction={{
        content: "Back to Settings",
        onAction: () => navigate(`${baseUrl}settings${location.search}`),
      }}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        loading: isSaving,
        disabled: isSaving || !isDirty
      }}
    >
      <Layout>
        {React.isValidElement(children)
          ? React.cloneElement(children, { settingsPayload, setSettingsPayload, settingsData, formErrors, updateSettings })
          : children}
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Template Preview</Text>
            <div style={{ marginTop: '16px' }} >
              <div dangerouslySetInnerHTML={{ __html: templateHTML }} />
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page >
  );
};

export default SettingsController;