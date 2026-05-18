import { OrderModel, ShopModel } from "../db/models";

export const handleWebhook = async (c) => {
  const topic = c.req.header('x-shopify-topic');
  const shopDomain = c.req.header('x-shopify-shop-domain');
  const payload = await c.req.json();

  console.log(`Received webhook ${topic} for ${shopDomain}`);

  const db = c.env.DB;

  switch (topic) {
    case 'orders/create':
    case 'orders/updated':
      const shop = await ShopModel.getByDomain(db, shopDomain);
      if (shop) {
        await OrderModel.upsert(db, {
          id: payload.id,
          shop_id: shop.id,
          email: payload.email,
          number: payload.number,
          order_number: payload.order_number,
          total_price: payload.total_price,
          currency: payload.currency,
          financial_status: payload.financial_status,
          fulfillment_status: payload.fulfillment_status
        });
      }
      break;

    case 'app/uninstalled':
      // Handle cleanup
      console.log(`App uninstalled from ${shopDomain}`);
      break;

    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return c.json({ success: true });
};
