import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import {
  AlertCircle, Clock, MessageSquare, CheckCircle2, Archive,
  User, Phone, ArrowRight, GripVertical,
  Flame, AlertTriangle, Circle, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface PipelineTicket {
  id: string;
  conversation_id: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string | null;
  description: string | null;
  assigned_to: string | null;
  resolution: string | null;
  sentiment: string | null;
  detected_by: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = [
  { key: 'novo', label: 'Novo', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', count_bg: 'bg-red-500' },
  { key: 'em_atendimento', label: 'Em Atendimento', icon: MessageSquare, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', count_bg: 'bg-yellow-500' },
  { key: 'aguardando', label: 'Aguardando', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', count_bg: 'bg-blue-500' },
  { key: 'resolvido', label: 'Resolvido', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
  { key: 'fechado', label: 'Fechado', icon: Archive, color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', count_bg: 'bg-muted-foreground' },
];

// Map old status values to new ones
const STATUS_MAP: Record<string, string> = {
  aberto: 'novo',
  em_andamento: 'em_atendimento',
  aguardando_cliente: 'aguardando',
  resolvido: 'resolvido',
  fechado: 'fechado',
  novo: 'novo',
  em_atendimento: 'em_atendimento',
  aguardando: 'aguardando',
};

const priorityConfig: Record<string, { icon: typeof Flame; color: string; label: string }> = {
  urgente: { icon: Flame, color: 'text-red-600', label: 'Urgente' },
  alta: { icon: AlertTriangle, color: 'text-orange-500', label: 'Alta' },
  normal: { icon: Circle, color: 'text-blue-400', label: 'Normal' },
  baixa: { icon: Circle, color: 'text-muted-foreground', label: 'Baixa' },
};

const sentimentEmoji: Record<string, string> = {
  positivo: '😊',
  neutro: '😐',
  negativo: '😠',
  muito_negativo: '🤬',
};

const categoryLabels: Record<string, string> = {
  reclamacao: 'Reclamação',
  duvida: 'Dúvida',
  rastreio: 'Rastreio',
  financeiro: 'Financeiro',
  cancelamento: 'Cancelamento',
  elogio: 'Elogio',
  outros: 'Outros',
};

const CrmPipelineKanban = () => {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['crm-pipeline'],
    queryFn: () => aiManagementQuery<PipelineTicket>({
      action: 'select',
      table: 'ai_support_pipeline',
      orderBy: { column: 'created_at', ascending: false },
      limit: 200,
    }),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await aiManagementUpdate('ai_support_pipeline', id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Ticket movido!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const normalizeStatus = (status: string) => STATUS_MAP[status] || 'novo';

  const getColumnTickets = useCallback((columnKey: string) => {
    if (!tickets) return [];
    return tickets.filter(t => normalizeStatus(t.status) === columnKey);
  }, [tickets]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggingId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId && draggingId) {
      const ticket = tickets?.find(t => t.id === ticketId);
      if (ticket && normalizeStatus(ticket.status) !== columnKey) {
        updateMutation.mutate({ id: ticketId, status: columnKey });
      }
    }
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return phone;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col">
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3 overflow-x-auto pb-1">
        {COLUMNS.map(col => {
          const count = getColumnTickets(col.key).length;
          return (
            <div key={col.key} className="flex items-center gap-2 text-xs whitespace-nowrap">
              <col.icon className={`w-3.5 h-3.5 ${col.color}`} />
              <span className="text-muted-foreground">{col.label}:</span>
              <span className={`font-bold ${col.color}`}>{count}</span>
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5" />
          Total: <span className="font-bold text-foreground">{tickets?.length || 0}</span>
        </div>
      </div>

      {/* Kanban board */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex gap-3 overflow-x-auto pb-2 min-h-0"
      >
        {COLUMNS.map(col => {
          const colTickets = getColumnTickets(col.key);
          const isDragTarget = dragOverColumn === col.key;

          return (
            <div
              key={col.key}
              className={`flex-shrink-0 w-72 flex flex-col rounded-xl border transition-all duration-200 ${
                isDragTarget
                  ? `${col.border} ${col.bg} ring-2 ring-offset-1 ring-${col.key === 'novo' ? 'red' : col.key === 'em_atendimento' ? 'yellow' : col.key === 'aguardando' ? 'blue' : col.key === 'resolvido' ? 'green' : 'gray'}-500/30`
                  : 'border-border bg-card/50'
              }`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {/* Column header */}
              <div className={`p-3 rounded-t-xl ${col.bg} border-b ${col.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <col.icon className={`w-4 h-4 ${col.color}`} />
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${col.count_bg}`}>
                    {colTickets.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                {colTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                    <col.icon className="w-6 h-6 mb-2" />
                    <p className="text-[10px]">Nenhum ticket</p>
                  </div>
                ) : (
                  colTickets.map(ticket => {
                    const priorityCfg = priorityConfig[ticket.priority] || priorityConfig.normal;
                    const PriorityIcon = priorityCfg.icon;
                    const isExpanded = expandedCard === ticket.id;
                    const isDragging = draggingId === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setExpandedCard(isExpanded ? null : ticket.id)}
                        className={`group relative bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:border-border/80 ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        {/* Drag handle */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        {/* Priority + Sentiment row */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <PriorityIcon className={`w-3 h-3 ${priorityCfg.color}`} />
                          <span className={`text-[10px] font-medium ${priorityCfg.color}`}>{priorityCfg.label}</span>
                          {ticket.sentiment && (
                            <span className="text-xs ml-auto" title={ticket.sentiment}>
                              {sentimentEmoji[ticket.sentiment] || '❓'}
                            </span>
                          )}
                          {ticket.category && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                              {categoryLabels[ticket.category] || ticket.category}
                            </span>
                          )}
                        </div>

                        {/* Subject */}
                        <h4 className="text-xs font-semibold text-foreground leading-tight mb-1.5 line-clamp-2">
                          {ticket.subject || 'Ticket sem assunto'}
                        </h4>

                        {/* Contact */}
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                          <User className="w-3 h-3" />
                          <span className="text-[10px] truncate">
                            {ticket.contact_name || formatPhone(ticket.contact_phone) || 'Desconhecido'}
                          </span>
                        </div>

                        {/* Time + detected by */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                          <span>{timeAgo(ticket.created_at)}</span>
                          {ticket.detected_by && (
                            <span className="flex items-center gap-1">
                              {ticket.detected_by === 'ai' ? (
                                <><Zap className="w-2.5 h-2.5" />IA</>
                              ) : ticket.detected_by}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2 animate-in slide-in-from-top-1 duration-200">
                            {ticket.description && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{ticket.description}</p>
                            )}
                            {ticket.contact_phone && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {formatPhone(ticket.contact_phone)}
                              </div>
                            )}
                            {ticket.resolution && (
                              <div className="bg-green-500/5 rounded p-2">
                                <p className="text-[10px] text-green-600 font-medium">Resolução:</p>
                                <p className="text-[11px] text-foreground mt-0.5">{ticket.resolution}</p>
                              </div>
                            )}
                            <div className="text-[10px] text-muted-foreground">
                              Criado: {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>

                            {/* Quick actions */}
                            <div className="flex gap-1 pt-1">
                              {col.key !== 'fechado' && col.key !== 'resolvido' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus = col.key === 'novo' ? 'em_atendimento' : col.key === 'em_atendimento' ? 'aguardando' : 'resolvido';
                                    updateMutation.mutate({ id: ticket.id, status: nextStatus });
                                  }}
                                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  Avançar
                                </button>
                              )}
                              {col.key === 'resolvido' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMutation.mutate({ id: ticket.id, status: 'fechado' });
                                  }}
                                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                >
                                  <Archive className="w-3 h-3" />
                                  Fechar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrmPipelineKanban;
