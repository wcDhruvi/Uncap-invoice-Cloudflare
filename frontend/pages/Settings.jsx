import React from "react";
import { Page, Card, Layout, Grid, BlockStack, Text, Box, Button, Thumbnail } from "@shopify/polaris";
import { ReceiptDollarIcon, ChatReferralIcon, ChatIcon, ImportIcon, SettingsIcon, ThemeTemplateIcon, LanguageIcon, OrganizationIcon } from "@shopify/polaris-icons";
import { useNavigate, useLocation } from "react-router-dom";
import { baseUrl } from "../utils/Constent";


const Settings = () => {
  let navigate = useNavigate();
  let location = useLocation();

  const menuList = [
    {
      title: 'Email Settings',
      text: `Configure email notification preferences and delivery settings.`,
      link: "email-settings",
      icon: SettingsIcon
    },
    {
      title: 'Template Settings',
      text: `Manage and customize your email templates.`,
      link: "template-settings",
      icon: ThemeTemplateIcon
    },
    {
      title: 'Design Settings',
      text: `Customize the appearance of your invoice email templates.`,
      link: "design-settings",
      icon: ThemeTemplateIcon
    },
    {
      title: 'Company Settings',
      text: `Update your company information used in communications.`,
      link: "company-settings",
      icon: OrganizationIcon
    },
    {
      title: 'Language Settings',
      text: `Configure language preferences and translations for customer communications.`,
      link: "language-settings",
      icon: LanguageIcon
    },
    {
      title: 'Plan and Price',
      text: `View the details of your current subscription plan.`,
      link: "plans",
      icon: ReceiptDollarIcon
    },
    {
      title: 'FAQs',
      text: `Find answers to common questions about using and configuring the Uncap Printed Invoice app.`,
      link: "faqs",
      icon: ChatReferralIcon
    },
    {
      title: 'Installation',
      text: `Please follow these instructions to set up the Uncap Printed Invoice app.`,
      link: "installation",
      icon: ImportIcon
    },
    {
      title: 'Support',
      text: `Need help? Contact our support team for personalized assistance or troubleshooting.`,
      link: "support",
      icon: ChatIcon
    }
  ];
  return (
    <Page title={"Settings"}>
      <Layout>
        <Layout.Section>
          <Card padding={"400"}>
            <Grid>
              {
                menuList.map((x, i) => {
                  return (
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4, xl: 4 }} key={x.link}>
                      {/* <div onClick={() => navigate(`${baseUrl}settings/${x.link}${location.search}`)} className={"pointer"}> */}
                      <div onClick={() => navigate(`${baseUrl}settings/${x.link}`)} className={"pointer"}>
                        {/*<InlineStack gap={"200"} wrap={false} >*/}
                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 2, sm: 2, md: 2, lg: 2, xl: 2 }}>
                            <Thumbnail
                              source={x.icon}
                              alt="Icon"
                              size={"small"}
                            />
                          </Grid.Cell>
                          <Grid.Cell columnSpan={{ xs: 10, sm: 10, md: 10, lg: 10, xl: 10 }}>
                            <BlockStack align={"start"}>
                              <div>
                                <Button variant={"plain"} removeUnderline>
                                  <Text as="h2" variant="headingSm">{x.title}</Text>
                                </Button>
                              </div>
                              <Text as={"p"} alignment={"start"}>{x.text}</Text>
                            </BlockStack>
                          </Grid.Cell>
                        </Grid>
                      </div>
                    </Grid.Cell>
                  );
                })
              }
            </Grid>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};
export default Settings;