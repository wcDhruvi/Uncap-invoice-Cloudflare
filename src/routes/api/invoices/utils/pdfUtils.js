import { format } from 'date-fns';
import pdfMake from 'pdfmake';
import axios from 'axios';
import { Roboto_Regular, Roboto_Bold, OpenSans_Regular, OpenSans_Bold } from './fontsBase64.js';

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

function getMimeTypeFromUrl(url) {
  const extension = url.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg'].includes(extension)) {
    return extension === 'png' ? 'image/png' : 'image/jpeg';
  }
  return 'image/png';
}

async function imageToBase64(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    if (response.status !== 200) {
      logger.error(`Failed to fetch image: ${url} - Status: ${response.status}`);
      return "";
    }
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    logger.error('imageToBase64 error:', error);
    return "";
  }
}

async function convertUrlToBase64(url) {
  if (!url) return "";
  try {
    const extension = url.split('.').pop().toLowerCase();
    let base64, mimeType;
    if (['png', 'jpg', 'jpeg'].includes(extension)) {
      base64 = await imageToBase64(url);
      mimeType = getMimeTypeFromUrl(url);
      return `data:${mimeType};base64,${base64}`;
    } else {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      if (response.status !== 200) {
        logger.error(`Failed to fetch image: ${url} - Status: ${response.status}`);
        return "";
      }
      logger.info(`Fetching image from URL: ` + JSON.stringify(url));
      const buffer = Buffer.from(response.data, 'binary');
      base64 = buffer.toString('base64');
      mimeType = 'image/png';
      return `data:${mimeType};base64,${base64}`;
    }
  } catch (error) {
    logger.error('convertUrlToBase64 error:', error);
    return "";
  }
}

const pdfMakeInstance = pdfMake && pdfMake.setFonts ? pdfMake : (pdfMake.default || pdfMake);

// Write font buffers to pdfmake virtual filesystem
pdfMakeInstance.virtualfs.writeFileSync('Roboto-Regular.ttf', Buffer.from(Roboto_Regular, 'base64'));
pdfMakeInstance.virtualfs.writeFileSync('Roboto-Bold.ttf', Buffer.from(Roboto_Bold, 'base64'));
pdfMakeInstance.virtualfs.writeFileSync('OpenSans-Regular.ttf', Buffer.from(OpenSans_Regular, 'base64'));
pdfMakeInstance.virtualfs.writeFileSync('OpenSans-Bold.ttf', Buffer.from(OpenSans_Bold, 'base64'));

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Bold.ttf',
    italics: 'Roboto-Regular.ttf',
    bolditalics: 'Roboto-Regular.ttf'
  },
  Open_Sans: {
    normal: 'OpenSans-Regular.ttf',
    bold: 'OpenSans-Bold.ttf',
    italics: 'OpenSans-Regular.ttf',
    bolditalics: 'OpenSans-Regular.ttf'
  }
};

fonts.Lato = fonts.Roboto;
fonts.Montserrat = fonts.Roboto;
fonts.Oswald = fonts.Roboto;
fonts.Source_Sans_Pro = fonts.Open_Sans;
fonts.Raleway = fonts.Roboto;
fonts.PT_Sans = fonts.Roboto;
fonts.Poppins = fonts.Roboto;
fonts.Playfair_Display = fonts.Roboto;
fonts.Merriweather = fonts.Roboto;
fonts.PT_Serif = fonts.Roboto;
fonts.Ubuntu = fonts.Roboto;
fonts.Lora = fonts.Roboto;
fonts.Rubik = fonts.Roboto;
fonts.Nunito = fonts.Roboto;
fonts.Work_Sans = fonts.Roboto;
fonts.Fira_Sans = fonts.Roboto;
fonts.Quicksand = fonts.Roboto;

pdfMakeInstance.setFonts(fonts);





const getHtmlToPdfMakeObj = (html) => {
  const parseInlineText = (html) => {
    const result = [];

    html = html.replace(/<br\s*\/?>/gi, '\n');

    const parseFragment = (fragment) => {
      let matched = false;

      const patterns = [
        { tag: 'strong', style: { bold: true } },
        { tag: 'b', style: { bold: true } },
        { tag: 'em', style: { italics: true } },
        { tag: 'i', style: { italics: true } },
        { tag: 'u', style: { decoration: 'underline' } },
        { tag: 's', style: { decoration: 'lineThrough' } },
        {
          tag: 'a',
          style: (node) => {
            const hrefMatch = node.match(/href="(.*?)"/i);
            const link = hrefMatch ? hrefMatch[1] : '';
            return { link, color: 'blue', decoration: 'underline' };
          },
          isDynamic: true,
        },
      ];

      for (const { tag, style, isDynamic } of patterns) {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'i');
        const match = regex.exec(fragment);

        if (match) {
          const before = fragment.slice(0, match.index);
          const inner = match[1];
          const after = fragment.slice(match.index + match[0].length);

          if (before) result.push({ text: before });

          const appliedStyle = isDynamic ? style(match[0]) : style;
          result.push({ text: inner, ...appliedStyle });

          if (after) result.push(...parseFragment(after));

          matched = true;
          break;
        }
      }

      if (!matched && fragment) result.push({ text: fragment });
      return result;
    };

    return parseFragment(html);
  };

  // Converts HTML string into pdfMake content array
  const simpleHtmlToPdfMake = (html) => {
    const content = [];

    // Handle headers and paragraphs
    const blockElements = [
      { tag: 'h1', fontSize: 20, bold: true, margin: [0, 15, 0, 5] },
      { tag: 'h2', fontSize: 16, bold: true, margin: [0, 12, 0, 4] },
      { tag: 'h3', fontSize: 14, bold: true, margin: [0, 10, 0, 3] },
      { tag: 'p', margin: [0, 5, 0, 5] },
    ];

    blockElements.forEach((block) => {
      const regex = new RegExp(`<${block.tag}[^>]*>(.*?)<\/${block.tag}>`, 'gi');
      let match;

      while ((match = regex.exec(html)) !== null) {
        const inlineText = parseInlineText(match[1]);
        const element = {
          text: inlineText,
          margin: block.margin,
          bold: block.bold,
        };
        content.push(element);
      }
    });

    // Handle unordered and ordered lists
    const listRegex = /<(ul|ol)[^>]*>(.*?)<\/\1>/gis;
    let match;

    while ((match = listRegex.exec(html)) !== null) {
      const isOrdered = match[1] === 'ol';
      const listItems = [];

      const liRegex = /<li[^>]*>(.*?)<\/li>/gis;
      let liMatch;
      while ((liMatch = liRegex.exec(match[2])) !== null) {
        listItems.push({ text: parseInlineText(liMatch[1]) });
      }

      content.push({ [isOrdered ? 'ol' : 'ul']: listItems, margin: [15, 5, 0, 5] });
    }

    return content;
  };

  const pdfContent = simpleHtmlToPdfMake(html);
  return pdfContent;
}

/**
 * Generates a PDF from order and invoice data
 * @param {Object} data - The data needed to generate the PDF
 * @param {Object} data.invoice - Invoice data
 * @param {Object} data.order - Shopify order data
 * @param {Object} data.settings - Invoice settings with styling preferences
 * @param {Object} language - Additional options for PDF generation
 * @returns {Promise<Buffer>} - The generated PDF as a buffer
 */


const generateInvoiceTemplate = async (data) => {
  const { invoice, order, settings, language, transactionData } = data;

  const templateSettings = settings?.templateSettings || {};
  const paperSize = settings?.paperSize || "A4"
  const isA4PaperSize = paperSize == "A4"
  const invoiceNumber = invoice?.invoiceNumber || '';
  const invoiceDate = formatDate(invoice?.createdAt || new Date(), settings?.date_format || 'MM/dd/yyyy');

  const companyName = settings?.businessName || '';
  const subtotal = order?.subtotalPrice || 0;
  const discountCodes = order?.discountCodes;
  const discountCodeAmount = discountCodes.reduce((sum, item) => {
    return sum + parseFloat(item.amount);
  }, 0);
  const tax = order?.totalTax || 0;
  const totalShipping = order?.totalShipping || 0;
  const total = order?.totalPrice || 0;
  const currency = order?.currency || 'USD';
  const lineItems = order.lineItems?.edges?.map(edge => edge.node) || [];
  const shippingLines = order.shippingLines?.edges?.map(edge => edge.node) || [];

  const logoUrl = await convertUrlToBase64(settings?.logoUrl || '');

  logger.info("=========Logo URL:========= " + logoUrl)
  const primaryColor = settings?.primaryColor || '#8257d0';
  const secondaryColor = settings?.secondaryColor || '#f0ecf9';

  const showCurrencyCode = settings?.showCurrencyCode || false
  const totalItems = lineItems?.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const bodyFont = formatFontName(settings?.bodyFont || "Open Sans");
  const headingFont = formatFontName(settings?.headingFont || "Roboto");

  // Address formatting
  const companyAddressComponents = [
    settings.street || '',
    `${settings.apartment ? settings.apartment + ', ' : ''} ${settings.city || ''}`,
    `${settings.state ? settings.state + ', ' : ''} ${settings.country ? settings.country + ', ' : ''} ${settings.zipCode || ''}`,
  ].filter(component => component && component.trim() !== '');

  const shippingAddressComponents = [
    order.shippingAddress.name || '',
    `${order.shippingAddress.address1 ? order.shippingAddress.address1 + ', ' : ''} ${order.shippingAddress.address2 || ''}`,
    `${order.billingAddress.city ? order.billingAddress.city + ', ' : ''} ${order.shippingAddress.province ? order.shippingAddress.province + ', ' : ''} ${order.shippingAddress.country ? order.shippingAddress.country + ', ' : ''}`,
    order.shippingAddress.zip || '',
    order.shippingAddress.phone,
  ].filter(component => component && component.trim() !== '');

  const billingAddressComponents = [
    order.billingAddress.name || '',
    `${order.billingAddress.address1 ? order.billingAddress.address1 + ', ' : ''} ${order.billingAddress.address2 || ''}`,
    `${order.billingAddress.city ? order.billingAddress.city + ', ' : ''} ${order.billingAddress.province ? order.billingAddress.province + ', ' : ''} ${order.billingAddress.country ? order.billingAddress.country + ', ' : ''}`,
    order.billingAddress.zip || '',
    order.shippingAddress.phone,
  ].filter(component => component && component.trim() !== '');

  logger.info('=== generateInvoiceTemplate ===' + settings?.showItemTotal)
  // Generate line items for table
  const generateLineItemsTable = async () => {
    const headers = [
      { text: '#', style: 'tableHeader' },
      { text: language.item || 'ITEM', style: 'tableHeader' },
      { text: language.QTY || 'QTY', style: 'tableHeader', noWrap: true },
      { text: language.unitPrice || 'UNIT PRICE', style: 'tableHeader', noWrap: true, alignment: 'right' },
    ];

    const showTaxColumn = settings?.templateSettings?.taxes?.taxEachProduct === 'true';
    if (showTaxColumn) {
      headers.push({ text: language.tax || 'TAX', style: 'tableHeader', alignment: 'right' });
    }

    if (settings?.showItemTotal) {
      headers.push({ text: language.total || 'TOTAL', style: 'tableHeader', alignment: 'right' });
    }


    const rows = [headers];

    const itemsArray = Array.isArray(lineItems) ? lineItems : [];

    for (const [index, item] of itemsArray.entries()) {

      const itemImage = item?.product?.featuredMedia?.file?.image?.originalSrc ?? 'public/images/no-image.png';
      const itemImageBase64 = settings?.showImage ? await convertUrlToBase64(itemImage) : '';

      const price = parseFloat(item.price || 0);
      const quantity = item.quantity || 0;
      const totalDiscount = parseFloat(item.totalDiscount || 0);
      const totalPrice = price * quantity;
      const totalPriceWithDiscount = totalPrice - totalDiscount;
      const taxValue = typeof item.tax === 'string' && item.tax.includes('%')
        ? item.tax
        : formatCurrency(item.tax || 0, currency);

      const currencyCode = item.currencyCode || currency || 'USD';

      const showDiscountAppliedOriginalPrice = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === false);
      const hideDiscountZero = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === true && totalDiscount > 0);


      // Build price cell content
      const unitPriceCell = [];
      if ((showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero) {
        unitPriceCell.push({
          text: formatCurrency(price, currencyCode),
          decoration: 'lineThrough',
          margin: [0, 0, 0, 2]
        });
      }

      unitPriceCell.push({
        text: formatCurrency(price - totalDiscount, currencyCode),
        margin: [0, 0, 0, 2]
      });

      if (showDiscountAppliedOriginalPrice || hideDiscountZero) {
        unitPriceCell.push({
          text: `(Discount ${formatCurrency(totalDiscount, currencyCode)})`,
          fontSize: 10
        });
      }

      const row = [
        { text: (index + 1).toString(), style: 'tableCell' },
        settings?.showImage ?
          // ✅ If showImage is true, use columns (image + text)
          {
            columns: [
              {
                width: "auto",
                stack: [
                  itemImageBase64 ? {
                    image: itemImageBase64,
                    width: 40,
                    height: 40,
                  } : {
                    text: '',
                    margin: [0, 0, 0, 0]
                  }
                ]
              },
              {
                width: '*',
                stack: [
                  {
                    text: item?.title || item?.name || 'Unknown Item',
                    style: 'itemTitle'
                  },
                  ...(item?.variantTitle || item?.description ? [
                    {
                      text: item?.variantTitle || item?.description,
                      style: 'itemDescription',
                    }
                  ] : []),

                  {
                    margin: [0, 3, 0, 0],
                    stack: [
                      ...(settings?.showSku && item?.variant?.sku ? [
                        { text: `${language?.SKU || "SKU:"} ${item.variant.sku}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showBarcode && item?.variant?.barcode ? [
                        { text: `${language?.barcode || "BARCODE:"} ${item.variant.barcode}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin ? [
                        { text: `${language?.countryOfOrigin || "Country Of Origin:"} ${item.variant.inventoryItem.countryCodeOfOrigin}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode ? [
                        { text: `${language?.hsCode || "HS Code:"} ${item.variant.inventoryItem.harmonizedSystemCode}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showWeight && item?.variant?.inventoryItem?.weightValue ? [
                        {
                          text: `${language?.weight || "Weight:"} ${item.variant.inventoryItem.weightValue || 0} ${item.variant.inventoryItem.weightUnit || "lb"}`,
                          style: 'itemDescription'
                        }
                      ] : [])
                    ]
                  }
                ]
              }
            ],
            style: 'tableCell',
            margin: [0, 10, 0, 10],
            columnGap: 10
          }
          :
          // ❌ If showImage is false, show only the text stack
          {
            stack: [
              {
                text: item?.title || item?.name || 'Unknown Item',
                style: 'itemTitle'
              },
              ...(item?.variantTitle || item?.description ? [
                {
                  text: item?.variantTitle || item?.description,
                  style: 'itemDescription',
                }
              ] : []),

              {
                margin: [0, 3, 0, 0],
                stack: [
                  ...(settings?.showSku && item?.variant?.sku ? [
                    { text: `${language?.SKU || "SKU:"} ${item.variant.sku}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showBarcode && item?.variant?.barcode ? [
                    { text: `${language?.barcode || "BARCODE:"} ${item.variant.barcode}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin ? [
                    { text: `${language?.countryOfOrigin || "Country Of Origin:"} ${item.variant.inventoryItem.countryCodeOfOrigin}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode ? [
                    { text: `${language?.hsCode || "HS Code:"} ${item.variant.inventoryItem.harmonizedSystemCode}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showWeight && item?.variant?.inventoryItem?.weightValue ? [
                    {
                      text: `${language?.weight || "Weight:"} ${item.variant.inventoryItem.weightValue || 0} ${item.variant.inventoryItem.weightUnit || "lb"}`,
                      style: 'itemDescription'
                    }
                  ] : [])
                ]
              }
            ],
            style: 'tableCell',
            margin: [0, 10, 0, 10]
          },

        // Other cells in the row
        { text: quantity.toString(), style: 'tableCell' },
        { stack: unitPriceCell, style: 'tableCell', alignment: 'right' },
      ];


      if (showTaxColumn) {
        row.push({ text: taxValue, style: 'tableCell', alignment: 'right' });
      }

      if (settings?.showItemTotal) {
        row.push({ text: formatCurrency(totalPriceWithDiscount, currencyCode), style: 'tableCell', alignment: 'right' });
      }


      rows.push(row);
    };

    // Fallback row if no items
    if (rows.length === 1) {
      const fallback = [
        { text: '-', style: 'tableCell' },
        { text: 'No items', style: 'tableCell' },
        { text: '0', style: 'tableCell' },
        { text: formatCurrency(0, currency), style: 'tableCell' },
      ];

      if (showTaxColumn) {
        fallback.push({ text: formatCurrency(0, currency), style: 'tableCell' });
      }
      if (settings?.showItemTotal) {
        fallback.push({ text: formatCurrency(0, currency), style: 'tableCell' });
      }

      rows.push(fallback);
    }

    return {
      table: {
        widths: (showTaxColumn && settings?.showItemTotal)
          ? ['auto', '*', 'auto', 'auto', 'auto', 'auto']
          : (showTaxColumn || settings?.showItemTotal)
            ? ['auto', '*', 'auto', 'auto', 'auto']
            : ['auto', '*', 'auto', 'auto'],
        body: rows
      },
      layout: {
        fillColor: function (rowIndex) {
          return rowIndex === 0 ? secondaryColor : null;
        },
        hLineWidth: function (i, node) {
          return i === 0 || i === node.table.body.length ? 0 : 1;
        },
        vLineWidth: function () { return 0; },
        hLineColor: function () { return '#eee'; }
      },
      margin: [20, 10, 20, 0]
    };
  };

  // Generate totals section
  const generateTotalsSection = () => {
    const totalsData = [];

    // Subtotal
    totalsData.push([
      { text: `${language.subtotal || 'Subtotal'}${settings?.showTotalQuantity ? ` (${totalItems} Items):` : ':'}`, style: 'totalLabel' },
      { text: formatCurrency(subtotal, currency, showCurrencyCode), style: 'totalValue' }
    ]);


    // Discount
    if ((settings?.templateSettings?.discount?.hideDiscountTotalPriceZero === true && order?.totalDiscounts > 0) ||
      settings?.templateSettings?.discount?.hideDiscountTotalPriceZero !== true
    ) {
      totalsData.push([
        { text: `${language.discount || 'Discount'}:`, style: 'totalLabel' },
        { text: `-${formatCurrency(order?.totalDiscounts, currency, showCurrencyCode)}`, style: 'totalValue' }
      ]);
    }

    // Subtotal after discount
    if (settings?.templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalDiscounts > 0) {
      totalsData.push([
        { text: `${language.subtotalAfterDiscount || 'Subtotal after discount'}:`, style: 'totalLabel' },
        { text: formatCurrency(subtotal - parseFloat(discountCodeAmount), currency, showCurrencyCode), style: 'totalValue' }
      ]);
    }

    // Tax
    if (settings?.templateSettings?.taxes?.taxHideZero !== true && tax !== 0) {
      totalsData.push([
        { text: `${language.tax || 'Tax'}:`, style: 'totalLabel' },
        { text: formatCurrency(tax, currency, showCurrencyCode), style: 'totalValue' }
      ]);
    }

    // Shipping
    const shippingLabel = settings?.templateSettings?.shipping?.showShippingMethod == true ?
      `${language.shipping || 'Shipping'} ${shippingLines.length > 0 ? `(${shippingLines[0]?.title || ''})` : ''}:` :
      `${language.shipping || 'Shipping'}:`;

    totalsData.push([
      { text: shippingLabel, style: 'totalLabel' },
      { text: formatCurrency(totalShipping, currency, showCurrencyCode), style: 'totalValue' }
    ]);

    // Total
    totalsData.push([
      { text: `${language.total || 'Total'}:`, style: 'totalLabelBold' },
      { text: formatCurrency(total, currency, showCurrencyCode), style: 'totalValueBold' }
    ]);

    return {
      table: {
        widths: ['*', 'auto'],
        body: totalsData
      },
      layout: {
        vLineWidth: function () { return 0; },
        hLineColor: function () { return '#eee'; }
      },
      margin: [20, 10, 20, 0]
    };
  };

  const termConditionContent = getHtmlToPdfMakeObj(language?.termConditionContent || "")
  var dd = {
    background: [
      {
        canvas: [
          {
            type: 'rect',
            x: 20,
            y: 20,
            w: isA4PaperSize ? 555 : 572, // A4 width (595) - 40 (20px margin on each side)
            h: isA4PaperSize ? 802 : 752, // A4 height (842) - 40 (20px margin on each side)
            lineWidth: 1,
            lineColor: "#ddd",
          }
        ]
      }
    ],
    content: [
      {
        table: {
          widths: ['auto', '*'],
          body: [
            [
              {
                stack: [
                  logoUrl ?
                    { image: logoUrl, width: 80, height: 80 } :
                    {
                      table: {
                        body: [
                          [{
                            text: settings.brandName || companyName,
                            style: 'logoText',
                            border: [true, true, true, true], // [left, top, right, bottom]
                            margin: [10, 5, 10, 5] // [left, top, right, bottom] padding
                          }]
                        ]
                      },
                      layout: {
                        defaultBorder: false,
                        hLineWidth: function (i, node) {
                          return 1; // Border thickness
                        },
                        vLineWidth: function (i, node) {
                          return 1; // Border thickness
                        },
                        hLineColor: function (i, node) {
                          return settings.primaryTextColor || '#fff'; // Border color (white in your case)
                        },
                        vLineColor: function (i, node) {
                          return settings.primaryTextColor || '#fff'; // Border color
                        }
                      }
                    }
                ],
                border: [false, false, false, false],
                margin: logoUrl ? [20, settings?.templateSettings?.taxes?.taxNumber ? 21 : 20, 10, 20] : [20, settings?.templateSettings?.taxes?.taxNumber ? 39 : 30, 10, 20]
              },
              {
                stack: [
                  { text: companyName, style: 'companyAddress' },
                  { text: companyAddressComponents.join('\n'), style: 'companyAddress' },
                  { text: settings?.templateSettings?.taxes?.taxNumber || '', style: 'companyAddress' }
                ],
                alignment: 'right',
                border: [false, false, false, false],
                margin: [10, 20, 20, 20]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: function () { return 0; },
          vLineWidth: function () { return 0; },
          fillColor: function () { return primaryColor; }
        },
      },
      {
        columns: [
          {
            stack: [
              { text: language?.shippingAddress || 'Shipping Address', style: 'sectionHeader' },
              { text: shippingAddressComponents.join('\n'), style: 'addressText' }
            ],
            width: '*'
          },
          {
            stack: [
              { text: language?.billingAddress || 'Billing Address', style: 'sectionHeader' },
              { text: billingAddressComponents.join('\n'), style: 'addressText' }
            ],
            width: '*'
          }
          ,
        ],
        margin: [20, 20, 0, 0]
      },
      {
        table: {
          widths: ['auto'], // Important for centering!
          body: [
            [
              {
                stack: [
                  // Rounded rectangle background
                  {
                    canvas: [
                      {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: 515,  // Adjust width
                        h: 60,   // Adjust height
                        r: 10,
                        color: secondaryColor,
                        lineColor: secondaryColor
                      }
                    ],
                    margin: [20, 0, 0, -60] // Prevents extra space below
                  },
                  // Table content over canvas
                  {
                    table: {
                      widths: ['*', '*'],
                      body: [
                        [
                          {
                            stack: [
                              { text: language.invoice || 'INVOICE', style: 'metaTitle' },
                              { text: `#${invoiceNumber}`, style: 'metaValue' }
                            ],
                            alignment: 'center',
                            margin: [10, 10, 0, 10],
                            border: [false, false, true, false],// This centers the stack inside the cell
                          },
                          {
                            stack: [
                              { text: language.invoiceDate || 'INVOICE DATE', style: 'metaTitle' },
                              { text: invoiceDate, style: 'metaValue' }
                            ],
                            alignment: 'center',
                            margin: [10, 10, 0, 10],
                            border: [false, false, false, false]
                          }
                        ]
                      ]
                    },
                    layout: {

                      vLineColor: function () { return '#ffffff'; }
                    },
                  }
                ],
                alignment: 'center'

              }
            ]
          ]
        },
        layout: 'noBorders',
        alignment: 'center',
        margin: [10, 20, 10, 5]
      },

      // Line items table
      await generateLineItemsTable(),
      generateTotalsSection(),

      ...(settings?.showPaymentDetails ? [
        {
          margin: [20, 20, 20, 0],
          stack: [
            {
              text: language?.paymentDetails || "Payment Details:",
              style: "bodySectionHeader",
            },
            {
              columns: [
                // Gateway section
                ...(settings?.showPaymentGateway && transactionData?.gateway ? [
                  { text: language?.paymentGateway || "Gateway:", style: "label", width: 'auto' },
                  { text: transactionData.gateway, style: "value", width: 'auto', margin: [0, 0, 10, 0] }
                ] : []),

                // Card Type section
                ...(settings?.showCardType && transactionData?.paymentDetails?.company ? [
                  { text: language?.cardType || "Card:", style: "label", width: 'auto' },
                  { text: transactionData.paymentDetails.company, style: "value", width: 'auto', margin: [0, 0, 10, 0], noWrap: true }
                ] : []),

                // Card Number section
                ...(settings?.showCardLastDigit && transactionData?.paymentDetails?.number ? [
                  { text: language?.cardNumber || "Card#:", style: "label", width: 'auto' },
                  { text: transactionData.paymentDetails.number, style: "value", width: 'auto', }
                ] : [])
              ],
              columnGap: 2
            }
          ]
        }
      ] : []),

      ...(settings?.showOrderNote && order?.note ? [
        {
          margin: [20, 20, 20, 0],
          stack: [
            {
              text: language?.notes || "Notes:",
              style: "bodySectionHeader"

            },
            {
              text: order.note,
              style: "value"
            }
          ]
        }
      ] : []),
      ...(language?.termConditionContent ? [{
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: termConditionContent,
                style: 'footer',
                border: [false, false, false, false], // Only top border
                margin: [20, 20, 20, 0],
              }
            ]
          ]
        },
        layout: {
          vLineWidth: function () { return 0; },
          hLineColor: function () { return "#eee"; }
        }
      }] : []),
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: `${language.paymentInfo || 'Make all Checks payable to:'} ${companyName}.`,
                style: 'paymentInfo',
                alignment: 'center',
                border: [false, true, false, false], // Only top border
                margin: [0, 20, 0, 0]
              }
            ]
          ]
        },
        layout: {
          vLineWidth: function () { return 0; },
          hLineColor: function () { return "#eee"; },
        },
        margin: [0, 20, 0, 0]
      },
      {
        text: language.thankYouNote || 'THANK YOU FOR YOUR BUSINESS!',
        style: 'thankYou',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: [
                  companyName,
                  settings?.phone ? ' | ' : '',
                  settings?.phone ? `${language.phone || 'Phone'}: ` : '',
                  settings?.phone ? {
                    text: settings.phone,
                    decoration: 'underline'
                  } : '',
                  settings?.companyWebsite ? ' | ' : '',
                  settings?.companyWebsite ? {
                    text: settings.companyWebsite,
                    decoration: 'underline'
                  } : ''
                ],
                style: 'footer',
                alignment: 'center',
                border: [false, true, false, true], // Only top border
                margin: [0, 15, 0, 15]
              }
            ]
          ]
        },
        layout: {
          vLineWidth: function () { return 0; },
          hLineColor: function () { return "#eee"; },

        },

      },
    ],
    styles: {
      itemDescription: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
      },
      logoText: {
        fontSize: 25,
        bold: true,
        color: settings.primaryTextColor || '#fff',
        characterSpacing: 1,
        margin: [0, 30, 20, 20]
      },
      companyName: {
        fontSize: 16,
        bold: true,
        color: settings.primaryTextColor || '#fff'
      },
      companyAddress: {
        fontSize: 14,
        color: settings.primaryTextColor || '#fff',
        lineHeight: 1
      },
      sectionHeader: {
        font: headingFont,
        fontSize: 18,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 0, 0, 5]
      },
      bodySectionHeader: {
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 0, 0, 5]
      },
      addressText: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        lineHeight: 1
      },
      // Meta section styles
      metaTitle: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000'
      },
      metaValue: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 3, 0, 0]
      },

      // Table styles
      tableHeader: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        background: secondaryColor,
        margin: [10, 10, 10, 10]
      },
      tableCell: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [10, 12],
        justify: 'center'
      },
      // Totals styles
      totalLabel: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [10, 5, 10, 5]
      },
      totalValue: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        alignment: 'right',
        margin: [10, 5, 10, 5]
      },
      totalLabelBold: {
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [10, 5, 10, 5]
      },
      totalValueBold: {
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        alignment: 'right',
        margin: [10, 5, 10, 5]
      },
      // Payment and footer styles
      paymentInfo: {
        fontSize: 18,
        color: settings.invoiceTextColor || '#000',
        lineHeight: 1.4,
        characterSpacing: 0.4
      },
      thankYou: {
        font: headingFont,
        fontSize: 20,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        characterSpacing: 0.4
      },
      footer: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000'
      },
      label: {

        bold: true,
        color: settings.invoiceTextColor || '#000'
      },
      value: {
        color: settings.invoiceTextColor || '#000'
      }
    },

    defaultStyle: {
      font: bodyFont, // pdfMake default font
      fontSize: 14,
      color: settings.invoiceTextColor || '#000'
    },
    pageMargins: [20, 20, 20, 20],
    pageSize: paperSize

  }
  return dd;
};

const generateInvoiceTemplate2 = async (data) => {
  const { invoice, order, settings, language, transactionData } = data;

  const invoiceNumber = invoice?.invoiceNumber || '';
  const invoiceDate = formatDate(invoice?.createdAt || new Date(), settings?.date_format || 'MM/dd/yyyy');

  const brandName = settings?.brandName || ""
  const companyName = settings?.businessName || '';
  const subtotal = order?.subtotalPrice || 0;
  const discountCodes = order?.discountCodes;
  const discountCodeAmount = discountCodes.reduce((sum, item) => {
    return sum + parseFloat(item.amount);
  }, 0);
  const tax = order?.totalTax || 0;
  const totalShipping = order?.totalShipping || 0;
  const total = order?.totalPrice || 0;
  const currency = order?.currency || 'USD';
  const lineItems = order.lineItems?.edges?.map(edge => edge.node) || [];
  const shippingLines = order.shippingLines?.edges?.map(edge => edge.node) || [];

  const logoUrl = await convertUrlToBase64(settings?.logoUrl || '');
  const primaryColor = settings?.primaryColor || '#8257d0';
  const secondaryColor = settings?.secondaryColor || '#f0ecf9';

  const showCurrencyCode = settings?.showCurrencyCode || false
  const totalItems = lineItems?.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const bodyFont = formatFontName(settings?.bodyFont || "Open Sans");
  const headingFont = formatFontName(settings?.headingFont || "Roboto");

  // Address formatting
  const companyAddressComponents = [
    settings.street || '',
    `${settings.apartment ? settings.apartment + ', ' : ''} ${settings.city || ''}`,
    `${settings.state ? settings.state + ', ' : ''} ${settings.country ? settings.country + ', ' : ''} ${settings.zipCode || ''}`,
  ].filter(component => component && component.trim() !== '');

  const shippingAddressComponents = [
    order.shippingAddress.name || '',
    `${order.shippingAddress.address1 ? order.shippingAddress.address1 + ', ' : ''} ${order.shippingAddress.address2 || ''}`,
    `${order.billingAddress.city ? order.billingAddress.city + ', ' : ''} ${order.shippingAddress.province ? order.shippingAddress.province + ', ' : ''} ${order.shippingAddress.country ? order.shippingAddress.country + ', ' : ''}`,
    order.shippingAddress.zip || '',
    order.shippingAddress.phone,
  ].filter(component => component && component.trim() !== '');

  const billingAddressComponents = [
    order.billingAddress.name || '',
    `${order.billingAddress.address1 ? order.billingAddress.address1 + ', ' : ''} ${order.billingAddress.address2 || ''}`,
    `${order.billingAddress.city ? order.billingAddress.city + ', ' : ''} ${order.billingAddress.province ? order.billingAddress.province + ', ' : ''} ${order.billingAddress.country ? order.billingAddress.country + ', ' : ''}`,
    order.billingAddress.zip || '',
    order.shippingAddress.phone,
  ].filter(component => component && component.trim() !== '');

  // Generate line items for table
  const generateLineItemsTable = async () => {
    const headers = [

      { text: language.item || 'ITEM', style: 'tableHeader' },
      { text: language.QTY || 'QTY', style: 'tableHeader' },
      { text: language.unitPrice || 'UNIT PRICE', style: 'tablePriceHeader' },
    ];

    const showTaxColumn = settings?.templateSettings?.taxes?.taxEachProduct === 'true';
    if (showTaxColumn) {
      headers.push({ text: language.tax || 'TAX', style: 'tablePriceHeader' });
    }
    if (settings?.showItemTotal) {
      headers.push({ text: language.total || 'TOTAL', style: 'tablePriceHeader' });
    }

    const rows = [headers];
    const templateSettings = settings?.templateSettings || {};
    const itemsArray = Array.isArray(lineItems) ? lineItems : [];
    for (const item of itemsArray) {
      const itemImage = item?.product?.featuredMedia?.file?.image?.originalSrc ?? 'public/images/no-image.png';
      const itemImageBase64 = settings?.showImage ? await convertUrlToBase64(itemImage) : '';

      const price = parseFloat(item.price || 0);
      const quantity = item.quantity || 0;
      const totalDiscount = parseFloat(item.totalDiscount || 0);
      const totalPrice = price * quantity;
      const totalPriceWithDiscount = totalPrice - totalDiscount;
      const taxValue = typeof item.tax === 'string' && item.tax.includes('%')
        ? item.tax
        : formatCurrency(item.tax || 0, currency);

      const currencyCode = item.currencyCode || currency || 'USD';

      const showDiscountAppliedOriginalPrice = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === false);
      const hideDiscountZero = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === true && totalDiscount > 0);

      // Build price cell content
      const unitPriceCell = [];

      if ((showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero) {
        unitPriceCell.push({
          text: formatCurrency(price, currencyCode),
          decoration: 'lineThrough',
          margin: [0, 0, 0, 2]
        });
      }

      unitPriceCell.push({
        text: formatCurrency(price - totalDiscount, currencyCode),
        margin: [0, 0, 0, 2]
      });

      if (showDiscountAppliedOriginalPrice || hideDiscountZero) {
        unitPriceCell.push({
          text: `(Discount ${formatCurrency(totalDiscount, currencyCode)})`,
          fontSize: 10
        });
      }


      const row = [
        settings?.showImage ?
          // ✅ If showImage is true, use columns (image + text)
          {
            columns: [
              {
                width: "auto",
                stack: [
                  itemImageBase64 ? {
                    image: itemImageBase64,
                    width: 40,
                    height: 40,
                  } : {
                    text: '',
                    margin: [0, 0, 0, 0]
                  }
                ]
              },
              {
                width: '*',
                stack: [
                  { text: item?.title || item?.name || 'Unknown Item', bold: true },
                  item?.variantTitle || item?.description ? { text: item?.variantTitle || item?.description, fontSize: 10 } : {},
                  {
                    margin: [0, 3, 0, 0],
                    stack: [
                      ...(settings?.showSku && item?.variant?.sku ? [
                        { text: `${language?.SKU || "SKU:"} ${item.variant.sku}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showBarcode && item?.variant?.barcode ? [
                        { text: `${language?.barcode || "BARCODE:"} ${item.variant.barcode}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin ? [
                        { text: `${language?.countryOfOrigin || "Country Of Origin:"} ${item.variant.inventoryItem.countryCodeOfOrigin}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode ? [
                        { text: `${language?.hsCode || "HS Code:"} ${item.variant.inventoryItem.harmonizedSystemCode}`, style: 'itemDescription' }
                      ] : []),

                      ...(settings?.showWeight && item?.variant?.inventoryItem?.weightValue ? [
                        {
                          text: `${language?.weight || "Weight:"} ${item.variant.inventoryItem.weightValue || 0} ${item.variant.inventoryItem.weightUnit || "lb"}`,
                          style: 'itemDescription'
                        }
                      ] : [])
                    ]
                  }
                ]
              }
            ],
            style: 'tableCell',
            columnGap: 10
          }
          :
          // ❌ If showImage is false, show only the text stack
          {
            stack: [
              { text: item?.title || item?.name || 'Unknown Item', bold: true },
              item?.variantTitle || item?.description ? { text: item?.variantTitle || item?.description, fontSize: 10 } : {},
              {
                margin: [0, 3, 0, 0],
                stack: [
                  ...(settings?.showSku && item?.variant?.sku ? [
                    { text: `${language?.SKU || "SKU:"} ${item.variant.sku}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showBarcode && item?.variant?.barcode ? [
                    { text: `${language?.barcode || "BARCODE:"} ${item.variant.barcode}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin ? [
                    { text: `${language?.countryOfOrigin || "Country Of Origin:"} ${item.variant.inventoryItem.countryCodeOfOrigin}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode ? [
                    { text: `${language?.hsCode || "HS Code:"} ${item.variant.inventoryItem.harmonizedSystemCode}`, style: 'itemDescription' }
                  ] : []),

                  ...(settings?.showWeight && item?.variant?.inventoryItem?.weightValue ? [
                    {
                      text: `${language?.weight || "Weight:"} ${item.variant.inventoryItem.weightValue || 0} ${item.variant.inventoryItem.weightUnit || "lb"}`,
                      style: 'itemDescription'
                    }
                  ] : [])
                ]
              }
            ],
            style: 'tableCell'
          },

        // Other cells in the row
        { text: quantity.toString(), style: 'tableCell' },
        { stack: unitPriceCell, style: 'tableUnitPriceCell' }
      ];


      if (showTaxColumn) {
        row.push({ text: taxValue, style: 'tablePriceCell' });
      }
      if (settings?.showItemTotal) {
        row.push({ text: formatCurrency(totalPriceWithDiscount, currencyCode), style: 'tablePriceCell' });
      }

      rows.push(row);
    };

    // Fallback row if no items
    if (rows.length === 1) {
      const fallback = [
        { text: 'No items', style: 'tableCell' },
        { text: '0', style: 'tableCell' },
        { text: formatCurrency(0, currency), style: 'tableUnitPriceCell' },
      ];

      if (showTaxColumn) {
        fallback.push({ text: formatCurrency(0, currency), style: 'tablePriceCell' });
      }
      if (settings?.showItemTotal) {
        fallback.push({ text: formatCurrency(0, currency), style: 'tablePriceCell' });
      }

      rows.push(fallback);
    }

    return {
      table: {
        widths: (showTaxColumn && settings?.showItemTotal)
          ? ['*', 50, 'auto', 'auto', 'auto']
          : (showTaxColumn || settings?.showItemTotal)
            ? ['*', 50, 'auto', 'auto']
            : ['*', 50, 'auto'],
        body: rows,

      },
      layout: {
        hLineWidth: function (i, node) {
          return i === 0 || i === node.table.body.length || i === 1 ? 1 : 0
        },

        vLineWidth: function () { return 0; },
        hLineColor: function () { return '#eee' },
      },
      margin: [0, 30, 0, 20]
    };
  };

  // Generate totals section
  const generateTotalsSection = () => {
    const totalsData = [];

    // Subtotal 
    totalsData.push([
      { text: `${language.subtotal || 'Subtotal'} ${settings?.showTotalQuantity ? `(${totalItems} Items) ` : ''}`, style: 'totalLabel' },
      { text: formatCurrency(subtotal, currency, showCurrencyCode), style: 'totalValue' }
    ]);

    // Discount 
    if ((settings?.templateSettings?.discount?.hideDiscountTotalPriceZero === true && order?.totalDiscounts > 0) ||
      settings?.templateSettings?.discount?.hideDiscountTotalPriceZero !== true
    ) {
      totalsData.push([
        { text: `${language.discount || 'Discount'}`, style: 'totalLabel' },
        { text: `-${formatCurrency(order?.totalDiscounts, currency, showCurrencyCode)}`, style: 'totalValue' }
      ]);
    }

    // Subtotal after discount 
    if (settings?.templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalDiscounts > 0) {
      totalsData.push([
        { text: `${language.subtotalAfterDiscount || 'Subtotal after discount'}`, style: 'totalLabel' },
        { text: formatCurrency(subtotal - parseFloat(discountCodeAmount), currency, showCurrencyCode), style: 'totalValue' }
      ]);
    }

    // Tax 
    if (settings?.templateSettings?.taxes?.taxHideZero !== true && tax !== 0) {
      totalsData.push([
        { text: `${language.tax || 'Tax'}`, style: 'totalLabel' },
        { text: formatCurrency(tax, currency, showCurrencyCode), style: 'totalValue' }
      ]);
    }

    // Shipping 
    const shippingLabel = settings?.templateSettings?.shipping?.showShippingMethod == true ?
      `${language.shipping || 'Shipping'} ${shippingLines.length > 0 ? `(${shippingLines[0]?.title || ''})` : ''}` :
      `${language.shipping || 'Shipping'}`;

    totalsData.push([
      { text: shippingLabel, style: 'totalLabel' },
      { text: formatCurrency(totalShipping, currency, showCurrencyCode), style: 'totalValue' }
    ]);

    // Total 
    totalsData.push([
      { text: `${language.total || 'Total'}`, style: 'totalLabelBold' },
      { text: formatCurrency(total, currency, showCurrencyCode), style: 'totalValueBold' }
    ]);

    // Method 1: Using columns layout
    return {
      columns: [
        // Empty left column to push content right
        { width: '*', text: '' },
        // Right column with totals table
        {
          width: 'auto',
          table: {
            widths: ['auto', 'auto'], // Adjust widths as needed
            body: totalsData
          },
          layout: {
            vLineWidth: function () { return 0; },
            hLineWidth: function (i, node) {
              return i === node.table.body.length - 1 ? 1 : 0
            },
            hLineColor: function () { return '#eee'; },
          }
        }
      ],
      margin: [10, 10, 0, 0],
    };
  };

  const paperSize = settings?.paperSize || "A4"
  const isA4PaperSize = paperSize == "A4"
  const svgWidth = isA4PaperSize ? 515 : 532;


  const termConditionContent = getHtmlToPdfMakeObj(language?.termConditionContent || "")

  var dd = {
    background: [
      {
        canvas: [
          {
            type: 'rect',
            x: 20,
            y: 20,
            w: isA4PaperSize ? 555 : 572, // A4 width (595) - 40 (20px margin on each side)
            h: isA4PaperSize ? 802 : 752, // A4 height (842) - 40 (20px margin on each side)

            color: secondaryColor
          }
        ]
      }
    ],
    content: [
      {
        table: {
          widths: ['auto', '*'],
          body: [
            [
              {
                stack: [
                  { text: brandName, style: 'brandName', },
                  { text: settings?.supportEmail, style: 'companyAddress', decoration: 'underline' },
                  { text: settings?.phone || '', style: 'companyAddress', decoration: 'underline' },
                ],

                border: [false, false, false, false],

              },
              {
                stack: [
                  { text: companyName, style: 'companyAddress' },
                  { text: companyAddressComponents.join('\n'), style: 'companyAddress' },
                  { text: settings?.phone || '', style: 'companyAddress' },
                  { text: settings?.templateSettings?.taxes?.taxNumber || '', style: 'companyAddress' }
                ],
                alignment: 'right',
                border: [false, false, false, false],
              }
            ]
          ]
        },
        margin: [29, 0, 29, 30]
      },
      {
        table: {
          widths: ['*'],
          body: [
            // First row - Top rounded corner SVG
            [
              {
                svg: `<svg width="${svgWidth}" height="20" viewBox="0 0 ${svgWidth} 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="
                        M0 20 
                        H${svgWidth} 
                        V8 
                        A12 12 0 0 0 ${svgWidth - 12} 0 
                        H12 
                        A12 12 0 0 0 0 8 
                        V20 
                        Z" 
                        fill="#ffffff" />
                    </svg>
                    `,
                width: svgWidth,
                height: 20,
                border: [false, false, false, false],
                margin: [0, 0, 0, 0]
              }
            ],
            [
              {
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        stack: [
                          {
                            table: {
                              widths: ['*'],
                              body: [
                                [
                                  {
                                    stack: [
                                      {
                                        table: {
                                          widths: ['*', '*'],
                                          body: [
                                            [
                                              {
                                                stack: [
                                                  { text: language.invoiceDate || 'INVOICE DATE', style: 'metaTitle' },
                                                  { text: invoiceDate, style: 'metaValue' }

                                                ],
                                                border: [false, false, false, false]
                                              },
                                              {
                                                stack: [
                                                  { text: language.invoice || 'INVOICE', style: 'metaTitle' },
                                                  { text: `#${invoiceNumber}`, style: 'metaValue' }
                                                ],
                                                alignment: 'right',
                                                border: [false, false, false, false]
                                              }
                                            ]
                                          ]
                                        },
                                        margin: [0, 0, 0, 20],
                                        border: [false, false, false, false]
                                      },
                                      {
                                        table: {
                                          widths: ['*', '*'],
                                          body: [
                                            [
                                              {
                                                stack: [
                                                  { text: language?.shippingAddress || 'Shipping Address', style: 'metaTitle' },
                                                  { text: shippingAddressComponents.join('\n'), style: 'metaValue' }

                                                ],
                                                border: [false, false, false, false]
                                              },
                                              {
                                                stack: [
                                                  { text: language?.billingAddress || 'Billing Address', style: 'metaTitle' },
                                                  { text: billingAddressComponents.join('\n'), style: 'metaValue' }
                                                ],
                                                alignment: 'right',
                                                border: [false, false, false, false]
                                              }
                                            ]
                                          ]
                                        },

                                        border: [false, false, false, false]
                                      },
                                      await generateLineItemsTable(),
                                      generateTotalsSection(),
                                      ...(settings?.showPaymentDetails ? [
                                        {
                                          margin: [0, 20, 20, 0],
                                          stack: [
                                            {
                                              text: language?.paymentDetails || "Payment Details:",
                                              style: "metaTitle",
                                              margin: [0, 0, 0, 5]
                                            },
                                            {
                                              columns: [
                                                // Gateway section
                                                ...(settings?.showPaymentGateway && transactionData?.gateway ? [
                                                  { text: language?.paymentGateway || "Gateway:", style: "label", width: 'auto' },
                                                  { text: transactionData.gateway, style: "value", width: 'auto', margin: [0, 0, 10, 0] }
                                                ] : []),

                                                // Card Type section
                                                ...(settings?.showCardType && transactionData?.paymentDetails?.company ? [
                                                  { text: language?.cardType || "Card:", style: "label", width: 'auto' },
                                                  { text: transactionData.paymentDetails.company, style: "value", width: 'auto', noWrap: true, margin: [0, 0, 10, 0] }
                                                ] : []),

                                                // Card Number section
                                                ...(settings?.showCardLastDigit && transactionData?.paymentDetails?.number ? [
                                                  { text: language?.cardNumber || "Card#:", style: "label", width: 'auto' },
                                                  { text: transactionData.paymentDetails.number, style: "value", width: 'auto' }
                                                ] : [])
                                              ],
                                              columnGap: 2
                                            }
                                          ]
                                        }
                                      ] : []),

                                      ...(settings?.showOrderNote && order?.note ? [
                                        {
                                          margin: [0, 20, 20, 0],
                                          stack: [
                                            {
                                              text: language?.notes || "Notes:",
                                              style: "metaTitle",
                                              margin: [0, 0, 0, 5]
                                            },
                                            {
                                              text: order.note,
                                              style: "value"
                                            }
                                          ]
                                        }
                                      ] : []),
                                      {
                                        table: {
                                          widths: ['*', 'auto'],
                                          body: [
                                            [
                                              {
                                                stack: [
                                                  { text: `${language.paymentInfo || 'Make all Checks payable to:'} ${companyName}.`, style: 'paymentInfo' },
                                                  { text: language.thankYouNote || 'THANK YOU FOR YOUR BUSINESS!', style: 'thankyouTitle' },
                                                ],
                                                border: [false, false, false, false],
                                                margin: logoUrl ? [0, 40, 0, 0] : [0, 0, 0, 0]
                                              },
                                              {
                                                stack: [
                                                  logoUrl ?
                                                    { image: logoUrl, width: 80, height: 80 } :
                                                    {
                                                      table: {
                                                        body: [
                                                          [{
                                                            text: settings.brandName || companyName,
                                                            style: 'logoText',
                                                            bold: false,
                                                            border: [true, true, true, true], // [left, top, right, bottom]
                                                            margin: [10, 5, 10, 5] // [left, top, right, bottom] padding
                                                          }]
                                                        ]
                                                      },
                                                      layout: {
                                                        defaultBorder: false,
                                                        hLineWidth: function (i, node) {
                                                          return 1; // Border thickness
                                                        },
                                                        vLineWidth: function (i, node) {
                                                          return 1; // Border thickness
                                                        },
                                                        hLineColor: function (i, node) {
                                                          return '#FFFFFF'; // Border color (white in your case)
                                                        },
                                                        vLineColor: function (i, node) {
                                                          return '#FFFFFF'; // Border color
                                                        }
                                                      }
                                                    }
                                                ],
                                                alignment: 'right',
                                                border: [false, false, false, false]
                                              }
                                            ]
                                          ]
                                        },
                                        margin: [0, 80, 0, 20],
                                        border: [false, false, false, false]
                                      },
                                    ]
                                  }
                                ]
                              ]
                            },
                            layout: 'noBorders',
                            fillColor: '#ffffff',
                            margin: [0, 0, 0, 0]
                          },

                        ],
                        border: [false, false, false, false],
                        margin: [20, 0, 20, 0]
                      }
                    ]
                  ]
                },
                layout: 'noBorders',
                border: [true, false, true, false],
                borderColor: ['#cc0000', '#cc0000', '#cc0000', '#cc0000'],
                fillColor: '#ffffff',
                margin: [0, 0, 0, 0]
              }
            ],
            [
              {
                svg: `<svg width="${svgWidth}" height="20" viewBox="0 0 ${svgWidth} 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="
                          M0 0 
                          H${svgWidth} 
                          V12 
                          A12 12 0 0 1 ${svgWidth - 12} 20 
                          H12 
                          A12 12 0 0 1 0 12 
                          V0 
                          Z" 
                          fill="#ffffff" />
                      </svg>`,
                width: svgWidth,
                height: 20,
                border: [false, false, false, false],
                margin: [0, 0, 0, 0]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: function () { return 0; },
          vLineWidth: function () { return 0; },
          paddingLeft: function () { return 0; },
          paddingRight: function () { return 0; },
          paddingTop: function () { return 0; },
          paddingBottom: function () { return 0; }
        },
        margin: [20, 0, 20, 0]
      },
      {
        stack: termConditionContent,
        border: [false, false, false, false],
        margin: [30, 40, 20, 20]
      },
    ],
    styles: {
      itemDescription: {
        fontSize: 10,
      },
      condition: {
        fontSize: 12,
        bold: true,
        color: settings.invoiceTextColor || '#000',
      },
      conditionText: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 5, 0, 0]
      },
      logoText: {
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        characterSpacing: 1,
        margin: [0, 30, 20, 20]
      },
      brandName: {
        fontSize: 22,
        bold: true,
        color: settings.primaryTextColor || '#000',
      },
      companyAddress: {
        fontSize: 12,
        margin: [0, 3, 0, 0]
      },
      metaTitle: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: settings.primaryTextColor || '#000',
      },
      thankyouTitle: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 3, 0, 0]
      },
      paymentInfo: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 5, 0, 0]
      },
      metaValue: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 5, 0, 0]
      },
      tableHeader: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: settings.primaryTextColor || '#000',
        margin: [5, 10, 5, 10]
      },
      tableCell: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 10],
        justify: 'center'
      },
      tablePriceHeader: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: settings.primaryTextColor || '#000',
        margin: [5, 10, 5, 10],
        alignment: 'right',
      },
      tablePriceCell: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 10],
        alignment: 'right',
      },
      tableUnitPriceCell: {
        fontSize: 12,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 10],
        alignment: 'right',
        lineHeight: 1.2
      },
      totalLabel: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 10]
      },
      totalValue: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        alignment: 'right',
        margin: [5, 10]
      },
      totalLabelBold: {
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 10]
      },
      totalValueBold: {
        fontSize: 14,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        alignment: 'right',
        margin: [5, 10]
      },
      label: {

        bold: true,
        color: settings.invoiceTextColor || '#000'
      },
      value: {
        color: settings.invoiceTextColor || '#000'
      }
    },

    defaultStyle: {
      font: bodyFont,
      fontSize: 12,
      color: settings.invoiceTextColor || '#000'
    },
    pageMargins: [20, 40, 20, 40], // Increased margins to accommodate border and footer
    pageSize: paperSize

  }
  return dd;
};

const generateInvoiceTemplate3 = async (data) => {
  const { invoice, order, settings, language, transactionData } = data;

  const paperSize = settings?.paperSize || "A4"
  const isA4PaperSize = paperSize == "A4"
  const invoiceNumber = invoice?.invoiceNumber || '';
  const invoiceDate = formatDate(invoice?.createdAt || new Date(), settings?.date_format || 'MM/dd/yyyy');

  const brandName = settings?.brandName || ""
  const companyName = settings?.businessName || '';
  const subtotal = order?.subtotalPrice || 0;
  const discountCodes = order?.discountCodes;
  const discountCodeAmount = discountCodes.reduce((sum, item) => {
    return sum + parseFloat(item.amount);
  }, 0);
  const tax = order?.totalTax || 0;
  const totalShipping = order?.totalShipping || 0;
  const total = order?.totalPrice || 0;
  const currency = order?.currency || 'USD';
  const lineItems = order.lineItems?.edges?.map(edge => edge.node) || [];
  const shippingLines = order.shippingLines?.edges?.map(edge => edge.node) || [];

  const logoUrl = await convertUrlToBase64(settings?.logoUrl || '');
  const primaryColor = settings?.primaryColor || '#8257d0';
  const secondaryColor = settings?.secondaryColor || '#f0ecf9';

  const showCurrencyCode = settings?.showCurrencyCode || false
  const totalItems = lineItems?.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const contactInfo = [
    settings?.phone,
    settings?.phone && settings?.supportEmail ? ' | ' : '',
    settings?.supportEmail
  ].filter(Boolean).join('');


  const bodyFont = formatFontName(settings?.bodyFont || "Open Sans");
  const headingFont = formatFontName(settings?.headingFont || "Roboto");

  // Address formatting
  const companyAddressComponents = [
    settings.street || '',
    `${settings.apartment ? settings.apartment + ', ' : ''} ${settings.city || ''}`,
    `${settings.state ? settings.state + ', ' : ''} ${settings.country ? settings.country + ', ' : ''} ${settings.zipCode || ''}`,
  ].filter(component => component && component.trim() !== '');

  const shippingAddressComponents = [
    order.shippingAddress.name || '',
    `${order.shippingAddress.address1 ? order.shippingAddress.address1 + ', ' : ''} ${order.shippingAddress.address2 || ''}`,
    `${order.billingAddress.city ? order.billingAddress.city + ', ' : ''} ${order.shippingAddress.province ? order.shippingAddress.province + ', ' : ''} ${order.shippingAddress.country ? order.shippingAddress.country + ', ' : ''}`,
    order.shippingAddress.zip || '',
    order.shippingAddress.phone,
  ].filter(component => component && component.trim() !== '');

  const billingAddressComponents = [
    order.billingAddress.name || '',
    `${order.billingAddress.address1 ? order.billingAddress.address1 + ', ' : ''} ${order.billingAddress.address2 || ''}`,
    `${order.billingAddress.city ? order.billingAddress.city + ', ' : ''} ${order.billingAddress.province ? order.billingAddress.province + ', ' : ''} ${order.billingAddress.country ? order.billingAddress.country + ', ' : ''}`,
    order.billingAddress.zip || '',
    order.shippingAddress.phone,
  ].filter(component => component && component.trim() !== '');


  // Generate line items for table
  const generateLineItemsTable = async () => {
    const headers = [

      { text: language.item || 'ITEM', style: 'tableHeader' },
      { text: language.QTY || 'QTY', style: 'tableHeader' },
      { text: language.unitPrice || 'UNIT PRICE', style: 'tablePriceHeader' },
    ];

    const templateSettings = settings?.templateSettings || {};
    const showTaxColumn = settings?.templateSettings?.taxes?.taxEachProduct === 'true1';
    if (showTaxColumn) {
      headers.push({ text: language.tax || 'TAX', style: 'tablePriceHeader' });
    }
    if (settings?.showItemTotal) {
      headers.push({ text: language.total || 'TOTAL', style: 'tablePriceHeader' });
    }

    const rows = [headers];

    const itemsArray = Array.isArray(lineItems) ? lineItems : [];

    for (const item of itemsArray) {

      const itemImage = item?.product?.featuredMedia?.file?.image?.originalSrc ?? 'public/images/no-image.png';
      const itemImageBase64 = settings?.showImage ? await convertUrlToBase64(itemImage) : '';

      const price = parseFloat(item.price || 0);
      const quantity = item.quantity || 0;
      const totalDiscount = parseFloat(item.totalDiscount || 0);
      const totalPrice = price * quantity;
      const totalPriceWithDiscount = totalPrice - totalDiscount;
      const currencyCode = item.currencyCode || currency || 'USD';
      const taxValue = typeof item.tax === 'string' && item.tax.includes('%')
        ? item.tax
        : formatCurrency(item.tax || 0, currency);

      const showDiscountAppliedOriginalPrice = (
        templateSettings?.discount?.showDiscountAppliedOriginalPrice === true &&
        templateSettings?.discount?.hideDiscountZero === false
      );
      const hideDiscountZero = (
        templateSettings?.discount?.showDiscountAppliedOriginalPrice === true &&
        templateSettings?.discount?.hideDiscountZero === true &&
        totalDiscount > 0
      );

      const shouldShowDiscount = (
        (templateSettings?.discount?.hideDiscountTotalPriceZero === true && totalDiscount > 0) ||
        templateSettings?.discount?.hideDiscountTotalPriceZero !== true
      );

      // Build price cell content
      const unitPriceCell = [];

      if (shouldShowDiscount && showDiscountAppliedOriginalPrice) {
        unitPriceCell.push({
          text: formatCurrency(price, currencyCode),
          decoration: 'lineThrough',
          margin: [0, 0, 0, 2]
        });
      }

      unitPriceCell.push({
        text: formatCurrency(price - totalDiscount, currencyCode),
        margin: [0, 0, 0, 2]
      });

      if (shouldShowDiscount && (showDiscountAppliedOriginalPrice || hideDiscountZero)) {
        unitPriceCell.push({
          text: `(Discount ${formatCurrency(totalDiscount, currencyCode)})`,
          fontSize: 10,
        });
      }

      const row = [
        settings?.showImage ?
          // ✅ If showImage is true, use columns (image + text)
          {
            columns: [
              {
                width: "auto",
                stack: [
                  itemImageBase64 ? {
                    image: itemImageBase64,
                    width: 40,
                    height: 40,
                  } : {
                    text: '',
                    margin: [0, 0, 0, 0]
                  }
                ]
              },
              {
                width: '*',
                stack: [
                  { text: item?.title || item?.name || 'Unknown Item', bold: true },
                  ...(item?.variantTitle || item?.description ? [{
                    text: item?.variantTitle || item?.description,
                    fontSize: 10
                  }] : []),
                  {
                    margin: [0, 3, 0, 0],
                    stack: [
                      ...(settings?.showSku && item?.variant?.sku ? [
                        { text: `${language?.SKU || "SKU:"} ${item.variant.sku}`, style: 'itemDescription' }
                      ] : []),
                      ...(settings?.showBarcode && item?.variant?.barcode ? [
                        { text: `${language?.barcode || "BARCODE:"} ${item.variant.barcode}`, style: 'itemDescription' }
                      ] : []),
                      ...(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin ? [
                        { text: `${language?.countryOfOrigin || "Country Of Origin:"} ${item.variant.inventoryItem.countryCodeOfOrigin}`, style: 'itemDescription' }
                      ] : []),
                      ...(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode ? [
                        { text: `${language?.hsCode || "HS Code:"} ${item.variant.inventoryItem.harmonizedSystemCode}`, style: 'itemDescription' }
                      ] : []),
                      ...(settings?.showWeight && item?.variant?.inventoryItem?.weightValue ? [
                        {
                          text: `${language?.weight || "Weight:"} ${item.variant.inventoryItem.weightValue || 0} ${item.variant.inventoryItem.weightUnit || "lb"}`,
                          style: 'itemDescription'
                        }
                      ] : [])
                    ]
                  }
                ]
              }
            ],
            style: 'tableCell',
            columnGap: 10
          }
          :
          // ❌ If showImage is false, show only the text stack
          {
            stack: [
              { text: item?.title || item?.name || 'Unknown Item', bold: true },
              ...(item?.variantTitle || item?.description ? [{
                text: item?.variantTitle || item?.description,
                fontSize: 10
              }] : []),
              {
                margin: [0, 3, 0, 0],
                stack: [
                  ...(settings?.showSku && item?.variant?.sku ? [
                    { text: `${language?.SKU || "SKU:"} ${item.variant.sku}`, style: 'itemDescription' }
                  ] : []),
                  ...(settings?.showBarcode && item?.variant?.barcode ? [
                    { text: `${language?.barcode || "BARCODE:"} ${item.variant.barcode}`, style: 'itemDescription' }
                  ] : []),
                  ...(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin ? [
                    { text: `${language?.countryOfOrigin || "Country Of Origin:"} ${item.variant.inventoryItem.countryCodeOfOrigin}`, style: 'itemDescription' }
                  ] : []),
                  ...(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode ? [
                    { text: `${language?.hsCode || "HS Code:"} ${item.variant.inventoryItem.harmonizedSystemCode}`, style: 'itemDescription' }
                  ] : []),
                  ...(settings?.showWeight && item?.variant?.inventoryItem?.weightValue ? [
                    {
                      text: `${language?.weight || "Weight:"} ${item.variant.inventoryItem.weightValue || 0} ${item.variant.inventoryItem.weightUnit || "lb"}`,
                      style: 'itemDescription'
                    }
                  ] : [])
                ]
              }
            ],
            style: 'tableCell'
          },

        // Other cells in the row
        { text: quantity.toString(), style: 'tableCell' },
        { stack: unitPriceCell, style: 'tableUnitPriceCell' }
      ];


      if (showTaxColumn) {
        row.push({ text: taxValue, style: 'tablePriceCell' });
      }

      if (settings?.showItemTotal) {
        row.push({ text: formatCurrency(totalPriceWithDiscount, currencyCode), style: 'tablePriceCell' });
      }

      rows.push(row);
    }

    // Fallback row if no items
    if (rows.length === 1) {
      const fallback = [
        { text: 'No items', style: 'tableCell' },
        { text: '0', style: 'tableCell' },
        { text: formatCurrency(0, currency), style: 'tableUnitPriceCell' },
      ];

      if (showTaxColumn) {
        fallback.push({ text: formatCurrency(0, currency), style: 'tablePriceCell' });
      }
      if (settings?.showItemTotal) {
        fallback.push({ text: formatCurrency(0, currency), style: 'tablePriceCell' });
      }
      rows.push(fallback);
    }

    return {
      table: {
        widths: (showTaxColumn && settings?.showItemTotal)
          ? ['*', 50, 'auto', 'auto', 'auto']
          : (showTaxColumn || settings?.showItemTotal)
            ? ['*', 50, 'auto', 'auto']
            : ['*', 50, 'auto'],
        body: rows,
      },
      layout: {
        hLineWidth: function (i, node) {
          return i === node.table.body.length || i === 1 ? 1 : 0
        },

        vLineWidth: function () { return 0; },
        hLineColor: function () { return '#D7DAE0' },
      },
      margin: [20, 20, 20, 0]
    };
  };

  // Generate totals section
  const generateTotalsSection = () => {
    const totalsData = [];

    // Subtotal 
    totalsData.push([
      { text: `${language.subtotal || 'Subtotal'}${settings?.showTotalQuantity ? ` (${totalItems} Items):` : ':'}`, style: 'totalLabel' },
      { text: formatCurrency(subtotal, currency, showCurrencyCode), style: 'totalValue' }
    ]);

    // Discount 
    if ((settings?.templateSettings?.discount?.hideDiscountTotalPriceZero === true && order?.totalDiscounts > 0) ||
      settings?.templateSettings?.discount?.hideDiscountTotalPriceZero !== true
    ) {
      totalsData.push([
        { text: `${language.discount || 'Discount'}:`, style: 'totalLabel' },
        { text: `-${formatCurrency(order?.totalDiscounts, currency, showCurrencyCode)}`, style: 'totalValue' }
      ]);
    }

    // Subtotal after discount 
    if (settings?.templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalDiscounts > 0) {
      totalsData.push([
        { text: `${language.subtotalAfterDiscount || 'Subtotal after discount'}:`, style: 'totalLabel' },
        { text: formatCurrency(subtotal - parseFloat(discountCodeAmount), currency, showCurrencyCode), style: 'totalValue' }
      ]);
    }

    // Tax 
    if (settings?.templateSettings?.taxes?.taxHideZero !== true && tax !== 0) {
      totalsData.push([
        { text: `${language.tax || 'Tax'}:`, style: 'totalLabel' },
        { text: formatCurrency(tax, currency, showCurrencyCode), style: 'totalValue' }
      ]);
    }

    // Shipping 
    const shippingLabel = settings?.templateSettings?.shipping?.showShippingMethod == true ?
      `${language.shipping || 'Shipping'} ${shippingLines.length > 0 ? `(${shippingLines[0]?.title || ''})` : ''}:` :
      `${language.shipping || 'Shipping'}:`;

    totalsData.push([
      { text: shippingLabel, style: 'totalLabel' },
      { text: formatCurrency(totalShipping, currency, showCurrencyCode), style: 'totalValue' }
    ]);

    // Total 
    totalsData.push([
      { text: `${language.total || 'Total'}:`, style: 'totalLabel' },
      { text: formatCurrency(total, currency, showCurrencyCode), style: 'totalValue' }
    ]);

    totalsData.push([
      { text: `Amount due`, style: 'totalLabelBold', color: primaryColor },
      { text: formatCurrency(total, currency, showCurrencyCode), style: 'totalValueBold', color: primaryColor }
    ]);

    // Method 1: Using columns layout
    return {
      columns: [
        // Empty left column to push content right
        { width: '*', text: '' },
        // Right column with totals table
        {
          width: 'auto',
          table: {
            widths: ['auto', 'auto'], // Adjust widths as needed
            body: totalsData
          },
          layout: {
            vLineWidth: function () { return 0; },
            hLineWidth: function (i, node) {
              return i === node.table.body.length || i === node.table.body.length - 1 ? 2 : i == 0 ? 0 : 1;
            },
            hLineColor: function (i, node) { return i === node.table.body.length || i === node.table.body.length - 1 ? primaryColor : '#D7DAE0'; },

          }
        }
      ],
      margin: [20, 20, 20, 80],
    };
  };

  const termConditionContent = getHtmlToPdfMakeObj(language?.termConditionContent || "")

  var dd = {
    background: [
      {
        canvas: [
          {
            type: 'rect',
            x: 20,
            y: 20,
            w: isA4PaperSize ? 555 : 572, // A4 width (595) - 40 (20px margin on each side)
            h: isA4PaperSize ? 802 : 752, // A4 height (842) - 40 (20px margin on each side)

            color: secondaryColor
          }
        ]
      }
    ],
    content: [

      {
        columns: [
          {
            // Left column - Invoice info
            stack: [
              { text: (language.invoice || 'Invoice').toUpperCase(), style: 'brandName' },
              { text: `#${invoiceNumber}`, style: 'invoiceNo' },
            ],
            width: '*',
            margin: [0, 0, 0, 0]
          },
          {
            // Right column - Logo
            stack: [
              logoUrl ?
                { image: logoUrl, width: 80, height: 80 } :
                {
                  table: {
                    body: [
                      [{
                        text: (settings.brandName || companyName).toUpperCase(),
                        style: 'logoText',
                        border: [true, true, true, true],
                        margin: [10, 5, 10, 5]
                      }]
                    ]
                  },
                  layout: {
                    defaultBorder: false,
                    hLineWidth: function (i, node) { return 1; },
                    vLineWidth: function (i, node) { return 1; },
                    hLineColor: function (i, node) { return '#000'; },
                    vLineColor: function (i, node) { return '#000'; },

                  },
                  margin: [0, logoUrl ? 0 : 7, 0, 0]
                }
            ],
            width: 'auto',
            alignment: 'right',
            margin: logoUrl ? [0, 0, 10, 20] : [0, 10, 10, 20]
          }
        ],
        margin: [40, 20, 40, 40]
      },

      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [{
              // Left column - Invoice info
              stack: [
                { text: language.invoiceDate || 'Invoice Date', style: 'metaTitle' },
                { text: invoiceDate, style: 'metaValue' },
              ],
              margin: [16, 40, 0, 10]
            },
            {
              // Left column - Invoice info
              stack: [
                { text: language.billingAddress || 'Billing Address', style: 'metaTitle', noWrap: true },
                { text: billingAddressComponents.join('\n'), style: 'metaValue' },
              ],

            },
            {
              // Left column - Invoice info
              stack: [
                { text: language?.shippingAddress || 'Shipping Address', style: 'metaTitle', noWrap: true },
                { text: shippingAddressComponents.join('\n'), style: 'metaValue' },
              ],

            },],
          ]
        },
        layout: {
          fillColor: function (rowIndex, node, columnIndex) {
            return primaryColor;
          },
          paddingLeft: function (i, node) { return 24; },
          paddingRight: function (i, node) { return 24; },
          paddingTop: function (i, node) { return 20; },
          paddingBottom: function (i, node) { return 24; },
          vLineColor: function () { return '#D7DAE0'; }
        }
      },
      await generateLineItemsTable(),
      generateTotalsSection(),
      ...(settings?.showPaymentDetails ? [
        {
          margin: [20, 20, 20, 0],
          stack: [
            {
              text: language?.paymentDetails || "Payment Details:",
              style: "bodySectionHeader",
              margin: [0, 0, 0, 5]
            },
            {
              columns: [
                // Gateway section
                ...(settings?.showPaymentGateway && transactionData?.gateway ? [
                  { text: language?.paymentGateway || "Gateway:", style: "label", width: 'auto' },
                  { text: transactionData.gateway, style: "value", width: 'auto', noWrap: true, margin: [0, 0, 10, 0] }
                ] : []),

                // Card Type section
                ...(settings?.showCardType && transactionData?.paymentDetails?.company ? [
                  { text: language?.cardType || "Card:", style: "label", width: 'auto' },
                  { text: transactionData.paymentDetails.company, style: "value", width: 'auto', noWrap: true, margin: [0, 0, 10, 0] }
                ] : []),

                // Card Number section
                ...(settings?.showCardLastDigit && transactionData?.paymentDetails?.number ? [
                  { text: language?.cardNumber || "Card#:", style: "label", width: 'auto' },
                  { text: transactionData.paymentDetails.number, style: "value", width: 'auto' }
                ] : [])
              ],
              columnGap: 2
            }
          ]
        }
      ] : []),

      ...(settings?.showOrderNote && order?.note ? [
        {
          margin: [20, 20, 20, 0],
          stack: [
            {
              text: language?.notes || "Notes:",
              style: "bodySectionHeader",
              margin: [0, 0, 0, 5]
            },
            {
              text: order.note,
              style: "value"
            }
          ]
        }
      ] : []),
      {
        // Left column - Invoice info
        stack: [
          { text: language.thankYouNote || 'THANK YOU FOR YOUR BUSINESS!', style: 'thankyouTitle' },
          {
            // Text column
            text: `${language.paymentInfo || 'Make all Checks payable to:'} ${companyName}.`,
            style: 'paymentInfo',
            margin: [0, 0, 0, 0]
          }
        ],
        width: '*',
        margin: [20, 20, 20, 0]
      },

      ...(language?.termConditionContent ? [
        {
          stack: termConditionContent,
          margin: [20, 20, 40, 0]
        }
      ] : []),

      {
        columns: [
          {
            text: settings.brandName,
            style: {
              fontSize: 14,
            },
            width: 'auto',
            alignment: 'left',
            margin: [20, 81, 0, 0] // [left, top, right, bottom]
          },
          {
            // Right side - Phone and email
            text: [
              contactInfo
            ],
            style: {
              fontSize: 14,
            },
            width: '*',
            alignment: 'right',
            margin: [0, 81, 20, 0] // [left, top, right, bottom]
          }
        ]
      },
    ],
    styles: {
      itemDescription: {
        fontSize: 10,
      },
      logoText: {
        fontSize: 25,
        color: settings.invoiceTextColor || '#000',
      },
      brandName: {
        fontSize: 34,
        color: settings.invoiceTextColor || '#000',
        lineHeight: 1.2,
        font: headingFont,
      },
      invoiceNo: {
        fontSize: 16,
        color: settings.invoiceTextColor || '#000',
      },
      companyAddress: {
        margin: [0, 3, 0, 0]
      },
      metaTitle: {
        font: headingFont,
        fontSize: 16,
        bold: true,
        color: settings.primaryTextColor || '#fff'
      },
      thankyouTitle: {
        font: headingFont,
        fontSize: 16,
        lineHeight: 1.2,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 3, 0, 0]
      },
      paymentInfo: {
        fontSize: 15,
        color: settings.invoiceTextColor || '#000',
        margin: [0, 5, 0, 0]
      },
      metaValue: {
        fontSize: 14,
        color: settings.primaryTextColor || '#fff',
        margin: [0, 5, 0, 0]
      },
      tableHeader: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: primaryColor,
        margin: [5, 10, 5, 10]
      },
      bodySectionHeader: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: primaryColor,
      },
      tableCell: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 17],
        justify: 'center'
      },
      tablePriceHeader: {
        font: headingFont,
        fontSize: 14,
        bold: true,
        color: primaryColor,
        margin: [5, 10, 5, 10],
        alignment: 'right',
      },
      tablePriceCell: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 17],
        alignment: 'right',
      },
      tableUnitPriceCell: {
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [2, 17],
        alignment: 'right',
        lineHeight: 1.1,
      },
      totalLabel: {
        lineHeight: 1.1,
        fontSize: 14,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 5, 30, 5]
      },
      totalValue: {
        fontSize: 14,
        lineHeight: 1.1,
        color: settings.invoiceTextColor || '#000',
        alignment: 'right',
        margin: [5, 5, 5, 5]
      },
      totalLabelBold: {
        fontSize: 14,
        lineHeight: 1.1,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        margin: [5, 5, 5, 5]
      },
      totalValueBold: {
        fontSize: 14,
        lineHeight: 1.1,
        bold: true,
        color: settings.invoiceTextColor || '#000',
        alignment: 'right',
        margin: [5, 5, 0, 5]
      },
      label: {
        bold: true,
        color: settings.invoiceTextColor || '#000'
      },
      value: {
        color: settings.invoiceTextColor || '#000'
      }
    },

    defaultStyle: {
      font: bodyFont, // pdfMake default font
      fontSize: 14,
      color: settings.invoiceTextColor || '#000'
    },
    pageMargins: [20, 40, 20, 40], // Increased margins to accommodate border and footer
    pageSize: paperSize

  }

  return dd;
};

const generatePDF = async (invoice, order = {}, settings = {}, language = {}, transactionData = {}) => {
  const data = { invoice, order, settings, language, transactionData };



  logger.info('========invoice==============' + JSON.stringify(invoice))

  logger.info('========order==============' + JSON.stringify(order))
  logger.info('========settings==============' + JSON.stringify(settings))
  logger.info('========language==============' + JSON.stringify(language))
  logger.info('========transactionData==============' + JSON.stringify(transactionData))

  let docDefinition;

  if (settings?.invoice_template === 'Design 3') {
    docDefinition = await generateInvoiceTemplate3(data);
  } else if (settings?.invoice_template === 'Design 2') {
    docDefinition = await generateInvoiceTemplate2(data);
  } else {
    docDefinition = await generateInvoiceTemplate(data);
  }

  try {
    const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
    const pdfBuffer = await pdfDoc.getBuffer();
    return pdfBuffer;
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

/**
 * Generates HTML content for the invoice
 * @param {Object} data - The data needed to generate the HTML
 * @param {Object} data.invoice - Invoice data
 * @param {Object} data.order - Shopify order data
 * @param {Object} data.settings - Invoice settings with styling preferences
 * @returns {string} - The HTML content
 */


const generateInvoiceHTML = (data) => {
  const { invoice, order, settings } = data;

  // Extract necessary data from the settings
  const {
    businessName,
    businessAddress,
    contactInfo,
    logoUrl,
    primaryColor,
    secondaryColor,
    footerNote
  } = settings;

  // Format dates for display
  const formattedDate = new Date(invoice?.createdAt).toLocaleDateString();
  const dueDate = invoice?.dueDate
    ? new Date(invoice?.dueDate).toLocaleDateString()
    : new Date(new Date(invoice?.createdAt).getTime() + (settings?.defaultDueDate * 24 * 60 * 60 * 1000)).toLocaleDateString();

  // Get order line items and customer info
  const lineItems = order.lineItems?.edges?.map(edge => edge.node) || [];
  const billingAddress = order.billingAddress || {};

  // Create CSS styles based on invoice settings
  const styles = `
    <style>
      :root {
        --primary-color: #d50095;
        --secondary-color: #E5E7EB;
        --text-color: #333333;
        --light-bg: #f9fafb;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        color: var(--text-color);
        line-height: 1.5;
        margin: 0;
        padding: 0;
        background-color: white;
      }
      
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
      }
      
      .business-info {
        flex: 1;
      }
      
      .logo-container {
        max-width: 200px;
      }
      
      .logo-container img {
        max-width: 100%;
        height: auto;
      }
      
      .invoice-title {
        background-color: var(--primary-color);
        color: white;
        padding: 10px 15px;
        font-size: 24px;
        margin-bottom: 20px;
      }
      
      .invoice-details {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      
      .invoice-details-col {
        flex: 1;
      }
      
      .customer-details {
        margin-bottom: 30px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      
      th {
        text-align: left;
        background-color: var(--secondary-color);
        padding: 10px;
        font-weight: bold;
      }
      
      td {
        padding: 10px;
        border-bottom: 1px solid #ddd;
      }
      
      .line-items-total {
        text-align: right;
        margin-bottom: 30px;
      }
      
      .total-row {
        font-weight: bold;
        font-size: 1.1em;
      }
      
      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid var(--secondary-color);
        text-align: center;
        color: #666;
        font-size: 0.9em;
      }

      .businessName{color: #f00;}
      .businessAddress{color:#00d564}
    </style>
  `;

  // Generate the HTML content
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice #${invoice?.invoiceNumber}</title>
        ${styles}
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="business-info">
              <h1 class="businessName">${businessName || 'businessName'}</h1>
              <div class="businessAddress">${businessAddress.split('\n').join('<br>') || 'businessAddress'}</div>
              <div>${contactInfo || 'contactinfo'}</div>
            </div>
            <div class="logo-container">
              <img src="${logoUrl || ''}" alt="Business Logo">
            </div>
          </div>
          
          <div class="invoice-title">
            INVOICE #${invoice?.invoiceNumber || '123'}
          </div>
          
          <div class="invoice-details">
            <div class="invoice-details-col">
              <strong>Date:</strong> ${formattedDate || 'date'}<br>
              <strong>Status:</strong> ${invoice?.status.toUpperCase() || 'status'}<br>
            </div>
            <div class="invoice-details-col">
              <strong>Order Number:</strong> ${order?.name || order?.number || 'N/A' || 'name'}<br>
              <strong>Order Date:</strong> ${new Date(order?.processedAt || order?.createdAt).toLocaleDateString()}<br>
            </div>
          </div>
          
          <div class="customer-details">
            <h3>Bill To:</h3>
            <div>
              ${billingAddress.firstName || ''} ${billingAddress.lastName || ''}<br>
              ${billingAddress.address1 || ''} ${billingAddress.address2 ? `<br>${billingAddress.address2}` : ''}<br>
              ${billingAddress.city || ''}, ${billingAddress.province || ''} ${billingAddress.zip || ''}<br>
              ${billingAddress.country || ''}<br>
              ${order.email || ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${generateLineItemsHTML(lineItems)}
            </tbody>
          </table>
          
          <div class="line-items-total">
            <div><strong>Subtotal:</strong> ${formatCurrency(order?.subtotalPrice, order?.currency)}</div>
            ${order?.totalTax && parseFloat(order?.totalTax) > 0
      ? `<div><strong>Tax:</strong> ${formatCurrency(order.totalTax, order.currency)}</div>`
      : ''}
            ${order?.totalDiscounts && parseFloat(order?.totalDiscounts) > 0
      ? `<div><strong>Discounts:</strong> ${formatCurrency(order?.totalDiscounts, order?.currency)}</div>`
      : ''}
            <div class="total-row"><strong>Total:</strong> ${formatCurrency(order?.totalPrice, order?.currency)}</div>
          </div>
          
          <div class="footer">
            ${footerNote || ''}
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Creates HTML for line items in the invoice
 * @param {Array} lineItems - Array of line items from the order
 * @returns {string} - HTML string of line items
 */
const generateLineItemsHTML = (lineItems, templateSettings, language) => {
  let items = [];
  if (!lineItems || lineItems.length === 0) {
    return '<tr><td colspan="4">No items</td></tr>';
  }

  if (lineItems.edges && Array.isArray(lineItems.edges)) {
    items = lineItems.edges.map(edge => edge.node);
  }
  // If lineItems is already an array, use it directly
  else if (Array.isArray(lineItems)) {
    items = lineItems;
  }

  return items.map((item, index) => {
    const price = parseFloat(item.price || 0);
    const totalDiscount = parseFloat(item.totalDiscount || 0);
    const quantity = item.quantity || 0;
    const totalPrice = price * quantity;
    const totalPriceWithDiscount = (price * quantity) - totalDiscount;
    const tax = item.tax || 0;

    const showDiscountAppliedOriginalPrice = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === false);
    const hideDiscountZero = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === true && totalDiscount > 0);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.title || item.name || 'Unknown Item'} <br><span style="font-size: 14px;">${item.variantTitle || item.description || '-'}</span></td>
        <td>${quantity || '1'}</td>
        <td> 
          ${(showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero ? `<span style="display: block;text-decoration: line-through;">${formatCurrency(price, item.currencyCode || 'USD')}</span>` : ''}
          <span style="display: block;">${formatCurrency(price - totalDiscount, item.currencyCode || 'USD')}</span>
          ${showDiscountAppliedOriginalPrice || hideDiscountZero ? `<span style="display: block;font-size: 14px;">(Discount ${formatCurrency(totalDiscount, item.currencyCode || 'USD')})</span>` : ''}
        </td>
        ${templateSettings?.taxes?.showTax === 'true1' ? `<td>${formatCurrency(tax, item.currencyCode || 'USD')}</td>` : ''}
        <td> ${formatCurrency(totalPriceWithDiscount, item.currencyCode || 'USD')}</td>
      </tr>
    `;
  }).join('');
};

/**
 * Formats a currency value
 * @param {number|string} value - The amount to format
 * @param {string} currency - The currency code (USD, CAD, etc.)
 * @returns {string} - The formatted currency string
 */
const formatCurrency = (value, currency = 'USD', showCurrency = false) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '$0.00';

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);

  return showCurrency ? `${formatted} ${currency}` : formatted;
};

/**
 * Generates a filename for the invoice PDF
 * @param {string} invoiceNumber - The invoice number
 * @param {string} shopDomain - The shop domain
 * @returns {string} - The generated filename
 */
const generatePdfFilename = (invoiceNumber, shopDomain) => {
  const sanitizedShopDomain = (shopDomain || '').replace(/[^a-zA-Z0-9]/g, '-');
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');

  return `invoice-${invoiceNumber}-${sanitizedShopDomain}-${timestamp}.pdf`;
};

/**
 * Creates a data URL for a PDF buffer
 * @param {Buffer} pdfBuffer - The PDF buffer
 * @returns {string} - Data URL for the PDF
 */
const createPdfDataUrl = (pdfBuffer) => {
  return `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
};

/**
 * Stores a PDF buffer in the public directory
 * @param {Buffer} pdfBuffer - The PDF buffer to store
 * @param {Object} invoice - The invoice data
 * @param {string} shopDomain - The shop domain
 * @returns {Promise<string>} - URL path to access the stored PDF
 */


/**
 * Format a date in a user-friendly format
 * @param {string|Date} date - The date to format
 * @returns {string} - The formatted date string
 */
const formatDate = (date, date_format) => {
  if (!date) return '';

  try {
    // Check if date_format is valid
    if (!date_format) {
      date_format = 'MM/dd/yyyy'; // Default format
    }

    // Ensure date is a valid Date object
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    // For debugging
    // console.log('Formatting date:', dateObj, 'with format:', date_format);

    // Try to format with the provided format
    return format(dateObj, date_format);
  } catch (error) {
    console.error('Error formatting date:', error);

    // Fallback to a basic format instead of returning the original date
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString();
    } catch (e) {
      // Last resort
      return String(date);
    }
  }
};

function formatFontName(fontName = '') {
  return fontName.replace(/ /g, '_');
}

export {
  generatePDF,
  generateInvoiceHTML,
  formatCurrency,
  generatePdfFilename,
  createPdfDataUrl,
  formatDate
};
