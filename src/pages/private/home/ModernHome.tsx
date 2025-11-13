import { useState } from "react";
import { Package, Truck, DollarSign, Clock, Plus } from "lucide-react";
import { useCotacao } from "../../../hooks/useCotacao";
import { useNavigate } from "react-router-dom";

export const ModernHome = () => {
    const navigate = useNavigate();
    const { onGetCotacaoCorreios, cotacoes, isLoadingCotacao } = useCotacao();
    
    const [freteData, setFreteData] = useState({
        cepOrigem: "",
        cepDestino: "",
        peso: "",
        altura: "",
        largura: "",
        comprimento: ""
    });

    const handleCalcular = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!freteData.cepOrigem || !freteData.cepDestino || !freteData.peso) {
            return;
        }

        await onGetCotacaoCorreios(
            freteData.cepOrigem,
            freteData.cepDestino,
            {
                id: "temp-id",
                descricao: "Pacote temporário",
                peso: parseFloat(freteData.peso) || 0.3,
                altura: parseFloat(freteData.altura) || 2,
                largura: parseFloat(freteData.largura) || 11,
                comprimento: parseFloat(freteData.comprimento) || 16,
                diametro: 0,
                formatoObjeto: "CAIXA_PACOTE"
            }
        );
    };

    const features = [
        {
            icon: DollarSign,
            title: "Fretes até 80% mais baratos",
            description: "Economize em todos os seus envios sem mensalidades",
            color: "text-green-600"
        },
        {
            icon: Truck,
            title: "Envie para todo o Brasil",
            description: "Cobertura nacional com as melhores transportadoras",
            color: "text-blue-600"
        },
        {
            icon: Clock,
            title: "Simule em segundos",
            description: "Cotação rápida e fácil de usar",
            color: "text-orange-600"
        },
        {
            icon: Package,
            title: "Rastreamento completo",
            description: "Acompanhe seus envios em tempo real",
            color: "text-purple-600"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
                    {/* Left Column - Text */}
                    <div className="space-y-6 animate-fade-in">
                        <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                            Calcular frete e emitir com{" "}
                            <span className="text-primary">desconto</span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Venda mais com fretes <strong className="text-primary">até 80% mais baratos</strong> com a BRHUB: 
                            sem mensalidades ou taxas escondidas
                        </p>
                        <button
                            onClick={() => navigate('/app/emissao')}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-lg font-bold shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-primary/50"
                        >
                            Emitir frete com desconto
                        </button>
                    </div>

                    {/* Right Column - Calculator */}
                    <div className="bg-card border border-border rounded-3xl shadow-2xl p-8 animate-scale-in">
                        <h2 className="text-2xl font-bold mb-6 text-primary">
                            Simule seu frete em segundos
                        </h2>
                        
                        <form onSubmit={handleCalcular} className="space-y-4">
                            {/* CEP Origem */}
                            <div>
                                <label className="block text-sm font-medium mb-2">CEP de origem*</label>
                                <input
                                    type="text"
                                    placeholder="00000-000"
                                    value={freteData.cepOrigem}
                                    onChange={(e) => setFreteData({ ...freteData, cepOrigem: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    maxLength={9}
                                />
                            </div>

                            {/* CEP Destino */}
                            <div>
                                <label className="block text-sm font-medium mb-2">CEP de destino*</label>
                                <input
                                    type="text"
                                    placeholder="00000-000"
                                    value={freteData.cepDestino}
                                    onChange={(e) => setFreteData({ ...freteData, cepDestino: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    maxLength={9}
                                />
                            </div>

                            {/* Peso */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Peso (kg)*</label>
                                <input
                                    type="number"
                                    placeholder="0.0"
                                    value={freteData.peso}
                                    onChange={(e) => setFreteData({ ...freteData, peso: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    step="0.1"
                                    min="0"
                                />
                            </div>

                            {/* Dimensões */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-2">Altura (cm)</label>
                                    <input
                                        type="number"
                                        placeholder="2"
                                        value={freteData.altura}
                                        onChange={(e) => setFreteData({ ...freteData, altura: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-2">Largura (cm)</label>
                                    <input
                                        type="number"
                                        placeholder="11"
                                        value={freteData.largura}
                                        onChange={(e) => setFreteData({ ...freteData, largura: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-2">Comprim. (cm)</label>
                                    <input
                                        type="number"
                                        placeholder="16"
                                        value={freteData.comprimento}
                                        onChange={(e) => setFreteData({ ...freteData, comprimento: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoadingCotacao}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold text-lg shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoadingCotacao ? "Calculando..." : "Calcular frete com desconto"}
                            </button>
                        </form>

                        {/* Resultados */}
                        {cotacoes && cotacoes.length > 0 && (
                            <div className="mt-6 space-y-3 animate-fade-in">
                                <p className="text-sm font-medium text-muted-foreground">Fretes disponíveis:</p>
                                {cotacoes.slice(0, 3).map((cotacao, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-orange-50 dark:bg-orange-950/20 border-2 border-primary/30 rounded-xl hover:shadow-lg hover:border-primary transition-all cursor-pointer hover:scale-[1.02]"
                                        onClick={() => navigate('/app/emissao')}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-foreground">{cotacao.nomeServico}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {cotacao.prazo} dias úteis
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-primary">
                                                    R$ {parseFloat(cotacao.preco).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className={`${feature.color} mb-4`}>
                                <feature.icon className="h-10 w-10" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Pronto para economizar nos seus fretes?
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Comece agora mesmo a emitir fretes com desconto
                    </p>
                    <button
                        onClick={() => navigate('/app/emissao')}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-lg font-bold shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Criar primeira etiqueta
                    </button>
                </div>
            </div>
        </div>
    );
};
