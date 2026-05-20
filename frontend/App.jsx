import React, { useMemo } from 'react';
import { Page, Layout, Card, Text } from '@shopify/polaris';

import { Link as RouterLink } from 'react-router-dom';
import { NavMenu } from '@shopify/app-bridge-react';
import AppRoutes from './routes';
import { appRoutes } from './routes/AppRoutes';
import { apiService } from './utils/Constent';


export default function App() {
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
        console.log("Checking local shop registration...");

        const data = await apiService.getShopDetails({ shop: config.shop });

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
  }, [config.shop]);

  if (!config.host && process.env.NODE_ENV !== 'development') {
    return (
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
    );
  }

  const navigationLinks = [
    { label: 'Invoice Dashboard', destination: appRoutes?.dashboard || '/admin/', position: 1 },
    { label: 'Add Product', destination: '/admin/product/new', position: 2 }
  ];

  return (
    <>
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
    </>
  );
}
