import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data, error } = await supabase
        .from('ai_interaction_logs')
        .select('*')
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw error;
      return data;
    },
  });

  const totalInteractions = logs?.length || 0;
  const successCount = logs?.filter(l => l.success).length || 0;
  const errorCount = logs?.filter(l => !l.success).length || 0;
  const avgResponseTime = logs?.length
    ? Math.round((logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0)) / logs.length)
    : 0;

  const byAgent = (logs || []).reduce((acc, l) => {
    acc[l.agent_name] = (acc[l.agent_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byContentType = (logs || []).reduce((acc, l) => {
    acc[l.content_type] = (acc[l.content_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byTool = (logs || []).filter(l => l.tool_used).reduce((acc, l) => {
    acc[l.tool_used!] = (acc[l.tool_used!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const contentTypeIcons: Record<string, React.ReactNode> = {
    text: <MessageSquare className="w-4 h-4" />,
    image: <Image className="w-4 h-4" />,
    audio: <Mic className="w-4 h-4" />,
    voice: <Mic className="w-4 h-4" />,
    ptt: <Mic className="w-4 h-4" />,
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Período */}
      <div className="flex gap-2">
        {([['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriodo(key)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${periodo === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando métricas...</div>
      ) : (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-medium">Total Interações</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalInteractions}</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{successCount}</p>
              <p className="text-xs text-muted-foreground">{totalInteractions > 0 ? Math.round(successCount / totalInteractions * 100) : 0}%</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <XCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Erros</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{errorCount}</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Tempo Médio</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{avgResponseTime}ms</p>
            </div>
          </div>

          {/* Por agente */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <h4 className="text-sm font-semibold text-foreground mb-3">Por Agente</h4>
              {Object.entries(byAgent).map(([agent, count]) => (
                <div key={agent} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-foreground capitalize">{agent}</span>
                  <span className="text-sm font-medium text-primary">{count}</span>
                </div>
              ))}
              {Object.keys(byAgent).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            </div>

            <div className="border border-border rounded-xl p-4 bg-card">
              <h4 className="text-sm font-semibold text-foreground mb-3">Por Tipo de Conteúdo</h4>
              {Object.entries(byContentType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-foreground flex items-center gap-2">
                    {contentTypeIcons[type] || null}
                    {type}
                  </span>
                  <span className="text-sm font-medium text-primary">{count}</span>
                </div>
              ))}
              {Object.keys(byContentType).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            </div>

            <div className="border border-border rounded-xl p-4 bg-card">
              <h4 className="text-sm font-semibold text-foreground mb-3">Tools Utilizadas</h4>
              {Object.entries(byTool).sort(([,a],[,b]) => b - a).map(([tool, count]) => (
                <div key={tool} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{tool}</span>
                  <span className="text-sm font-medium text-primary">{count}</span>
                </div>
              ))}
              {Object.keys(byTool).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            </div>
          </div>

          {/* Últimas interações */}
          <div className="border border-border rounded-xl p-4 bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Últimas Interações</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-left py-2 px-2">Agente</th>
                    <th className="text-left py-2 px-2">Tipo</th>
                    <th className="text-left py-2 px-2">Tool</th>
                    <th className="text-left py-2 px-2">Tempo</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs || []).slice(0, 20).map(log => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-2 text-foreground">{new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 px-2 text-foreground capitalize">{log.agent_name}</td>
                      <td className="py-2 px-2 text-foreground">{log.content_type}</td>
                      <td className="py-2 px-2 text-muted-foreground">{log.tool_used || '-'}</td>
                      <td className="py-2 px-2 text-foreground">{log.response_time_ms ? `${log.response_time_ms}ms` : '-'}</td>
                      <td className="py-2 px-2">
                        {log.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalInteractions === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma interação registrada neste período</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MetricasTab;
