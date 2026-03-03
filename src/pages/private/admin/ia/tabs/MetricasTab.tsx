import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiManagementQuery } from '@/services/aiManagementApi';
import { BarChart3, CheckCircle, XCircle, Clock, MessageSquare, Image, Mic } from 'lucide-react';

const MetricasTab: React.FC = () => {
  const [periodo, setPeriodo] = useState<'hoje' | '7d' | '30d'>('7d');

  const getDateFilter = () => {
    const now = new Date();
    if (periodo === 'hoje') return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    if (periodo === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-metrics', periodo],
    queryFn: () => aiManagementQuery({
      action: 'select',
      table: 'ai_interaction_logs',
      filters: [{ column: 'created_at', op: 'gte', value: getDateFilter() }],
      orderBy: { column: 'created_at', ascending: false },
    }),
  });

  const totalInteractions = logs?.length || 0;
  const successCount = logs?.filter((l: any) => l.success).length || 0;
  const errorCount = logs?.filter((l: any) => !l.success).length || 0;
  const avgResponseTime = logs?.length
    ? Math.round((logs.reduce((sum: number, l: any) => sum + (l.response_time_ms || 0), 0)) / logs.length)
    : 0;

  const byAgent = (logs || []).reduce((acc: any, l: any) => {
    acc[l.agent_name] = (acc[l.agent_name] || 0) + 1;
    return acc;
  }, {});

  const byContentType = (logs || []).reduce((acc: any, l: any) => {
    acc[l.content_type] = (acc[l.content_type] || 0) + 1;
    return acc;
  }, {});

  const contentTypeIcons: Record<string, React.ReactNode> = {
    text: <MessageSquare className="w-4 h-4" />,
    image: <Image className="w-4 h-4" />,
    audio: <Mic className="w-4 h-4" />,
  };

  return (
    <div className="mt-4 space-y-6">
      <div className="flex gap-2">
        {(['hoje', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodo === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-4 text-muted-foreground">Carregando métricas...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalInteractions}</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{successCount}</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Erros</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Tempo Médio</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{avgResponseTime}ms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-border rounded-xl p-5 bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Por Agente</h3>
              {Object.entries(byAgent).map(([agent, count]) => (
                <div key={agent} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-foreground capitalize">{agent}</span>
                  <span className="text-sm font-medium text-muted-foreground">{count as number}</span>
                </div>
              ))}
              {Object.keys(byAgent).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            </div>
            <div className="border border-border rounded-xl p-5 bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Por Tipo de Conteúdo</h3>
              {Object.entries(byContentType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {contentTypeIcons[type] || <MessageSquare className="w-4 h-4" />}
                    <span className="text-sm text-foreground capitalize">{type}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{count as number}</span>
                </div>
              ))}
              {Object.keys(byContentType).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MetricasTab;
