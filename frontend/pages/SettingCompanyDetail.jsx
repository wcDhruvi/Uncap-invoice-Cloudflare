import {
  Layout,
  FormLayout,
  TextField,
  Box,
  Button,
  InlineStack,
  Card,
  Text,
  Divider,
  BlockStack,
  DropZone,
  Thumbnail,
  Modal
} from '@shopify/polaris';
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { ShopContext } from "../providers";
import InvoiceSettingsController from "./InvoiceSettingsController";
import useApiService from "../utils/ApiService";

const SettingsForm = ({ settingsPayload, setSettingsPayload, settingsData, formErrors, updateSettings }) => {
  const { shop } = useContext(ShopContext);
  const apiService = useApiService();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDropZoneDrop = useCallback(async (_dropFiles, acceptedFiles, _rejectedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      // Check file size (1MB limit)
      if (file.size > 1024 * 1024) {
        if (typeof shopify !== 'undefined') {
          shopify.toast.show("File size exceeds 1MB limit", { isError: true });
        }
        return;
      }

      setLogoFile(file);

      // Create a preview of the image
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        setLogoPreview(base64Data);

        // Call our backend API to upload the logo
        await apiService.uploadLogo({
          file: {
            filename: file.name,
            mimetype: file.type,
            encoding: base64Data,
            resource: 'IMAGE'
          }
        })
          .then(response => {
            console.log('response image', response);
            if (response.success) {
              const fileData = response.data?.file;
              // Add logoUrl to the settings payload
              setSettingsPayload(prev => ({
                ...prev,
                logoUrl: fileData?.image?.url || fileData?.url,
                logoUrlId: fileData?.id
              }));

              updateSettings({
                id: settingsData.id,
                logoUrl: fileData?.image?.url || fileData?.url,
                logoUrlId: fileData?.id
              });

              if (typeof shopify !== 'undefined') {
                shopify.toast.show("Logo uploaded successfully");
              }
            } else {
              console.error("Failed to upload logo:", response.error);
              if (typeof shopify !== 'undefined') {
                shopify.toast.show(response.error || "Failed to upload logo", { isError: true });
              }
            }
          })
          .catch(error => {
            console.error("Error calling uploadLogo action:", error);
            if (typeof shopify !== 'undefined') {
              shopify.toast.show("Failed to upload logo", { isError: true });
            }
          });
      };
      reader.readAsDataURL(file);
    }
  }, [shop, apiService, updateSettings, settingsData]);

  const handleDeleteImage = useCallback(async () => {
    setIsDeleteModalOpen(false);
    if (!settingsPayload?.logoUrl) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    try {
      if (settingsData?.logoUrlId) {
        const response = await apiService.deleteLogo({
          fileId: settingsData.logoUrlId
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to delete logo");
        }

        await updateSettings({
          id: settingsData.id,
          logoUrl: null,
          logoUrlId: null
        });

        // Clear the logo URL from settings
        setSettingsPayload(prev => ({
          ...prev,
          logoUrl: null,
          logoUrlId: null,
        }));

        setLogoFile(null);
        setLogoPreview(null);

        if (typeof shopify !== 'undefined') {
          shopify.toast.show("Logo deleted successfully");
        }
      }
    } catch (error) {
      console.error("Error deleting logo:", error);
      if (typeof shopify !== 'undefined') {
        shopify.toast.show(error.message || "Failed to delete logo", { isError: true });
      }
    }
  }, [settingsPayload?.logoUrl, settingsData, apiService, updateSettings]);

  // Function to validate the file type
  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

  useEffect(() => {
    setLogoFile(settingsData?.logoUrl || '');
    setLogoPreview(settingsData?.logoUrl || '');
  }, [settingsData]);

  const handleTextFieldChange = useCallback((value, name) => {
    setSettingsPayload(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  return <Layout.Section variant="oneThird">
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <div>
            <Text as="h2" variant="headingMd">Company Details</Text>
          </div>
          <Divider />
          <FormLayout>
            <TextField
              label="Brand name"
              value={settingsPayload?.brandName}
              onChange={(value) => handleTextFieldChange(value, "brandName")}
              autoComplete="off"
            />
            <Box paddingBlock="200">
              <BlockStack gap="200">
                <Text>Upload your logo (optional)</Text>
                {!logoFile ? (
                  <DropZone onDrop={handleDropZoneDrop} allowMultiple={false} accept="image/*" type="image" >
                    <DropZone.FileUpload actionHint="Accepts .gif, .jpg, and .png formats" actionTitle="Upload Logo"/>
                  </DropZone>
                ) : (
                  <div style={{ padding: '0rem' }}>
                    <InlineStack gap="400" align="center">
                      <BlockStack gap="300">
                        <Thumbnail
                          size="large"
                          alt={logoFile?.name || "Logo"}
                          source={
                            (logoFile && validImageTypes.includes(logoFile?.type)) || logoPreview
                              ? logoPreview
                              : 'https://cdn.shopify.com/s/files/1/0757/9955/files/New_Post.png'
                          }
                        />
                        <Button
                          variant="primary"
                          tone="critical"
                          accessibilityLabel="Delete logo"
                          onClick={() => setIsDeleteModalOpen(true)}
                        >
                          Remove
                        </Button>
                      </BlockStack>
                      <div>
                        <Text as="p" variant="bodyMd">
                          {logoFile?.name || "Logo uploaded"}
                        </Text>
                      </div>
                    </InlineStack>
                  </div>)}
                <Text as="p" variant="bodySm" color="subdued">
                  For best results, upload a square logo at least 200px wide. Maximum file size: 1MB.
                </Text>
              </BlockStack>
            </Box>

            <TextField
              label="Business Name"
              value={settingsPayload?.businessName}
              onChange={(value) => handleTextFieldChange(value, "businessName")}
              autoComplete="off"
            />

            <TextField
              label="Company website"
              value={settingsPayload?.companyWebsite}
              onChange={(value) => handleTextFieldChange(value, "companyWebsite")}
              autoComplete="off"
            />

            <TextField
              label="Company support email"
              value={settingsPayload?.supportEmail}
              onChange={(value) => handleTextFieldChange(value, "supportEmail")}
              autoComplete="off"
              error={formErrors.supportEmail}
            />

            <TextField
              label="Phone"
              value={settingsPayload?.phone}
              onChange={(value) => handleTextFieldChange(value, "phone")}
              autoComplete="off"
            />

            <TextField
              label="Street"
              value={settingsPayload?.street}
              onChange={(value) => handleTextFieldChange(value, "street")}
              autoComplete="off"
            />

            <TextField
              label="Apartment, suite, etc. (optional)"
              value={settingsPayload?.apartment}
              onChange={(value) => handleTextFieldChange(value, "apartment")}
              autoComplete="off"
            />

            <TextField
              label="City"
              value={settingsPayload?.city}
              onChange={(value) => handleTextFieldChange(value, "city")}
              autoComplete="off"
            />

            <TextField
              label="Postal/Zip code"
              value={settingsPayload?.zipCode}
              onChange={(value) => handleTextFieldChange(value, "zipCode")}
              autoComplete="off"
            />
            <TextField
              label="Country/Region"
              value={settingsPayload?.country}
              onChange={(value) => handleTextFieldChange(value, "country")}
              autoComplete="off"
            />
            <TextField
              label="State"
              value={settingsPayload?.state}
              onChange={(value) => handleTextFieldChange(value, "state")}
              autoComplete="off"
            />
            <TextField
              label="Additional Info"
              value={settingsPayload?.additionalInfo}
              onChange={(value) => handleTextFieldChange(value, "additionalInfo")}
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
    <Modal
      open={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      title="Delete Logo"
      primaryAction={{
        content: 'Delete',
        destructive: true,
        onAction: handleDeleteImage,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setIsDeleteModalOpen(false),
        },
      ]}
    >
      <Modal.Section>
        <Text as="p">
          Are you sure you want to delete this logo? This action cannot be undone.
        </Text>
      </Modal.Section>
    </Modal>
  </Layout.Section>
};

const SettingCompanyDetail = () => {
  return (
    <InvoiceSettingsController pageTitle="Company Settings">
      <SettingsForm />
    </InvoiceSettingsController>
  );
};

export default SettingCompanyDetail;
