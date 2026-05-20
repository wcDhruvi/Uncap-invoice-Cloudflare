import { getDrizzle } from '../../../db/drizzle';
import { plans, shops } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { GraphQLClient } from 'graphql-request';
import { getShopByDomain } from '../../../db/dbHelpers';
import { CREATE_SUBSCRIPTION_MUTATION } from '../shop/graphqlQuery';


export const getPlans = async (c) => {
  const db = getDrizzle(c.env);

  try {
    const result = await db.select().from(plans);

    // features is stored as JSON string — parse it for the frontend
    const parsed = result.map(p => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      monthly_price: p.monthly_price ?? 0,
      trial_days: p.trial_days ?? 0,
    }));
    const data = {
      data: parsed
    }

    return c.json(data);

  } catch (error) {
    console.error('[GET /plans]', error);
    return c.json({ error: error.message }, 500);
};
}

const trialCalculations = (usedTrialMinutes = 0, usedTrialMinutesUpdatedAt, today, defaultTrialDays) => {
  const lastUpdated = usedTrialMinutesUpdatedAt ? new Date(usedTrialMinutesUpdatedAt) : today;
  const diffInMinutes = Math.floor((today.getTime() - lastUpdated.getTime()) / 1000 / 60);
  const usedMinutes = diffInMinutes + usedTrialMinutes;

  return {
    usedTrialMinutes: Math.min(defaultTrialDays * 24 * 60, usedMinutes),
    availableTrialDays: Math.max(
      0,
      Math.round(defaultTrialDays - (usedMinutes / 60 / 24))
    ),
  };
};

export const selectAppPlan = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);
  const { plan_id } = await c.req.json();

  try {
    // 1. Fetch shop to get access token
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop || !shop.access_token) {
      return c.json({ error: 'Shop not found or missing access token' }, 404);
    }

    // 2. Fetch plan details from DB
    const planRecords = await db.select().from(plans).where(eq(plans.id, plan_id));
    if (planRecords.length === 0) {
      return c.json({ error: 'Invalid plan selected' }, 400);
    }
    const plan = planRecords[0];

    // 3. Create GraphQL Client
    const graphqlClient = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
      headers: {
        'X-Shopify-Access-Token': shop.access_token,
      },
    });

    // 4. Construct return URL for the billing callback
    let host = c.req.header('host');
    const forwardedHost = c.req.header('x-forwarded-host');
    const forwardedProto = c.req.header('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      host = forwardedHost.split(',')[0].trim();
    }
    const baseUrl = c.env.APP_URL && !host.includes('localhost') && !host.includes('127.0.0.1')
      ? c.env.APP_URL
      : `${forwardedProto}://${host}`;

    const returnUrl = `${baseUrl}/api/plans/billing-callback?shop=${shopDomain}&plan_id=${plan.id}`;

    // 5. Calculate Trial Days
    const defaultTrialDays = Number(plan.trial_days || 0);
    const today = new Date();
    const { availableTrialDays } = trialCalculations(
      shop.used_trial_minutes,
      shop.used_trial_minutes_updated_at,
      today,
      defaultTrialDays
    );

    // 6. Execute GraphQL Mutation
    const variables = {
      name: plan.name,
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: plan.monthly_price,
              currencyCode: plan.currency || "USD"
            },
            interval: "EVERY_30_DAYS" // Defaulting to monthly as per DB schema
          }
        }
      }],
      trialDays: availableTrialDays,
      returnUrl: returnUrl,
      test: true // Set to false in production if needed, or based on c.env.NODE_ENV
    };

    // FIXED: pass variables directly, not inside { variables: variables }
    const response = await graphqlClient.request(CREATE_SUBSCRIPTION_MUTATION, variables);
    const result = response.appSubscriptionCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Create app subscription failed: ${result.userErrors[0].message}`);
    }

    console.log(`${shopDomain} created subscription for plan ${plan.name}, ID: ${result.appSubscription.id}`);

    return c.json({
      apiStatus: 200,
      subscriptionId: result.appSubscription.id,
      confirmationUrl: result.confirmationUrl,
      status: result.appSubscription.status,
    });

  } catch (error) {
    console.error('Error creating app subscription:', error);
    return c.json({ apiStatus: 500, error: error.message }, 500);
  }
};

export const billingCallback = async (c) => {
  const shopDomain = c.req.query('shop');
  const plan_id = c.req.query('plan_id');
  const charge_id = c.req.query('charge_id');
  
  if (!shopDomain || !charge_id || !plan_id) {
    return c.text('Missing required parameters in callback', 400);
  }

  const db = getDrizzle(c.env);

  try {
    // 1. Get shop
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.text('Shop not found', 404);
    }

    // 2. Fetch plan details to calculate used trial minutes accurately
    const planRecords = await db.select().from(plans).where(eq(plans.id, plan_id));
    const defaultTrialDays = planRecords.length > 0 ? Number(planRecords[0].trial_days || 0) : 0;
    
    const today = new Date();
    const { usedTrialMinutes } = trialCalculations(
      shop.used_trial_minutes,
      shop.used_trial_minutes_updated_at,
      today,
      defaultTrialDays
    );

    // 3. Update shop with active subscription ID and plan ID and trial times
    await db.update(shops)
      .set({
        active_recurring_subscription_id: charge_id,
        plan_id: parseInt(plan_id, 10),
        used_trial_minutes: usedTrialMinutes,
        used_trial_minutes_updated_at: today.toISOString(),
        updated_at: today.toISOString()
      })
      .where(eq(shops.id, shop.id));

    console.log(`Successfully activated subscription ${charge_id} for shop ${shopDomain} on plan ${plan_id}`);

    // 4. Redirect back to embedded app
    const appUrl = `https://${shopDomain}/admin/apps/${c.env.SHOPIFY_API_KEY}`;
    return c.redirect(appUrl);

  } catch (error) {
    console.error('Error in billing callback:', error);
    return c.text('Internal Server Error processing billing callback', 500);
  }
};
