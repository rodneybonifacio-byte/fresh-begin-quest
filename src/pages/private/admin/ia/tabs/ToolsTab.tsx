import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { ShieldCheck, ToggleLeft, ToggleRight, Lock } from 'lucide-react';
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
    queryFn: () => aiManagementQuery<AiTool>({
      action: 'select',
      table: 'ai_tools',
      orderBy: { column: 'category', ascending: true },
    }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AiTool> }) => {
      await aiManagementUpdate('ai_tools', id, updates);
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

  if (isLoading) return <div className="p-4 text-muted-foreground">Carregando funções...</div>;

  const grouped = (tools || []).reduce<Record<string, AiTool[]>>((acc, tool) => {
    const cat = tool.category || 'geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  return (
    <div className="mt-4 space-y-6">
      {Object.entries(grouped).map(([category, categoryTools]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="space-y-2">
            {categoryTools.map((tool) => (
              <div key={tool.id} className={`border rounded-lg p-4 flex items-center justify-between transition-colors ${tool.is_enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">{tool.display_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${riskColors[tool.risk_level] || 'bg-gray-100 text-gray-700'}`}>
                      {riskLabels[tool.risk_level] || tool.risk_level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                  {tool.allowed_agents?.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">Agentes: {tool.allowed_agents.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => toggleApproval(tool)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${tool.requires_approval ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}
                    title={tool.requires_approval ? 'Requer aprovação humana' : 'Execução automática'}
                  >
                    {tool.requires_approval ? <Lock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                    {tool.requires_approval ? 'Manual' : 'Auto'}
                  </button>
                  <button onClick={() => toggleEnabled(tool)} className="p-1">
                    {tool.is_enabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
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
