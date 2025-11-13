import {
    Box, Calculator, CreditCard, Database, FileBarChart,  
    FileStack, Home, Package, PlugZap, Printer, Settings, Truck, Users, UsersRound, Wallet, Wrench
} from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { SidebarLayout } from './SidebarLayout';
import authStore from '../../authentica/authentication.store';

const AppSidebar = observer(({
    isOpen,
    onClose,
    onNavigate
}: {
    isOpen?: boolean;
    onClose?: () => void;
    onNavigate?: (page: string) => void;
}) => {
    const [isSidebarOpen, _setIsSidebarOpen] = useState(true);
    const location = useLocation();

    // Em mobile, usa o estado passado como prop, em desktop usa o estado interno
    const sidebarOpen = typeof isOpen !== 'undefined' ? isOpen : isSidebarOpen;

    // Determinar qual item está ativo baseado na rota atual
    const isPathActive = (path: string) => {
        if (path === '/app' && location.pathname === '/app') return true;
        if (path !== '/app' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const userData = authStore.getUser();
    const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'administrator';

    const navItems = [
        {
            icon: Home,
            label: 'Home',
            to: '/app',
            active: isPathActive('/app')
        },
        {
            icon: Package,
            label: 'Etiquetas',
            to: '/app/emissao',
            active: isPathActive('/app/emissao')
        },
        {
            icon: Truck,
            label: 'Rastreio',
            to: '/app/rastrear',
            active: isPathActive('/app/rastrear')
        },
        {
            icon: Box,
            label: 'Acompanhamento',
            to: '/app/acompanhamento',
            active: isPathActive('/app/acompanhamento')
        },
        {
            icon: Wallet,
            label: 'Financeiro',
            to: '/app/financeiro/faturas',
            active: isPathActive('/app/financeiro/faturas')
        },
        {
            icon: UsersRound,
            label: 'Clientes',
            to: '/app/destinatarios',
            active: isPathActive('/app/destinatarios')
        },
        {
            icon: Wrench,
            label: 'Ferramentas',
            active: ['/app/ferramentas/imprimir-etiquetas', '/app/ferramentas/manifestos', '/app/ferramentas/integracoes', '/app/simulador/frete'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: Printer,
                    label: 'Imprimir Etiquetas',
                    to: '/app/ferramentas/imprimir-etiquetas',
                    active: isPathActive('/app/ferramentas/imprimir-etiquetas')
                },
                {
                    icon: FileStack,
                    label: 'Manifestos',
                    to: '/app/ferramentas/manifestos',
                    active: isPathActive('/app/ferramentas/manifestos')
                },
                {
                    icon: PlugZap,
                    label: 'Integrações',
                    to: '/app/ferramentas/integracoes',
                    active: isPathActive('/app/ferramentas/integracoes')
                },
                {
                    icon: Calculator,
                    label: 'Simulador de Frete',
                    to: '/app/simulador/frete',
                    active: isPathActive('/app/simulador/frete')
                }
            ]
        },
        {
            icon: Settings,
            label: 'Configurações',
            to: '/app/profile',
            active: isPathActive('/app/profile')
        }
    ];

    // Adiciona seção de administração se for admin
    const adminSection = isAdmin ? [
        {
            section: 'ADMINISTRAÇÃO',
            items: [
                {
                    icon: CreditCard,
                    label: 'Gerenciar Créditos',
                    to: '/admin',
                    active: isPathActive('/admin')
                },
                {
                    icon: FileBarChart,
                    label: 'Ajustes de Custos',
                    to: '/admin/transportadoras',
                    active: isPathActive('/admin/transportadoras')
                },
                {
                    icon: Users,
                    label: 'Gestão de Clientes',
                    to: '/admin/clientes',
                    active: isPathActive('/admin/clientes')
                },
                {
                    icon: Database,
                    label: 'Sincronização de Dados',
                    to: '/admin/sincronizacao',
                    active: isPathActive('/admin/sincronizacao')
                },
                {
                    icon: Settings,
                    label: 'Configurações do Sistema',
                    to: '/admin/configuracoes',
                    active: isPathActive('/admin/configuracoes')
                }
            ]
        }
    ] : [];

    return (
        <>
            {/* Overlay para mobile - só aparece quando sidebar está aberto */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <SidebarLayout 
                navItems={navItems} 
                adminSection={adminSection}
                isOpen={isOpen} 
                onClose={onClose} 
                onNavigate={onNavigate} 
                title="BRHUB" 
            />
        </>
    );
});

export default AppSidebar;
