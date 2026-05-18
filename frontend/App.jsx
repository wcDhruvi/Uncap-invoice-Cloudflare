import React, { useMemo } from 'react';
import { AppProvider as PolarisProvider, Page, Layout, Card, Text } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { Link as RouterLink } from 'react-router-dom';
import { NavMenu } from '@shopify/app-bridge-react';
import AppRoutes from './routes';
import { appRoutes } from './routes/AppRoutes';
import { useAppBridge } from "@shopify/app-bridge-react";


export default function App() {
  const shopify = useAppBridge();

  const config = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get('host') || '';
    const shop = urlParams.get('shop') || '';

    return {
      host,
      shop,
      apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'YOUR_SHOPIFY_API_KEY',
      forceRedirect: true
    };
  }, []);

  React.useEffect(() => {
    if (!config.shop) return;
    
    const checkInstallation = async () => {
      try {
        let authHeaderValue = '';
        if (shopify.environment?.mobile || shopify.environment?.embedded) {
          const token = await shopify.idToken();
          authHeaderValue = `Bearer ${token}`;
        } else {
          const localData = window.location.search;
          const urlParams = new URLSearchParams(localData);
          const params = Object.fromEntries(urlParams);
          authHeaderValue = JSON.stringify(params);
        }
        
        console.log("Checking local shop registration with Authorization token...");
        const res = await fetch(`/api/shop?shop=${config.shop}`, {
          headers: {
            'Authorization': authHeaderValue
          }
        });
        const data = await res.json();
        console.log("Shop registration data:", data, data.shop);
        

        if (!data?.shop?.id) {
          console.log("Shop not registered locally, initiating fallback OAuth flow...");
          window.location.href = `/auth?shop=${config.shop}`;
        }
      } catch (err) {
        console.error("Error checking shop registration:", err);
      }
    };

    checkInstallation();
  }, [config.shop, shopify]);

  if (!config.host && process.env.NODE_ENV !== 'development') {
    return (
      <PolarisProvider i18n={enTranslations}>
        <Page>
          <Layout>
            <Layout.Section>
              <Card>
                <div style={{ padding: '20px' }}>
                  <Text as="h2" variant="headingMd">Missing Host Parameter</Text>
                  <p>This app must be loaded within the Shopify Admin.</p>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </PolarisProvider>
    );
  }

  const navigationLinks = [
    { label: 'Invoice Dashboard', destination: appRoutes?.dashboard || '/admin/', position: 1 },
    { label: 'Add Product', destination: '/admin/product/new', position: 2 }
  ];

  return (
    <PolarisProvider i18n={enTranslations}>
      <NavMenu>
        {navigationLinks.sort((a, b) => a.position - b.position).map((x) => (
          <RouterLink to={x.destination} key={x.position}>
            {x.label}
          </RouterLink>
        ))}
      </NavMenu>
      <div style={{ minHeight: "calc(100vh - 57px)" }}>
        <AppRoutes />
      </div>
    </PolarisProvider>
  );
}
