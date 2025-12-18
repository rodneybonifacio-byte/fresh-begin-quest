// Componente: Integracoes.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FormularioDinamico, type FormSchema } from "./FormularioDinamico";
import { Content } from "../../Content";
import { SwitchToggle } from "../../../../components/SwitchToggle";
import { ModalCustom } from "../../../../components/modal";
import { IntegracaoService, type IIntegracao } from "../../../../services/IntegracaoService";
import { toast } from "sonner";
import { Check, Link2, Copy, Trash2, ExternalLink } from "lucide-react";
const plataformasDisponiveis: FormSchema[] = [
    {
        image: "/shopify.png",
        conected: false,
        descricao: "Integre sua conta com as plataformas de e-commerce mais populares do Brasil.",
        plataforma: "shopify",
        formulario: [
            { label: "Access Token", name: "accessToken", type: "input", required: true },
            { label: "Shop URL", name: "shopUrl", type: "input", required: true },
        ]
    },
    {
        image: "/Nuvemshop-logo.png",
        conected: false,
        descricao: "Integre sua loja Nuvemshop e receba pedidos automaticamente para gerar etiquetas no BRHUB Envios.",
        plataforma: "nuvemshop",
        formulario: [
            { label: "User ID", name: "userId", type: "input", required: true, description: "ID do usuário da sua loja Nuvemshop" },
            { label: "Access Token", name: "accessToken", type: "input", required: true, description: "Token de acesso da API Nuvemshop" },
            { label: "Store ID", name: "storeId", type: "input", required: true, description: "ID da sua loja Nuvemshop" },
        ]
    }
];

const Integracoes = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [plataformaSelecionada, setPlataformaSelecionada] = useState<FormSchema | null>(null);
    const [integracoes, setIntegracoes] = useState<IIntegracao[]>([]);
    const [, setLoading] = useState(true);

    const integracaoService = new IntegracaoService();

    const carregarIntegracoes = async () => {
        try {
            setLoading(true);
            const response = await integracaoService.getAll();
            setIntegracoes(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar integrações:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarIntegracoes();
    }, []);

    const handleConectar = (plataforma: FormSchema) => {
        // Para Shopify, navegar para a página dedicada
        if (plataforma.plataforma === 'shopify') {
            navigate('/app/ferramentas/integracoes/novo/shopify');
            return;
        }
        setPlataformaSelecionada(plataforma);
        setShowModal(true);
    };

    const handleToggleAtivo = async (integracao: IIntegracao) => {
        try {
            await integracaoService.update(integracao.id!, { ativo: !integracao.ativo });
            toast.success(`Integração ${!integracao.ativo ? 'ativada' : 'desativada'} com sucesso!`);
            carregarIntegracoes();
        } catch (error) {
            toast.error('Erro ao atualizar integração');
        }
    };

    const handleRemoverIntegracao = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta integração?')) return;
        
        try {
            await integracaoService.delete(id);
            toast.success('Integração removida com sucesso!');
            carregarIntegracoes();
        } catch (error) {
            toast.error('Erro ao remover integração');
        }
    };

    const copiarWebhook = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('URL do webhook copiada!');
    };

    const getIntegracaoAtiva = (plataforma: string) => {
        return integracoes.find(i => i.plataforma === plataforma);
    };

    return (
        <Content
            titulo="Integrações"
            subTitulo="Integre sua conta com as plataformas de e-commerce mais populares do Brasil."
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {plataformasDisponiveis.map((schema) => {
                    const integracaoAtiva = getIntegracaoAtiva(schema.plataforma);
                    const isConectado = !!integracaoAtiva;

                    return (
                        <div 
                            key={schema.plataforma} 
                            className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 flex flex-col justify-between border-2 transition-all ${
                                isConectado ? 'border-green-500' : 'border-transparent'
                            }`}
                        >
                            <div className="flex flex-row justify-between mb-3 md:mb-4">
                                <div className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white">
                                    <img src={schema.image} alt={schema.plataforma} className="w-[50px] md:w-[68px]" />
                                </div>
                                <div className="flex items-center gap-2">
                                    {isConectado && (
                                        <span className="flex items-center gap-1 text-green-600 text-xs md:text-sm font-medium">
                                            <Check className="w-3 h-3 md:w-4 md:h-4" />
                                            <span className="hidden sm:inline">Conectado</span>
                                        </span>
                                    )}
                                    {integracaoAtiva && (
                                        <SwitchToggle 
                                            defaultValue={integracaoAtiva.ativo} 
                                            onChange={() => handleToggleAtivo(integracaoAtiva)}
                                        />
                                    )}
                                </div>
                            </div>
                            
                            <p className="text-sm md:text-base mb-3 md:mb-4 text-slate-500 dark:text-slate-400 line-clamp-2">{schema.descricao}</p>

                            {isConectado && integracaoAtiva && (
                                <div className="mb-3 md:mb-4 p-2 md:p-3 bg-slate-50 dark:bg-slate-700 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2 text-xs md:text-sm">
                                        <Link2 className="w-3 h-3 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
                                        <span className="text-slate-600 dark:text-slate-300 truncate">Store: {integracaoAtiva.storeId}</span>
                                    </div>
                                    {integracaoAtiva.webhookUrl && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => copiarWebhook(integracaoAtiva.webhookUrl!)}
                                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copiar Webhook
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2">
                                {schema.plataforma === 'shopify' ? (
                                    <>
                                        <Link
                                            to="/app/ferramentas/integracoes/novo/shopify"
                                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-medium transition text-center text-sm md:text-base"
                                        >
                                            {isConectado ? 'Configurar' : 'Conectar'}
                                        </Link>
                                        {isConectado && (
                                            <Link
                                                to="/app/integracoes/shopify/pedidos"
                                                className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-medium transition text-sm md:text-base"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Pedidos
                                            </Link>
                                        )}
                                    </>
                                ) : isConectado ? (
                                    <>
                                        <button
                                            onClick={() => handleConectar(schema)}
                                            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-medium transition text-sm md:text-base"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleRemoverIntegracao(integracaoAtiva!.id!)}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-medium transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleConectar(schema)}
                                        className="w-full bg-white dark:bg-gray-700 border border-secondary text-secondary hover:bg-secondary hover:text-white py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-bold hover:bg-opacity-90 transition text-sm md:text-base"
                                    >
                                        Conectar
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && plataformaSelecionada && (
                <ModalCustom
                    title={`Integração com ${plataformaSelecionada.plataforma}`}
                    description={plataformaSelecionada.descricao}
                    onCancel={() => {
                        setShowModal(false);
                        carregarIntegracoes();
                    }}
                >
                    <FormularioDinamico schema={plataformaSelecionada} />
                </ModalCustom>
            )}
        </Content>
    );
};

export default Integracoes;
