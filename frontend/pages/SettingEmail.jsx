import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import {
  Page,
  Layout,
  FormLayout,
  TextField,
  ChoiceList,
  Button,
  InlineStack,
  Spinner,
  Card,
  Text,
  Divider,
  BlockStack,
  Select,
  DescriptionList,
  Modal,
  InlineGrid,
  Checkbox,
  InlineError
} from '@shopify/polaris';
import { useNavigate, useLocation } from "react-router-dom";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'quill-emoji/dist/quill-emoji.css';
import emailVariables from "../utilities/emailVariableList";
import { ShopContext } from "../providers";
import useApiService from "../utils/ApiService";
import defaultData from "../constant/defaultSetttingData.json";
import { baseUrl } from '../utils/Constent';

const { settings: defaultSetting } = defaultData;

const SettingEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shop } = useContext(ShopContext);
  const apiService = useApiService();

  const [selected, setSelected] = useState(['manuall']);
  const [invoiceFor, setInvoiceFor] = useState('new');
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [variableModalShow, setVariableModalShow] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [initialEmailPayload, setInitialEmailPayload] = useState(null);

  const handleVariableModalChange = useCallback(() => setVariableModalShow(prev => !prev), []);
  const showVariableModal = useCallback(() => setVariableModalShow(true), []);

  const [emailSettings, setEmailSettings] = useState({
    cancelledOrderEmailContent: "",
    cancelledOrderEmailTitle: "",
    newOrderEmailContent: "",
    newOrderEmailTitle: "",
    editedOrderEmailTitle: "",
    editedOrderEmailContent: "",
    autoInvoiceSendCondition: "created",
    sendInvoicesOn: {
      editedOrders: false,
      orderCancelled: false,
      refundedOrders: false,
      emailChanges: false,
      shippingAddressChanges: false
    }
  });

  const variableList = Object.entries(emailVariables).map(([variable, description]) => ({
    term: (
      <Text gap="200" align="space-between">
        {variable}
      </Text>
    ),
    description: description,
  }));

  // Fetch settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!shop?.id) return;
      setFetching(true);
      try {
        const res = await apiService.getInvoiceSettings();
        if (res && res.apiStatus !== 404) {
          setSettingsData(res);
        }
      } catch (err) {
        console.error("Error loading email settings:", err);
      } finally {
        setFetching(false);
      }
    };
    loadSettings();
  }, [shop?.id]);

  const setFieldDefaultValue = useCallback((name) => {
    setEmailSettings(prev => ({
      ...prev,
      [name]: defaultSetting[name]
    }));
  }, []);

  // When settings data loads, populate the form
  useEffect(() => {
    if (settingsData) {
      const sendInvoice = settingsData.sendInvoice || 'manuall';
      const sendInvoicesOn = settingsData.sendInvoicesOn || {
        editedOrders: false,
        orderCancelled: false,
        refundedOrders: false,
        emailChanges: false,
        shippingAddressChanges: false
      };
      
      const payload = {
        sendInvoice,
        newOrderEmailContent: settingsData.newOrderEmailContent || '',
        newOrderEmailTitle: settingsData.newOrderEmailTitle || '',
        cancelledOrderEmailContent: settingsData.cancelledOrderEmailContent || '',
        cancelledOrderEmailTitle: settingsData.cancelledOrderEmailTitle || '',
        editedOrderEmailTitle: settingsData.editedOrderEmailTitle || '',
        editedOrderEmailContent: settingsData.editedOrderEmailContent || '',
        autoInvoiceSendCondition: settingsData.autoInvoiceSendCondition || 'created',
        sendInvoicesOn: {
          editedOrders: sendInvoicesOn.editedOrders ?? false,
          orderCancelled: sendInvoicesOn.orderCancelled ?? false,
          refundedOrders: sendInvoicesOn.refundedOrders ?? false,
          emailChanges: sendInvoicesOn.emailChanges ?? false,
          shippingAddressChanges: sendInvoicesOn.shippingAddressChanges ?? false
        }
      };

      setSelected([sendInvoice]);
      setEmailSettings(payload);
      setInitialEmailPayload(JSON.parse(JSON.stringify(payload)));
    }
  }, [settingsData]);

  const handleChoiceListChange = useCallback((value) => setSelected(value), []);
  const handleTextFieldChange = useCallback((value, name) => {
    setEmailSettings(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleInvocieForChange = useCallback((value) => {
    setInvoiceFor(value);
  }, []);

  const handleQuillChange = useCallback((value) => {
    const contentField = invoiceFor === 'new' ? 'newOrderEmailContent'
      : invoiceFor === 'cancel' ? 'cancelledOrderEmailContent'
        : 'editedOrderEmailContent';

    setEmailSettings(prev => ({
      ...prev,
      [contentField]: value
    }));
  }, [invoiceFor]);

  const handleSave = useCallback(async () => {
    setFormErrors({});
    setSuccess(false);

    const errors = {};

    if (!emailSettings.newOrderEmailTitle.trim()) {
      errors.newOrderEmailTitle = "New order email title is required";
    }

    if (!emailSettings.newOrderEmailContent.trim() || emailSettings?.newOrderEmailContent === "<p><br></p>") {
      errors.newOrderEmailContent = "New order email content is required";
    }

    if (!emailSettings.cancelledOrderEmailTitle.trim()) {
      errors.cancelledOrderEmailTitle = "Cancelled order email title is required";
    }

    if (!emailSettings.cancelledOrderEmailContent.trim() || emailSettings?.cancelledOrderEmailContent === "<p><br></p>") {
      errors.cancelledOrderEmailContent = "Cancelled order email content is required";
    }

    if (!emailSettings.editedOrderEmailTitle.trim()) {
      errors.editedOrderEmailTitle = "Edited order email title is required";
    }

    if (!emailSettings.editedOrderEmailContent.trim() || emailSettings?.editedOrderEmailContent === "<p><br></p>") {
      errors.editedOrderEmailContent = "Edited order email content is required";
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
        sendInvoice: selected[0],
        newOrderEmailContent: emailSettings.newOrderEmailContent,
        cancelledOrderEmailContent: emailSettings.cancelledOrderEmailContent,
        newOrderEmailTitle: emailSettings.newOrderEmailTitle,
        cancelledOrderEmailTitle: emailSettings.cancelledOrderEmailTitle,
        editedOrderEmailTitle: emailSettings.editedOrderEmailTitle,
        editedOrderEmailContent: emailSettings.editedOrderEmailContent,
        autoInvoiceSendCondition: selected[0] === "automatic" ? emailSettings.autoInvoiceSendCondition : "created",
        sendInvoicesOn: selected[0] === "automatic" ? emailSettings.sendInvoicesOn : {
          editedOrders: false,
          orderCancelled: false,
          refundedOrders: false,
          emailChanges: false,
          shippingAddressChanges: false
        }
      };

      const res = await apiService.updateInvoiceSettings(saveData);
      if (res && res.apiStatus === 200) {
        setSettingsData(res);
        if (typeof shopify !== 'undefined') {
          shopify.toast.show("Email settings saved successfully");
        }
        setSuccess(true);
      } else {
        throw new Error(res.error || "Failed to update email settings");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setFormErrors({ general: err.message || "There was an error saving your settings. Please try again." });
      if (typeof shopify !== 'undefined') {
        shopify.toast.show("Failed to save settings", { isError: true });
      }
    } finally {
      setIsSaving(false);
    }
  }, [selected, emailSettings, apiService]);

  const isDirty = useMemo(() => {
    if (!initialEmailPayload) return false;
    
    // Normalization helper for ReactQuill content
    const normalizeQuill = (val) => {
      if (val === '<p><br></p>' || val === null || val === undefined) return '';
      return val.trim();
    };

    const normalizeString = (val) => {
      if (val === null || val === undefined) return '';
      return val.trim();
    };

    const activeSendInvoice = selected[0] || 'manuall';
    
    const activeAutoCondition = activeSendInvoice === "automatic" ? (emailSettings.autoInvoiceSendCondition || 'created') : "created";
    
    const activeSendInvoicesOn = activeSendInvoice === "automatic" ? {
      editedOrders: emailSettings.sendInvoicesOn?.editedOrders ?? false,
      orderCancelled: emailSettings.sendInvoicesOn?.orderCancelled ?? false,
      refundedOrders: emailSettings.sendInvoicesOn?.refundedOrders ?? false,
      emailChanges: emailSettings.sendInvoicesOn?.emailChanges ?? false,
      shippingAddressChanges: emailSettings.sendInvoicesOn?.shippingAddressChanges ?? false
    } : {
      editedOrders: false,
      orderCancelled: false,
      refundedOrders: false,
      emailChanges: false,
      shippingAddressChanges: false
    };

    if (activeSendInvoice !== initialEmailPayload.sendInvoice) return true;
    if (activeAutoCondition !== initialEmailPayload.autoInvoiceSendCondition) return true;
    
    if (normalizeQuill(emailSettings.newOrderEmailContent) !== normalizeQuill(initialEmailPayload.newOrderEmailContent)) return true;
    if (normalizeString(emailSettings.newOrderEmailTitle) !== normalizeString(initialEmailPayload.newOrderEmailTitle)) return true;
    
    if (normalizeQuill(emailSettings.cancelledOrderEmailContent) !== normalizeQuill(initialEmailPayload.cancelledOrderEmailContent)) return true;
    if (normalizeString(emailSettings.cancelledOrderEmailTitle) !== normalizeString(initialEmailPayload.cancelledOrderEmailTitle)) return true;
    
    if (normalizeQuill(emailSettings.editedOrderEmailContent) !== normalizeQuill(initialEmailPayload.editedOrderEmailContent)) return true;
    if (normalizeString(emailSettings.editedOrderEmailTitle) !== normalizeString(initialEmailPayload.editedOrderEmailTitle)) return true;

    const keys = ['editedOrders', 'orderCancelled', 'refundedOrders', 'emailChanges', 'shippingAddressChanges'];
    for (const key of keys) {
      const currentVal = activeSendInvoicesOn[key];
      const initialVal = initialEmailPayload.sendInvoicesOn?.[key] ?? false;
      if (currentVal !== initialVal) return true;
    }

    return false;
  }, [selected, emailSettings, initialEmailPayload]);

  if (fetching) {
    return (
      <Page
        title="Email Settings"
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

  const options = [
    { label: 'New Orders', value: 'new' },
    { label: 'Cancelled orders', value: 'cancel' },
    { label: 'Others (Edits, Refunds etc)', value: 'edit' }
  ];

  const emailSubjectName = invoiceFor === 'new' ? 'newOrderEmailTitle' : invoiceFor === 'cancel' ? 'cancelledOrderEmailTitle' : 'editedOrderEmailTitle';

  const modules = {
    toolbar: [
      [{ header: [false, 1, 2, 3, 4, 5, 6] }],
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header',
    'size',
    'bold', 'italic', 'underline',
    'color', 'background',
    'align',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];

  const autoInvoiceSendOption = [
    { label: 'Created', value: 'created' },
    { label: 'Paid', value: 'paid' },
    { label: 'Not Paid', value: 'pending' },
    { label: 'Fulfilled', value: 'fulfilled' },
  ];

  const sendInvoicesOnCheckboxOptions = [
    { label: 'Edited Orders', value: 'editedOrders' },
    { label: 'Cancelled Orders', value: 'orderCancelled' },
    { label: 'Refunded Orders', value: 'refundedOrders' },
    { label: 'Email Changes', value: 'emailChanges' },
    { label: "Customer's shipping address changes", value: 'shippingAddressChanges' }
  ];

  const renderChildren = () => (
    <>
      {selected[0] === "automatic" ? <BlockStack gap={300}>
        <Select
          label="Automatically send invoices when orders are"
          options={autoInvoiceSendOption}
          onChange={(value) => setEmailSettings(prev => ({ ...prev, autoInvoiceSendCondition: value }))}
          value={emailSettings.autoInvoiceSendCondition}
        />
        <div>
          <Text variant="bodyMd" as="p">
            Send invoices automatically on
          </Text>
          <InlineGrid columns={2}>
            {sendInvoicesOnCheckboxOptions.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={emailSettings.sendInvoicesOn?.[option.value] || false}
                onChange={(checked) => setEmailSettings(prev => ({
                  ...prev,
                  sendInvoicesOn: {
                    ...prev.sendInvoicesOn,
                    [option.value]: checked
                  }
                }))}
              />
            ))}
          </InlineGrid>
        </div>
      </BlockStack>
        : ''}
    </>
  );

  const errorText = (error) => <InlineError message={error}></InlineError>;

  return (
    <Page title="Email Settings"
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
        <Layout.AnnotatedSection
          id="sendInvoices"
          title="Email Delivery Settings"
          description="Choose how you want to send invoices to your customers."
        >
          <Card sectioned>
            <FormLayout>
              <ChoiceList
                title="Invoice delivery method"
                choices={[
                  { label: 'Send invoice emails automatically', value: 'automatic', renderChildren },
                  { label: 'Send invoices manually when needed', value: 'manuall' },
                ]}
                name="sendInvoice"
                selected={selected}
                onChange={handleChoiceListChange}
              />
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>

        <Layout.AnnotatedSection
          id="generalSettings"
          title="Invoice Email Content Configuration"
          description="Configure the subject line, and content for the emails your customers receive. Easily insert variables to make your emails dynamic and relevant. "
        >
          <Card sectioned gap={400}>
            <BlockStack gap={400}>
              <FormLayout>
                <Select
                  label="Invoice emails for"
                  options={options}
                  onChange={handleInvocieForChange}
                  value={invoiceFor}
                />

                <TextField
                  name={emailSubjectName}
                  label="Email Subject"
                  value={emailSettings[emailSubjectName]}
                  onChange={(value) => handleTextFieldChange(value, emailSubjectName)}
                  autoComplete="off"
                  helpText={<>
                    {formErrors.newOrderEmailTitle && errorText(formErrors.newOrderEmailTitle)}
                    {formErrors.cancelledOrderEmailTitle && errorText(formErrors.cancelledOrderEmailTitle)}
                    {formErrors.editedOrderEmailTitle && errorText(formErrors.editedOrderEmailTitle)}
                    Your customers will receive emails with this subject. You can use the following <Button variant="plain" onClick={showVariableModal}> variables </Button> in your subject.
                  </>}
                  error={(formErrors["newOrderEmailTitle"] || formErrors["cancelledOrderEmailTitle"] || formErrors["editedOrderEmailTitle"]) ? true : false}
                  labelAction={{ content: 'Set Default', onAction: () => setFieldDefaultValue(emailSubjectName) }}
                />

                <div>
                  <div className="Polaris-Labelled__LabelWrapper">
                    <Text variant="bodyMd" as="p"> Email Content</Text>
                    <Button variant="plain" onClick={() => setFieldDefaultValue(invoiceFor === 'new' ? 'newOrderEmailContent' : invoiceFor === 'cancel' ? 'cancelledOrderEmailContent' : 'editedOrderEmailContent')}>Set Default</Button>
                  </div>
                  <ReactQuill
                    key={invoiceFor}
                    theme="snow"
                    value={emailSettings[invoiceFor === 'new' ? 'newOrderEmailContent' : invoiceFor === 'cancel' ? 'cancelledOrderEmailContent' : 'editedOrderEmailContent']}
                    onChange={handleQuillChange}
                    modules={modules}
                    formats={formats}
                    placeholder="Compose your message..."
                  />
                  {formErrors.newOrderEmailContent && errorText(formErrors.newOrderEmailContent)}
                  {formErrors.cancelledOrderEmailContent && errorText(formErrors.cancelledOrderEmailContent)}
                  {formErrors.editedOrderEmailContent && errorText(formErrors.editedOrderEmailContent)}
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Your customers will receive emails with this content. You can use the following <Button variant="plain" onClick={showVariableModal}> variables </Button> in your content.
                  </Text>
                </div>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        <Modal
          open={variableModalShow}
          onClose={handleVariableModalChange}
          title="Variable List"
        >
          <div className="variable_list" style={{ padding: '20px' }}>
            <DescriptionList
              gap="tight"
              items={variableList}
            />
          </div>
        </Modal>
        {formErrors.general && (
          <Layout.Section>
            <Card>
              <Text tone="critical" as="p">{formErrors.general}</Text>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
};

export default SettingEmail;