import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RotaPublica } from '../RotaPublica';
import { RotaPrivada } from '../RotaPrivada';
import { AppRoutes } from './app.routes';
import { AdminRoutes } from './admin.routes';
import authStore from '../authentica/authentication.store';
import { getRedirectPathByRole } from '../utils/auth.utils';

// Lazy load dos componentes
const Login = lazy(() => import('../pages/site/login').then(module => ({ default: module.Login })));
const ErrorPage = lazy(() => import('../components/Error').then(module => ({ default: module.ErrorPage })));
const RastreioPublica = lazy(() => import('../pages/site/rastreio').then(module => ({ default: module.RastreioPublica })));
const ApiDocs = lazy(() => import('../pages/site/ducumetacoes/ApiDocs').then(module => ({ default: module.ApiDocs })));
const Manutencao = lazy(() => import('../pages/site/manutencao').then(module => ({ default: module.Manutencao })));
const AppLayout = lazy(() => import('../layout/AppLayout').then(module => ({ default: module.AppLayout })));
const AdminLayout = lazy(() => import('../layout/AdminLayout'));
const RecuperarSenha = lazy(() => import('../pages/site/login/recuperar-senha').then(module => ({ default: module.RecuperarSenha })));
const MessageRedefinirSenha = lazy(() => import('../pages/site/login/message-redefinir-senha').then(module => ({ default: module.MessageRedefinirSenha })));
const PinCode = lazy(() => import('../pages/site/login/pin-code').then(module => ({ default: module.PinCode })));
const NovaSenhaPage = lazy(() => import('../pages/site/login/nova-senha').then(module => ({ default: module.NovaSenhaPage })));
const RelatorioDesempenho = lazy(() => import('../pages/site/RelatorioDesempenho').then(module => ({ default: module.RelatorioDesempenho })));
const FaturaSimple = lazy(() => import('../pages/site/FaturaSimple'));
const VisualizarPdf = lazy(() => import('../pages/site/VisualizarPdf'));
const CadastroCliente = lazy(() => import('../pages/site/cadastro/cadastro-cliente').then(module => ({ default: module.CadastroCliente })));

// Loading component
const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

const RootRedirect = () => {
    if (authStore.isLoggedIn()) {
        return <Navigate to={getRedirectPathByRole()} replace />;
    }
    return <Navigate to="/login" replace />;
};

export const RouterBase = () => {
    return (
        <div className="bg-gray-50 dark:bg-slate-900">
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    {/* Público */}
                    <Route index element={<RootRedirect />} />
                    <Route path="/error" element={<ErrorPage id={404} />} />
                    <Route path="*" element={<ErrorPage id={404} />} />
                    <Route path="/relatorio-desempenho" element={<RelatorioDesempenho />} />
                    <Route path="/fatura/viewInPdf/:faturaId/:subFaturaId?" element={<FaturaSimple />} />
                    <Route path="/apidocs" element={<ApiDocs />} />
                    <Route path="/rastreio/encomenda" element={<RastreioPublica />} />
                    <Route path="/redefinir-senha-success" element={<MessageRedefinirSenha />} />
                    <Route path="/pin-code" element={<PinCode />} />
                    <Route path="/nova-senha" element={<NovaSenhaPage />} />
                    <Route path="/manutencao" element={<Manutencao />} />
                    <Route path="/view/pdf/:pdfId/print" element={<VisualizarPdf />} />

                    <Route element={<RotaPublica />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                        <Route path="/cadastro-cliente" element={<CadastroCliente />} />
                    </Route>

                    {/* Grupo /app */}
                    <Route
                        path="/app"
                        element={
                            <RotaPrivada>
                                <AppLayout />
                            </RotaPrivada>
                        }
                    >
                        {AppRoutes.map((route, index) => (
                            <Route key={index} path={route.path} element={route.element} />
                        ))}
                    </Route>

                    {/* Grupo /admin (futuro) */}
                    <Route
                        path="/admin"
                        element={
                            <RotaPrivada>
                                <AdminLayout />
                            </RotaPrivada>
                        }
                    >
                        {AdminRoutes.map((route, index) => (
                            <Route key={index} path={route.path} element={route.element} />
                        ))}
                    </Route>
                </Routes>
            </Suspense>
        </div>
    );
};
