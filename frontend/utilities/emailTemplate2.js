import { format } from 'date-fns';
/**
 * Client-side utility for generating invoice email templates with dynamic data
 * This file provides React-compatible functions for email template generation
 */

/**
 * Get a complete invoice template with given data
 * For use in React components
 *
 * @param {Object} invoice - Invoice data
          * @param {Object} order - Shopify order data
          * @param {Object} settings - Invoice settings with styling preferences
          * @returns {string} - Complete HTML for the invoice
          */
export const getTemplate = (templateSettings, order, invoice, settings, language) => {
  const normTemplateSettings = templateSettings || {};
  const normOrder = order || {};
  const normInvoice = invoice || {};
  const normSettings = settings || {};
  const normLanguage = language || {};

  const data = {
    templateSettings: normTemplateSettings,
    order: normOrder,
    invoice: normInvoice,
    settings: normSettings,
    language: normLanguage
  };
  // console.log('== templateSettings 1== ', normTemplateSettings);

  if (normSettings?.invoice_template === 'Design 3') {
    return generateInvoiceTemplate3(data);
  } else if (normSettings?.invoice_template === 'Design 2') {
    return generateInvoiceTemplate2(data);
  } else {
    return generateInvoiceHTML(data);
  }

};

/**
 * Format currency values for display
 * @param {number|string} value - The amount to format
 * @param {string} currency - The currency code (USD, CAD, etc.)
 * @returns {string} - The formatted currency string
 */
export const formatCurrency = (value, currency = 'USD', showCurrency = false) => {
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
 * Format a date in a user-friendly format
 * @param {string|Date} date - The date to format
 * @returns {string} - The formatted date string
 */
export const formatDate = (date, date_format) => {
  if (!date) return '';

  try {
    return format(new Date(date), date_format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
  // const dateObj = typeof date === 'string' ? new Date(date) : date;

  // return dateObj.toLocaleDateString('en-US', {
  //   year: 'numeric',
  //   month: 'long',
  //   day: 'numeric'
  // });
};

/**
 * Generate HTML for invoice line items
 * @param {Array} lineItems - Array of order line items
 * @returns {string} - HTML string for the line items table rows
 */
export const generateLineItemsHTML = (lineItems, templateSettings, settings, language) => {
  lineItems = lineItems || [];
  templateSettings = templateSettings || {};
  settings = settings || {};
  language = language || {};

  if (lineItems.length === 0) {
    return '<tr><td colspan="6">No items</td></tr>';
  }

  // console.log('lineItems', lineItems);
  return lineItems.map((item, index) => {
    const price = parseFloat(item.price || 0);
    const totalDiscount = parseFloat(item.totalDiscount || 0);
    const quantity = item.quantity || 0;
    const totalPrice = price * quantity;
    const totalPriceWithDiscount = (price * quantity) - totalDiscount;
    const tax = item.tax || '5%';

    const showDiscountAppliedOriginalPrice = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === false);
    const hideDiscountZero = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === true && totalDiscount > 0);

    return `
      <tr>
        <td>${index + 1}</td>
        <td style="padding: 10px 0; vertical-align: top;">
  <div style="display: flex; align-items: flex-start;">
    
    <!-- Image -->
    ${settings?.showImage ? `
      <img src="${item.image}" width="50" height="50" style="display: block; margin-right: 10px;" />
    ` : ''}

    <!-- Text Content -->
    <div style="font-size: 12px; color: var(--tsecondary_color);">
      <span style="font-weight: 600; display: block;">${item.title || item.name || 'Unknown Item'}</span>
      <span style="display: block; margin-top: 4px;">${item.variantTitle || item.description || '-'}</span>

      <div style="margin-top: 4px;">
        ${(settings?.showSku && item?.variant?.sku) ? `<div>${language?.SKU || "SKU:"} ${item?.variant?.sku}</div>` : ''}
        ${(settings?.showBarcode && item?.variant?.barcode) ? `<div>${language?.barcode || "BARCODE:"} ${item?.variant?.barcode}</div>` : ''}
        ${(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin) ? `<div>${language?.countryOfOrigin || "Country Of Origin:"} ${item?.variant?.inventoryItem?.countryCodeOfOrigin}</div>` : ''}
        ${(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode) ? `<div>${language?.hsCode || "HS Code:"} ${item?.variant?.inventoryItem?.harmonizedSystemCode}</div>` : ''}
        ${(settings?.showWeight && item?.variant?.inventoryItem?.weightValue) ? `<div>${language?.weight || "Weight:"} ${item?.variant?.inventoryItem?.weightValue || 0} ${item?.variant?.inventoryItem?.weightUnit || "lb"}</div>` : ''}
      </div>
    </div>

  </div>
</td>
        <td>${quantity || '1'}</td>
        <td style="text-align: right;"> 
        ${(showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero ? `<span style="display: block;text-decoration: line-through;">${formatCurrency(price, item.currencyCode || 'USD')}</span>` : ''}
        <span style="display: block;">${formatCurrency(price - totalDiscount, item.currencyCode || 'USD')}</span>
        ${showDiscountAppliedOriginalPrice || hideDiscountZero ? `<span style="display: block;font-size:12px;">(Discount ${formatCurrency(totalDiscount, item.currencyCode || 'USD')})</span>` : ''}
        </td>
        ${templateSettings?.taxes?.taxEachProduct === 'true1' ? `<td>${tax}</td>` : ''}
        
         ${(settings?.showItemTotal ?? true) ? `<td style="text-align: right;"> ${formatCurrency(totalPriceWithDiscount, item.currencyCode || 'USD')}</td >` : ""}
      </tr >
  `;
  }).join('');
};

/**
 * Generate the full HTML template with dynamic data
 * @param {Object} data - The data for generating the template
 * @param {Object} data.invoice - Invoice data including invoiceNumber, status, etc.
 * @param {Object} data.order - Order data including line items, customer info, etc.
 * @param {Object} data.settings - Invoice settings like company info, colors, etc.
 * @returns {string} - Complete HTML content for the email
 */
export const generateInvoiceHTML = (data) => {
  const normData = data || {};
  const templateSettings = normData.templateSettings || {};
  const order = normData.order || {};
  const invoice = normData.invoice || {};
  const settings = normData.settings || {};
  const language = normData.language || {};

  // Extract values with defaults
  const invoiceNumber = invoice?.invoiceNumber || '12345';
  const invoiceDate = formatDate(invoice?.createdAt || new Date(), settings?.date_format || 'MM/dd/yyyy');
  // const dueDate = formatDate(invoice?.dueDate || new Date());

  // Company info
  const companyName = settings?.businessName || 'Zylker Thread & Weave';
  // const companyAddress = `${settings.street || ''} ${settings.apartment || ''} ${settings.city || ''} ${settings.zipCode || ''} ${settings.state || ''} ${settings.country || ''}`;
  const companyAddressComponents = [
    settings.street || '',
    `${settings.apartment ? settings.apartment + ', ' : ''} ${settings.city || ''}`,
    `${settings.state ? settings.state + ', ' : ''} ${settings.country ? settings.country + ', ' : ''} ${settings.zipCode || ''}`,
  ].filter(component => component && component.trim() !== '');

  const companyAddress = companyAddressComponents.join('<br>');

  // settings?.businessAddress || '14A, Northern Street<br>Greater South Avenue<br>New Yourl 25662<br>U.S.A';
  const phone = `Phone: ${settings?.phone} `;
  const logoUrl = settings?.logoUrl || '';

  // Primary color (with fallback)
  const primaryColor = settings?.primaryColor || '#8257d0';
  const secondaryColor = settings?.secondaryColor || '#f0ecf9';

  // Line items
  const lineItems = order?.lineItems || [];

  // Totals
  const subtotal = order?.subtotalPrice || '198.00';
  const tax = order?.totalTax || '9.90';
  const totalShipping = order?.totalShipping || '50.00';
  const total = order?.totalPrice || '257.90';
  const currency = order?.currency || 'USD';

  // Header for client info
  const clientName = order?.billingAddress?.firstName ? `${order.billingAddress.firstName} ${order.billingAddress.lastName}` : 'Acme LTD';
  const clientAddress = order?.billingAddress ? `${order.billingAddress.address1 || ''} ${order.billingAddress.address2 || ''} <br>
  ${order.billingAddress.city || ''}, ${order.billingAddress.province || ''} ${order.billingAddress.zip || ''}<br> ${order.billingAddress.country || ''}` : 'Toronto ON M5C 2T9';
  const clientEmail = order?.email || 'willie.jennings@example.com';

  const showItemTotal = settings?.showItemTotal || true
  const showCurrencyCode = settings?.showCurrencyCode || false
  // Footer note
  const footerNote = settings?.footerNote || 'Thank you for your business!';
  const totalItems = lineItems?.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const transaction = (order?.transactions && order.transactions[0]) || {}

  // Generate styles with dynamic colors
  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=${settings.bodyFont || 'Arial'}&family=${settings.headingFont || 'Arial'}&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

      /* Base styles */
      /* body {
        font-family: 'Proxima Nova Condensed', 'Arial Narrow', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
      line-height: 1.4;
    }*/

      .template1{
        font-family: ${settings.bodyFont || 'Arial'};
      font-size: 16px;
      color: ${settings.invoiceTextColor || '#000'}
    }

      .container {
        max-width: 800px;
      margin: 0 auto;
      border: 1px solid #ddd;
      background-color: #fff;
    }

      .template1 h2, .meta-title, .thank-you, .template1 table th{
        font-family: ${settings.headingFont || 'Arial'};
      }
      /* Header styles */
      .header {
        background-color: ${primaryColor};
      color: ${settings.primaryTextColor || '#000'};
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo_wrapper span{    
      font-weight: 900;
      font-size: 25px;
      text-transform: uppercase;
      border: 1px solid;
      text-align: center;
      padding: 5px 20px;
      margin-top: 20px;
    }
      .footer a{
        color: ${settings.invoiceTextColor || '#000'};
    }
      .logo {
        width: 80px;
      height: 80px;
    }

      .company-address {
        text-align: right;
      font-size: 14px;
      line-height: 1.5;
    }

      /* Info section styles */
      .info-section {
        display: flex;
      justify-content: space-between;
      padding: 20px;
    }

      .supplier, .client {
        width: 45%;
    }

      .info-heading {
        font-weight: bold;
      font-size: 18px;
      margin-top: 0;
      margin-bottom: 10px;
    }

      /* Invoice meta styles */
      .invoice-meta {
        display: flex;
      margin: 10px 20px;
      border-radius: 8px;
      overflow: hidden;
    }

      .invoice-meta-item {
        flex: 1;
      padding: 15px 10px;
      background-color: ${secondaryColor};
      text-align: center;
      border-right: 1px solid #e6e6e6;
    }

      .invoice-meta-item:last-child {
        border-right: none;
    }

      .meta-title {
        font-weight: bold;
      margin-bottom: 5px;
      font-size: 14px;
    }

      /* Table styles */
      .invoice-table {
        width: calc(100% - 40px);
      margin: 20px;
      border-collapse: collapse;
    }

      .invoice-table th {
        background-color: ${secondaryColor};
      padding: 12px 8px;
      text-align: left;
      font-weight: bold;
      color: ${settings.invoiceTextColor || '#000'};
    }

      .invoice-table td {
        padding: 12px 8px;
      border-bottom: 1px solid #eee;
      color: ${settings.invoiceTextColor || '#000'};
    }

      /* Totals section */
      .totals {
        margin: 0 20px;
    }

      .total-row {
        display: flex;
      justify-content: space-between;
      padding: 10px 5px;
      border-bottom: 1px solid #eee;
      letter-spacing: 0.3px;
    }

      /* Payment info */
      .payment-info {
      text-align: center;
      margin: 30px 0 0px;
      font-size: 18px;
      line-height: 25px;
      letter-spacing: 0.4px;
      border-top: 1px solid #eee;
      padding-top: 30px;
    }

      .thank-you {
        text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin: 10px 0 30px;
      letter-spacing: 0.4px;
    }

      /* Footer */
      .footer {
        text-align: center;
      padding: 20px;
      color: ${settings.invoiceTextColor || '#000'};
      font-size: 14px;
      border-top: 1px solid #eee;
      margin-top: 20px;
    }

    .termTitle {
    text-align: center;
        font-weight: bold;
    padding: 20px 20px 0px 20px;
    color: ${settings.invoiceTextColor || '#000'};
    font-size: 16px;
    border-top: 1px solid #eee;
    }

    .order-meta-title{
      font-weight: bold;
      padding-bottom: 5px;
    }
    .payment-detail-item{
      display: flex;
      gap: 5px;
      flex-direction: row;
    }
      .payment-details-section{
       display: flex;
      gap: 2px 15px;
      flex-direction: row;
       flex-wrap: wrap;
      }
    .terms {
    text-align: center;
    padding: 5px 0px 0px 20px;
    color: ${settings.invoiceTextColor || '#000'};
    font-size: 16px;
    }
    </style>`;

  // Generate the HTML content with dynamic data
  // <!--<!DOCTYPE html>
  //   <html>
  //     <head>
  //       <meta charset="UTF-8">
  //         <title>Invoice #${invoiceNumber}</title>
  //         ${styles}
  //     </head>
  //     <body> -->
  return `
        ${styles}
        <div class="container template1">
          <!-- Header -->
          <div class="header">
            <div class="logo_wrapper">
              ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" class="logo">` : `<span>${settings.brandName}</span>`}
            </div>
            <div class="company-address">
              ${companyName}<br>
              ${companyAddress}<br>
                ${templateSettings?.taxes?.taxNumber}
            </div>
          </div>

      <!--Info Section-->
      <div class="info-section">
        <div class="supplier">
          <h2 class="info-heading">${language.shippingAddress || 'Shipping Address'}</h2>
          <p>
            ${companyName}<br>
              ${companyAddress.replace(/<br>/g, '<br>')}
          </p>
        </div>

        <div class="client">
          <h2 class="info-heading">${language.billingAddress || 'Billing Address'}</h2>
          <p>
            ${clientName}<br>
              ${clientAddress}<br>
                ${clientEmail || ''}
              </p>
            </div>
        </div>

        <!-- Invoice Meta -->
        <div class="invoice-meta">
          <div class="invoice-meta-item">
            <div class="meta-title">${language.invoice || 'INVOICE'}</div>
            <div>#${invoiceNumber}</div>
          </div>
          <div class="invoice-meta-item">
            <div class="meta-title">${language.invoiceDate || 'INVOICE'}</div>
            <div>${invoiceDate}</div>
          </div>
        </div>

        <!-- Invoice Table -->
        <table class="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${language.item || 'ITEM'}</th>
              <th>${language.QTY || 'QTY'}</th>
              <th style="text-align: right;">${language.unitPrice || 'UNIT PRICE'}</th>
              ${templateSettings?.taxes?.taxEachProduct === 'true1' ? `<th>${language.tax || 'TAX'}</th>` : ''}
              ${(settings?.showItemTotal ?? true) ? `<th style="text-align: right;">${language.total || 'TOTAL'}</th>` : ""}
            </tr>
          </thead>
          <tbody style="font-size:14px;vertical-align: top;";>
            ${generateLineItemsHTML(lineItems, templateSettings, settings, language)}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals">
          <div class="total-row">
            <div>${language.subtotal || 'Subtotal'}${settings?.showTotalQuantity ? ` (${totalItems} Items):` : ":"}</div>
            <div>${formatCurrency(subtotal, currency, showCurrencyCode)}</div>
          </div>

          ${(
      (settings?.templateSettings?.discount?.hideDiscountTotalPriceZero === true && order?.totalDiscounts > 0) ||
      settings?.templateSettings?.discount?.hideDiscountTotalPriceZero !== true
    ) ? `<div class="total-row"><div>${language.discount || 'Discount'}:</div><div>-${formatCurrency(order?.totalDiscounts, currency, showCurrencyCode)}</div></div>` : ''}
          ${templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalDiscounts > 0 ? `<div class="total-row"><div>${language.subtotalAfterDiscount || 'Subtotal after discount'}:</div><div>${formatCurrency(order?.totalAfterDiscounts, currency, showCurrencyCode)}</div></div>` : ''}

          ${templateSettings?.taxes?.taxHideZero !== true && tax !== 0 ? `<div class="total-row"><div>${language.tax || 'Tax'}:</div><div>${formatCurrency(tax, currency, showCurrencyCode)}</div></div>` : ''}

          <div class="total-row">
            <div>${language.shipping || 'Shipping'} ${templateSettings?.shipping?.showShippingMethod == true ? `(Generic Shipping)` : ''}:</div>
            <div>${formatCurrency(totalShipping, currency, showCurrencyCode)}</div>
          </div>

          <div class="total-row" style="font-weight: 600;">
            <div><strong>${language.total || 'Total'}:</strong></div>
            <div><strong>${formatCurrency(total, currency, showCurrencyCode)}</strong></div>
          </div>
        </div>

        <div style="text-align: left;">

        ${settings?.showPaymentDetails ? `
          <div  style="padding: 20px 20px 0px 20px;">
            <p class="order-meta-title">${language?.paymentDetails || "Payment Details:"}</p>
            <div class="payment-details-section">
            ${(settings?.showPaymentGateway && transaction?.gateway) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.paymentGateway || "Gateway:"}</p>
                <p >${transaction.gateway}</p>
              </div>
            ` : ''}
            
            ${(settings?.showCardType && transaction?.paymentDetails?.company) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.cardType || "Card:"}</p>
                <p >${transaction?.paymentDetails?.company}</p>
              </div>
            ` : ''}

            ${(settings?.showCardLastDigit && transaction?.paymentDetails?.number) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.cardNumber || "Card#:"}</p>
                <p >${transaction?.paymentDetails?.number}</p>
              </div>
            ` : ''}
            </div>
          </div>
      ` : ""}

        ${settings?.showOrderNote && order?.note ? `<div style="padding: 20px 20px 0px 20px;">
          <p class="order-meta-title">${language?.notes || "Notes:"}</p>
          <p>${order.note}</p>
          </div>` : ""}
         ${language?.termConditionContent ? `<div class="termConditionContent" style="text-align: left;/* padding-top: 42px; *//* padding-left: 29px; */;padding: 20px 20px 0px 20px;">
     ${language?.termConditionContent}
    </div>` : ""}
        </div>
        <!-- Payment Info -->
        <div class="payment-info">
          ${language.paymentInfo || 'Make all Checks payable to:'} ${companyName}.
        </div>

        <!-- Thank You Message -->
        <div class="thank-you">
          ${language.thankYouNote || 'THANK YOU FOR YOUR BUSINESS!'}
        </div>

        <!-- Footer -->
        <div class="footer">
          ${companyName} ${settings?.phone ? `| ${language.phone || 'Phone'}: <a href="tel:${settings?.phone}">${settings?.phone}</a>` : ''} ${settings?.companyWebsite ? `| <a target="_blank" href="${settings?.companyWebsite}">${settings?.companyWebsite}</a>` : ''}
        </div>
      </div>
      <!--</body >
          </html > --> `;
};

export const generateInvoiceTemplate2 = (data) => {
  const normData = data || {};
  const templateSettings = normData.templateSettings || {};
  const order = normData.order || {};
  const invoice = normData.invoice || {};
  const settings = normData.settings || {};
  const language = normData.language || {};
  // console.log('settings', settings);
  // Extract values with defaults
  const invoiceNumber = invoice?.invoiceNumber || '12345';
  const invoiceDate = formatDate(invoice?.createdAt || new Date(), settings?.date_format || 'MM/dd/yyyy');
  // const dueDate = formatDate(invoice?.dueDate || new Date());

  // Company info
  const companyName = settings?.businessName || 'Zylker Thread & Weave';
  // const companyAddress = `${settings.street || ''} ${settings.apartment || ''} ${settings.city || ''} ${settings.zipCode || ''} ${settings.state || ''} ${settings.country || ''}`;
  const companyAddressComponents = [
    settings.street || '',
    `${settings.apartment ? settings.apartment + ', ' : ''} ${settings.city || ''}`,
    `${settings.state ? settings.state + ', ' : ''} ${settings.country ? settings.country + ', ' : ''} ${settings.zipCode || ''}`,
  ].filter(component => component && component.trim() !== '');

  const companyAddress = companyAddressComponents.join('<br>');

  // settings?.businessAddress || '14A, Northern Street<br>Greater South Avenue<br>New Yourl 25662<br>U.S.A';
  const phone = `Phone: ${settings?.phone} `;
  const logoUrl = settings?.logoUrl || '';

  // Primary color (with fallback)
  const primaryColor = settings?.primaryColor || '#8257d0';
  const secondaryColor = settings?.secondaryColor || '#f0ecf9';

  // Line items
  const lineItems = order?.lineItems || [];
  const totalItems = lineItems?.reduce((sum, item) => sum + (item.quantity || 0), 0);
  // Totals
  const subtotal = order?.subtotalPrice || '198.00';
  const tax = order?.totalTax || '9.90';
  const totalShipping = order?.totalShipping || '50.00';
  const total = order?.totalPrice || '257.90';
  const currency = order?.currency || 'USD';
  const transaction = (order?.transactions && order.transactions[0]) || {}

  const showCurrencyCode = settings?.showCurrencyCode || false
  // Header for client info
  const clientName = order?.billingAddress?.firstName ? `${order.billingAddress.firstName} ${order.billingAddress.lastName}` : 'Acme LTD';
  const clientAddress = order?.billingAddress ? `${order.billingAddress.address1 || ''} ${order.billingAddress.address2 || ''} <br>
  ${order.billingAddress.city || ''}, ${order.billingAddress.province || ''} ${order.billingAddress.zip || ''}<br> ${order.billingAddress.country || ''}` : 'Toronto ON M5C 2T9';

  // Generate the HTML content with dynamic data
  return `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
       @import url('https://fonts.googleapis.com/css2?family=${settings.bodyFont || 'Arial'}&family=${settings.headingFont || 'Arial'}&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
    :root {
      --tprimary_color: ${settings.primaryTextColor || ""};
      --tsecondary_color: ${settings.invoiceTextColor || '#000'};
    }
    .template2{
      font-size: 12px; font-family: ${settings.bodyFont || 'Arial'}; font-weight: 400; line-height: 14px;
    }

    .template2 .heading_font{
    font-family: ${settings.headingFont || 'Arial'};
      font-size: 14px;
    }

      .template2 .total_cell{
    font-family: ${settings.bodyFont || 'Arial'};
      font-size: 14px;
    }

    .template2 .body_font{
      font-size: 12px;
      font-family: ${settings.bodyFont || 'Arial'}
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background-image: linear-gradient(180deg, #E5F1FF 0%, #B3D2F6 100%);
      background: ${secondaryColor};
      padding: 30px;
    }

    .invoice-table {
      background-color: #ffffff;
      border-radius: 21px;
      padding: 35px 28px;
      box-shadow: 0px 5px 11px rgba(0, 0, 0, 0.05);
      width: 100%;
    }

    .template2 h2, .template2 h3, .template2 h4{
      font-size: 14px;
    }
    .template2 p{font-size: 12px;line-height: 18px;}
    .template2 a{color: ${settings.invoiceTextColor || '#000'};}
    @media (max-width: 768px) {
      .container {
        padding: 30px 15px !important;
      }

      .invoice-table {
        padding: 20px 15px !important;
      }

      h2 {
        font-size: 24px !important;
      }

      p {
        font-size: 16px !important;
      }

      .item-table th, .item-table td {
        font-size: 14px !important;
      }
    }

    @media (max-width: 480px) {
      h2 {
        font-size: 20px !important;
      }

      p {
        font-size: 14px !important;
      }

      .item-table th, .item-table td {
        font-size: 12px !important;
      }
    }

       .order-meta-title{
      font-weight: bold;
      padding-bottom: 5px;
    }
    .payment-detail-item{
      display: flex;
      gap: 5px;
      flex-direction: row;
      color: var(--tsecondary_color);
      
    }
      .payment-details-section{
       display: flex;
   gap: 2px 15px;
      flex-direction: row;
      margin-top: 7px;
      color:black;
      flex-wrap:wrap;
      }

    .termConditionContent a{
    color:#06c !important;
    }
  </style>
</head>
<body>
  <div class="container template2">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding: 0 29px 30px 29px;">
          <table width="100%">
            <tr>
              <td style="vertical-align: top;">
                <h2 style="color: var(--tprimary_color); font-size: 22px;  font-weight: 600; margin: 0 0 5px; line-height: normal; font-family: ${settings.headingFont || 'Arial'};">${settings?.brandName}</h2>
                ${settings?.supportEmail ? `<p style="color: var(--tsecondary_color); font-weight: 400; margin:0 0 6px;"><a href="tel:${settings?.supportEmail}">${settings?.supportEmail}</a></p>` : ''}
                ${settings?.phone ? `<p style="color: var(--tsecondary_color); font-weight: 400; margin:0;"><a href="tel:${settings?.phone}">${settings?.phone}</a></p>` : ''}
              </td>
              <td align="right" style="text-align: right;">
                <p style="color: var(--tsecondary_color); font-weight: 400; margin: 0;">
                      ${companyName}<br>
                      ${companyAddress}<br>
                      ${templateSettings?.taxes?.taxNumber}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table class="invoice-table" cellpadding="0" cellspacing="0">
            <!-- Invoice Info -->
            <tr>
              <td>
                <table width="100%">
                  <tr>
                    <td colspan="0" style="padding-bottom: 20px;">
                      <p class="heading_font" style="color: var(--tprimary_color);  font-weight: bold; margin:0; margin-bottom: 7px;">${language.invoiceDate || 'Invoice Date'}</p>
                      <p style="color: var(--tsecondary_color); margin:0;">${invoiceDate}</p>
                    </td>
                    <td colspan="0" style="padding-bottom: 20px;text-align: right;">
                      <p class="heading_font" style="min-width: 170px;font-weight: bold;color: var(--tprimary_color);margin:0; margin-bottom: 7px;">${language.invoice || 'Invoice Number'}</p>
                      <p style="color: var(--tsecondary_color); margin: 0; ">#${invoiceNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top;">
                      <p class="heading_font" style="color: var(--tprimary_color); margin: 0;font-weight: bold; ">${language.billingAddress || 'Billing Address'}</p>
                      <p style="color: var(--tsecondary_color);  margin: 0; margin-top: 7px; ">${companyName}<br>
                        ${companyAddress.replace(/<br>/g, '<br>')}</p>
                    </td>
                    <td style="vertical-align: top;text-align: right;">
                      <p class="heading_font" style="color: var(--tprimary_color); margin: 0; font-weight: bold;">${language.shippingAddress || 'Shipping Address'}</p>
                      <p style="color: var(--tsecondary_color);  margin: 0; margin-top: 7px; ">${companyName}<br>
                        ${companyAddress.replace(/<br>/g, '<br>')}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Item Table -->
            <tr>
              <td style="padding: 30px 0 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" class="item-table" style="border-collapse: collapse;">
                  <thead style="border-top: 1px solid #D7DAE0; border-bottom: 1px solid #D7DAE0;">
                    <tr>
                      <th class="heading_font" align="left" style="color: var(--tprimary_color); text-transform: uppercase; padding: 10px 0;">${language.item || 'ITEM'}</th>
                      <th class="heading_font" align="left" style="color: var(--tprimary_color); text-transform: uppercase; padding: 10px 0 10px 6%;">${language.QTY || 'QTY'}</th>
                      <th class="heading_font" align="right" style="color: var(--tprimary_color); text-transform: uppercase; padding: 10px 0;">${language.unitPrice || 'UNIT PRICE'}</th>
${(settings?.showItemTotal ?? true) ? `<th class="heading_font" align="right" style="color: var(--tprimary_color); text-transform: uppercase; padding: 10px 0; ">${language.total || 'TOTAL'}</th>` : ""}
                    </tr>
                  </thead>
                  <tbody style="border-bottom: 1px solid #D7DAE0;">
                  ${lineItems.map((item, index) => {
    const price = parseFloat(item.price || 0);
    const totalDiscount = parseFloat(item.totalDiscount || 0);
    const quantity = item.quantity || 0;
    const totalPrice = price * quantity;
    const totalPriceWithDiscount = (price * quantity) - totalDiscount;
    const tax = item.tax || '5%';

    const showDiscountAppliedOriginalPrice = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === false);
    const hideDiscountZero = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === true && totalDiscount > 0);
    return `<tr>
                      <td style="padding: 10px 0; vertical-align: top; color: var(--tsecondary_color); font-size: 10px;">
                        <div style="display: flex; align-items: flex-start;">
                          
                          <!-- Image -->
                          ${settings?.showImage ? `
                            <img src="${item.image}" width="50" height="50" style="display: block; margin-right: 10px;" />
                          ` : ''}
                          <!-- Text Block -->
                          <div>
                            <p style="font-weight: 600; margin: 0 0 3px 0;">${item.title || item.name || 'Unknown Item'}</p>
                            <p style="margin: 0 0 3px 0;">${item.variantTitle || item.description || '-'}</p>
                            
                            <div style="margin-top: 3px;">
                              ${(settings?.showSku && item?.variant?.sku) ? `<p style="margin: 0;">${language?.SKU || "SKU:"} ${item?.variant?.sku}</p>` : ''}
                              ${(settings?.showBarcode && item?.variant?.barcode) ? `<p style="margin: 0;">${language?.barcode || "BARCODE:"} ${item?.variant?.barcode}</p>` : ''}
                              ${(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin) ? `<p style="margin: 0;">${language?.countryOfOrigin || "Country Of Origin:"} ${item?.variant?.inventoryItem?.countryCodeOfOrigin}</p>` : ''}
                              ${(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode) ? `<p style="margin: 0;">${language?.hsCode || "HS Code:"} ${item?.variant?.inventoryItem?.harmonizedSystemCode}</p>` : ''}
                              ${(settings?.showWeight && item?.variant?.inventoryItem?.weightValue) ? `<p style="margin: 0;">${language?.weight || "Weight:"} ${item?.variant?.inventoryItem?.weightValue || 0} ${item?.variant?.inventoryItem?.weightUnit || "lb"}</p>` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style="padding: 10px 0 ;vertical-align: top;">
                        <p style="color: var(--tsecondary_color);  font-weight: bold; margin: 0; ">${quantity || '1'}</p>
                      </td>
                      <td style="text-align: right; padding: 10px 0;vertical-align: top;">
                        <p style="text-align: right; color: var(--tsecondary_color);  margin: 0; ">
                        ${(showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero ? `<span style="display: block;text-decoration: line-through;">${formatCurrency(price, item.currencyCode || 'USD')}</span>` : ''}
                        <span style="display: block;">${formatCurrency(price - totalDiscount, item.currencyCode || 'USD')}</span>
                        ${showDiscountAppliedOriginalPrice || hideDiscountZero ? `<span style="display: block; font-size: 10px;">(Discount ${formatCurrency(totalDiscount, item.currencyCode || 'USD')})</span>` : ''}
                        </p>
                      </td>
                      ${(settings?.showItemTotal ?? true) ? `<td style="text-align: right; padding: 10px 0;vertical-align: top;">
                        <p style="text-align: right; color: var(--tsecondary_color);   margin: 0; ">${formatCurrency(totalPriceWithDiscount, item.currencyCode || 'USD')}</p>
                      </td>` : ""}
                    </tr>
                    `;
  }).join('')
    }
                  </tbody>
                </table>
              </td>
            </tr>

            <!--Totals -->
            <tr>
              <td align="right">
                <table cellpadding="8" cellspacing="0" style="width: 300px; float: right;">
                  <tr>
                    <td align="left" style="padding: 10px 0;">
                      <p class="total_cell" style="color: var(--tsecondary_color);  margin: 0;">${language.subtotal || 'Subtotal'} ${settings?.showTotalQuantity ? `(${totalItems} Items) ` : ''}</p>
                    </td>
                    <td align="right" style="padding: 10px 0;">
                      <p class="total_cell" style="text-align: right; color: var(--tsecondary_color); margin:0;">${formatCurrency(subtotal, currency, showCurrencyCode)}</p>
                    </td>
                  </tr>

                    ${(
      (settings?.templateSettings?.discount?.hideDiscountTotalPriceZero === true && order?.totalDiscounts > 0) ||
      settings?.templateSettings?.discount?.hideDiscountTotalPriceZero !== true
    ) ? `<tr>
                    <td align="left" style="padding: 10px 0;">
                      <p class="total_cell" style="color: var(--tsecondary_color); margin:0;">${language.discount || 'Discount'}</p>
                    </td>
                    <td align="right" style="padding: 10px 0;">
                      <p class="total_cell" style="text-align: right; color: var(--tsecondary_color); margin: 0;">-${formatCurrency(order?.totalDiscounts, currency, showCurrencyCode)}</p>
                    </td>
                  </tr>` : ''}

                    ${templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalDiscounts > 0 ? `<tr>
                    <td align="left" style="padding: 10px 0;">
                      <p class="total_cell" style="color: var(--tsecondary_color); margin:0;">${language.subtotalAfterDiscount || 'Subtotal after discount'}</p>
                    </td>
                    <td align="right" style="padding: 10px 0;">
                      <p class="total_cell" style="text-align: right; color: var(--tsecondary_color); margin: 0;">${formatCurrency(order?.totalAfterDiscounts, currency, showCurrencyCode)}</p>
                    </td>
                  </tr>` : ''}

                  ${templateSettings?.taxes?.taxHideZero !== true && tax !== 0 ? `<tr>
                    <td align="left" style="padding: 10px 0;">
                      <p class="total_cell" style="color: var(--tsecondary_color); margin:0;">${language.tax || 'Tax'}</p>
                    </td>
                    <td align="right" style="padding: 10px 0;">
                      <p class="total_cell" style="text-align: right; color: var(--tsecondary_color); margin: 0;">${formatCurrency(tax, currency, showCurrencyCode)}</p>
                    </td>
                  </tr>` : ''}
                  <tr>
                    <td align="left" style="padding: 10px 0;"><p class="total_cell" style="color: var(--tsecondary_color);margin: 0;">${language.shipping || 'Shipping'} ${templateSettings?.shipping?.showShippingMethod == true ? `(Generic Shipping)` : ''}</p></td>
                    <td align="right" style="padding: 10px 0;"><p class="total_cell" style="color: var(--tsecondary_color); margin: 0;">${formatCurrency(totalShipping, currency, showCurrencyCode)}</p></td>
                  </tr>
                  <tr>
                    <td align="left" style="border-top: 1px solid #D7DAE0; padding: 20px 0;">
                      <p class="total_cell" style="color: var(--tsecondary_color);  font-weight: 700; margin: 0;">${language.total || 'Total'}</p>
                    </td>
                    <td align="right" style="border-top: 1px solid #D7DAE0; padding: 20px 0;">
                      <p class="total_cell" style="text-align: right;font-weight: 700; color: var(--tsecondary_color); margin: 0;">${formatCurrency(total, currency, showCurrencyCode)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

             ${settings?.showPaymentDetails ? `<tr>
          <td  style="padding-top: 20px;">
           <p class="heading_font" style="color: var(--tprimary_color);  font-weight: bold; ">${language?.paymentDetails || "Payment Details:"}</p>
            <div class="payment-details-section">
            ${(settings?.showPaymentGateway && transaction?.gateway) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.paymentGateway || "Gateway:"}</p>
                <p >${transaction.gateway}</p>
              </div>
            ` : ''}
            
            ${(settings?.showCardType && transaction?.paymentDetails?.company) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.cardType || "Card:"}</p>
                <p >${transaction?.paymentDetails?.company}</p>
              </div>
            ` : ''}

            ${(settings?.showCardLastDigit && transaction?.paymentDetails?.number) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.cardNumber || "Card#:"}</p>
                <p >${transaction?.paymentDetails?.number}</p>
              </div>
            ` : ''}
            </div>
          </td>
      </tr>` : ""}
            ${(settings?.showOrderNote && order?.note) ? `<tr>
                <td style="padding-top: 20px;">
                  <div style=""padding-top: 20px;"">
                    <p class="heading_font" style="color: var(--tprimary_color);  font-weight: bold; ">${language?.notes || "Notes:"}</p>
                    <p style="color: var(--tsecondary_color); margin-top: 7px; ">${order.note}</p>
                  </div> 
                </td>
            </tr>` : ""}
            <!--Footer -->
  <tr>
    <td style="padding-top: 100px;">
      <table width="100%">
        <tr>
          <td style="vertical-align: bottom;">
           <p class="table_cell" style="color: var(--tsecondary_color); margin: 0; ">${language.paymentInfo || 'Make all Checks payable to:'} ${companyName}.</p>
            <p class="heading_font" style="color: var(--tsecondary_color);  font-weight: bold; margin-top: 5px; ">${language.thankYouNote}</p>
          </td>
          <td align="right">
            ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" class="logo" width="100" style="border-radius: 50%;">` : `<span>${settings.brandName}</span>`}
          </td>
        </tr>
      </table>
    </td>
  </tr>
          </table >
  ${language?.termConditionContent ? `<div class="termConditionContent" style="text-align: left; padding-top: 42px; padding-left: 29px;font-size: 12px;color: ${settings.invoiceTextColor || '#000'}; ">
     ${language?.termConditionContent}
    </div>` : ''}
        </td >
      </tr >
    </table >
  </div > `;
};

export const generateInvoiceTemplate3 = (data) => {
  const normData = data || {};
  const templateSettings = normData.templateSettings || {};
  const order = normData.order || {};
  const invoice = normData.invoice || {};
  const settings = normData.settings || {};
  const language = normData.language || {};
  // Extract values with defaults
  const invoiceNumber = invoice?.invoiceNumber || '12345';
  const invoiceDate = formatDate(invoice?.createdAt || new Date(), settings?.date_format || 'MM/dd/yyyy');

  // Company info
  const companyName = settings?.businessName || 'Zylker Thread & Weave';
  const companyAddressComponents = [
    settings.street || '',
    `${settings.apartment ? settings.apartment + ', ' : ''} ${settings.city || ''}`,
    `${settings.state ? settings.state + ', ' : ''} ${settings.country ? settings.country + ', ' : ''} ${settings.zipCode || ''}`,
  ].filter(component => component && component.trim() !== '');

  const companyAddress = companyAddressComponents.join('<br>');

  // settings?.businessAddress || '14A, Northern Street<br>Greater South Avenue<br>New Yourl 25662<br>U.S.A';
  const phone = `Phone: ${settings?.phone} `;
  const logoUrl = settings?.logoUrl || "";

  // Primary color (with fallback)
  const primaryColor = settings?.primaryColor || '#8257d0';
  const primaryTextColor = settings?.primaryTextColor || '#8257d0';
  const secondaryColor = settings?.secondaryColor || '#F9FAFC';
  const invoiceTextColor = settings?.invoiceTextColor || '#000000';

  // Line items
  const lineItems = order?.lineItems || [];

  const totalItems = lineItems?.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const transaction = (order?.transactions && order.transactions[0]) || {}

  // Totals
  const showCurrencyCode = settings?.showCurrencyCode || false
  const subtotal = order?.subtotalPrice || '198.00';
  const tax = order?.totalTax || '9.90';
  const totalShipping = order?.totalShipping || '50.00';
  const total = order?.totalPrice || '257.90';
  const currency = order?.currency || 'USD';

  // Header for client info
  const clientName = order?.billingAddress?.firstName ? `${order.billingAddress.firstName} ${order.billingAddress.lastName}` : 'Acme LTD';
  const clientAddress = order?.billingAddress ? `${order.billingAddress.address1 || ''} ${order.billingAddress.address2 || ''} <br>
  ${order.billingAddress.city || ''}, ${order.billingAddress.province || ''} ${order.billingAddress.zip || ''}<br> ${order.billingAddress.country || ''}` : 'Toronto ON M5C 2T9';
  const clientEmail = order?.email || 'willie.jennings@example.com';

  // Footer note
  const footerNote = settings?.footerNote || 'Thank you for your business!';

  return `<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

 @import url('https://fonts.googleapis.com/css2?family=${settings.bodyFont || 'Arial'}&family=${settings.headingFont || 'Arial'}&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

.template3{
  color: ${invoiceTextColor};
  font-family: ${settings.bodyFont || 'Arial'};
}
   .order-meta-title{
      font-weight: bold;
      padding-bottom: 5px;
    }
    .payment-detail-item{
      display: flex;
      gap: 5px;
      flex-direction: row;
      font-size: 14px;
      color: var(--tsecondary_color);
    }
      .payment-details-section{
       display: flex;
      gap: 2px 15px;
      flex-direction: row;
      margin-top: 7px;
      color:black;
      flex-wrap: wrap;
      }
.heading_font{
 font-family: ${settings.headingFont || 'Arial'};
}
.template3 .logo span{font-weight: bold;font-size: 25px;text-transform: uppercase;border: 1px solid;text-align: center;padding: 5px 20px;margin-top: 20px;}
</style>

<body style="margin: 0;">
<div class="template3">
  <table width="580" align="center" cellpadding="0" cellspacing="0" style="padding: 40px 0 ; background: ${secondaryColor};">
    <!-- Header -->
    <tbody>
      <tr>
        <td>
          <table style="width: 100%;padding-bottom: 40px; ">
            <tr>
              <td colspan="2" style="padding-left: 40px;">
                <p class="heading_font" style="color: ${invoiceTextColor}; font-size: 34px;  font-weight: 600; text-transform: uppercase; line-height: 57.01px; word-wrap: break-word; margin: 0;">${language.invoice || 'Invoice'}</p>
                <p style="color: ${invoiceTextColor}; font-size: 16px;  text-transform: uppercase; line-height: 28.50px; letter-spacing: 0.59px; margin: 0; word-wrap: break-word">#${invoiceNumber}</p>
              </td>
              <td align="right" class="logo" style="padding-right: 40px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" class="logo" width="90" style="vertical-align: middle;;">` : `<span>${settings.brandName}</span>`}
              </td>
            </tr>
          </table>
        </td>
    </tr>
    <tr style="background: ${primaryColor};">
      <td style="width: 100%;">
        <table align="center" cellpadding="0" cellspacing="0" style="width: 100%;table-layout: fixed;">
          <tr>
              <td style="width: 33%; padding: 24px 28px 24px 40px; border-right: 1px solid #D7DAE0;">
                <p  class="heading_font" style="color: ${primaryTextColor};font-size: 16px;font-weight: 600;line-height: 24.94px;word-wrap: break-word;margin: 0;">${language.invoiceDate || 'Invoice Date'}</p>
                <p style="width: 100%;color: ${primaryTextColor};font-size: 14px;font-weight: 400;line-height: 24.94px;word-wrap: break-word;margin: 0;padding-top: 10px;">${invoiceDate}</p>
              </td>
              <td style="width: 33%; padding: 24px 28px; border-right: 1px solid #D7DAE0;">
                <p  class="heading_font" style="color: ${primaryTextColor};font-size: 16px;font-weight: 600;line-height: 24.94px;word-wrap: break-word;margin: 0;padding-bottom: 10px;">${language.billingAddress || 'Billing Address'}</p>
                <p style="width: 100%;color: ${primaryTextColor};font-size: 14px;font-weight: 400;line-height: 24.94px;word-wrap: break-word;margin: 0;">${companyName}</p>
                <p style="width: 100%;color: ${primaryTextColor};font-size: 14px;font-weight: 400;line-height: 24.94px;word-wrap: break-word;margin: 3px 0;">${companyAddress.replace(/<br>/g, '<br>')}</p>
              </td>
              <td style="width: 33%; padding: 24px 28px;">
                <p class="heading_font" style="color: ${primaryTextColor};font-size: 16px;font-weight: 600;line-height: 24.94px;word-wrap: break-word;margin: 0;padding-bottom: 10px;">${language.shippingAddress || 'Shipping Address'}</p>
                <p style="width: 100%;color: ${primaryTextColor};font-size: 14px;font-weight: 400;line-height: 24.94px;word-wrap: break-word;margin: 0;">Company Name</p>
                <p style="width: 100%;color: ${primaryTextColor};font-size: 14px;font-weight: 400;line-height: 24.94px;word-wrap: break-word;margin: 3px 0;">${companyAddress.replace(/<br>/g, '<br>')}</p>
              </td>
            </tr>
          </table>
        </td>
    </tr>
    <!-- Table Header -->
    <tr>
      <td colspan="3" style="padding: 24px 40px 0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tbody><tr style="">
            <th align="left" class="heading_font" style="color: ${primaryColor};border-bottom: 1px solid #D7DAE0;font-weight: 600;font-size: 16px;line-height: 25px;padding: 17px 0;">${language.item || 'ITEM'}</th>
            <th align="center" class="heading_font" style="color: ${primaryColor};border-bottom: 1px solid #D7DAE0;font-weight: 600;font-size: 16px;line-height: 25px;padding: 17px;">${language.QTY || 'QTY'}</th>
            <th align="right" class="heading_font" style="color: ${primaryColor};border-bottom: 1px solid #D7DAE0;font-weight: 600;font-size: 16px;line-height: 25px;padding: 17px;white-space: nowrap;">${language.unitPrice || 'UNIT PRICE'}</th>
            ${(settings?.showItemTotal ?? true) ? `<th align="right" class="heading_font" style="color: ${primaryColor};border-bottom: 1px solid #D7DAE0;font-weight: 600;font-size: 16px;line-height: 25px;padding: 17px 12px;">${language.total || 'TOTAL'}</th>` : ''}
          </tr>

          <!-- Item Row 1 -->
          ${lineItems.map((item, index) => {
    const price = parseFloat(item.price || 0);
    const totalDiscount = parseFloat(item.totalDiscount || 0);
    const quantity = item.quantity || 0;
    const totalPrice = price * quantity;
    const totalPriceWithDiscount = (price * quantity) - totalDiscount;
    const tax = item.tax || '5%';

    const showDiscountAppliedOriginalPrice = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === false);
    const hideDiscountZero = (templateSettings?.discount?.showDiscountAppliedOriginalPrice === true && templateSettings?.discount?.hideDiscountZero === true && totalDiscount > 0);
    return `
          <tr>
           
            <td style="padding: 17px 0 12px 0; vertical-align: top; font-weight: 400; letter-spacing: 0; font-size: 12px; color: ${invoiceTextColor};">
              <div style="display: flex; align-items: flex-start;">
               ${settings?.showImage ? `<img src="${item.image}" width="50" height="50" style="display: block;  margin-right: 10px;" />` : ''} 

                <!-- Text Content -->
                <div>
                  <p style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">
                    ${item.title || item.name || 'Unknown Item'}
                  </p>
                  <p style="margin: 0;">${item.variantTitle || item.description || '-'}</p>
                  <div style="margin-top: 4px;">
                    ${(settings?.showSku && item?.variant?.sku) ? `<p style="margin: 0;">${language?.SKU || "SKU:"} ${item?.variant?.sku}</p>` : ''}
                    ${(settings?.showBarcode && item?.variant?.barcode) ? `<p style="margin: 0;">${language?.barcode || "BARCODE:"} ${item?.variant?.barcode}</p>` : ''}
                    ${(settings?.showCountry && item?.variant?.inventoryItem?.countryCodeOfOrigin) ? `<p style="margin: 0;">${language?.countryOfOrigin || "Country Of Origin:"} ${item?.variant?.inventoryItem?.countryCodeOfOrigin}</p>` : ''}
                    ${(settings?.showHsCode && item?.variant?.inventoryItem?.harmonizedSystemCode) ? `<p style="margin: 0;">${language?.hsCode || "HS Code:"} ${item?.variant?.inventoryItem?.harmonizedSystemCode}</p>` : ''}
                    ${(settings?.showWeight && item?.variant?.inventoryItem?.weightValue) ? `<p style="margin: 0;">${language?.weight || "Weight:"} ${item?.variant?.inventoryItem?.weightValue || 0} ${item?.variant?.inventoryItem?.weightUnit || "lb"}</p>` : ''}
                  </div>
                </div>
                
              </div>
            </td>
            <td align="center" style="padding: 17px 0 12px 0;margin: 0;margin-bottom:7px;font-weight: 500;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};vertical-align: top;">${quantity || '1'}</td>
            <td align="right" style="padding: 17px 0 12px 0;margin: 0;margin-bottom:7px;font-weight: 500;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor}; vertical-align: top;">
              ${(showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero ? `<span style="display: block;text-decoration: line-through;">${formatCurrency(price, item.currencyCode || 'USD')}</span>` : ''}
              <span style="display: block;">${formatCurrency(price - totalDiscount, item.currencyCode || 'USD')}</span>
              ${showDiscountAppliedOriginalPrice || hideDiscountZero ? `<span style="display: block; font-size: 12px;">(Discount ${formatCurrency(totalDiscount, item.currencyCode || 'USD')})</span>` : ''}
            </td>
            ${(settings?.showItemTotal ?? true) ? `<td align="right" style="padding: 17px 0 12px 0;margin: 0;margin-bottom:7px;font-weight: 500;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor}; vertical-align: top;">${formatCurrency(totalPriceWithDiscount, item.currencyCode || 'USD')}</td>` : ''}
          </tr>`;
  }).join('')
    }
          <!-- Summary -->
          <tr style="border-top: 1px solid #D7DAE0;">
            <td align="right" colspan="4">
              <table style="float: right; width: 300px;padding-top: 20px;margin-bottom:80px;" cellpadding="9" cellspacing="0">
                <tbody>
                  <tr style="border-top: 1px solid #D7DAE0;">
                    <td colspan="3" align="right" style="padding-left: 0;border-bottom: 1px solid #D7DAE0;text-align: left;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${language.subtotal || 'Subtotal'}${settings?.showTotalQuantity ? ` (${totalItems} Items):` : ':'}</td>
                    <td align="right" style="padding-right: 0;border-bottom: 1px solid #D7DAE0;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${formatCurrency(subtotal, currency, showCurrencyCode)}</td>
                  </tr>
                  
                  ${(
      (settings?.templateSettings?.discount?.hideDiscountTotalPriceZero === true && order?.totalDiscounts > 0) ||
      settings?.templateSettings?.discount?.hideDiscountTotalPriceZero !== true
    ) ? `<tr>
                    <td colspan="3" align="right" style="text-align: left;padding-left: 0;border-bottom: 1px solid #D7DAE0;text-align: left;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${language.discount || 'Discount'}:</td>
                    <td align="right" style="padding-right: 0;border-bottom: 1px solid #D7DAE0;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">-${formatCurrency(order?.totalDiscounts, currency, showCurrencyCode)}</td>
                  </tr>` : ''}
                  
                  ${templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalAfterDiscounts > 0 ? `<tr>
                    <td colspan="3" align="right" style="text-align: left;padding-left: 0;border-bottom: 1px solid #D7DAE0;text-align: left;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${language.subtotalAfterDiscount || 'Subtotal after discount'}:</td>
                    <td align="right" style="padding-right: 0;border-bottom: 1px solid #D7DAE0;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${formatCurrency(order?.totalAfterDiscounts, currency, showCurrencyCode)}</td>
                  </tr>` : ''}
                  
                  ${templateSettings?.taxes?.taxHideZero !== true || (templateSettings?.taxes?.taxHideZero === true && tax !== 0) ? `<tr>
                    <td colspan="3" align="right" style="text-align: left;padding-left: 0;border-bottom: 1px solid #D7DAE0;text-align: left;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${language.tax || 'Tax'}:</td>
                    <td align="right" style="padding-right: 0;border-bottom: 1px solid #D7DAE0;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${formatCurrency(tax, currency, showCurrencyCode)}</td>
                  </tr>` : ''}
                  
                  <tr>
                    <td colspan="3" align="right" style="text-align: left;padding-left: 0;border-bottom: 1px solid #D7DAE0;text-align: left;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${language.shipping || 'Shipping'} ${templateSettings?.shipping?.showShippingMethod == true ? `(Generic Shipping)` : ''}:</td>
                    <td align="right" style="padding-right: 0;border-bottom: 1px solid #D7DAE0;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${formatCurrency(totalShipping, currency, showCurrencyCode)}</td>
                  </tr>
                  <tr>
                    <td colspan="3" align="right" style="text-align: left;padding-left: 0;text-align: left;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${language.total || 'Total'}:</td>
                    <td align="right" style="padding-right: 0;margin: 0;margin-bottom:7px;font-weight: 600;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${invoiceTextColor};">${formatCurrency(total, currency, showCurrencyCode)}</td>
                  </tr>
                  <tr>
                    <td colspan="3" align="right" style="text-align: left;padding-left: 0;border-bottom: 2.67px solid ${primaryColor};border-top: 2.67px solid ${primaryColor};text-align: left;margin: 0;margin-bottom:7px;font-weight: 700;font-size: 14px;line-height: 24.94px;letter-spacing: 0;color: ${primaryColor};">Amount due</td>
                    <td align="right" style="padding-right: 0; border-bottom: 2.67px solid ${primaryColor}; border-top: 2.67px solid ${primaryColor}; text-align: right; margin: 0;margin-bottom:7px;font-weight: 700;font-size: 14px;line-height: 24.94px;letter-spacing: 0; color: ${primaryColor};">${formatCurrency(total, currency, showCurrencyCode)}</td>
                  </tr>
              </tbody >
          </table >
      </td >
      </tr >
      <!--Footer -->

        ${settings?.showPaymentDetails ? `<tr>
          <td  style="padding-top: 20px;">
           <p class="heading_font" style="color: ${primaryColor};  font-weight: bold; ">${language?.paymentDetails || "Payment Details:"}</p>
            <div class="payment-details-section">
            ${(settings?.showPaymentGateway && transaction?.gateway) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.paymentGateway || "Gateway:"}</p>
                <p >${transaction.gateway}</p>
              </div>
            ` : ''}
            
            ${(settings?.showCardType && transaction?.paymentDetails?.company) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.cardType || "Card:"}</p>
                <p >${transaction?.paymentDetails?.company}</p>
              </div>
            ` : ''}

            ${(settings?.showCardLastDigit && transaction?.paymentDetails?.number) ? `
              <div class="payment-detail-item"> 
                <p class="order-meta-title">${language?.cardNumber || "Card#:"}</p>
                <p >${transaction?.paymentDetails?.number}</p>
              </div>
            ` : ''}
            </div>
          </td>
      </tr>` : ""}

       ${(settings?.showOrderNote && order?.note) ? `<tr>
                <td style="padding: 20px 0 0px 0;color: ${settings.invoiceTextColor || '#000'};">
                  <div>
                    <p class="heading_font" style="color: ${primaryColor};  font-weight: bold; margin-bottom:3px;">${language?.notes || "Notes:"}</p>
                    <p style="font-size: 14px;">${order.note}</p>
                  </div> 
                </td>
            </tr>` : ""}
  <tr >
    <td colspan="4" style="font-size: 14px;padding: 20px 0 0px 0;">
      <p class="heading_font" style="padding-bottom: 7px;text-align: left;margin: 0;font-weight: 600;font-size: 16px;letter-spacing: 0;color: ${invoiceTextColor};margin: 0; ">${language.thankYouNote}</p>
      <p style="display: flex;align-items: center;text-align: left;margin: 0;font-weight: 400;font-size: 16px;letter-spacing: 0;color: ${invoiceTextColor}; font-family: ${settings.bodyFont || 'Arial'};">${language?.paymentInfo || 'Make all Checks payable to Uncap'}  ${companyName}</p>
    </td>
  </tr>
  
   <tr>
   ${language?.termConditionContent ? `<td colspan="4" style="font-size: 14px; padding-top: 20px;color: ${settings.invoiceTextColor || '#000'};">
     ${language?.termConditionContent}
    </td>` : ''}
  </tr>
        </tbody >
      </table >
      </td >
    </tr >
  <tr>
    <td>
      <table style="width: 100%;">
        <tr>
          <td colspan="2" style="padding-top: 81px; font-size: 12px; text-align: left; color: #999; padding-left: 55px;">
            <p style="width: 100%;color: ${invoiceTextColor};font-size: 14px;line-height: 24.94px;word-wrap: break-word;margin: 0;">${settings.brandName}</p>
          </td>
          <td colspan="2" style="padding-top: 81px; font-size: 12px; text-align: right; color: #999; padding-right: 55px;">
            <p style="color: ${invoiceTextColor};font-size: 14px;line-height: 24.94px;word-wrap: break-word;text-wrap-mode: nowrap;margin: 0;">
            ${settings?.phone ? `<a style="color: ${invoiceTextColor};font-size: 14px;line-height: 24.94px;word-wrap: break-word;margin: 0;text-decoration: none;" href="tel:${settings?.phone}">${settings?.phone}</a>` : ''} &nbsp;
            ${settings?.supportEmail ? `| &nbsp; <a style="color: ${invoiceTextColor};font-size: 14px;line-height: 24.94px;word-wrap: break-word;margin: 0;text-decoration: none;" href="mailto:${settings?.supportEmail}">${settings?.supportEmail}</a>` : ''}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  </tbody >
</table > `;
};

/**
 * Preview component data for the template editor
 * @returns {Object} - Sample data for template preview
          */
export const getPreviewData = () => {
  return {
    invoice: {
      invoiceNumber: '10001',
      createdAt: new Date(), // now
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'draft'
    },
    order: {
      currency: "USD",
      subtotalPrice: "198.00",
      totalDiscounts: 10,
      totalAfterDiscounts: "188",
      totalTax: "9.90",
      totalShipping: "50.00",
      totalPrice: "247.90",
      note: 'Test Order Note',
      email: "customer@example.com",
      billingAddress: {
        firstName: "John",
        lastName: "Doe",
        address1: "123 Main Street",
        city: "New York",
        province: "NY",
        zip: "10001",
        country: "United States"
      },
      lineItems: [
        {
          name: "Converse All Star",
          description: "Size 9",
          price: 54.44,
          totalDiscount: 10,
          quantity: 1,
          tax: "5%",
          total: 49.00,
          currencyCode: "USD",
          image: "https://cdn.shopify.com/s/files/1/0932/8882/5121/files/Main_589fc064-24a2-4236-9eaf-13b2bd35d21d.jpg?v=1742906376",
          variant: {
            id: "51085991117089",
            sku: "SKU2006-020",
            barcode: "12345 00010",
            taxCode: "",
            inventoryItem: {
              id: "53135180071201",
              countryCodeOfOrigin: "US",
              harmonizedSystemCode: "900410",
              weightUnit: "lb",
              weightValue: 2,
              cost: null,
              requiresShipping: true,
              tracked: true
            }
          }
        },
        {
          name: "Converse All Star",
          description: "White",
          price: 159.00,
          totalDiscount: 0,
          quantity: 1,
          tax: "5%",
          total: 149.00,
          currencyCode: "USD",
          image: "https://cdn.shopify.com/s/files/1/0932/8882/5121/files/snowboard_wax.png?v=1742906376",
          variant: {
            id: "51085991117089",
            sku: "SKU2006-002",
            barcode: "12345 05550",
            taxCode: "",
            inventoryItem: {
              id: "53135180071201",
              countryCodeOfOrigin: "US",
              harmonizedSystemCode: "900010",
              weightUnit: "lb",
              weightValue: 10,
              cost: null,
              requiresShipping: true,
              tracked: true
            }
          }
        }
      ],
      transactions: [
        {
          amount: "885.95",
          gateway: "shopify_payments",
          processedAt: "2025-06-19T07:18:19Z",
          paymentDetails: {
            bin: "400005",
            company: "Visa",
            number: "•••• •••• •••• 5556",
            name: "Dhruvi Narola",
            paymentMethodName: "card",
            wallet: null,
            expirationMonth: 12,
            expirationYear: 2034
          }
        }
      ]
    },
    settings: {
      businessName: 'Your Business Name',
      businessAddress: '123 Business Street<br>Business City, 12345<br>Business Country',
      contactInfo: 'Phone: 123-456-7890 | Email: contact@yourbusiness.com',
      logoUrl: 'https://via.placeholder.com/80',
      primaryColor: '#8257d0',
      secondaryColor: '#f0ecf9',
      footerNote: 'Thank you for your business!'
    }
  };
};


export default {
  getTemplate,
  generateInvoiceHTML,
  generateInvoiceTemplate2,
  formatCurrency,
  formatDate,
  generateLineItemsHTML,
  getPreviewData
};