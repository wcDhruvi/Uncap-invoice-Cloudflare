import React, { useState, Fragment, useContext } from 'react';
import { Button, Card, Page, Divider, Toast, BlockStack, Text, Grid, Link, Collapsible, Box } from "@shopify/polaris";
import { ShopContext } from "../providers";
import { useNavigate } from "react-router-dom";

// Get environment variables
const SHOPIFY_CART_VIEW_UI_ID = import.meta.env.SHOPIFY_CART_VIEW_UI_ID || '8b269adb-a500-437d-8be0-5b9f9376f436';

const Installation = () => {
  const [message, setMessage] = useState('');
  const [activeMessage, setActiveMessage] = useState(false);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const { shop } = useContext(ShopContext);
  const navigate = useNavigate();

  // console.log('activeTheme', shop);
  let storeUrl = `https://${shop.myshopifyDomain}/admin/themes`;
  let imageUrl = `${import.meta.env.BASE_URL}/images/`;

  const settingUpCodeArray = [
    {
      id: 1,
      title: "Enable \"View/Download Invoice Button\" On Order Status page",
      description: "Follow the step below to display the 'View' and 'Download Invoice' buttons on the order status page, so customers can easily view and download the invoice PDF. <br><br><b>Step:</b><br> Got to Theme Customization -> Order Status -> Apps -> Order Invoice View Button or Order Invoice Download Button.",
      button: "Enable View/Download Invoice Button",
      imgUrl: `${imageUrl}order-invoice-button.png`
    },
  ];
  const handleToggle = () => {
    setOpen(!open);
  };

  const handleTabChange = (index) => {
    setSelected(index);
  };
  // context=apps&previewPath=%2Fcart
  //window.open(`${storeUrl}/${activeTheme.id}/editor?context=apps&activateAppId=77c4a9c5-14c2-4430-9675-e6a649057831/product-save-cart`, "_blank")
  //https://uncap-cart.myshopify.com/admin/themes/current/editor?template=cart&addAppBlockId=8686d522-fc17-4fdd-ad25-c9ecb5c4f1ac/product-save-cart&target=newAppsSection
  const handleNavigate = (value) => {
    // value === 1 ? window.open(`${storeUrl}/current/editor?context=apps&template=product&activateAppId=${SHOPIFY_THEME_EXTENSION_ID}/app-embed`, "_blank") :
    value === 1 ? window.open(`${storeUrl}/current/editor/?template=index&page=order-status&context=apps`, "_blank") :
      value === 3 ? window.open(`${storeUrl}/current/editor?template=cart&addAppBlockId=${SHOPIFY_CART_VIEW_UI_ID}/saved-cart-list&target=newAppsSection`, "_blank") :
        window.open(`https://shopify.com/${shop.id}/account/profile`, "_blank");
    // window.open(`https://admin.shopify.com/store/uncap-rebates-dev/settings/checkout/editor/profiles/1836384450?page=order-list&context=apps${storeUrl}/current/editor?previewPath=/cart&addAppBlockId=57e80362-5a6c-4809-a9c4-1cddc032ad44/quote-cart&target=mainSection`, "_blank");

  };


  const toggleActive = () => {
    setActiveMessage((activeMessage) => !activeMessage);
    setMessage('');
  };

  const toastMarkup = activeMessage ? (
    <Toast content={message} onDismiss={toggleActive} duration={5000} />
  ) : null;

  const HTMLRenderer = ({ htmlContent }) => {
    // Create a span element with the HTML content
    return (
      <Text as="span">
        {htmlContent.split(/<br\s*\/?>/i).map((text, index, array) => (
          <Fragment key={`text-fragment-${index}`}>
            {text.includes('<b>') && text.includes('</b>') ? (
              <>
                {text.split(/<b>|<\/b>/).map((part, idx) => (
                  idx % 2 === 0 ?
                    <React.Fragment key={`text-part-${index}-${idx}`}>{part}</React.Fragment> :
                    <strong key={`text-bold-${index}-${idx}`}>{part}</strong>
                ))}
              </>
            ) : (
              text
            )}
            {index < array.length - 1 && <br />}
          </Fragment>
        ))}
      </Text>
    );
  };

  return (
    <Page title={"Installation instructions"}
      backAction={{
        content: "Back to Settings",
        onAction: () => navigate("/settings"),
      }}>
      {toastMarkup}
      <BlockStack gap={"400"}>
        <Card padding={"0"}>
          <BlockStack gap={"0"}>
            {
              (settingUpCodeArray || []).map((x, index) => {
                return (
                  <Fragment key={index}>
                    <Box padding={"400"}>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                          <BlockStack gap={"400"}>
                            <Text as="h2" variant="headingSm">{x.title}</Text>
                            {/* <Text>{x.description}</Text> */}
                            <HTMLRenderer htmlContent={x.description} />

                            <span><Button onClick={() => handleNavigate(x?.id)} variant={"primary"}>{x.button}</Button></span>
                          </BlockStack>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                          {/*<figure className='theme_screenshot'>*/}
                          <a href={x.imgUrl} target="_blank">
                            <img src={x.imgUrl} className="theme_extension" style={{ maxWidth: '100%', height: 'auto' }} />
                          </a>
                          {/*</figure>*/}
                        </Grid.Cell>
                      </Grid>
                    </Box>
                    {
                      settingUpCodeArray.length - 1 === index ? "" : <Divider />
                    }
                  </Fragment>
                );
              })
            }
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
};

export default Installation;