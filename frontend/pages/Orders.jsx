import { useContext, useState, useEffect } from "react"; // ← removed unused hooks
import {
  Page, Text, BlockStack, Card, Button, InlineStack, Box,
  Spinner, Banner, Popover, ActionList, Badge,
  IndexTable
} from "@shopify/polaris"; // ← removed useIndexResourceState and Pagination
import { format } from "date-fns";
import { ShopContext } from "../providers";
import useApiService from "../utils/ApiService";

const Orders = () => {
  const { shop } = useContext(ShopContext);
  const api = useApiService();

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePopover, setActivePopover] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [sentInvoices, setSentInvoices] = useState({});

  const limit = 10;

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      const data = await api.getOrderList({ page, limit });
      if (data.apiStatus !== 200) {
        setError(data.message || 'Failed to fetch orders');
      } else {
        setOrders(data.data || []);
        setTotalCount(data.pagination?.total || 0);
      }
      setLoading(false);
    };
    loadOrders();
  }, [page]);

  const handlePreviousPage = () => { setActivePopover(null); setPage(p => p - 1); };
  const handleNextPage = () => { setActivePopover(null); setPage(p => p + 1); };

  const handleTogglePopover = (strId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePopover(prev => prev === strId ? null : strId);
  };

  const handleAction = async (orderId, actionType) => {
    setActionLoading(prev => ({ ...prev, [orderId]: actionType }));
    setError(null);
    try {
      if (actionType === 'view' || actionType === 'generate') {
        const result = await api.getInvoiceByOrder({ orderId, regenerate: actionType === 'generate' });
        if (result.apiStatus !== 200) throw new Error(result.message || 'Action failed');
        if (result.pdf_url) window.open(result.pdf_url, '_blank');
        else throw new Error("PDF not found for this invoice.");
      } else if (actionType === 'sent') {
        const invData = await api.createInvoice({ orderId });
        if (invData.apiStatus !== 200 || !invData.id) throw new Error(invData.message || "Invoice creation failed");
        const sendResult = await api.sendInvoice(invData.id, { invoiceFor: 'new' });
        if (sendResult.apiStatus !== 200) throw new Error(sendResult.message || 'Send failed');
        setSentInvoices(prev => ({ ...prev, [orderId]: true }));
      }
      setActivePopover(null);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const formatBadge = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const rowMarkup = orders.map((record, index) => {
    const strId = String(record.id);
    const fStatus = record?.fulfillmentStatus;
    const orderUrl = `https://${shop?.domain || 'admin.shopify.com'}/admin/orders/${record.id}`;

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: shop?.currency || 'USD',
      minimumFractionDigits: 2,
    });

    return (
      <IndexTable.Row
        id={strId}
        key={strId}
        position={index}
      >
        <IndexTable.Cell>
          <Button variant="plain" onClick={() => window.open(orderUrl, '_blank')}>
            <Text fontWeight="medium">{record.name}</Text>
          </Button>
        </IndexTable.Cell>

        <IndexTable.Cell>
          {record.customer
            ? <Text>{record.customer.firstName} {record.customer.lastName}</Text>
            : <Text tone="subdued">No customer</Text>}
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text>
            {record.processedAt ? format(new Date(record.processedAt), 'd MMM, yyyy') : '—'}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text>{formatter.format(parseFloat(record.totalPrice) || 0)}</Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Badge tone={record.financialStatus === 'PAID' ? 'success' : 'attention'}>
            {formatBadge(record.financialStatus || 'Pending')}
          </Badge>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Badge tone={fStatus === 'FULFILLED' ? 'success' : 'attention'}>
            {formatBadge(fStatus || 'Unfulfilled')}
          </Badge>
        </IndexTable.Cell>

        {/* ── Actions popover ── */}
        <IndexTable.Cell>
          <Popover
            active={activePopover === strId}
            onClose={() => setActivePopover(null)}
            activator={
              <Button
                variant="plain"
                disclosure
                onClick={(e) => handleTogglePopover(strId, e)}
              >
                Actions
              </Button>
            }
          >
            <ActionList
              actionRole="menuitem"
              items={[
                {
                  content: actionLoading[strId] === 'view' ? 'Viewing...' : 'View Invoice',
                  prefix: actionLoading[strId] === 'view' ? <Spinner size="small" /> : null,
                  onAction: () => handleAction(record.id, 'view'),
                  disabled: !!actionLoading[strId],
                },
                {
                  content: actionLoading[strId] === 'generate' ? 'Generating...' : 'Regenerate PDF',
                  prefix: actionLoading[strId] === 'generate' ? <Spinner size="small" /> : null,
                  onAction: () => handleAction(record.id, 'generate'),
                  disabled: !!actionLoading[strId],
                },
                {
                  content: actionLoading[strId] === 'sent'
                    ? 'Sending...'
                    : sentInvoices[strId] ? 'Resend Invoice' : 'Send Invoice to Customer',
                  prefix: actionLoading[strId] === 'sent' ? <Spinner size="small" /> : null,
                  onAction: () => handleAction(record.id, 'sent'),
                  disabled: !!actionLoading[strId],
                },
              ]}
            />
          </Popover>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });


  return (
    <Page title="Orders" subtitle="View all orders and manage invoices" divider>
      <BlockStack gap="400">
        <Card padding="0">
          <BlockStack gap="400">
            <Box padding="400">
              <Text as="h2" variant="headingMd">Order List</Text>
              <Text as="p" variant="bodyMd">
                View all orders from your shop. Generate, view, or download invoices for each order.
              </Text>
              {error && (
                <Box paddingBlockStart="200">
                  <Banner tone="critical" onDismiss={() => setError(null)}>
                    <Text as="p">{error}</Text>
                  </Banner>
                </Box>
              )}
            </Box>

            <IndexTable
              selectable={false}          // ← no checkboxes
              resourceName={{ singular: 'order', plural: 'orders' }}
              itemCount={orders.length}
              loading={loading}
              headings={[
                { title: '#Order' },
                { title: 'Customer' },
                { title: 'Date' },
                { title: 'Total' },
                { title: 'Payment' },
                { title: 'Fulfillment' },
                { title: 'Actions' },
              ]}
              pagination={{
                hasPrevious: page > 1,
                onPrevious: handlePreviousPage,
                hasNext: page * limit < totalCount,
                onNext: handleNextPage,
              }}
            >
              {rowMarkup}
            </IndexTable>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
};

export default Orders;