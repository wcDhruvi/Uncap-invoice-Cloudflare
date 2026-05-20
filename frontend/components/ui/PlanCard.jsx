import {
  Card,
  Text,
  BlockStack,
  Box,
  InlineStack,
  SkeletonDisplayText,
  Button,
  List,
  ButtonGroup
} from "@shopify/polaris";
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useContext, useState } from "react";
import { ShopContext } from "../../providers";
import { apiService } from "../../utils/Constent";

export default ({ id, name, features, featuredText, description, monthlyPrice, trialDays, frequency }) => {
  const { shop } = useContext(ShopContext);
  const [disabled, setDisabled] = useState(false);

  // Convert features to array if it's an object
  const featuresList = Array.isArray(features)
    ? features
    : features
      ? Object.values(features)
      : [];
  
  const handleSelectPlan = async () => {
    setDisabled(true);
    const result = await apiService.selectPlan({ plan_id: id });

    if (result.apiStatus === 200 && result.confirmationUrl) {
      window.open(result.confirmationUrl, "_top");
    } else {
      setDisabled(false);
      alert(result.error || result.message || "Failed to subscribe. Please try again.");
    }
  };

  return (
    <div
      style={{
        width: "28rem",
        boxShadow: featuredText ? "0px 0px 15px 4px #CDFEE1" : "none",
        borderRadius: ".75rem",
        position: "relative",
        zIndex: "0",
      }}
    >
      {featuredText ? (
        <div style={{ position: "absolute", top: "-15px", right: "6px", zIndex: "100" }}>
          <Badge size="large" tone="success">
            {featuredText}
          </Badge>
        </div>
      ) : null}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200" align="start">
            <Text as="h3" variant="headingLg">
              {name}
            </Text>
            {description ? (
              <Text as="p" variant="bodySm" tone="subdued">
                {description}
              </Text>
            ) : null}
          </BlockStack>

          <InlineStack blockAlign="end" gap="100" align="start">
            <Text as="h2" variant="heading2xl">
              ${monthlyPrice}
            </Text>
            <Box paddingBlockEnd="200">
              <Text variant="bodySm">/ {frequency}</Text>
            </Box>
          </InlineStack>
          <InlineStack blockAlign="start" align="start">
            <Text>{trialDays} Day trial</Text>
            {/* <Text as="p" variant="bodyMd" fontWeight="medium">
              {
                trialCalculations(
                  shop?.usedTrialMinutes,
                  shop?.usedTrialMinutesUpdatedAt,
                  new Date(),
                  trialDays
                ).availableTrialDays
              }{" "}
              trial days
            </Text> */}
          </InlineStack>

          <BlockStack gap="100">
            <List type="none">
              {featuresList?.map((feature, id) => (
                <List.Item key={id}>{feature}</List.Item>
              ))}
            </List>
          </BlockStack>

          <Box paddingBlockStart="200" paddingBlockEnd="200">
            <ButtonGroup fullWidth>
               <Button
            disabled={shop?.plan_id === id || disabled}
            onClick={handleSelectPlan}
            variant="primary"
          >
            {shop?.plan_id === id ? "Selected Plan" : "Select Plan"}
          </Button>
            </ButtonGroup>
          </Box>
        </BlockStack>
      </Card>
    </div>
  );
};
