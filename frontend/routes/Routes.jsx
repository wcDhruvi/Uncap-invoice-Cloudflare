import Dashboard from '../pages/Dashboard';
import NotFoundPage from '../pages/NotFoundPage';
import { Spinner } from '../components/ui';
import { appRoutes } from './AppRoutes';

export const RouteLoading = () => (
    <Spinner />
);

const routes = [
    { path: `${appRoutes?.dashboard}`, component: <Dashboard /> },
    { path: `*`, component: <NotFoundPage /> },
]

export default routes;
