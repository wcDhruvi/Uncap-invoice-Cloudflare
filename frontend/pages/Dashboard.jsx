import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, Text, DataTable, Spinner } from '@shopify/polaris';

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');

        if (!shop) {
          throw new Error('Missing shop parameter in URL');
        }

        const response = await fetch(`/api/invoices?shop=${shop}`);
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

    fetchInvoices();
  }, []);

  const rows = invoices.map((inv) => [
    inv.id.toString(),
    inv.customer_name,
    `$${inv.amount.toFixed(2)}`,
    inv.status,
    new Date(inv.created_at).toLocaleDateString()
  ]);

  return (
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
  );
}
