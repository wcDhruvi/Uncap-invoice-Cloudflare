
import {
  Layout,
  FormLayout,
  Card,
  Text,
  Divider,
  BlockStack,
  Select,
  Button,
  InlineStack,
  Grid, Box,
  InlineGrid,
  Checkbox
} from '@shopify/polaris';
import React, { useCallback, useRef, useEffect, useState } from 'react';
import GoogleFontSelector from '../components/ui/GoogleFontSelector';
import InvoiceSettingsController from "./InvoiceSettingsController";

const CHECKBOX_FIELDS = [
  { name: "showSku", label: "SKU" },
  { name: "showBarcode", label: "Barcode" },
  { name: "showCountry", label: "Country Of Origin" },
  { name: "showHsCode", label: "HS Code" },
  { name: "showWeight", label: "Weight" },
  { name: "showImage", label: "Image" },
];

const SettingsForm = ({ settingsPayload, setSettingsPayload }) => {
  const colorInputRefs = useRef({});

  const handleButtonClick = (key) => {
    colorInputRefs.current[key]?.click();
  };


  console.log("setting paylaod", settingsPayload)

  const handleSelectChange = useCallback((value, name) => {
    setSettingsPayload(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleCheckboxChange = (name, newChecked) => {
    setSettingsPayload((prev) => ({
      ...prev,
      [name]: newChecked,
    }));
  };

  const templateOptions = [
    { label: 'Design 1', value: 'Design 1' },
    { label: 'Design 2', value: 'Design 2' },
    { label: 'Design 3', value: 'Design 3' },
  ];

  const paperSizeOptions = [
    { label: 'A4 Letter', value: 'A4' },
    { label: 'US Letter', value: 'LETTER' },
  ];

  const dateformatOptions = [
    { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
    { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
    { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
    { label: 'MM.DD.YYYY', value: 'mm.dd.yyyy' },
    { label: 'DD.MM.YYYY', value: 'dd.MM.yyyy' },
    { label: 'YYYY.MM.DD', value: 'yyyy.MM.dd' },
    { label: 'MMM, DD YYYY', value: 'MMM, dd yyyy' },
  ];

  const colorFields = [
    { label: 'Primary Color', key: 'primaryColor' },
    { label: 'Primary Text Color', key: 'primaryTextColor' },
    { label: 'Secondary Color', key: 'secondaryColor' },
    { label: 'Invoice text color', key: 'invoiceTextColor' },
  ];


  useEffect(() => {
    const isCheckedPaymentDetail = settingsPayload?.showCardLastDigit || settingsPayload?.showCardType || settingsPayload?.showPaymentGateway
    setSettingsPayload((prev) => ({
      ...prev,
      showPaymentDetails: isCheckedPaymentDetail,
    }));
  }, [settingsPayload?.showCardLastDigit, settingsPayload?.showCardType, settingsPayload?.showPaymentGateway])


  // Now you have access to the props here
  return <Layout.Section variant="oneThird">
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Design Settings</Text>
          </div>
          <Divider />
          <FormLayout>
            <Select
              label="Invoice Template"
              options={templateOptions}
              onChange={(value) => handleSelectChange(value, "invoice_template")}
              value={settingsPayload?.invoice_template || "Design 1"}
            />

            <Select
              label="Generate invoice in"
              options={paperSizeOptions}
              onChange={(value) => handleSelectChange(value, "paperSize")}
              value={settingsPayload?.paperSize || "A4"}
            />

            <Select
              label="Date format"
              options={dateformatOptions}
              onChange={(value) => handleSelectChange(value, "date_format")}
              value={settingsPayload?.date_format || "MM/DD/YYYY"}
            />

            <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }} gap="200">
              {colorFields.map(({ label, key }) => (
                <Box paddingBlock="100" key={key}>
                  <div style={{ marginBottom: 'var(--p-space-100)' }}>
                    <Text as="p" variant="bodyMd" >{label}</Text>
                  </div>

                  <Button onClick={() => handleButtonClick(key)} fullWidth>
                    <InlineStack gap="200" blockAlign="center" style={{ position: 'relative' }}>
                      <input
                        type="color"
                        ref={(el) => (colorInputRefs.current[key] = el)}
                        value={settingsPayload?.[key]}
                        onChange={(e) => handleSelectChange(e.target.value, key)}
                        style={{
                          opacity: 0,
                          width: 0,
                          height: 0,
                          position: 'absolute',
                          pointerEvents: 'none',
                        }}
                      />
                      <div
                        style={{
                          width: "1.5rem",
                          height: "1.5rem",
                          borderRadius: '50%',
                          backgroundColor: settingsPayload?.[key],
                          border: '1px solid #ccc',
                        }}
                      />
                      <Text as="span" variant="bodyMd">{settingsPayload?.[key]}</Text>
                    </InlineStack>
                  </Button>
                </Box>
              ))}
            </Grid>
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Font settings</Text>
          </div>
          <Divider />
          <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }} gap="200">
            <GoogleFontSelector
              selectedFont={settingsPayload?.headingFont}
              onFontChange={(value) => handleSelectChange(value, "headingFont")}
              label="Heading Font"
            />

            <GoogleFontSelector
              selectedFont={settingsPayload?.bodyFont}
              onFontChange={(value) => handleSelectChange(value, "bodyFont")}
              label="Body Font"
            />
          </Grid>
        </BlockStack>
      </Card>
      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Configure Invoice Settings</Text>
            <Text as="p" tone="subdued">Choose the following elements for each product</Text>
          </div>
          <Divider />
          <BlockStack gap={400}>
            <BlockStack gap={200}>
              <InlineGrid gap="200" columns={2}>
                {CHECKBOX_FIELDS.map(({ name, label }) => (
                  <Checkbox
                    key={name}
                    label={label}
                    checked={settingsPayload[name] || false}
                    onChange={(newChecked) => handleCheckboxChange(name, newChecked)}
                  />
                ))}
              </InlineGrid>
              <Checkbox
                key={"showCurrencyCode"}
                label={"Include ISO currency code with prices (ex. $12 USD)"}
                checked={settingsPayload["showCurrencyCode"] || false}
                onChange={(newChecked) => handleCheckboxChange("showCurrencyCode", newChecked)}
              />
              <Checkbox
                key={"showItemTotal"}
                label={"Show total for each product"}
                checked={settingsPayload["showItemTotal"] || false}
                onChange={(newChecked) => handleCheckboxChange("showItemTotal", newChecked)}
              />
              {/* <Checkbox
                key={"notShowZeroOutstanding"}
                label={'Do not show outstanding if zero'}
                checked={settingsPayload["notShowZeroOutstanding"] || false}
                onChange={(newChecked) => handleCheckboxChange("notShowZeroOutstanding", newChecked)}
              />
              <Checkbox
                key={'showPaymentLink'}
                label={"Show payment link"}
                checked={settingsPayload['showPaymentLink'] || false}
                onChange={(newChecked) => handleCheckboxChange('showPaymentLink', newChecked)}
              /> */}
              <Checkbox
                key={"showPaymentDetails"}
                label={"Show payment details"}
                checked={settingsPayload["showPaymentDetails"] || false}
                onChange={(newChecked) => {
                  setSettingsPayload((prev) => ({
                    ...prev,
                    showPaymentDetails: newChecked,
                    showPaymentGateway: newChecked,
                    showCardType: newChecked,
                    showCardLastDigit: newChecked
                  }));
                }}
              />
              <Box paddingInlineStart="300">
                <BlockStack gap={200}>
                  <Checkbox
                    disabled={!settingsPayload["showPaymentDetails"]}
                    key={"showPaymentGateway"}
                    label={"Payment Gateway"}
                    checked={settingsPayload["showPaymentGateway"] || false}
                    onChange={(newChecked) => handleCheckboxChange("showPaymentGateway", newChecked)}
                  />
                  <Checkbox
                    disabled={!settingsPayload["showPaymentDetails"]}
                    key={"showCardType"}
                    label={"Card type"}
                    checked={settingsPayload["showCardType"] || false}
                    onChange={(newChecked) => handleCheckboxChange("showCardType", newChecked)}
                  />
                  <Checkbox
                    disabled={!settingsPayload["showPaymentDetails"]}
                    key={"showCardLastDigit"}
                    label={"Last 4 digits of the card"}
                    checked={settingsPayload["showCardLastDigit"] || false}
                    onChange={(newChecked) => handleCheckboxChange("showCardLastDigit", newChecked)}
                  />
                </BlockStack>
              </Box>
              <Checkbox
                key={"showOrderNote"}
                label={"Show order notes on the invoice"}
                checked={settingsPayload["showOrderNote"] || false}
                onChange={(newChecked) => handleCheckboxChange("showOrderNote", newChecked)}
              />
              <Checkbox
                key={"showTotalQuantity"}
                label={"Show total quantity on the invoice"}
                checked={settingsPayload["showTotalQuantity"] || false}
                onChange={(newChecked) => handleCheckboxChange("showTotalQuantity", newChecked)}
              />

            </BlockStack>
          </BlockStack>

        </BlockStack>
      </Card>
    </BlockStack>
  </Layout.Section>;
};

const SettingsDesign = () => {

  return (
    <InvoiceSettingsController pageTitle="Design Settings  ">
      <SettingsForm />
    </InvoiceSettingsController>

  );
};

export default SettingsDesign;
