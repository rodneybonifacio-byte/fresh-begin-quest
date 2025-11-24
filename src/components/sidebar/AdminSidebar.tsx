import { Archive, Calculator, ClipboardList, FileBarChart, FilePen, FileStack, Home, Package, Settings, Truck, UsersRound, Wallet, Tags } from 'lucide-react';
import { observer } from 'mobx-react-lite';
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
    const location = useLocation();

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
            active: ['/admin/ferramentas/cancelar-emissao', '/admin/ferramentas/criar-manifesto', '/admin/ferramentas/realizar-fechamento', '/admin/ferramentas/gerenciar-etiquetas'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: Tags,
                    label: 'Gerenciar Etiquetas',
                    to: '/admin/ferramentas/gerenciar-etiquetas',
                    active: isPathActive('/admin/ferramentas/gerenciar-etiquetas')
                },
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
                },
                {
                    icon: Calculator,
                    label: 'Realizar Fechamento',
                    to: '/admin/ferramentas/realizar-fechamento',
                    active: isPathActive('/admin/ferramentas/realizar-fechamento')
                }
            ]
        }
    ];

    return (
        <>
            <SidebarLayout navItems={navItems} isOpen={isOpen} onClose={onClose} onNavigate={onNavigate} title="BRHUB" />
        </>
    );
});

export default AdminSidebar;
