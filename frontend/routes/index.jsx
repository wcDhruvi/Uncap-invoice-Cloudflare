import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { baseUrl } from "../utils/Constent";
import { appRoutes } from './AppRoutes';
import routes from './Routes';
const AppRoutes = ({  }) => {
    return (
        <>
            <Suspense fallback={ null}>
                <Routes>
                    {(routes || []).map((route, index) => (
                        <Route key={`${route.path}-${index}`} path={route.path} element={route.component} />
                    ))}
                    <Route path={`${baseUrl}`} element={<Navigate to={`${appRoutes?.dashboard}${window.location.search}`} replace />} />
                </Routes>
            </Suspense>
        </>
    );
};

export default AppRoutes;