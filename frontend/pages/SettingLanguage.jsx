import {
  Page,
  Layout,
  FormLayout,
  TextField,
  Card,
  Text,
  Divider,
  BlockStack,
  Spinner,
  InlineStack,
  Button
} from '@shopify/polaris';
import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { ShopContext } from "../providers";
import { getTemplate, getPreviewData } from '../utilities/emailTemplate2';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import useApiService from "../utils/ApiService";
import defaultData from "../constant/defaultSetttingData.json";
import { baseUrl } from '../utils/Constent';

const { language: defaultLanguage } = defaultData;

// Define field groups for better organization
const LANGUAGE_FIELDS = {
  thankyou: [
    { name: "thankYouNote", label: "Thank You Note" },
    { name: "paymentInfo", label: "Thank You Subtitle" }
  ],
  headings: [
    { name: "invoice", label: "Invoice" },
    { name: "invoiceNumber", label: "Invoice Number" },
    { name: "description", label: "Description" },
    { name: "sku", label: "SKU" }, // Changed from SKU to match schema
    { name: "shippingAddress", label: "Shipping Address" },
    { name: "billingAddress", label: "Billing Address" },
    { name: "invoiceDate", label: "Invoice Date" },
    { name: "item", label: "Item" },
    { name: "qty", label: "QTY" }, // Changed from QTY to match schema
    { name: "unitPrice", label: "Unit Price" },
    { name: "tax", label: "Tax" },
    { name: "total", label: "Total" },
    { name: "subtotal", label: "Subtotal" },
    { name: "discount", label: "Discount" },
    { name: "subtotalAfterDiscount", label: "Subtotal After Discount" },
    { name: "shipping", label: "Shipping" },
    { name: "phone", label: "Phone" },
    { name: "barcode", label: "Barcode" },
    { name: "countryOfOrigin", label: "Country of origin" },
    { name: "hsCode", label: "HS code" },
    { name: "weight", label: "Weight" },
    { name: "notes", label: "Notes" },
    { name: "paymentDetails", label: "Payment Details" },
    { name: "paymentGateway", label: "Payment Gateway" },
    { name: "cardType", label: "Card Type" },
    { name: "cardNumber", label: "Card Number" },
  ]
};

const SettingLanguage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shop } = useContext(ShopContext);
  const apiService = useApiService();

  const [templateHTML, setTemplateHTML] = useState('');
  const [success, setSuccess] = useState(false);
  const [settingsPayload, setSettingsPayload] = useState({});
  const [languagePayload, setLanguagePayload] = useState({});
  const [initialLanguagePayload, setInitialLanguagePayload] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [languageData, setLanguageData] = useState(null);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [fetchingLanguage, setFetchingLanguage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings & language data
  useEffect(() => {
    const loadData = async () => {
      if (!shop?.id) return;
      
      try {
        setFetchingSettings(true);
        const settingsRes = await apiService.getInvoiceSettings();
        if (settingsRes && settingsRes.apiStatus !== 404) {
          setSettingsData(settingsRes);
        }
      } catch (err) {
        console.error("Error fetching invoice settings:", err);
      } finally {
        setFetchingSettings(false);
      }

      try {
        setFetchingLanguage(true);
        const languageRes = await apiService.getInvoiceLanguage();
        if (languageRes && languageRes.apiStatus !== 404) {
          setLanguageData(languageRes);
        }
      } catch (err) {
        console.error("Error fetching invoice language:", err);
      } finally {
        setFetchingLanguage(false);
      }
    };

    loadData();
  }, [shop?.id]);

  // Initialize data from API
  useEffect(() => {
    if (settingsData && languageData) {
      const { createdAt, updatedAt, shopId, id, ...cleanData } = languageData;
      setLanguagePayload(cleanData);
      setInitialLanguagePayload(JSON.parse(JSON.stringify(cleanData)));

      setSettingsPayload({
        logoUrl: settingsData.logoUrl || '',
        primaryColor: settingsData.primaryColor,
        primaryTextColor: settingsData.primaryTextColor,
        secondaryColor: settingsData.secondaryColor,
        invoiceTextColor: settingsData.invoiceTextColor || '#000',
        bodyFont: settingsData.bodyFont,
        headingFont: settingsData.headingFont,
        invoice_template: settingsData.invoice_template,
        date_format: settingsData.date_format,
        brandName: settingsData.brandName,
        businessName: settingsData.businessName,
        companyWebsite: settingsData.companyWebsite,
        supportEmail: settingsData.supportEmail,
        phone: settingsData.phone,
        street: settingsData.street,
        apartment: settingsData.apartment,
        city: settingsData.city,
        state: settingsData.state,
        zipCode: settingsData.zipCode,
        country: settingsData.country,
        additionalInfo: settingsData.additionalInfo,
      });
    }
  }, [settingsData, languageData]);

  // Update template preview whenever relevant data changes
  useEffect(() => {
    if (settingsData?.templateSettings && Object.keys(settingsPayload).length > 0) {
      const previewData = getPreviewData();
      const html = getTemplate(settingsData.templateSettings, previewData.order, previewData.invoice, settingsPayload, languagePayload);
      setTemplateHTML(html);
    }
  }, [settingsData, settingsPayload, languagePayload]);

  // Handle text field changes
  const handleTextFieldChange = useCallback((value, name) => {
    setLanguagePayload(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const setFieldDefaultValue = useCallback((name) => {
    setLanguagePayload(prev => ({
      ...prev,
      [name]: defaultLanguage[name]
    }));
  }, []);

  // Save settings with better error handling
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const saveData = {
        ...languagePayload,
        termConditionContent: languagePayload.termConditionContent === "<p><br></p>" ? "" : languagePayload.termConditionContent,
      };

      const res = await apiService.updateInvoiceLanguage(saveData);
      if (res && res.apiStatus === 200) {
        setLanguageData(res);
        setSuccess(true);
        if (typeof shopify !== 'undefined') {
          shopify.toast.show("Language settings saved successfully");
        }
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(res.error || "Failed to update language settings");
      }
    } catch (error) {
      console.error("Error saving language settings:", error);
      if (typeof shopify !== 'undefined') {
        shopify.toast.show("Failed to save language settings: " + (error?.message || "Unknown error"), { isError: true });
      }
    } finally {
      setIsSaving(false);
    }
  }, [languagePayload, apiService]);

  // Generate field components based on config
  const renderFields = useCallback((fieldGroup) => {
    return fieldGroup.map(field => (
      <TextField
        key={field.name}
        label={field.label}
        value={languagePayload?.[field.name] || ''}
        onChange={(value) => handleTextFieldChange(value, field.name)}
        autoComplete="off"
        multiline={field?.multiline || 1}
        labelAction={field.setDefault !== false ? { content: 'Set Default', onAction: () => setFieldDefaultValue(field.name) } : undefined}
      />
    ));
  }, [languagePayload, handleTextFieldChange]);

  const thankYouFields = useMemo(() => renderFields(LANGUAGE_FIELDS.thankyou), [renderFields]);
  const headingFields = useMemo(() => renderFields(LANGUAGE_FIELDS.headings), [renderFields]);

  const isLoading = fetchingSettings || fetchingLanguage;

  const isDirty = useMemo(() => {
    if (!initialLanguagePayload || !languagePayload) return false;
    const keys = Object.keys(languagePayload);
    for (const key of keys) {
      let val1 = languagePayload[key];
      let val2 = initialLanguagePayload[key];
      if (key === 'termConditionContent') {
        if (val1 === '<p><br></p>' || val1 === null || val1 === undefined) val1 = '';
        if (val2 === '<p><br></p>' || val2 === null || val2 === undefined) val2 = '';
      }
      if ((val1 === '' || val1 === null || val1 === undefined) && 
          (val2 === '' || val2 === null || val2 === undefined)) {
        continue;
      }
      if (val1 !== val2) return true;
    }
    return false;
  }, [languagePayload, initialLanguagePayload]);

  if (isLoading) {
    return (
      <Page
        title="Template Settings"
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
    <Page
      title="Language Settings"
      backAction={{
        content: "Back to Settings",
        onAction: () => navigate(`${baseUrl}settings${location.search}`),
      }}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        loading: isSaving,
        disabled: isSaving || isLoading || !isDirty
      }}
    >
      <Layout>
        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400" >
                <Text as="h2" variant="headingMd">Terms & conditions</Text>
                <Divider />
                <FormLayout>
                  <div>
                    <div className="Polaris-Labelled__LabelWrapper">
                      <Text variant="bodyMd" as="p"> Additional text in the footer</Text>
                      <Button variant="plain" onClick={() => setFieldDefaultValue('termConditionContent')}>Set Default</Button>
                    </div>
                    <ReactQuill
                      value={languagePayload?.termConditionContent || ""}
                      onChange={(value) => handleTextFieldChange(value, "termConditionContent")}
                      modules={{
                        toolbar: [
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['link'],
                        ],
                        clipboard: {
                          matchVisual: false,
                        }
                      }}
                    />
                  </div>
                </FormLayout>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Thank You</Text>
                <Divider />
                <FormLayout>
                  {thankYouFields}
                </FormLayout>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Headings of the invoice</Text>
                <Divider />
                <FormLayout>
                  {headingFields}
                </FormLayout>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Template Preview</Text>
            <div style={{ marginTop: '16px' }}>
              <div
                dangerouslySetInnerHTML={{ __html: templateHTML }}
              />
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default SettingLanguage;