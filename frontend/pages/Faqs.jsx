import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Page,
  Card,
  Button,
  Collapsible,
  Text,
  Box,
  BlockStack, Divider, InlineStack
} from "@shopify/polaris";
import { baseUrl } from "../utils/Constent";


const FaqsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = useState(null);

  const toggleSection = (id) => {
    setOpenSections(openSections === id ? null : id);
  };


  const jsonList = [
    {
      tab: "0",
      title: "How do I customize my invoice template?",
      desc: "You can customize your invoice template in the Settings page. You'll find options for adding your logo, changing colors, and editing the footer text."
    },
    {
      tab: "1",
      title: "How do I download an invoice as PDF?",
      desc: "On the Orders page, find the order you want to create an invoice for and click the \"Download PDF\" button."
    },
    {
      tab: "2",
      title: "Can I send invoices directly to customers?",
      desc: "Yes, from the invoice view, you can use the \"Send to Customer\" option to email the invoice directly."
    },
  ];

  return (
    <Page
      title="Frequently Asked Questions"
      backAction={{
        content: "Back to Settings",
        onAction: () => navigate(`${baseUrl}settings${location.search}`),
      }}
    >

      <BlockStack gap="200">
        {(jsonList || []).map((x, i) => {
          return (
            <Card key={i}>
              <BlockStack gap="200">
                <InlineStack align="space-between" wrap={false}>
                  <Button
                    onClick={() => toggleSection(x.tab)}
                    textAlign="left"
                    fullWidth
                    variant={'monochromePlain'}
                  >
                    <Text variant="headingSm" as="h6"> {x.title}</Text>
                  </Button>
                  <Button
                    onClick={() => toggleSection(x.tab)}
                    ariaExpanded={openSections === x.tab}
                    ariaControls={x.tab}
                    variant={'monochromePlain'}
                    disclosure={openSections === x.tab ? "up" : 'down'}
                  />

                </InlineStack>

                <Collapsible
                  open={openSections === x.tab}
                  id={x.tab}
                  transition={{ duration: "300ms" }}
                >
                  <Box>
                    <Text>
                      <span dangerouslySetInnerHTML={{ __html: x.desc }} />
                    </Text>
                  </Box>
                </Collapsible>
              </BlockStack>
            </Card>
          );
        })}
      </BlockStack>
    </Page>
  );
};
export default FaqsPage;