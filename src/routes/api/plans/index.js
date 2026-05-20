import { Hono } from 'hono';
import { getPlans, selectAppPlan } from './controller';

const plansApi = new Hono();

plansApi.get('/', getPlans);
plansApi.post('/select-plan', selectAppPlan);

export default plansApi;
