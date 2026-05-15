import React, { useMemo, useState, useEffect } from 'react';
import { AppProvider as PolarisProvider, Page, Layout, Card, Text, DataTable, Spinner } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    // Fetch data from our Cloudflare Worker API Endpoint
    const fetchInvoices = async () => {
      try {
        const response = await fetch('/api/invoices');
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setInvoices(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we are actually rendering the main view
    // (If config.host is missing, we render an error card instead)
    if (config.host || process.env.NODE_ENV === 'development') {
      fetchInvoices();
    }
  }, [config.host]);

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

  // Format data for Polaris DataTable
  const rows = invoices.map((inv) => [
    inv.id.toString(),
    inv.customer_name,
    `$${inv.amount.toFixed(2)}`,
    inv.status,
    new Date(inv.created_at).toLocaleDateString()
  ]);

  return (
    <PolarisProvider i18n={enTranslations}>
      <Page title="Invoice Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text as="h2" variant="headingMd" style={{ marginBottom: '15px' }}>
                  Cloudflare D1 Database Integration
                </Text>

                {isLoading ? (
                  <Spinner accessibilityLabel="Loading invoices" size="large" />
                ) : error ? (
                  <Text color="critical">Failed to load invoices: {error}</Text>
                ) : (
                  <DataTable
                    columnContentTypes={[
                      'text',
                      'text',
                      'numeric',
                      'text',
                      'text',
                    ]}
                    headings={[
                      'ID',
                      'Customer Name',
                      'Amount',
                      'Status',
                      'Created At',
                    ]}
                    rows={rows}
                  />
                )}
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisProvider>
  );
}
