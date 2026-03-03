import { User, Phone, GripVertical, ArrowRight, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { priorityConfig, sentimentEmoji } from './pipelineConfig';

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

interface Props {
  ticket: PipelineTicket;
  isExpanded: boolean;
  isDragging: boolean;
  isLastStage: boolean;
  nextStageLabel?: string;
  onToggleExpand: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onAdvance: () => void;
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

export const PipelineTicketCard = ({
  ticket, isExpanded, isDragging, isLastStage, nextStageLabel,
  onToggleExpand, onDragStart, onDragEnd, onAdvance,
}: Props) => {
  const pCfg = priorityConfig[ticket.priority] || priorityConfig.normal;
  const PriorityIcon = pCfg.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onToggleExpand}
      className={`group relative bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:border-border/80 ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Priority + Sentiment */}
      <div className="flex items-center gap-1.5 mb-2">
        <PriorityIcon className={`w-3 h-3 ${pCfg.color}`} />
        <span className={`text-[10px] font-medium ${pCfg.color}`}>{pCfg.label}</span>
        {ticket.sentiment && (
          <span className="text-xs ml-auto" title={ticket.sentiment}>
            {sentimentEmoji[ticket.sentiment] || '❓'}
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

      {/* Time + detected */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
        <span>{timeAgo(ticket.created_at)}</span>
        {ticket.detected_by && (
          <span className="flex items-center gap-1">
            {ticket.detected_by === 'ai' ? <><Zap className="w-2.5 h-2.5" />IA</> : ticket.detected_by}
          </span>
        )}
      </div>

      {/* Expanded */}
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

          {!isLastStage && nextStageLabel && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdvance(); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              {nextStageLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
