import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { toast } from 'sonner';
import {
  Tag, Truck, PackageCheck, Star, AlertTriangle, Building2,
  Bell, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Save, RefreshCw, Globe, Variable, Clock
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  trigger_key: string;
  trigger_label: string;
  trigger_description: string | null;
  template_name: string;
  template_language: string;
  template_namespace: string | null;
  variables: { key: string; label: string }[];
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

const CrmNotificationTemplates = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, Partial<NotificationTemplate>>>({});

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
      toast.success('Template atualizado!');
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
            <p className="text-xs text-muted-foreground">Templates Meta aprovados para notificações automáticas</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          {templates?.length || 0} gatilhos configurados
        </div>
      </div>

      {/* Template cards */}
      <div className="space-y-3">
        {templates?.map(template => {
          const Icon = triggerIcons[template.trigger_key] || Bell;
          const colors = triggerColors[template.trigger_key] || triggerColors.etiqueta_criada;
          const isExpanded = expandedId === template.id;
          const hasChanges = !!editingData[template.id];

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
                    </div>
                    <p className="text-xs text-muted-foreground">{template.trigger_description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Template name badge */}
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-foreground/5 text-muted-foreground">
                    {template.template_name}
                  </span>

                  {/* Toggle */}
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
                <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Template name */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Globe className="w-3 h-3" /> Nome do Template Meta
                      </label>
                      <input
                        type="text"
                        value={getEditing(template.id, 'template_name', template.template_name)}
                        onChange={(e) => setField(template.id, 'template_name', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                        placeholder="nome_do_template"
                      />
                    </div>

                    {/* Language */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Globe className="w-3 h-3" /> Idioma
                      </label>
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

                    {/* Channel */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Bell className="w-3 h-3" /> Canal WhatsApp
                      </label>
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

                  {/* Namespace */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <Variable className="w-3 h-3" /> Namespace do Template (opcional)
                    </label>
                    <input
                      type="text"
                      value={getEditing(template.id, 'template_namespace', template.template_namespace || '')}
                      onChange={(e) => setField(template.id, 'template_namespace', e.target.value || null)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                      placeholder="ex: ab12cd34_ef56_..."
                    />
                  </div>

                  {/* Delay */}
                  <div className="max-w-xs">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
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

                  {/* Variables preview */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <Variable className="w-3 h-3" /> Variáveis Dinâmicas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {template.variables?.map((v, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border} font-mono`}
                        >
                          {`{{${i + 1}}} `}
                          <span className="font-sans text-muted-foreground">{v.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  {hasChanges && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSave(template.id)}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Salvar alterações
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
