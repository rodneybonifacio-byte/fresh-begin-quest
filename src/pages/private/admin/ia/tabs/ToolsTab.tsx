import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { ShieldCheck, ToggleLeft, ToggleRight, Lock, Phone, Plus, Trash2, Search } from 'lucide-react';
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

interface PhoneRule {
  id: string;
  phone_number: string;
  contact_name: string | null;
  allow_all: boolean;
  allowed_tool_names: string[];
  blocked_tool_names: string[];
  skip_approval: boolean;
  is_active: boolean;
  notes: string | null;
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const riskLabels: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

const categoryLabels: Record<string, string> = {
  emissao: 'Emissão',
  remetente: 'Remetente',
  rastreio: 'Rastreio',
  financeiro: 'Financeiro',
  fatura: 'Faturas',
  boleto: 'Boletos / Banco Inter',
  clientes: 'Gestão de Clientes',
  integracao: 'Integrações E-commerce',
  crm: 'CRM / WhatsApp',
  ia: 'Gestão da IA',
  parceiro: 'Conecta+ (Parceiros)',
  ferramenta: 'Ferramentas Admin',
  plano: 'Planos / Precificação',
  promocao: 'Promoções',
  cron: 'Automações (Cron)',
  sistema: 'Sistema',
  geral: 'Geral',
  rastreamento: 'Rastreamento',
  cadastro: 'Cadastro',
  comercial: 'Comercial',
  operacional: 'Operacional',
  suporte: 'Suporte',
};

const ToolsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'tools' | 'rules'>('tools');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newPhone, setNewPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');

  // Tools query
  const { data: tools, isLoading: loadingTools } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: () => aiManagementQuery<AiTool>({
      action: 'select',
      table: 'ai_tools',
      orderBy: { column: 'category', ascending: true },
    }),
  });

  // Phone rules query
  const { data: phoneRules, isLoading: loadingRules } = useQuery({
    queryKey: ['ai-phone-rules'],
    queryFn: () => aiManagementQuery<PhoneRule>({
      action: 'select',
      table: 'ai_tool_phone_rules',
      orderBy: { column: 'created_at', ascending: false },
    }),
  });

  const updateToolMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AiTool> }) => {
      await aiManagementUpdate('ai_tools', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tools'] });
      toast.success('Função atualizada!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const addRuleMutation = useMutation({
    mutationFn: async (rule: Partial<PhoneRule>) => {
      await aiManagementQuery({
        action: 'insert',
        table: 'ai_tool_phone_rules',
        data: rule,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-phone-rules'] });
      toast.success('Regra adicionada!');
      setNewPhone('');
      setNewContactName('');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PhoneRule> }) => {
      await aiManagementUpdate('ai_tool_phone_rules', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-phone-rules'] });
      toast.success('Regra atualizada!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await aiManagementQuery({
        action: 'delete',
        table: 'ai_tool_phone_rules',
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-phone-rules'] });
      toast.success('Regra removida!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const toggleEnabled = (tool: AiTool) => {
    updateToolMutation.mutate({ id: tool.id, updates: { is_enabled: !tool.is_enabled } });
  };

  const toggleApproval = (tool: AiTool) => {
    updateToolMutation.mutate({ id: tool.id, updates: { requires_approval: !tool.requires_approval } });
  };

  const addPhoneRule = () => {
    if (!newPhone.trim()) return toast.error('Informe o número');
    addRuleMutation.mutate({
      phone_number: newPhone.trim(),
      contact_name: newContactName.trim() || null,
      allow_all: true,
      skip_approval: true,
      is_active: true,
    });
  };

  // Filter tools
  const filteredTools = (tools || []).filter(t => {
    const matchesSearch = !searchTerm || 
      t.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = filteredTools.reduce<Record<string, AiTool[]>>((acc, tool) => {
    const cat = tool.category || 'geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  const categories = [...new Set((tools || []).map(t => t.category))];
  const totalEnabled = (tools || []).filter(t => t.is_enabled).length;
  const totalApproval = (tools || []).filter(t => t.requires_approval).length;

  return (
    <div className="mt-4 space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">Total</span>
          <p className="text-lg font-bold text-foreground">{tools?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">Ativas</span>
          <p className="text-lg font-bold text-green-600">{totalEnabled}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">Aprovação Manual</span>
          <p className="text-lg font-bold text-orange-600">{totalApproval}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">Regras Telefone</span>
          <p className="text-lg font-bold text-blue-600">{phoneRules?.length || 0}</p>
        </div>
      </div>

      {/* Section toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('tools')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'tools' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Funções ({tools?.length || 0})
        </button>
        <button
          onClick={() => setActiveSection('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'rules' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Regras por Telefone ({phoneRules?.length || 0})
        </button>
      </div>

      {/* TOOLS SECTION */}
      {activeSection === 'tools' && (
        <>
          {/* Search and filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar função..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="all">Todas categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
              ))}
            </select>
          </div>

          {loadingTools ? (
            <div className="p-4 text-muted-foreground">Carregando funções...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, categoryTools]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    {categoryLabels[category] || category} ({categoryTools.length})
                  </h3>
                  <div className="space-y-2">
                    {categoryTools.map((tool) => (
                      <div key={tool.id} className={`border rounded-lg p-4 flex items-center justify-between transition-colors ${tool.is_enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-foreground text-sm">{tool.display_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${riskColors[tool.risk_level] || 'bg-muted text-muted-foreground'}`}>
                              {riskLabels[tool.risk_level] || tool.risk_level}
                            </span>
                            {tool.edge_function && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-mono">
                                {tool.edge_function}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                          {tool.allowed_agents?.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1">Agentes: {tool.allowed_agents.join(', ')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <button
                            onClick={() => toggleApproval(tool)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${tool.requires_approval ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}
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
          )}
        </>
      )}

      {/* PHONE RULES SECTION */}
      {activeSection === 'rules' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1 flex items-center gap-2"><Phone className="w-4 h-4" /> Regras por Telefone</h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Defina quais números de telefone podem executar todas as funções da IA automaticamente, sem necessidade de aprovação humana.
            </p>
          </div>

          {/* Add new rule */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h4 className="text-sm font-medium text-foreground mb-3">Adicionar número autorizado</h4>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Número (ex: 5511999998888)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              />
              <input
                type="text"
                placeholder="Nome do contato (opcional)"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              />
              <button
                onClick={addPhoneRule}
                disabled={addRuleMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Rules list */}
          {loadingRules ? (
            <div className="p-4 text-muted-foreground">Carregando regras...</div>
          ) : (phoneRules || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma regra cadastrada</p>
              <p className="text-xs">Adicione um número para liberar acesso total à IA</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(phoneRules || []).map((rule) => (
                <div key={rule.id} className={`border rounded-lg p-4 transition-colors ${rule.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono font-medium text-foreground text-sm">{rule.phone_number}</span>
                        {rule.contact_name && (
                          <span className="text-xs text-muted-foreground">({rule.contact_name})</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {rule.allow_all && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                            Acesso Total
                          </span>
                        )}
                        {rule.skip_approval && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                            Sem Aprovação
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateRuleMutation.mutate({ id: rule.id, updates: { allow_all: !rule.allow_all } })}
                        className={`text-xs px-2 py-1 rounded-md ${rule.allow_all ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}
                      >
                        {rule.allow_all ? 'Tudo' : 'Parcial'}
                      </button>
                      <button
                        onClick={() => updateRuleMutation.mutate({ id: rule.id, updates: { skip_approval: !rule.skip_approval } })}
                        className={`text-xs px-2 py-1 rounded-md ${rule.skip_approval ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}
                      >
                        {rule.skip_approval ? 'Auto' : 'Manual'}
                      </button>
                      <button
                        onClick={() => updateRuleMutation.mutate({ id: rule.id, updates: { is_active: !rule.is_active } })}
                        className="p-1"
                      >
                        {rule.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Remover esta regra?')) deleteRuleMutation.mutate(rule.id);
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolsTab;
