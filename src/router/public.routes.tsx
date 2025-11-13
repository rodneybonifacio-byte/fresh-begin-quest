import { generateProtectedRoutes, type ProtectedRouteItem } from "./route.utils";

export const publicaRoutesConfig: ProtectedRouteItem[] = [
    
]
export const PublicRoutes = generateProtectedRoutes(publicaRoutesConfig);