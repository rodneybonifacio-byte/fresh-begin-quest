import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, ChevronDown, ChevronRight, User, Phone, ArrowRight,
  MessageSquare, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_PIPELINES, getNextStage, priorityConfig, sentimentEmoji } from './pipelineConfig';

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
  return `${Math.floor(hrs / 24)}d`;
};

const MobileCrmPipeline = ({ onOpenConversation }: { onOpenConversation?: (conversationId: string) => void }) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_PIPELINES[0].key);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const activePipeline = CATEGORY_PIPELINES.find(p => p.key === selectedCategory) || CATEGORY_PIPELINES[0];

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

  const normalizeStatus = (ticket: PipelineTicket) => {
    const pipeline = CATEGORY_PIPELINES.find(p => p.key === ticket.category);
    if (!pipeline) return ticket.status;
    const validStages = pipeline.stages.map(s => s.key);
    if (validStages.includes(ticket.status)) return ticket.status;
    return pipeline.stages[0].key;
  };

  const getStageTickets = useCallback((stageKey: string) => {
    if (!tickets) return [];
    return tickets.filter(t => t.category === selectedCategory && normalizeStatus(t) === stageKey);
  }, [tickets, selectedCategory]);

  const categoryTicketCounts = useCallback(() => {
    if (!tickets) return {};
    const counts: Record<string, number> = {};
    CATEGORY_PIPELINES.forEach(p => {
      counts[p.key] = tickets.filter(t => t.category === p.key).length;
    });
    return counts;
  }, [tickets]);

  const counts = categoryTicketCounts();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground">Pipeline</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {tickets?.length || 0} tickets
          </span>
        </div>

        {/* Category pills - horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {CATEGORY_PIPELINES.map(cat => {
            const isActive = selectedCategory === cat.key;
            const count = counts[cat.key] || 0;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => { setSelectedCategory(cat.key); setExpandedStage(null); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? `${cat.color} bg-background border border-border shadow-sm`
                    : 'text-muted-foreground bg-muted/50'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-foreground/10' : 'bg-muted-foreground/20'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stages - Accordion style */}
      <div className="flex-1 overflow-y-auto">
        {activePipeline.stages.map((stage, stageIdx) => {
          const stageTickets = getStageTickets(stage.key);
          const isOpen = expandedStage === stage.key || expandedStage === null;
          const StageIcon = stage.icon;

          return (
            <div key={stage.key} className="border-b border-border/50">
              {/* Stage header */}
              <button
                onClick={() => setExpandedStage(expandedStage === stage.key ? null : stage.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 ${stage.bg} transition-colors`}
              >
                <StageIcon className={`w-4 h-4 ${stage.color}`} />
                <span className={`text-sm font-semibold ${stage.color} flex-1 text-left`}>
                  {stage.label}
                </span>
                <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${stage.count_bg}`}>
                  {stageTickets.length}
                </span>
                {expandedStage === stage.key ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Tickets */}
              <AnimatePresence>
                {isOpen && stageTickets.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-2">
                      {stageTickets.map(ticket => {
                        const isCardExpanded = expandedCard === ticket.id;
                        const prio = priorityConfig[ticket.priority] || priorityConfig.normal;
                        const PrioIcon = prio.icon;
                        const nextStageKey = getNextStage(selectedCategory, stage.key);
                        const nextStage = activePipeline.stages.find(s => s.key === nextStageKey);

                        return (
                          <motion.div
                            key={ticket.id}
                            layout
                            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
                          >
                            {/* Card header */}
                            <button
                              onClick={() => setExpandedCard(isCardExpanded ? null : ticket.id)}
                              className="w-full p-3 flex items-start gap-3 text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {ticket.contact_name || formatPhone(ticket.contact_phone)}
                                  </span>
                                  <PrioIcon className={`w-3 h-3 flex-shrink-0 ${prio.color}`} />
                                </div>
                                {ticket.subject && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {ticket.subject}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-muted-foreground">{timeAgo(ticket.created_at)}</span>
                                  {ticket.sentiment && (
                                    <span className="text-[10px]">{sentimentEmoji[ticket.sentiment] || ''}</span>
                                  )}
                                  {ticket.detected_by && (
                                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                      {ticket.detected_by}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Expanded content */}
                            <AnimatePresence>
                              {isCardExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-border"
                                >
                                  <div className="p-3 space-y-3">
                                    {ticket.description && (
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {ticket.description}
                                      </p>
                                    )}

                                    {ticket.contact_phone && (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        {formatPhone(ticket.contact_phone)}
                                      </div>
                                    )}

                                    {ticket.resolution && (
                                      <div className="bg-green-500/10 rounded-lg p-2">
                                        <p className="text-xs text-green-600 font-medium">Resolução:</p>
                                        <p className="text-xs text-green-700 mt-0.5">{ticket.resolution}</p>
                                      </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                      {ticket.conversation_id && onOpenConversation && (
                                        <button
                                          onClick={() => onOpenConversation(ticket.conversation_id!)}
                                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 text-xs font-medium"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          Ver Conversa
                                        </button>
                                      )}
                                      {nextStage && (
                                        <button
                                          onClick={() => updateMutation.mutate({ id: ticket.id, status: nextStageKey! })}
                                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium"
                                        >
                                          <ArrowRight className="w-3.5 h-3.5" />
                                          {nextStage.label}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isOpen && stageTickets.length === 0 && (
                <div className="py-4 text-center text-muted-foreground/40">
                  <p className="text-xs">Nenhum ticket</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCrmPipeline;
