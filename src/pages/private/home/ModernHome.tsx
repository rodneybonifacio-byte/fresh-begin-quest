import { useState } from "react";
import { Package, Truck, DollarSign, Clock, Plus } from "lucide-react";
import { useCotacao } from "../../../hooks/useCotacao";
import { useNavigate } from "react-router-dom";
export const ModernHome = () => {
  const navigate = useNavigate();
  const {
    onGetCotacaoCorreios,
    cotacoes,
    isLoadingCotacao
  } = useCotacao();
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
    await onGetCotacaoCorreios(freteData.cepOrigem, freteData.cepDestino, {
      id: "temp-id",
      descricao: "Pacote temporário",
      peso: parseFloat(freteData.peso) || 0.3,
      altura: parseFloat(freteData.altura) || 2,
      largura: parseFloat(freteData.largura) || 11,
      comprimento: parseFloat(freteData.comprimento) || 16,
      diametro: 0,
      formatoObjeto: "CAIXA_PACOTE"
    });
  };
  const features = [{
    icon: DollarSign,
    title: "Fretes até 80% mais baratos",
    description: "Economize em todos os seus envios sem mensalidades",
    color: "text-green-600"
  }, {
    icon: Truck,
    title: "Envie para todo o Brasil",
    description: "Cobertura nacional com as melhores transportadoras",
    color: "text-blue-600"
  }, {
    icon: Clock,
    title: "Simule em segundos",
    description: "Cotação rápida e fácil de usar",
    color: "text-orange-600"
  }, {
    icon: Package,
    title: "Rastreamento completo",
    description: "Acompanhe seus envios em tempo real",
    color: "text-purple-600"
  }];
  return <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
                    {/* Left Column - Text */}
                    <div className="space-y-6 animate-fade-in">
                        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight">
                            Calcular frete e emitir com{" "}
                            <span className="text-primary">desconto</span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Venda mais com fretes <strong className="text-primary">até 80% mais baratos</strong> com a BRHUB: 
                            sem mensalidades ou taxas escondidas
                        </p>
                        <button onClick={() => navigate('/app/emissao/adicionar')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-primary/50 text-slate-50">
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
                                <input type="text" placeholder="00000-000" value={freteData.cepOrigem} onChange={e => setFreteData({
                ...freteData,
                cepOrigem: e.target.value
              })} className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all" maxLength={9} />
                            </div>

                            {/* CEP Destino */}
                            <div>
                                <label className="block text-sm font-medium mb-2">CEP de destino*</label>
                                <input type="text" placeholder="00000-000" value={freteData.cepDestino} onChange={e => setFreteData({
                ...freteData,
                cepDestino: e.target.value
              })} className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all" maxLength={9} />
                            </div>

                            {/* Peso */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Peso (g)*</label>
                                <input type="number" placeholder="0" value={freteData.peso} onChange={e => setFreteData({
                ...freteData,
                peso: e.target.value
              })} className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all" step="1" min="0" />
                            </div>

                            {/* Dimensões */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-2">Altura (cm)</label>
                                    <input type="number" placeholder="2" value={freteData.altura} onChange={e => setFreteData({
                  ...freteData,
                  altura: e.target.value
                })} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-2">Largura (cm)</label>
                                    <input type="number" placeholder="11" value={freteData.largura} onChange={e => setFreteData({
                  ...freteData,
                  largura: e.target.value
                })} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-2">Comp. (cm)</label>
                                    <input type="number" placeholder="16" value={freteData.comprimento} onChange={e => setFreteData({
                  ...freteData,
                  comprimento: e.target.value
                })} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                                </div>
                            </div>

                            <button type="submit" disabled={isLoadingCotacao} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-slate-50 bg-slate-950 hover:bg-slate-800">
                                {isLoadingCotacao ? "Calculando..." : "Calcular frete com desconto"}
                            </button>
                        </form>

                        {/* Resultados */}
                        {cotacoes && cotacoes.length > 0 && <div className="mt-6 space-y-3 animate-fade-in">
                                <p className="text-sm font-medium text-muted-foreground">Fretes disponíveis:</p>
                                {cotacoes.slice(0, 5).map((cotacao, index) => <div key={index} className="p-4 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl hover:shadow-lg hover:border-primary transition-all cursor-pointer hover:scale-[1.02]" onClick={() => navigate('/app/emissao/adicionar')}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-foreground">{cotacao.nomeServico}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {cotacao.prazo} {cotacao.prazo === 1 ? 'dia útil' : 'dias úteis'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-foreground">
                                                    R$ {parseFloat(cotacao.preco).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>)}
                            </div>}
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {features.map((feature, index) => <div key={index} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in" style={{
          animationDelay: `${index * 100}ms`
        }}>
                            <div className={`${feature.color} mb-4`}>
                                <feature.icon className="h-10 w-10" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>)}
                </div>

                {/* BRHUB Services Section */}
                <div className="mb-16">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Tudo que a BRHUB oferece para você
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            Soluções completas para simplificar e acelerar sua logística
                        </p>
                    </div>

                    {/* Main Services Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {/* Integração Direta */}
                        

                        {/* Solução Completa */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-600 rounded-xl">
                                    <Truck className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-2 text-purple-900 dark:text-purple-100">
                                        Solução Completa de Envio
                                    </h3>
                                    <p className="text-sm text-purple-700 dark:text-purple-300">
                                        Da geração da etiqueta à entrega, com atualizações automáticas via WhatsApp
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Suporte 24/7 */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-600 rounded-xl">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-2 text-green-900 dark:text-green-100">
                                        Suporte 24/7
                                    </h3>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Atendimento humanizado via IA a qualquer hora do dia para o destinatário
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Frete Exclusiva */}
                        

                        {/* Coleta na Loja */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-600 rounded-xl">
                                    <Package className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-2 text-indigo-900 dark:text-indigo-100">
                                        Coleta na sua loja
                                    </h3>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                        Coletamos suas encomendas em sua loja sem custo extra e sem necessidade de volume mínimo de pacote
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Endereço */}
                        
                    </div>

                    {/* Operational Flow Section */}
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-8 mb-12">
                        <h3 className="text-2xl font-bold mb-6 text-center">
                            Fluxo Operacional Simples e Eficiente
                        </h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-card rounded-xl p-6 border border-border">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                                    </div>
                                    <h4 className="font-bold">Agendamento Automático</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Gerou a etiqueta, o sistema agenda sua coleta automaticamente
                                </p>
                            </div>
                            <div className="bg-card rounded-xl p-6 border border-border">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                        <Package className="h-5 w-5 text-green-600 dark:text-green-300" />
                                    </div>
                                    <h4 className="font-bold">Todas encomendas</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Seguem fluxo de postagem no mesmo dia
                                </p>
                            </div>
                            <div className="bg-card rounded-xl p-6 border border-border">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                        <Truck className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                                    </div>
                                    <h4 className="font-bold">Postagem Direta</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold">Está fora de São Paulo?</span> Faça sua postagem direto na agência e aproveite os benefícios do serviço
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-3xl p-8">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div>
                                <h3 className="text-3xl font-bold mb-4 text-green-900 dark:text-green-100">
                                    Quanto Custa?
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-600 rounded-full mt-1">
                                            <Package className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-900 dark:text-green-100">
                                                Você não paga para usar
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-300">
                                                Sistema 100% gratuito para lojistas
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-600 rounded-full mt-1">
                                            <Clock className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-900 dark:text-green-100">
                                                Pós Venda sem complicação          
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-300">Atualizamos o destinatário do status da encomenda                  </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-600 rounded-full mt-1">
                                            <DollarSign className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-900 dark:text-green-100">
                                                Relatório completo com status das postagens
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-300">
                                                Acompanhe tudo em tempo real
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-600 rounded-full mt-1">
                                            <Package className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-900 dark:text-green-100">
                                                Suporte 24x7   
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-300">Realizamos suporte completo para o destinatárioe remetente                  </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        
                                        <div>
                                            
                                            
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl font-black text-green-600 dark:text-green-400 mb-4">
                                        R$ 0
                                    </div>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                                        Para usar a plataforma
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Pague apenas pelo que usar
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Benefits for VESTI Merchants */}
                    
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Pronto para economizar nos seus fretes?
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Comece agora mesmo a emitir fretes com desconto
                    </p>
                    <button onClick={() => navigate('/app/emissao/adicionar')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2 text-slate-50">
                        <Plus className="h-5 w-5" />
                        Criar primeira etiqueta
                    </button>
                </div>
            </div>
        </div>;
};