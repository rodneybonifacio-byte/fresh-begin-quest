import { DollarSign, Truck, Clock, Box, Zap, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCotacao } from "../../../hooks/useCotacao";
import { useCliente } from "../../../hooks/useCliente";
import { useAuth } from "../../../providers/AuthContext";
import { CotacaoList } from "../../../components/CotacaoList";
import { SelecionarRemetente } from "../../../components/SelecionarRemetente";
import { toast } from "sonner";

export const ModernHome = () => {
    const navigate = useNavigate();
    const [showBanner, setShowBanner] = useState(true);
    
    // Form states
    const [cepDestino, setCepDestino] = useState("");
    const [peso, setPeso] = useState("");
    const [altura, setAltura] = useState("2");
    const [largura, setLargura] = useState("11");
    const [comprimento, setComprimento] = useState("16");
    const [remetenteSelecionado, setRemetenteSelecionado] = useState<any>(null);
    
    // Hooks
    const { user: userPayload } = useAuth();
    const { data: cliente } = useCliente(userPayload?.clienteId || '');
    const { onGetCotacaoCorreios, cotacoes, isLoadingCotacao } = useCotacao();

    useEffect(() => {
        if (cliente && !remetenteSelecionado) {
            setRemetenteSelecionado(cliente);
        }
    }, [cliente, remetenteSelecionado]);

    const handleCalcularFrete = async () => {
        // Validação básica
        if (!remetenteSelecionado?.endereco?.cep) {
            toast.error("Selecione um remetente primeiro");
            return;
        }
        
        if (!cepDestino || cepDestino.length < 8) {
            toast.error("Informe um CEP de destino válido");
            return;
        }
        
        if (!peso || parseFloat(peso) <= 0) {
            toast.error("Informe o peso do pacote");
            return;
        }
        
        if (!altura || !largura || !comprimento) {
            toast.error("Informe as dimensões do pacote");
            return;
        }

        try {
            const embalagem = {
                id: '',
                descricao: 'Simulação',
                altura: parseFloat(altura),
                largura: parseFloat(largura),
                comprimento: parseFloat(comprimento),
                peso: parseFloat(peso),
                diametro: 0,
                formatoObjeto: 'CAIXA_PACOTE' as const
            };

            await onGetCotacaoCorreios(
                remetenteSelecionado.endereco.cep,
                cepDestino.replace(/\D/g, ""),
                embalagem,
                "0",
                "N",
                remetenteSelecionado
            );
        } catch (error) {
            console.error("Erro ao calcular frete:", error);
            toast.error("Erro ao calcular frete. Tente novamente.");
        }
    };

    return (
        <div className="flex flex-col gap-0 -m-4 sm:-m-6 lg:-m-8">
            {/* Black Friday Banner */}
            {showBanner && (
                <div className="bg-black text-white py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 justify-center">
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold text-yellow-400">BLACK FRIDAY</span>
                        <span className="hidden sm:inline">Descontos imperdíveis no frete! 🔥</span>
                        <span className="bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-sm">
                            ATÉ 80% OFF
                        </span>
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </div>
                    <button 
                        onClick={() => setShowBanner(false)}
                        className="text-white hover:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-background to-muted px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Left Content */}
                    <div className="space-y-6">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                            Calcular frete e emitir com desconto
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground">
                            Venda mais com fretes <span className="font-bold text-foreground">até 80% mais baratos</span> com a BRHUB: sem mensalidades ou taxas escondidas
                        </p>
                        <button
                            onClick={() => navigate('/app/emissao/adicionar')}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors"
                        >
                            Emitir frete com desconto
                        </button>
                    </div>

                    {/* Right Content - Simulator Card */}
                    <div className="bg-card rounded-2xl shadow-xl p-6 sm:p-8 border border-border">
                        <h2 className="text-2xl font-bold mb-6">Simule seu frete em segundos</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Remetente*</label>
                                <SelecionarRemetente
                                    remetenteSelecionado={remetenteSelecionado}
                                    onSelect={(remetente) => {
                                        setRemetenteSelecionado(remetente);
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">CEP de destino*</label>
                                <input
                                    type="text"
                                    placeholder="00000-000"
                                    value={cepDestino}
                                    onChange={(e) => setCepDestino(e.target.value)}
                                    maxLength={9}
                                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Peso (g)*</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={peso}
                                    onChange={(e) => setPeso(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-600"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Altura (cm)</label>
                                    <input
                                        type="number"
                                        placeholder="2"
                                        value={altura}
                                        onChange={(e) => setAltura(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Largura (cm)</label>
                                    <input
                                        type="number"
                                        placeholder="11"
                                        value={largura}
                                        onChange={(e) => setLargura(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Comprim. (cm)</label>
                                    <input
                                        type="number"
                                        placeholder="16"
                                        value={comprimento}
                                        onChange={(e) => setComprimento(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCalcularFrete}
                                disabled={isLoadingCotacao}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors"
                            >
                                {isLoadingCotacao ? "Calculando..." : "Calcular frete com desconto"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="px-4 sm:px-6 lg:px-8 py-12 bg-background">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Feature 1 */}
                    <div className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Fretes até 80% mais baratos</h3>
                        <p className="text-muted-foreground">
                            Economize em todos os seus envios sem mensalidades
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                            <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Envie para todo o Brasil</h3>
                        <p className="text-muted-foreground">
                            Cobertura nacional com as melhores transportadoras
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Simule em segundos</h3>
                        <p className="text-muted-foreground">
                            Cotação rápida e fácil de usar
                        </p>
                    </div>

                    {/* Feature 4 */}
                    <div className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
                            <Box className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Rastreamento completo</h3>
                        <p className="text-muted-foreground">
                            Acompanhe seus envios em tempo real
                        </p>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {cotacoes && cotacoes.length > 0 && (
                <div className="px-4 sm:px-6 lg:px-8 py-12 bg-muted/30">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl font-bold mb-6 text-center">Opções de Frete Disponíveis</h2>
                        <CotacaoList 
                            cotacoes={cotacoes} 
                            isLoading={isLoadingCotacao}
                            emptyStateMessage="Preencha os campos acima para calcular o frete"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
