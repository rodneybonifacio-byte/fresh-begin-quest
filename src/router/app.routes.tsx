import { generateProtectedRoutes, type ProtectedRouteItem } from "./route.utils";


export const appRoutesConfig: ProtectedRouteItem[] = [
    {
        path: "",
        component: () => import("../pages/private/home")
    },
    {
        path: "home",
        component: () => import("../pages/private/home")
    },
    {
        path: "rastrear",
        component: () => import("../pages/private/rastreio")
    },
    {
        path: "destinatarios",
        component: () => import("../pages/private/destinatario"),
    },
    {
        path: "remetentes",
        component: () => import("../pages/private/remetente"),
    },
    {
        path: "emissao",
        component: () => import("../pages/private/emissao")
    },
    {
        path: "emissao/importacao",
        component: () => import("../pages/private/emissao/FileImportEmissao")
    },
    {
        path: "emissao/detail/:emissaoId",
        component: () => import("../pages/private/emissao/EmissaoViewDetail")
    },
    {
        path: "emissao/adicionar",
        component: () => import("../pages/private/emissao/index-modern")
    },
    {
        path: "integracoes-pedidos",
        component: () => import("../pages/private/ferramentas/integracoes/PedidosImportados")
    },
    {
        path: "integracoes/shopify",
        component: () => import("../pages/private/ferramentas/integracoes/ShopifyIntegracao")
    },
    {
        path: "integracoes/shopify/pedidos",
        component: () => import("../pages/private/ferramentas/integracoes/PedidosShopify")
    },
    {
        path: "ferramentas/integracoes/novo/shopify",
        component: () => import("../pages/private/ferramentas/integracoes/ShopifyIntegracao")
    },
    {
        path: "ferramentas/imprimir-etiquetas",
        component: () => import("../pages/private/ferramentas/FImprimirMultiplasEtiqueta")
    },
    {
        path: "ferramentas/manifestos",
        component: () => import("../pages/private/ferramentas/manifestos")
    },
    {
        path: "ferramentas/manifestos/adicionar",
        component: () => import("../pages/private/ferramentas/manifestos/FManifestoFormulario")
    },
    {
        path: "ferramentas/integracoes",
        component: () => import("../pages/private/ferramentas/integracoes")
    },
    {
        path: "financeiro/faturas",
        component: () => import("../pages/private/financeiro/fatura/ListasFaturas")
    },
    {
        path: "financeiro/fatura/:faturaId",
        component: () => import("../pages/private/admin/financeiro/FaturaViewDetail")
    },
    {
        path: "financeiro/recarga",
        component: () => import("../pages/private/financeiro/recarga")
    },
    {
        path: "financeiro/recarga/historico",
        component: () => import("../pages/private/financeiro/recarga/HistoricoRecargas")
    },
    {
        path: "financeiro/extrato",
        component: () => import("../pages/private/financeiro/extrato")
    },
    {
        path: "simulador",
        component: () => import("../pages/private/simulador")
    },
    {
        path: "pdf-viewer/:encodedData",
        component: () => import("../pages/private/emissao/PDFViewerPage")
    },
    {
        path: "profile",
        component: () => import("../pages/private/profile/Profile")
    },
    {
        path: "test-dados",
        component: () => import("../pages/private/test/TestarBuscaDados")
    },
];
 
export const AppRoutes = generateProtectedRoutes(appRoutesConfig);