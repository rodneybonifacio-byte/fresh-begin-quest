import { useState, useEffect } from 'react';
import { supabase } from '../../../../integrations/supabase/client';
import { RealtimeStatusIndicator } from '../../../../components/RealtimeStatusIndicator';
import { Clock, CheckCircle, XCircle, RefreshCw, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface RecargaPendente {
  id: string;
  cliente_id: string;
  valor: number;
  status: string;
  txid: string;
  data_criacao: string;
  data_expiracao: string | null;
  pix_copia_cola: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente_pagamento: { 
    label: 'Pendente', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="w-4 h-4" />
  },
  aguardando_confirmacao: { 
    label: 'Aguardando Confirmação', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <RefreshCw className="w-4 h-4" />
  },
  pago: { 
    label: 'Pago', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="w-4 h-4" />
  },
  expirado: { 
    label: 'Expirado', 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: <XCircle className="w-4 h-4" />
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: <XCircle className="w-4 h-4" />
  },
};

export default function RecargasPendentes() {
  const [recargas, setRecargas] = useState<RecargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente_pagamento');
  const [searchTxid, setSearchTxid] = useState('');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | undefined>(undefined);

  const fetchRecargas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('recargas_pix')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (filtroStatus && filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      if (searchTxid) {
        query = query.ilike('txid', `%${searchTxid}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Erro ao buscar recargas:', error);
        toast.error('Erro ao carregar recargas');
        return;
      }

      setRecargas(data || []);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar recargas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecargas();
  }, [filtroStatus]);

  // Realtime subscription
  useEffect(() => {
    console.log('🔔 Iniciando listener realtime para recargas pendentes...');

    const channel = supabase
      .channel('admin-recargas-pix-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recargas_pix'
        },
        (payload) => {
          console.log('📥 Atualização realtime recebida:', payload);
          setLastUpdate(new Date());
          fetchRecargas();
        }
      )
      .subscribe((status) => {
        console.log('Status do canal realtime admin:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin inscrito no canal de recargas');
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Erro no canal realtime admin');
          setRealtimeConnected(false);
        }
      });

    return () => {
      console.log('🔕 Removendo listener realtime admin');
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSearch = () => {
    fetchRecargas();
  };

  const handleProcessarManual = (txid: string) => {
    window.location.href = `/admin/financeiro/pagamento-manual?txid=${txid}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  // Estatísticas
  const stats = {
    total: recargas.length,
    pendentes: recargas.filter(r => r.status === 'pendente_pagamento').length,
    aguardando: recargas.filter(r => r.status === 'aguardando_confirmacao').length,
    valorTotal: recargas.reduce((acc, r) => acc + Number(r.valor), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recargas Pendentes</h1>
          <p className="text-muted-foreground">Gerenciar recargas PIX aguardando confirmação</p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeStatusIndicator isConnected={realtimeConnected} lastUpdate={lastUpdate} />
          <button
            onClick={fetchRecargas}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Listado</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Aguardando Confirmação</p>
          <p className="text-2xl font-bold text-blue-600">{stats.aguardando}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorTotal)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todos</option>
              <option value="pendente_pagamento">Pendente Pagamento</option>
              <option value="aguardando_confirmacao">Aguardando Confirmação</option>
              <option value="pago">Pago</option>
              <option value="expirado">Expirado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Buscar por TXID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTxid}
                onChange={(e) => setSearchTxid(e.target.value)}
                placeholder="Digite o TXID..."
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : recargas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhuma recarga encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">TXID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Criação</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expiração</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recargas.map((recarga) => {
                  const statusInfo = statusConfig[recarga.status] || statusConfig.pendente_pagamento;
                  const isExpired = recarga.data_expiracao && new Date(recarga.data_expiracao) < new Date();
                  const canProcess = recarga.status === 'pendente_pagamento' || recarga.status === 'aguardando_confirmacao';

                  return (
                    <tr key={recarga.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground">{recarga.txid.substring(0, 20)}...</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{recarga.cliente_id.substring(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-600">{formatCurrency(recarga.valor)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(recarga.data_criacao)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {recarga.data_expiracao ? (
                          <span className={`text-sm ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {formatDate(recarga.data_expiracao)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canProcess && !isExpired && (
                          <button
                            onClick={() => handleProcessarManual(recarga.txid)}
                            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            Processar Manual
                          </button>
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
    </div>
  );
}
