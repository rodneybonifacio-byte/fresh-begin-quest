import {
    Archive, CloudDownload, FileBarChart, FileSpreadsheet, FileStack, Home,
    PlugZap, Printer, Receipt, ReceiptText, Settings, Truck, UsersRound, Wallet, DollarSign
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { SidebarLayout } from './SidebarLayout';

const AppSidebar = observer(({
    isOpen,
    onClose,
    onNavigate
}: {
    isOpen?: boolean;
    onClose?: () => void;
    onNavigate?: (page: string) => void;
}) => {
    const location = useLocation();

    // Determinar qual item está ativo baseado na rota atual
    const isPathActive = (path: string) => {
        if (path === '/app' && location.pathname === '/app') return true;
        if (path !== '/app' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        {
            icon: Home,
            label: 'Home',
            to: '/app',
            active: isPathActive('/app')
        },
        {
            icon: Archive,
            label: 'Cadastros',
            active: ['/app/destinatarios', '/app/remetentes'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: UsersRound,
                    label: 'Remetentes',
                    to: '/app/remetentes',
                    active: isPathActive('/app/remetentes')
                },
                {
                    icon: UsersRound,
                    label: 'Destinatarios',
                    to: '/app/destinatarios',
                    active: isPathActive('/app/destinatarios')
                }
            ]
        },
        {
            icon: Archive,
            label: 'Envios',
            active: ['/app/emissao', '/app/integracoes-pedidos'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: FileSpreadsheet,
                    label: 'Pre-Postagem',
                    to: '/app/emissao',
                    active: isPathActive('/app/emissao')
                },
                {
                    icon: CloudDownload,
                    label: 'Integrações',
                    to: '/app/integracoes-pedidos',
                    active: isPathActive('/app/integracoes-pedidos')
                }
            ]
        },
        {
            icon: Settings,
            label: 'Ferramentas',
            active: ['/app/ferramentas/imprimir-etiquetas', '/app/ferramentas/manifestos', '/app/ferramentas/integracoes', '/app/rastrear', '/app/simulador/frete'].some(path => isPathActive(path)),
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
                    icon: Truck,
                    label: 'Rastrear Pacote',
                    to: '/app/rastrear',
                    active: isPathActive('/app/rastrear')
                },
                {
                    icon: ReceiptText,
                    label: 'Simulador de Frete',
                    to: '/app/simulador/frete',
                    active: isPathActive('/app/simulador/frete')
                }
            ]
        },
        {
            icon: DollarSign,
            label: 'Financeiro',
            active: ['/app/financeiro/faturas', '/app/financeiro/recarga', '/app/financeiro/extrato'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: FileBarChart,
                    label: 'Faturas',
                    to: '/app/financeiro/faturas',
                    active: isPathActive('/app/financeiro/faturas')
                },
                {
                    icon: Wallet,
                    label: 'Recarga',
                    to: '/app/financeiro/recarga',
                    active: isPathActive('/app/financeiro/recarga')
                },
                {
                    icon: Receipt,
                    label: 'Extrato',
                    to: '/app/financeiro/extrato',
                    active: isPathActive('/app/financeiro/extrato')
                }
            ]
        }
    ];

    return (
        <>
            <SidebarLayout navItems={navItems} isOpen={isOpen} onClose={onClose} onNavigate={onNavigate} title="BRHUB" hideUserProfile />
        </>
    );
});

export default AppSidebar;
