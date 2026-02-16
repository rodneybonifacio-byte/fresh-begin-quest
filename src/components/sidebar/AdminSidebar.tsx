import { Activity, Archive, Calculator, ClipboardList, Clock, FileBarChart, FilePen, FileStack, Home, Package, Settings, Truck, UsersRound, Wallet, Tags, FileUp, Gift, FileText, UserCog, Receipt, ExternalLink, DollarSign } from 'lucide-react';
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
            active: ['/admin/relatorios/envios', '/admin/acompanhamento/ordem-coleta', '/admin/relatorios/correcao-etiquetas'].some(path => isPathActive(path)),
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
                },
                {
                    icon: Calculator,
                    label: 'Correção de Etiquetas',
                    to: '/admin/relatorios/correcao-etiquetas',
                    active: isPathActive('/admin/relatorios/correcao-etiquetas')
                }
            ]
        },
        {
            icon: Wallet,
            label: 'Financeiro',
            active: ['/admin/financeiro/faturas-a-receber', '/admin/financeiro/contas-a-pagar', '/admin/financeiro/processar-pagamento', '/admin/financeiro/recargas-pendentes', '/admin/financeiro/gerenciar-creditos'].some(path => isPathActive(path)),
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
                },
                {
                    icon: Clock,
                    label: 'Recargas Pendentes',
                    to: '/admin/financeiro/recargas-pendentes',
                    active: isPathActive('/admin/financeiro/recargas-pendentes')
                },
                {
                    icon: Wallet,
                    label: 'Processar Pagamento',
                    to: '/admin/financeiro/processar-pagamento',
                    active: isPathActive('/admin/financeiro/processar-pagamento')
                },
                {
                    icon: Wallet,
                    label: 'Gerenciar Créditos',
                    to: '/admin/financeiro/gerenciar-creditos',
                    active: isPathActive('/admin/financeiro/gerenciar-creditos')
                }
            ]
        },
        {
            icon: Settings,
            label: 'Configurações',
            active: ['/admin/correios/credenciais', '/admin/promocoes'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: Truck,
                    label: 'Transportadoras',
                    to: '/admin/transportadoras',
                    active: isPathActive('/admin/transportadoras')
                },
                {
                    icon: Gift,
                    label: 'Promoções',
                    to: '/admin/promocoes',
                    active: isPathActive('/admin/promocoes')
                }
            ]
        },
        {
            icon: Settings,
            label: 'Ferramentas',
            active: ['/admin/ferramentas/cancelar-emissao', '/admin/ferramentas/criar-manifesto', '/admin/ferramentas/realizar-fechamento', '/admin/ferramentas/gerenciar-etiquetas', '/admin/ferramentas/criar-etiquetas-em-massa', '/admin/logs-acesso', '/admin/ferramentas/fatura-exemplo', '/admin/ferramentas/gerenciar-clientes', '/admin/gerar-nota-fiscal', '/admin/ferramentas/emissoes-externas', '/admin/ferramentas/atualizar-precos-planilha'].some(path => isPathActive(path)),
            submenu: [
                {
                    icon: Activity,
                    label: 'Logs de Acesso',
                    to: '/admin/logs-acesso',
                    active: isPathActive('/admin/logs-acesso')
                },
                {
                    icon: Tags,
                    label: 'Gerenciar Etiquetas',
                    to: '/admin/ferramentas/gerenciar-etiquetas',
                    active: isPathActive('/admin/ferramentas/gerenciar-etiquetas')
                },
                {
                    icon: FileUp,
                    label: 'Criar Etiquetas em Massa',
                    to: '/admin/ferramentas/criar-etiquetas-em-massa',
                    active: isPathActive('/admin/ferramentas/criar-etiquetas-em-massa')
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
                },
                {
                    icon: FileText,
                    label: 'Fatura Exemplo',
                    to: '/admin/ferramentas/fatura-exemplo',
                    active: isPathActive('/admin/ferramentas/fatura-exemplo')
                },
                {
                    icon: UserCog,
                    label: 'Gerenciar Clientes',
                    to: '/admin/ferramentas/gerenciar-clientes',
                    active: isPathActive('/admin/ferramentas/gerenciar-clientes')
                },
                {
                    icon: Receipt,
                    label: 'Gerar Nota Fiscal',
                    to: '/admin/gerar-nota-fiscal',
                    active: isPathActive('/admin/gerar-nota-fiscal')
                },
                {
                    icon: ExternalLink,
                    label: 'Emissões Externas',
                    to: '/admin/ferramentas/emissoes-externas',
                    active: isPathActive('/admin/ferramentas/emissoes-externas')
                },
                {
                    icon: DollarSign,
                    label: 'Atualizar Preços Planilha',
                    to: '/admin/ferramentas/atualizar-precos-planilha',
                    active: isPathActive('/admin/ferramentas/atualizar-precos-planilha')
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
