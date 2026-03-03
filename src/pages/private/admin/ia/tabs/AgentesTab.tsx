import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { Bot, Save, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface AiAgent {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  system_prompt: string;
  personality: string | null;
  avatar_url: string | null;
  is_active: boolean;
  model: string;
  provider: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

const AgentesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AiAgent>>({});

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiManagementQuery<AiAgent>({
      action: 'select',
      table: 'ai_agents',
      orderBy: { column: 'name', ascending: true },
    }),
  });

  const updateMutation = useMutation({
    mutationFn: async (agent: Partial<AiAgent> & { id: string }) => {
      await aiManagementUpdate('ai_agents', agent.id, {
        display_name: agent.display_name,
        description: agent.description,
        system_prompt: agent.system_prompt,
        personality: agent.personality,
        is_active: agent.is_active,
        model: agent.model,
        provider: agent.provider,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      setEditingId(null);
      toast.success('Agente atualizado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message),
  });

  const toggleActive = async (agent: AiAgent) => {
    updateMutation.mutate({ id: agent.id, is_active: !agent.is_active } as any);
  };

  const startEditing = (agent: AiAgent) => {
    setEditingId(agent.id);
    setEditForm({ ...agent });
  };

  const saveEdit = () => {
    if (!editingId || !editForm) return;
    updateMutation.mutate({ id: editingId, ...editForm } as any);
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Carregando agentes...</div>;

  return (
    <div className="mt-4 space-y-6">
      {agents?.map((agent) => (
        <div key={agent.id} className="border border-border rounded-xl p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{agent.display_name}</h3>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(agent)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={agent.is_active ? 'Desativar' : 'Ativar'}>
                {agent.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
              </button>
              <button onClick={() => startEditing(agent)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {editingId === agent.id ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome de Exibição</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  value={editForm.display_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Personalidade</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  value={editForm.personality || ''}
                  onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Prompt do Sistema</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm min-h-[200px] font-mono"
                  value={editForm.system_prompt || ''}
                  onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    value={editForm.model || 'gpt-4o'}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Provedor</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    value={editForm.provider || 'openai'}
                    onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                  >
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Temperatura</label>
                  <input
                    type="number" step="0.1" min="0" max="2"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    value={editForm.temperature ?? 0.7}
                    onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Max Tokens</label>
                  <input
                    type="number" min="100" max="4000"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    value={editForm.max_tokens ?? 500}
                    onChange={(e) => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
                <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 hover:opacity-90">
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Modelo:</span> <span className="font-medium text-foreground">{agent.model}</span></div>
                <div><span className="text-muted-foreground">Provedor:</span> <span className="font-medium text-foreground">{agent.provider}</span></div>
                <div><span className="text-muted-foreground">Temperatura:</span> <span className="font-medium text-foreground">{agent.temperature}</span></div>
                <div><span className="text-muted-foreground">Max Tokens:</span> <span className="font-medium text-foreground">{agent.max_tokens}</span></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Prompt do Sistema:</p>
                <p className="text-sm text-foreground whitespace-pre-line line-clamp-4">{agent.system_prompt}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AgentesTab;
