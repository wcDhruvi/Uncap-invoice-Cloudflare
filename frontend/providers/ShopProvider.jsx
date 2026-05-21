import { createContext, useState, useEffect, useCallback } from "react";
import { Banner, Page, Text, FooterHelp } from "@shopify/polaris";
import StyledSpinner from "../components/ui/StyledSpinner";
import { apiService } from "../utils/Constent";
import { Link, useLocation, Navigate } from "react-router-dom";
import { appRoutes } from "../routes/AppRoutes";

export const ShopContext = createContext({});

export default ({ children }) => {
  const [show, setShow] = useState(false);
  const [bannerContext, setBannerContext] = useState("");
  const [availableTrialDays, setAvailableTrialDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({});
  const location = useLocation();

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
  
  if (!shop?.plan_id) {
    // If not already on the plans page, redirect there
    if (location.pathname !== appRoutes.plans) {
      return <Navigate to={`${appRoutes.plans}${location.search}`} replace />;
    }

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
        {children}
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
      {
        location.pathname === appRoutes.support ? "" :
          <FooterHelp>
            <Text>
              if you need any help, please{' '}
              <Link to={`${appRoutes.support}${location.search || window.location.search}`}>
                Contact us
              </Link>
            </Text>
          </FooterHelp>
      }
    </ShopContext.Provider>
  );
};