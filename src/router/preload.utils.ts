import { adminRoutesConfig } from "./admin.routes";
import { appRoutesConfig } from "./app.routes";


/**
 * Preload de rota pelo path (App/Admin)
 */
export const preloadRouteByPath = (to: string) => {
    const allRoutes = [...appRoutesConfig, ...adminRoutesConfig];
    const cleanPath = to.replace(/^\/(app|admin)\//, "");
    const matched = allRoutes.find(route => route.path === cleanPath);
    matched?.component()?.then(() => { });
};
