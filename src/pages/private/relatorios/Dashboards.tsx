import { TrendingUp, Package, DollarSign, Clock, Truck, MapPin, BarChart3, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useFetchQuery } from '../../hooks/useFetchQuery';
import { DashboardService } from '../../services/DashboardService';

const dashboardService = new DashboardService();

export default function Dashboards() {
  const [period, setPeriod] = useState('30d');

  const { data: dashboardData, isLoading, error } = useFetchQuery(
    ['dashboard', period],
    () => dashboardService.getDashboard({ periodo: period })
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dashboards...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar dados do dashboard</p>
          <p className="text-sm text-muted-foreground mt-2">Tente novamente mais tarde</p>
        </div>
      </div>
    );
  }

  const { envio, entregaAnalitico } = dashboardData;

  // Calcular estatísticas a partir dos dados reais
  const stats = {
    totalEnvios: envio.analyticsUf.reduce((acc, uf) => acc + uf.totalEnviado, 0),
    valorTotal: envio.analyticsUf.reduce((acc, uf) => acc + uf.valorFrete, 0),
    tempoMedio: entregaAnalitico?.indicadores?.atrasoMedio || 0,
    emTransito: entregaAnalitico?.indicadores?.totalEmTransito || 0,
    entregues: entregaAnalitico?.indicadores?.totalEntregues || 0,
    sla: entregaAnalitico?.indicadores?.sla || 0
  };

  // Top destinos por cidade
  const topDestinos = envio.analyticsCidade
    .sort((a, b) => b.totalEnviado - a.totalEnviado)
    .slice(0, 5)
    .map(cidade => ({
      cidade: cidade.destinatarioLocalidade,
      uf: cidade.destinatarioUf,
      quantidade: cidade.totalEnviado,
      percentual: stats.totalEnvios > 0 ? (cidade.totalEnviado / stats.totalEnvios) * 100 : 0
    }));

  // Distribuição por status
  const statusDistribution = entregaAnalitico?.distribuicaoStatus?.map(item => ({
    status: item.status.replace(/_/g, ' '),
    quantidade: item.total,
    percentual: stats.totalEnvios > 0 ? (item.total / stats.totalEnvios) * 100 : 0,
    cor: item.status.includes('ENTREGUE') ? 'bg-green-500' : 'bg-blue-500'
  })) || [];

  // Serviços utilizados
  const servicosUtilizados = entregaAnalitico?.distribuicaoServicos?.map(servico => ({
    nome: servico.servico,
    quantidade: servico.total,
    noPrazo: servico.totalNoPrazo,
    comAtraso: servico.totalComAtraso,
    cor: 'bg-primary'
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Dashboards de Envios
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe suas métricas e performance em tempo real
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  period === p
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-card border border-border hover:border-primary'
                }`}
              >
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Envios */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Package className="h-6 w-6 text-white" />
              </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-sm">SLA: {stats.sla.toFixed(1)}%</span>
            </div>
            </div>
            <h3 className="text-3xl font-black text-blue-900 dark:text-blue-100">
              {stats.totalEnvios.toLocaleString('pt-BR')}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Total de Envios</p>
          </div>

          {/* Valor Total */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-600 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-green-900 dark:text-green-100">
              R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">Valor Total em Fretes</p>
          </div>

          {/* Tempo Médio */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-600 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-orange-900 dark:text-orange-100">
              {stats.tempoMedio} dias
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Tempo Médio de Entrega</p>
          </div>

          {/* Em Trânsito */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-600 rounded-xl">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-purple-900 dark:text-purple-100">
              {stats.emTransito}
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Envios em Trânsito</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Destinos */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Top Destinos</h3>
                <p className="text-sm text-muted-foreground">Principais cidades de destino</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {topDestinos.map((destino, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{destino.cidade} - {destino.uf}</span>
                    <span className="text-sm text-muted-foreground">
                      {destino.quantidade} envios ({destino.percentual}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${destino.percentual}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Distribuição por Status</h3>
                <p className="text-sm text-muted-foreground">Status atual dos envios</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {statusDistribution.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.cor}`} />
                      <span className="font-medium">{item.status}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.quantidade} ({item.percentual}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`${item.cor} h-2 rounded-full transition-all`}
                      style={{ width: `${item.percentual}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Serviços Utilizados */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Serviços Mais Utilizados</h3>
              <p className="text-sm text-muted-foreground">Distribuição por transportadora</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {servicosUtilizados.map((servico, index) => (
              <div key={index} className="bg-muted/50 rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 ${servico.cor} rounded-lg flex items-center justify-center`}>
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-black">{servico.quantidade}</span>
                </div>
                <h4 className="font-bold text-lg mb-1">{servico.nome}</h4>
                <p className="text-sm text-muted-foreground">
                  R$ {servico.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
