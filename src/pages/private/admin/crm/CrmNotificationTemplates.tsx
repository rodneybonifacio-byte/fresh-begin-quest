import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tag, Truck, PackageCheck, Star, AlertTriangle, Building2,
  Bell, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Save, RefreshCw, Variable, Clock, Download, Check, X, Loader2,
  Link2, Eye, Zap, Search
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  trigger_key: string;
  trigger_label: string;
  trigger_description: string | null;
  template_name: string;
  template_language: string;
  template_namespace: string | null;
  variables: { key: string; label: string; system_field?: string }[];
  channel_id: string | null;
  is_active: boolean;
  send_delay_minutes: number;
  created_at: string;
  updated_at: string;
}

interface WhatsAppChannel {
  id: string;
  name: string;
  phone_number: string;
}

interface MetaTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  namespace: string;
  components: any[];
}

// Campos disponíveis do sistema para cada gatilho
const systemFieldsByTrigger: Record<string, { value: string; label: string; description: string }[]> = {
  etiqueta_criada: [
    { value: 'nome_destinatario', label: 'Nome do Destinatário', description: 'Nome completo do destinatário' },
    { value: 'codigo_rastreio', label: 'Código de Rastreio', description: 'Código do objeto para rastreio' },
    { value: 'nome_remetente', label: 'Nome do Remetente', description: 'Nome de quem está enviando' },
    { value: 'servico', label: 'Serviço', description: 'Nome do serviço de envio (SEDEX, PAC, etc.)' },
    { value: 'previsao_entrega', label: 'Previsão de Entrega', description: 'Data estimada de entrega' },
  ],
  objeto_postado: [
    { value: 'nome_destinatario', label: 'Nome do Destinatário', description: 'Nome completo do destinatário' },
    { value: 'codigo_rastreio', label: 'Código de Rastreio', description: 'Código do objeto para rastreio' },
    { value: 'nome_remetente', label: 'Nome do Remetente', description: 'Nome de quem está enviando' },
    { value: 'servico', label: 'Serviço', description: 'Serviço de envio utilizado' },
    { value: 'data_postagem', label: 'Data de Postagem', description: 'Data em que o objeto foi postado' },
  ],
  saiu_para_entrega: [
    { value: 'nome_destinatario', label: 'Nome do Destinatário', description: 'Nome completo do destinatário' },
    { value: 'codigo_rastreio', label: 'Código de Rastreio', description: 'Código do objeto' },
    { value: 'nome_remetente', label: 'Nome do Remetente', description: 'Nome de quem enviou' },
  ],
  avaliacao: [
    { value: 'nome_destinatario', label: 'Nome do Destinatário', description: 'Nome do destinatário' },
    { value: 'codigo_rastreio', label: 'Código de Rastreio', description: 'Código do objeto' },
    { value: 'nome_remetente', label: 'Nome do Remetente', description: 'Nome de quem enviou' },
    { value: 'link_avaliacao', label: 'Link de Avaliação', description: 'URL para avaliar o envio' },
  ],
  atraso: [
    { value: 'nome_destinatario', label: 'Nome do Destinatário', description: 'Nome do destinatário' },
    { value: 'codigo_rastreio', label: 'Código de Rastreio', description: 'Código do objeto' },
    { value: 'nome_remetente', label: 'Nome do Remetente', description: 'Nome de quem enviou' },
    { value: 'dias_atraso', label: 'Dias de Atraso', description: 'Quantidade de dias em atraso' },
    { value: 'previsao_original', label: 'Previsão Original', description: 'Data original de entrega' },
  ],
  retirada_agencia: [
    { value: 'nome_destinatario', label: 'Nome do Destinatário', description: 'Nome do destinatário' },
    { value: 'codigo_rastreio', label: 'Código de Rastreio', description: 'Código do objeto' },
    { value: 'nome_remetente', label: 'Nome do Remetente', description: 'Nome de quem enviou' },
    { value: 'endereco_agencia', label: 'Endereço da Agência', description: 'Endereço da agência para retirada' },
  ],
};

const triggerIcons: Record<string, any> = {
  etiqueta_criada: Tag,
  objeto_postado: Truck,
  saiu_para_entrega: PackageCheck,
  avaliacao: Star,
  atraso: AlertTriangle,
  retirada_agencia: Building2,
};

const triggerColors: Record<string, { text: string; bg: string; border: string }> = {
  etiqueta_criada: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  objeto_postado: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  saiu_para_entrega: { text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  avaliacao: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  atraso: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  retirada_agencia: { text: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
};

const getTemplateBodyText = (components: any[]): string => {
  const body = components?.find((c: any) => c.type === 'BODY' || c.type === 'body');
  return body?.text || '';
};

const getTemplateHeaderText = (components: any[]): string => {
  const header = components?.find((c: any) => c.type === 'HEADER' || c.type === 'header');
  if (header?.format === 'TEXT' || header?.format === 'text') return header.text || '';
  return '';
};

const getTemplateFooterText = (components: any[]): string => {
  const footer = components?.find((c: any) => c.type === 'FOOTER' || c.type === 'footer');
  return footer?.text || '';
};

const CrmNotificationTemplates = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, Partial<NotificationTemplate>>>({});
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [selectingForId, setSelectingForId] = useState<string | null>(null);
  const [metaSearch, setMetaSearch] = useState('');
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => aiManagementQuery<NotificationTemplate>({
      action: 'select',
      table: 'whatsapp_notification_templates',
      orderBy: { column: 'created_at', ascending: true },
    }),
  });

  const { data: channels } = useQuery({
    queryKey: ['whatsapp-channels'],
    queryFn: () => aiManagementQuery<WhatsAppChannel>({
      action: 'select',
      table: 'whatsapp_channels',
    }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      await aiManagementUpdate('whatsapp_notification_templates', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const toggleActive = (template: NotificationTemplate) => {
    updateMutation.mutate({ id: template.id, data: { is_active: !template.is_active } });
  };

  const handleSave = (id: string) => {
    const data = editingData[id];
    if (!data) return;
    updateMutation.mutate({ id, data });
    setEditingData(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const getEditing = (id: string, field: string, fallback: any) => {
    return editingData[id]?.[field as keyof NotificationTemplate] ?? fallback;
  };

  const setField = (id: string, field: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const fetchMetaTemplates = async () => {
    setIsFetchingMeta(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-whatsapp-templates');
      if (error) throw error;
      setMetaTemplates(data.templates || []);
      setShowMetaModal(true);
      toast.success(`${data.templates?.length || 0} templates aprovados encontrados`);
    } catch (err: any) {
      toast.error('Erro ao buscar templates: ' + err.message);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const selectMetaTemplate = (meta: MetaTemplate, templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template) return;

    const bodyText = getTemplateBodyText(meta.components || []);
    const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const availableFields = systemFieldsByTrigger[template.trigger_key] || [];

    // Auto-map variables to system fields when possible
    const variables = varMatches.map((_: string, i: number) => ({
      key: `var_${i + 1}`,
      label: `Variável ${i + 1}`,
      system_field: availableFields[i]?.value || '',
    }));

    setField(templateId, 'template_name', meta.name);
    setField(templateId, 'template_language', meta.language);
    setField(templateId, 'template_namespace', meta.namespace || null);
    setField(templateId, 'variables', variables);

    setSelectingForId(null);
    setShowMetaModal(false);
    toast.success(`Template "${meta.name}" associado! Configure as variáveis e salve.`);
  };

  const updateVariableMapping = (templateId: string, varIndex: number, systemField: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template) return;
    const currentVars = [...(getEditing(templateId, 'variables', template.variables) || [])];
    const availableFields = systemFieldsByTrigger[template.trigger_key] || [];
    const fieldInfo = availableFields.find(f => f.value === systemField);

    currentVars[varIndex] = {
      ...currentVars[varIndex],
      key: systemField || currentVars[varIndex].key,
      label: fieldInfo?.label || currentVars[varIndex].label,
      system_field: systemField,
    };
    setField(templateId, 'variables', currentVars);
  };

  const filteredMetaTemplates = useMemo(() => {
    if (!metaSearch.trim()) return metaTemplates;
    const search = metaSearch.toLowerCase();
    return metaTemplates.filter(t =>
      t.name.toLowerCase().includes(search) ||
      t.category?.toLowerCase().includes(search)
    );
  }, [metaTemplates, metaSearch]);

  // Find the selected meta template for preview
  const getMetaForTemplate = (templateName: string) => {
    return metaTemplates.find(m => m.name === templateName);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm">Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mensagens Ativas</h2>
            <p className="text-xs text-muted-foreground">Associe templates Meta aprovados a cada gatilho e mapeie as variáveis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetaTemplates}
            disabled={isFetchingMeta}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {isFetchingMeta ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Sincronizar da Meta
          </button>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            {templates?.length || 0} gatilhos
          </div>
        </div>
      </div>

      {/* Meta Templates Selection Modal */}
      {showMetaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowMetaModal(false); setSelectingForId(null); }}>
          <div className="bg-background rounded-xl border border-border max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Templates Aprovados na Meta</h3>
                <p className="text-xs text-muted-foreground">{filteredMetaTemplates.length} de {metaTemplates.length} templates</p>
              </div>
              <button onClick={() => { setShowMetaModal(false); setSelectingForId(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectingForId && (
              <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">
                  Associar template ao gatilho: <strong>{templates?.find(t => t.id === selectingForId)?.trigger_label}</strong>
                </span>
              </div>
            )}

            {/* Search */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome do template..."
                  value={metaSearch}
                  onChange={e => setMetaSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[55vh] p-4 space-y-2">
              {filteredMetaTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado</p>
              ) : (
                filteredMetaTemplates.map((meta, i) => {
                  const bodyText = getTemplateBodyText(meta.components || []);
                  const varCount = (bodyText.match(/\{\{(\d+)\}\}/g) || []).length;

                  return (
                    <div key={i} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono font-semibold text-foreground">{meta.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase">
                              {meta.status}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {meta.language}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {meta.category}
                            </span>
                            {varCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                {varCount} variáve{varCount > 1 ? 'is' : 'l'}
                              </span>
                            )}
                          </div>
                          {bodyText && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 font-mono leading-relaxed">
                              {bodyText}
                            </p>
                          )}
                        </div>
                        {selectingForId && (
                          <button
                            onClick={() => selectMetaTemplate(meta, selectingForId)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Associar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template cards */}
      <div className="space-y-3">
        {templates?.map(template => {
          const Icon = triggerIcons[template.trigger_key] || Bell;
          const colors = triggerColors[template.trigger_key] || triggerColors.etiqueta_criada;
          const isExpanded = expandedId === template.id;
          const hasChanges = !!editingData[template.id];
          const currentVars = getEditing(template.id, 'variables', template.variables) || [];
          const currentTemplateName = getEditing(template.id, 'template_name', template.template_name);
          const availableFields = systemFieldsByTrigger[template.trigger_key] || [];
          const metaInfo = getMetaForTemplate(currentTemplateName);
          const allVarsMapped = currentVars.length === 0 || currentVars.every((v: any) => v.system_field);
          const isConfigured = currentTemplateName && currentTemplateName !== 'template_name' && allVarsMapped;

          return (
            <div
              key={template.id}
              className={`rounded-xl border transition-all ${
                template.is_active ? `${colors.border} ${colors.bg}` : 'border-border bg-muted/30 opacity-60'
              }`}
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : template.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{template.trigger_label}</span>
                      {template.send_delay_minutes > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.send_delay_minutes}min
                        </span>
                      )}
                      {isConfigured ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Configurado
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{template.trigger_description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-foreground/5 text-muted-foreground max-w-[200px] truncate">
                    {currentTemplateName}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive(template); }}
                    className="transition-colors"
                  >
                    {template.is_active ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-5 border-t border-border/50 pt-4">
                  {/* Step 1: Select Template */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">1</div>
                      <h4 className="text-sm font-semibold text-foreground">Selecionar Template Meta</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectingForId(template.id);
                          if (metaTemplates.length > 0) {
                            setShowMetaModal(true);
                          } else {
                            fetchMetaTemplates().then(() => setSelectingForId(template.id));
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {currentTemplateName ? 'Trocar template' : 'Selecionar template'}
                      </button>

                      {currentTemplateName && metaInfo && (
                        <button
                          onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {showPreview === template.id ? 'Ocultar preview' : 'Ver preview'}
                        </button>
                      )}
                    </div>

                    {/* Template Info */}
                    {currentTemplateName && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Template</label>
                          <div className="px-3 py-2 text-sm rounded-lg border border-border bg-muted/30 text-foreground font-mono">
                            {currentTemplateName}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Idioma</label>
                          <select
                            value={getEditing(template.id, 'template_language', template.template_language)}
                            onChange={(e) => setField(template.id, 'template_language', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                          >
                            <option value="pt_BR">Português (BR)</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Canal</label>
                          <select
                            value={getEditing(template.id, 'channel_id', template.channel_id || '')}
                            onChange={(e) => setField(template.id, 'channel_id', e.target.value || null)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                          >
                            <option value="">Canal padrão</option>
                            {channels?.map(ch => (
                              <option key={ch.id} value={ch.id}>{ch.name} ({ch.phone_number})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {showPreview === template.id && metaInfo && (
                      <div className="rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2">
                        <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Preview do Template</div>
                        {getTemplateHeaderText(metaInfo.components || []) && (
                          <p className="text-sm font-bold text-foreground">{getTemplateHeaderText(metaInfo.components || [])}</p>
                        )}
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                          {getTemplateBodyText(metaInfo.components || [])}
                        </p>
                        {getTemplateFooterText(metaInfo.components || []) && (
                          <p className="text-xs text-muted-foreground italic">{getTemplateFooterText(metaInfo.components || [])}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Map Variables */}
                  {currentVars.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">2</div>
                        <h4 className="text-sm font-semibold text-foreground">Mapear Variáveis</h4>
                        <span className="text-[10px] text-muted-foreground ml-1">Associe cada variável do template a um campo do sistema</span>
                      </div>

                      <div className="space-y-2">
                        {currentVars.map((v: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                            <div className={`flex-shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {`{{${i + 1}}}`}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Zap className="w-3.5 h-3.5" />
                            </div>
                            <select
                              value={v.system_field || ''}
                              onChange={(e) => updateVariableMapping(template.id, i, e.target.value)}
                              className={`flex-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none ${
                                v.system_field ? 'border-emerald-500/30' : 'border-amber-500/30'
                              }`}
                            >
                              <option value="">-- Selecione o campo --</option>
                              {availableFields.map(field => (
                                <option key={field.value} value={field.value}>
                                  {field.label} — {field.description}
                                </option>
                              ))}
                            </select>
                            {v.system_field ? (
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Additional settings */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">3</div>
                      <h4 className="text-sm font-semibold text-foreground">Configurações Adicionais</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Variable className="w-3 h-3" /> Namespace (opcional)
                        </label>
                        <input
                          type="text"
                          value={getEditing(template.id, 'template_namespace', template.template_namespace || '')}
                          onChange={(e) => setField(template.id, 'template_namespace', e.target.value || null)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                          placeholder="Preenchido automaticamente ao selecionar template"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3" /> Delay de envio (minutos)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={getEditing(template.id, 'send_delay_minutes', template.send_delay_minutes)}
                          onChange={(e) => setField(template.id, 'send_delay_minutes', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save */}
                  {hasChanges && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="text-xs text-muted-foreground">
                        {!allVarsMapped && (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Algumas variáveis não estão mapeadas
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSave(template.id)}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Salvar configuração
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrmNotificationTemplates;
