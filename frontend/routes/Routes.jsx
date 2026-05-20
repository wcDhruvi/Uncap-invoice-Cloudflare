import { lazy, Suspense } from 'react';
import { Spinner } from '@shopify/polaris';
import { appRoutes } from './AppRoutes';

// ── Lazy imports — matching your exact file paths ─────────────────────────────
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Orders = lazy(() => import('../pages/Orders'));
const Settings = lazy(() => import('../pages/Settings'));
const SettingEmail = lazy(() => import('../pages/SettingEmail'));
const SettingTemplate = lazy(() => import('../pages/SettingTemplate'));
const DesignSettings = lazy(() => import('../pages/SettingsDesign'));
const SettingCompanyDetail = lazy(() => import('../pages/SettingCompanyDetail'));
const SettingLanguage = lazy(() => import('../pages/SettingLanguage'));
const FaqsPage = lazy(() => import('../pages/Faqs'));
const BillingPage = lazy(() => import('../pages/BillingPage'));
const Support = lazy(() => import('../pages/Support'));
const Installation = lazy(() => import('../pages/Installation'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export const RouteLoading = () => <Spinner accessibilityLabel="Loading page" />;

const routes = [
  { path: appRoutes.dashboard,        component: <Dashboard /> },
  { path: appRoutes.orders,           component: <Orders /> },
  { path: appRoutes.settings,         component: <Settings /> },
  { path: appRoutes.emailSettings,    component: <SettingEmail /> },
  { path: appRoutes.templateSettings, component: <SettingTemplate /> },
  { path: appRoutes.designSettings,   component: <DesignSettings /> },
  { path: appRoutes.companySettings,  component: <SettingCompanyDetail /> },
  { path: appRoutes.languageSettings, component: <SettingLanguage /> },
  { path: appRoutes.faqs,             component: <FaqsPage /> },
  { path: appRoutes.plans,            component: <BillingPage /> },
  { path: appRoutes.support,          component: <Support /> },
  { path: appRoutes.installation,     component: <Installation /> },
  { path: '*',                        component: <NotFoundPage /> },
];

export default routes;