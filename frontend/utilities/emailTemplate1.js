import { format } from 'date-fns';
/**
 * Client-side utility for generating invoice email templates with dynamic data
 * This file provides React-compatible functions for email template generation
 */

/**
 * Format currency values for display
 * @param {number|string} value - The amount to format
 * @param {string} currency - The currency code (USD, CAD, etc.)
 * @returns {string} - The formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
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
export const generateLineItemsHTML = (lineItems, templateSettings, language) => {
  if (!lineItems || lineItems.length === 0) {
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
        <td>${item.title || item.name || 'Unknown Item'} <br><span style="font-size: 14px;">${item.variantTitle || item.description || '-'}</span></td>
        <td>${quantity || '1'}</td>
        <td> 
        ${(showDiscountAppliedOriginalPrice && totalDiscount > 0) || hideDiscountZero ? `<span style="display: block;text-decoration: line-through;">${formatCurrency(price, item.currencyCode || 'USD')}</span>` : ''}
        <span style="display: block;">${formatCurrency(price - totalDiscount, item.currencyCode || 'USD')}</span>
        ${showDiscountAppliedOriginalPrice || hideDiscountZero ? `<span style="display: block;font-size: 14px;">(Discount ${formatCurrency(totalDiscount, item.currencyCode || 'USD')})</span>` : ''}
        </td>
        ${templateSettings?.taxes?.taxEachProduct === 'true1' ? `<td>${tax}</td>` : ''}
        <td> ${formatCurrency(totalPriceWithDiscount, item.currencyCode || 'USD')}</td >
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
  const { templateSettings = {}, order = {}, invoice = {}, settings = {}, language = {} } = data;

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
  const lineItems = order?.lineItems;

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

  // Footer note
  const footerNote = settings?.footerNote || 'Thank you for your business!';

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
        max-width: 80px;
      max-height: 80px;
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
      font-weight: 600;
      letter-spacing: 0.3px;
    }

      /* Payment info */
      .payment-info {
        text-align: center;
      margin: 30px 0 0px;
      font-size: 18px;
      line-height: 25px;
      letter-spacing: 0.4px;
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
              <th>${language.unitPrice || 'UNIT PRICE'}</th>
              ${templateSettings?.taxes?.taxEachProduct === 'true1' ? `<th>${language.tax || 'TAX'}</th>` : ''}
              <th>${language.total || 'TOTAL'}</th>
            </tr>
          </thead>
          <tbody>
            ${generateLineItemsHTML(lineItems, templateSettings, language)}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals">
          <div class="total-row">
            <div>${language.subtotal || 'Subtotal'}:</div>
            <div>${formatCurrency(subtotal, currency)}</div>
          </div>

          ${templateSettings?.discount?.hideDiscountTotalPriceZero !== true && order?.totalDiscounts > 0 ? `<div class="total-row"><div>${language.discount || 'Discount'}:</div><div>-${formatCurrency(order?.totalDiscounts, currency)}</div></div>` : ''}
          ${templateSettings?.discount?.showDiscountAfterSubtotal === true && order?.totalDiscounts > 0 ? `<div class="total-row"><div>${language.subtotalAfterDiscount || 'Subtotal after discount'}:</div><div>${formatCurrency(order?.totalAfterDiscounts, currency)}</div></div>` : ''}

          ${templateSettings?.taxes?.taxHideZero !== true && tax !== 0 ? `<div class="total-row"><div>${language.tax || 'Tax'}:</div><div>${formatCurrency(tax, currency)}</div></div>` : ''}

          <div class="total-row">
            <div>${language.shipping || 'Shipping'} ${templateSettings?.shipping?.showShippingMethod == true ? `(Generic Shipping)` : ''}:</div>
            <div>${formatCurrency(totalShipping, currency)}</div>
          </div>

          <div class="total-row">
            <div><strong>${language.total || 'Total'}:</strong></div>
            <div><strong>${formatCurrency(total, currency)}</strong></div>
          </div>
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

/**
 * Get a complete invoice template with given data
 * For use in React components
 *
 * @param {Object} invoice - Invoice data
          * @param {Object} order - Shopify order data
          * @param {Object} settings - Invoice settings with styling preferences
          * @returns {string} - Complete HTML for the invoice
          */
export const getTemplate = (templateSettings = {}, order = {}, invoice = {}, settings = {}, language = {}) => {
  const data = {
    templateSettings,
    order,
    invoice,
    settings,
    language
  };
  // console.log('== templateSettings 1== ', templateSettings);
  // console.log('== data 1== ', data);
  return generateInvoiceHTML(data);
};

/**
 * Preview component data for the template editor
 * @returns {Object} - Sample data for template preview
          */
export const getPreviewData = () => {
  return {
    invoice: {
      invoiceNumber: '10001',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'draft'
    },
    order: {
      currency: 'USD',
      subtotalPrice: '198.00',
      totalDiscounts: '10',
      totalAfterDiscounts: '188',
      totalTax: '9.90',
      totalShipping: '50.00',
      totalPrice: '247.90',
      email: 'customer@example.com',
      billingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main Street',
        city: 'New York',
        province: 'NY',
        zip: '10001',
        country: 'United States'
      },
      lineItems: [
        {
          name: 'Converse All Star',
          description: 'Size 9',
          price: 54.44,
          totalDiscount: 10,
          quantity: 1,
          tax: '5%',
          total: 49.00,
          currencyCode: 'USD'
        },
        {
          name: 'Converse All Star',
          description: 'White',
          price: 159.00,
          totalDiscount: 0,
          quantity: 1,
          tax: '5%',
          total: 149.00,
          currencyCode: 'USD'
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
  formatCurrency,
  formatDate,
  generateLineItemsHTML,
  getPreviewData
};