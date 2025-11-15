import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/site/login';
import { RotaPublica } from '../RotaPublica';
import { RotaPrivada } from '../RotaPrivada';
import { AppRoutes } from './app.routes';
import { AdminRoutes } from './admin.routes';
import { ErrorPage } from '../components/Error';
import { RastreioPublica } from '../pages/site/rastreio';
import { ApiDocs } from '../pages/site/ducumetacoes/ApiDocs';
import { Manutencao } from '../pages/site/manutencao';
import { AppLayout } from '../layout/AppLayout';
import { AdminLayout } from '../layout/AdminLayout';
import { RecuperarSenha } from '../pages/site/login/recuperar-senha';
import { MessageRedefinirSenha } from '../pages/site/login/message-redefinir-senha';
import { PinCode } from '../pages/site/login/pin-code';
import { NovaSenhaPage } from '../pages/site/login/nova-senha';
import { RelatorioDesempenho } from '../pages/site/RelatorioDesempenho';
import FaturaSimple from '../pages/site/FaturaSimple';
import VisualizarPdf from '../pages/site/VisualizarPdf';
import authStore from '../authentica/authentication.store';
import { getRedirectPathByRole } from '../utils/auth.utils';

const RootRedirect = () => {
    if (authStore.isLoggedIn()) {
        return <Navigate to={getRedirectPathByRole()} replace />;
    }
    return <Navigate to="/login" replace />;
};

export const RouterBase = () => {
    return (
        <div className="bg-gray-50 dark:bg-slate-900">
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
        </div>
    );
};
