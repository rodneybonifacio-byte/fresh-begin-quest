// src/routes/route.utils.ts
import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

export type ProtectedRouteItem = {
    path: string;
    permission?: string;
    component: () => Promise<{ default: React.ComponentType<any> }>;
};

export const generateProtectedRoutes = (routes: ProtectedRouteItem[]): RouteObject[] => {
    return routes.map(({ path, permission, component }) => {
        const LazyComponent = lazy(component);
        return {
            path,
            element: (
                <ProtectedRoute requiredPermission={permission}>
                    <LazyComponent />
                </ProtectedRoute>
            ),
        };
    });
};
