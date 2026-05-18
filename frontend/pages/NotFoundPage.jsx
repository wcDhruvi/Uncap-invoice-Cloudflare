import React from 'react';
import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function NotFoundPage() {
  return (
    <Page title="404 - Not Found">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="p">The page you're looking for doesn't exist.</Text>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
