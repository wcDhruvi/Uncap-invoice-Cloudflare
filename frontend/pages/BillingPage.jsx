import {
  Banner,
  BlockStack,
  Button,
  Card,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import PlanCard from "../components/ui/PlanCard";
import StyledSpinner from "../components/ui/StyledSpinner";
import { useCallback, useEffect, useState } from "react";
import { apiService, baseUrl } from "../utils/Constent";
import { useNavigate, useLocation } from "react-router-dom";

export default () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans]               = useState([]);
  const [fetchingPlans, setFetchingPlans] = useState(true);
  const [show, setShow]                 = useState(false);
  const [bannerContext, setBannerContext] = useState("");

  const handleDismiss = useCallback(() => setShow(false), []);

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      setFetchingPlans(true);
      setShow(false);

      const data = await apiService.getPlans();
      console.log("plans data :",data)

      if (data.apiStatus !== 200) {
        setBannerContext(data.message || "Failed to load plans.");
        setShow(true);
      } else {
        // CF Worker returns array at top level or inside data.plans — adjust if needed
        setPlans(Array.isArray(data.data) ? data.data :  []);
      }

      setFetchingPlans(false);
    };

    fetchPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (fetchingPlans) {
    return <StyledSpinner />;
  }

  return (
    <Page
      title="Select a plan"
      backAction={{
        content: "Back to Settings",
        onAction: () => navigate(`${baseUrl}settings${location.search}`),
      }}
    >
      <BlockStack gap="500">
        {show && (
          <Banner
            title={bannerContext}
            tone="critical"
            onDismiss={handleDismiss}
          />
        )}
        <Layout>
          {plans?.length ? (
            plans.map((plan) => (
              <Layout.Section variant="oneThird" key={plan.id}>
                <PlanCard
                  id={plan.id}
                  name={plan.name}
                  features={plan.features}
                  frequency="month"
                  description={plan.description}
                  monthlyPrice={plan.monthly_price}
                  trialDays={plan.trial_days}
                />
              </Layout.Section>
            ))
          ) : (
            <Layout.Section>
              <Text tone="subdued">No plans available.</Text>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>
    </Page>
  );
};