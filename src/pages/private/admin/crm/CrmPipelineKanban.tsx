import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { Zap, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_PIPELINES, getNextStage } from './pipelineConfig';
import { PipelineTicketCard } from './PipelineTicketCard';

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

const CrmPipelineKanban = ({ onOpenConversation }: { onOpenConversation?: (conversationId: string) => void }) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_PIPELINES[0].key);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [pipelineSearch, setPipelineSearch] = useState('');

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

  // Normalize: tickets with old generic statuses get mapped to first stage of their category
  const normalizeStatus = (ticket: PipelineTicket) => {
    const pipeline = CATEGORY_PIPELINES.find(p => p.key === ticket.category);
    if (!pipeline) return ticket.status;
    const validStages = pipeline.stages.map(s => s.key);
    if (validStages.includes(ticket.status)) return ticket.status;
    // Old status → map to first stage
    return pipeline.stages[0].key;
  };

  const getColumnTickets = useCallback((stageKey: string) => {
    if (!tickets) return [];
    return tickets
      .filter(t => t.category === selectedCategory)
      .filter(t => normalizeStatus(t) === stageKey);
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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggingId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId && draggingId) {
      const ticket = tickets?.find(t => t.id === ticketId);
      if (ticket && normalizeStatus(ticket) !== stageKey) {
        updateMutation.mutate({ id: ticketId, status: stageKey });
      }
    }
    setDraggingId(null);
    setDragOverColumn(null);
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
      {/* Category tabs */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {CATEGORY_PIPELINES.map(cat => {
          const isActive = selectedCategory === cat.key;
          const count = counts[cat.key] || 0;
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? `${cat.color} bg-background border border-border shadow-sm`
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              {cat.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-foreground/10' : 'bg-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5" />
          Total: <span className="font-bold text-foreground">{tickets?.length || 0}</span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-2 min-h-0">
        {activePipeline.stages.map((stage, stageIdx) => {
          const stageTickets = getColumnTickets(stage.key);
          const isDragTarget = dragOverColumn === stage.key;

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 flex flex-col rounded-xl border transition-all duration-200 ${
                isDragTarget
                  ? `${stage.border} ${stage.bg} ring-2 ring-offset-1`
                  : 'border-border bg-card/50'
              }`}
              style={{ width: `${Math.max(260, Math.floor(100 / activePipeline.stages.length))}%`, minWidth: 260, maxWidth: 320 }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColumn(stage.key); }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column header */}
              <div className={`p-3 rounded-t-xl ${stage.bg} border-b ${stage.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <stage.icon className={`w-4 h-4 ${stage.color}`} />
                    <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${stage.count_bg}`}>
                    {stageTickets.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                {stageTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                    <stage.icon className="w-6 h-6 mb-2" />
                    <p className="text-[10px]">Nenhum ticket</p>
                  </div>
                ) : (
                  stageTickets.map(ticket => {
                    const nextStageKey = getNextStage(selectedCategory, stage.key);
                    const nextStage = activePipeline.stages.find(s => s.key === nextStageKey);

                    return (
                      <PipelineTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        isExpanded={expandedCard === ticket.id}
                        isDragging={draggingId === ticket.id}
                        isLastStage={stageIdx === activePipeline.stages.length - 1}
                        nextStageLabel={nextStage ? `→ ${nextStage.label}` : undefined}
                        onToggleExpand={() => setExpandedCard(expandedCard === ticket.id ? null : ticket.id)}
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverColumn(null); }}
                        onAdvance={() => {
                          if (nextStageKey) updateMutation.mutate({ id: ticket.id, status: nextStageKey });
                        }}
                        onOpenConversation={onOpenConversation}
                      />
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
