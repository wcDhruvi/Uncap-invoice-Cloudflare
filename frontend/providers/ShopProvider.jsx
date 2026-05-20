import { createContext, useState, useEffect, useCallback } from "react";
import { Banner, Page, Text ,FooterHelp} from "@shopify/polaris";
import StyledSpinner from "../components/ui/StyledSpinner";
import BillingPage from "../pages/BillingPage";
import { apiService } from "../utils/Constent";
import { Link } from "react-router-dom";

export const ShopContext = createContext({});

export default ({ children }) => {


  const [show, setShow] = useState(false);
  const [bannerContext, setBannerContext] = useState("");
  const [availableTrialDays, setAvailableTrialDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({});

  const handleDismiss = useCallback(() => setShow(false), []);

  // ── Fetch shop data on mount ──────────────────────────────────────────────
  useEffect(() => {
    const getShopData = async () => {
      try {
        const res = await apiService.getShopDetails();

        if (res.apiStatus !== 200) {
          setBannerContext(res.message || "Failed to load shop data.");
          setShow(true);
        } else {
          console.log("shop res : ", res);
          setShop({ ...res?.shop, currency: res.currency || res.currencyBackup });

        }
      } catch (error) {
        console.error("Error loading shop data:", error);
        setBannerContext("Unexpected error loading shop.");
        setShow(true);
      } finally {
        setLoading(false);
      }
    };

    getShopData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Page>
        <StyledSpinner />
      </Page>
    );
  }

  console.log("shop : ", shop);
  // ── No plan selected → show billing ──────────────────────────────────────
  // useNavigate() removed — it requires <Router> context which isn't
  // guaranteed at provider level. Render BillingPage directly instead.
  if (!shop?.plan_id) {
    return (
      <ShopContext.Provider value={{ shop }}>
        {show && (
          <Banner tone="critical" title={bannerContext} onDismiss={handleDismiss} />
        )}
        <Page>
          <Banner tone="warning" title="Action required">
            <Text as="p" variant="bodyMd">
              You must select a plan before you can access this application.
            </Text>
          </Banner>
        </Page>
        <BillingPage />
      </ShopContext.Provider>
    );
  }

  // ── Has plan → render children ────────────────────────────────────────────
  return (
    <ShopContext.Provider value={{ shop }}>
      {show && (
        <Banner tone="critical" title={bannerContext} onDismiss={handleDismiss} />
      )}
      {!!availableTrialDays && (
        <Page>
          <Banner title="You are currently on a trial period." tone="info">
            <Text as="p" variant="bodyMd">
              The trial will end in <strong>{availableTrialDays}</strong> days.
            </Text>
          </Banner>
        </Page>
      )}
      {children}
      {/* {
        location.pathname === "/settings/support" ? "" :
          <FooterHelp>
            <Text>
              if you need any help, please{' '}
              <Link to="/settings/support">
                Contact us
              </Link>
            </Text>
          </FooterHelp>
      } */}
    </ShopContext.Provider>
  );
};