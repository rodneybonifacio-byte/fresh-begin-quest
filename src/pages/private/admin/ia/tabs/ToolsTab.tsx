import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface AiTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  edge_function: string | null;
  is_enabled: boolean;
  requires_approval: boolean;
  allowed_agents: string[];
  risk_level: string;
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const riskLabels: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

const categoryLabels: Record<string, string> = {
  rastreamento: '📦 Rastreamento',
  financeiro: '💰 Financeiro',
  cadastro: '👤 Cadastro',
  comercial: '🏷️ Comercial',
  operacional: '⚙️ Operacional',
  suporte: '🎧 Suporte',
  geral: '📋 Geral',
};

const ToolsTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: tools, isLoading } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data, error } = await supabase
        .from('ai_tools')
        .select('*')
        .order('category, name')
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw error;
      return data as AiTool[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AiTool> }) => {
      const token = localStorage.getItem('token');
      const { error } = await supabase
        .from('ai_tools')
        .update(updates)
        .eq('id', id)
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tools'] });
      toast.success('Função atualizada!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const toggleEnabled = (tool: AiTool) => {
    updateMutation.mutate({ id: tool.id, updates: { is_enabled: !tool.is_enabled } });
  };

  const toggleApproval = (tool: AiTool) => {
    updateMutation.mutate({ id: tool.id, updates: { requires_approval: !tool.requires_approval } });
  };

  const toggleAgent = (tool: AiTool, agent: string) => {
    const current = tool.allowed_agents || [];
    const updated = current.includes(agent) ? current.filter(a => a !== agent) : [...current, agent];
    updateMutation.mutate({ id: tool.id, updates: { allowed_agents: updated } });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Carregando funções...</div>;

  const grouped = (tools || []).reduce((acc, tool) => {
    const cat = tool.category || 'geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {} as Record<string, AiTool[]>);

  return (
    <div className="mt-4 space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p><strong>Modo Híbrido:</strong> Funções com risco baixo podem ser executadas automaticamente. Funções com risco médio/alto requerem aprovação humana antes de serem executadas pela IA.</p>
      </div>

      {Object.entries(grouped).map(([category, catTools]) => (
        <div key={category}>
          <h3 className="text-base font-semibold text-foreground mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="space-y-2">
            {catTools.map((tool) => (
              <div key={tool.id} className={`border rounded-lg p-4 transition-colors ${tool.is_enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{tool.display_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors[tool.risk_level]}`}>
                        {tool.risk_level === 'low' ? <ShieldCheck className="w-3 h-3 inline mr-1" /> :
                         tool.risk_level === 'high' ? <ShieldAlert className="w-3 h-3 inline mr-1" /> :
                         <Shield className="w-3 h-3 inline mr-1" />}
                        {riskLabels[tool.risk_level]}
                      </span>
                      {tool.requires_approval && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Aprovação
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                    {tool.edge_function && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{tool.edge_function}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    {/* Agentes */}
                    <div className="flex gap-1">
                      {['maya', 'felipe'].map(agent => (
                        <button
                          key={agent}
                          onClick={() => toggleAgent(tool, agent)}
                          className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                            (tool.allowed_agents || []).includes(agent)
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {agent.charAt(0).toUpperCase() + agent.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Aprovação toggle */}
                    <button
                      onClick={() => toggleApproval(tool)}
                      className={`p-1.5 rounded-lg transition-colors ${tool.requires_approval ? 'text-orange-500' : 'text-muted-foreground'}`}
                      title={tool.requires_approval ? 'Requer aprovação' : 'Execução automática'}
                    >
                      <Lock className="w-4 h-4" />
                    </button>

                    {/* Enabled toggle */}
                    <button onClick={() => toggleEnabled(tool)} title={tool.is_enabled ? 'Desativar' : 'Ativar'}>
                      {tool.is_enabled ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolsTab;
