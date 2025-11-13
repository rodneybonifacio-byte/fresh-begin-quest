import { Archive, ClipboardList, FileBarChart, FilePen, FileStack, Home, Package, Settings, Truck, UsersRound, Wallet } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';

const AdminSidebar = observer(({
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
        if (path === '/admin' && location.pathname === '/admin') return true;
        if (path !== '/admin' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        {
            icon: Home,
            label: 'Home',
            to: '/admin',
            active: isPathActive('/admin')
        },
        {
            icon: Archive,
            label: 'Cadastros',
            active: ['/admin/clientes', '/admin/planos'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: UsersRound,
                    label: 'Clientes',
                    to: '/admin/clientes',
                    active: isPathActive('/admin/clientes')
                }
            ]
        },
        {
            icon: FileBarChart,
            label: 'Acompanhamento',
            active: ['/admin/relatorios/envios', '/admin/acompanhamento/ordem-coleta'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: Package,
                    label: 'Envios',
                    to: '/admin/relatorios/envios',
                    active: isPathActive('/admin/relatorios/envios')
                },
                {
                    icon: ClipboardList,
                    label: 'Coletas',
                    to: '/admin/acompanhamento/ordem-coleta',
                    active: isPathActive('/admin/acompanhamento/ordem-coleta')
                }
            ]
        },
        {
            icon: Wallet,
            label: 'Financeiro',
            active: ['/admin/financeiro/faturas-a-receber', '/admin/financeiro/contas-a-pagar'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: FileBarChart,
                    label: 'Faturas a Receber',
                    to: '/admin/financeiro/faturas-a-receber',
                    active: isPathActive('/admin/financeiro/faturas-a-receber')
                },
                {
                    icon: FileBarChart,
                    label: 'Contas a Pagar',
                    to: '/admin/financeiro/contas-a-pagar',
                    active: isPathActive('/admin/financeiro/contas-a-pagar')
                }
            ]
        },
        {
            icon: Settings,
            label: 'Configurações',
            active: ['/admin/correios/credenciais'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: Truck,
                    label: 'Transportadoras',
                    to: '/admin/transportadoras',
                    active: isPathActive('/admin/transportadoras')
                }
            ]
        },
        {
            icon: Settings,
            label: 'Ferramentas',
            active: ['/admin/ferramentas/cancelar-emissao', '/admin/ferramentas/criar-manifesto'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: FilePen,
                    label: 'Cancelar Emissão',
                    to: '/admin/ferramentas/cancelar-emissao',
                    active: isPathActive('/admin/ferramentas/cancelar-emissao')
                },
                {
                    icon: FileStack,
                    label: 'Criar Manifesto',
                    to: '/admin/ferramentas/criar-manifesto',
                    active: isPathActive('/admin/ferramentas/criar-manifesto')
                },
                {
                    icon: FileStack,
                    label: 'Reprocessar Emissão Etiqueta',
                    to: '/admin/ferramentas/reprocessar-emissao-etiqueta',
                    active: isPathActive('/admin/ferramentas/reprocessar-emissao-etiqueta')
                }
            ]
        }
    ];

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
            <SidebarLayout navItems={navItems} isOpen={isOpen} onClose={onClose} onNavigate={onNavigate} title="BRHUB" />
        </>
    );
});

export default AdminSidebar;
