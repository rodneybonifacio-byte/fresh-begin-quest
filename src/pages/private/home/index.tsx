import { Package, Truck, CheckCircle, Clock, Plus, Calculator, Search, TrendingUp, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import ModalNotificacaoFaturaEmAtraso from "../../../components/ModalNotificacaoFaturaEmAtraso";

const Home = () => {
    const stats = [
        {
            label: 'Total de envios',
            value: '0',
            icon: Package,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-50'
        },
        {
            label: 'Em trânsito',
            value: '0',
            icon: Truck,
            iconColor: 'text-orange-500',
            iconBg: 'bg-orange-50'
        },
        {
            label: 'Entregues',
            value: '0',
            icon: CheckCircle,
            iconColor: 'text-green-500',
            iconBg: 'bg-green-50'
        },
        {
            label: 'Pendentes',
            value: '0',
            icon: Clock,
            iconColor: 'text-orange-500',
            iconBg: 'bg-orange-50'
        }
    ];

    const quickActions = [
        {
            title: 'Nova etiqueta',
            description: 'Criar novo envio',
            icon: Plus,
            to: '/app/emissao',
            iconColor: 'text-foreground',
        },
        {
            title: 'Simulação de Frete',
            description: 'Calcular valores',
            icon: Calculator,
            to: '/app/simulador/frete',
            iconColor: 'text-foreground',
        },
        {
            title: 'Rastrear',
            description: 'Acompanhar envios',
            icon: Search,
            to: '/app/rastrear',
            iconColor: 'text-foreground',
        },
        {
            title: 'Financeiro',
            description: 'Ver faturas',
            icon: TrendingUp,
            to: '/app/financeiro/faturas',
            iconColor: 'text-foreground',
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header de boas-vindas */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Bem-vindo de volta!</h1>
                <p className="text-muted-foreground mt-1">Aqui está um resumo das suas atividades</p>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div 
                        key={index}
                        className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover-scale"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                                <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                            </div>
                            <div className={`${stat.iconBg} ${stat.iconColor} p-3 rounded-lg`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ações rápidas */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Ações rápidas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, index) => (
                        <Link
                            key={index}
                            to={action.to}
                            className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover-scale group"
                        >
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="bg-muted p-4 rounded-lg group-hover:bg-accent transition-colors">
                                    <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                                    <p className="text-sm text-muted-foreground">{action.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Nenhuma atividade recente */}
            <div className="bg-card border border-border rounded-lg p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div className="bg-orange-50 p-6 rounded-full">
                        <Box className="w-12 h-12 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma atividade recente</h3>
                        <p className="text-muted-foreground">Comece criando sua primeira etiqueta de envio</p>
                    </div>
                    <Link
                        to="/app/emissao"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Criar etiqueta
                    </Link>
                </div>
            </div>

            <ModalNotificacaoFaturaEmAtraso />
        </div>
    );
};

export default Home;