import {
  Layout,
  FormLayout,
  TextField,
  Card,
  Text,
  Checkbox,
  Divider,
  BlockStack
} from '@shopify/polaris';
import React, { useCallback } from 'react';
import InvoiceSettingsController from "./InvoiceSettingsController";

const SettingsForm = ({ settingsPayload, setSettingsPayload }) => {

  function updateNestedObject(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();

    const nested = keys.reduce((acc, key) => {
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, obj);

    nested[lastKey] = value;
    return { ...obj };
  }

  const handleChange = useCallback((value, name) => {
    setSettingsPayload(prev => {
      const updatedTemplateSettings = updateNestedObject(
        { ...prev.templateSettings },
        name,
        value
      );

      return {
        ...prev,
        templateSettings: updatedTemplateSettings
      };
    });
  }, []);


  // console.log("settingsPayload", settingsPayload);
  // console.log("settingsPayload?.templateSettings?.shipping?.showShippingMethod", settingsPayload?.templateSettings?.shipping?.showShippingMethod)

  // Now you have access to the props here
  return <Layout.Section variant="oneThird">
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Taxes</Text>
            <Text>Enter your tax number and choose display settings for your tax details</Text>
          </div>
          <Divider />
          <FormLayout>
            <TextField
              label="Tax type and Tax number of your company"
              value={settingsPayload?.templateSettings?.taxes?.taxNumber}
              onChange={(value) => handleChange(value, "taxes.taxNumber")}
              autoComplete="off"
              helpText="Include your tax type along with your tax number. Better to use GST 12345 or VAT 12345 instead of 12345."
            />

            {/* <Checkbox
              label="Show tax"
              value={settingsPayload?.templateSettings?.taxes?.showTax}
              checked={settingsPayload?.templateSettings?.taxes?.showTax}
              onChange={(value) => handleChange(value, "taxes.showTax")}
            /> */}

            {/* <Checkbox
              label="Show individual tax details (if multiple taxes are applied)"
              value={settingsPayload?.templateSettings?.taxes?.taxIndividual}
              checked={settingsPayload?.templateSettings?.taxes?.taxIndividual}
              onChange={(value) => handleChange(value, "taxes.taxIndividual")}
            /> */}

            <Checkbox
              label="Do not show tax amount when the total tax is zero"
              value={settingsPayload?.templateSettings?.taxes?.taxHideZero}
              checked={settingsPayload?.templateSettings?.taxes?.taxHideZero}
              onChange={(value) => handleChange(value, "taxes.taxHideZero")}
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Shipping</Text>
            <Text>Choose display settings for your shipping details</Text>
          </div>
          <Divider />
          <FormLayout>
            <Checkbox
              label="Show shipping method"
              value={settingsPayload?.templateSettings?.shipping?.showShippingMethod}
              checked={settingsPayload?.templateSettings?.shipping?.showShippingMethod}
              onChange={(value) => handleChange(value, "shipping.showShippingMethod")}
            />

            <Checkbox
              label="Do not show shipping amount in the case of free delivery"
              value={settingsPayload?.templateSettings?.shipping?.hideShippingFreeDelivery}
              checked={settingsPayload?.templateSettings?.shipping?.hideShippingFreeDelivery}
              onChange={(value) => handleChange(value, "shipping.hideShippingFreeDelivery")}
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Discount</Text>
            <Text>Choose what information you want to show in the company details</Text>
          </div>
          <Divider />
          <FormLayout>
            <Checkbox
              label="Show original price when discount is applied"
              value={settingsPayload?.templateSettings?.discount?.showDiscountAppliedOriginalPrice}
              checked={settingsPayload?.templateSettings?.discount?.showDiscountAppliedOriginalPrice}
              onChange={(value) => handleChange(value, "discount.showDiscountAppliedOriginalPrice")}
            />

            <Checkbox
              label="Do not show zero discount for individual product"
              value={settingsPayload?.templateSettings?.discount?.hideDiscountZero}
              checked={settingsPayload?.templateSettings?.discount?.hideDiscountZero}
              onChange={(value) => handleChange(value, "discount.hideDiscountZero")}
              helpText="By default discount will always be shown when the product is sold at discount"
            />

            <Checkbox
              label="Do not show discount amount when the total discount is zero"
              value={settingsPayload?.templateSettings?.discount?.hideDiscountTotalPriceZero}
              checked={settingsPayload?.templateSettings?.discount?.hideDiscountTotalPriceZero}
              onChange={(value) => handleChange(value, "discount.hideDiscountTotalPriceZero")}
            />

            <Checkbox
              label="Show subtotal after discount"
              value={settingsPayload?.templateSettings?.discount?.showDiscountAfterSubtotal}
              checked={settingsPayload?.templateSettings?.discount?.showDiscountAfterSubtotal}
              onChange={(value) => handleChange(value, "discount.showDiscountAfterSubtotal")}
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
  </Layout.Section>;
};

const TemplateSettings = () => {
  return (
    <InvoiceSettingsController pageTitle="Template Settings">
      <SettingsForm />
    </InvoiceSettingsController>
  );
};

export default TemplateSettings;