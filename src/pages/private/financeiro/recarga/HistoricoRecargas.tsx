import { useState } from "react";
import { RecargaPixService } from "../../../../services/RecargaPixService";
import { IRecargaPix } from "../../../../types/IRecargaPix";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { formatCurrencyWithCents } from "../../../../utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  Filter, 
  X, 
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function HistoricoRecargas() {
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    status: "todos" as "todos" | "pendente_pagamento" | "pago" | "expirado" | "cancelado",
    valorMin: "",
    valorMax: ""
  });

    const { data: recargas = [], isLoading } = useFetchQuery<IRecargaPix[]>(
        ['recargas-historico'],
        async () => {
            return await RecargaPixService.buscarRecargas(100);
        }
    );

  const recargasFiltradas = recargas.filter((recarga) => {
    // Filtro por data
    if (filtros.dataInicio) {
      const dataRecarga = new Date(recarga.data_criacao);
      const dataInicio = new Date(filtros.dataInicio);
      if (dataRecarga < dataInicio) return false;
    }
    if (filtros.dataFim) {
      const dataRecarga = new Date(recarga.data_criacao);
      const dataFim = new Date(filtros.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      if (dataRecarga > dataFim) return false;
    }

    // Filtro por status
    if (filtros.status !== "todos" && recarga.status !== filtros.status) {
      return false;
    }

    // Filtro por valor
    if (filtros.valorMin) {
      const valorMin = parseFloat(filtros.valorMin);
      if (recarga.valor < valorMin) return false;
    }
    if (filtros.valorMax) {
      const valorMax = parseFloat(filtros.valorMax);
      if (recarga.valor > valorMax) return false;
    }

    return true;
  });

  const limparFiltros = () => {
    setFiltros({
      dataInicio: "",
      dataFim: "",
      status: "todos",
      valorMin: "",
      valorMax: ""
    });
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pago: {
        label: "Pago",
        icon: CheckCircle2,
        className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      },
      pendente_pagamento: {
        label: "Pendente",
        icon: Clock,
        className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
      },
      expirado: {
        label: "Expirado",
        icon: AlertCircle,
        className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
      },
      cancelado: {
        label: "Cancelado",
        icon: XCircle,
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      }
    };
    return configs[status as keyof typeof configs] || configs.pendente_pagamento;
  };

  const resumo = {
    total: recargasFiltradas.reduce((acc, r) => acc + r.valor, 0),
    quantidade: recargasFiltradas.length,
    pagos: recargasFiltradas.filter(r => r.status === 'pago').length,
    pendentes: recargasFiltradas.filter(r => r.status === 'pendente_pagamento').length
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <History className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Histórico de Recargas PIX</h1>
              <p className="text-muted-foreground">Acompanhe todas as suas recargas</p>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Total em Recargas</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrencyWithCents(resumo.total.toString())}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Total de Transações</p>
            <p className="text-2xl font-bold text-foreground">{resumo.quantidade}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Pagos</p>
            <p className="text-2xl font-bold text-green-600">{resumo.pagos}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{resumo.pendentes}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
            </div>
            <button
              onClick={limparFiltros}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todos">Todos</option>
                <option value="pago">Pago</option>
                <option value="pendente_pagamento">Pendente</option>
                <option value="expirado">Expirado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Valor Mínimo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor Mín.</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={filtros.valorMin}
                onChange={(e) => setFiltros({ ...filtros, valorMin: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Valor Máximo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor Máx.</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={filtros.valorMax}
                onChange={(e) => setFiltros({ ...filtros, valorMax: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Carregando histórico...</p>
            </div>
          ) : recargasFiltradas.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground mb-2">Nenhuma recarga encontrada</p>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros ou faça sua primeira recarga
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Data</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Transação</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Valor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recargasFiltradas.map((recarga) => {
                    const statusConfig = getStatusConfig(recarga.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={recarga.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(recarga.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(recarga.data_criacao), "HH:mm", { locale: ptBR })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-mono text-muted-foreground">
                            {recarga.txid.substring(0, 16)}...
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrencyWithCents(recarga.valor.toString())}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.className}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {recarga.data_pagamento ? (
                            <div>
                              <p className="text-sm text-foreground">
                                {format(new Date(recarga.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(recarga.data_pagamento), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer com informação */}
        {recargasFiltradas.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Mostrando {recargasFiltradas.length} de {recargas.length} recargas
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
