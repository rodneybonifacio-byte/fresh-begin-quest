import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Ticket, ChevronDown, ChevronUp, Clock, CheckCircle2, Bot, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketRecord {
  id: string;
  conversation_id: string;
  contact_phone: string;
  contact_name: string | null;
  status: string;
  category: string | null;
  subject: string | null;
  description: string | null;
  resolution: string | null;
  sentiment: string | null;
  priority: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  message_count: number;
}

interface TicketMessage {
  id: string;
  direction: string;
  content: string | null;
  content_type: string;
  ai_generated: boolean;
  sent_by: string | null;
  created_at: string;
}

interface Props {
  conversationId: string;
  currentTicketId?: string;
}


const closedByLabel: Record<string, string> = {
  ai: '🤖 Fechado pela IA',
  human: '👤 Fechado manualmente',
  timeout: '⏰ Fechado por inatividade',
};

const TicketHistory = ({ conversationId, currentTicketId }: Props) => {
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);

  const { data: tickets } = useQuery({
    queryKey: ['ticket-history', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_tickets')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('opened_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TicketRecord[];
    },
    enabled: !!conversationId,
  });

  const closedTickets = tickets?.filter(t => t.status === 'closed' && t.id !== currentTicketId) || [];

  const loadTicketMessages = async (ticket: TicketRecord) => {
    if (ticketMessages[ticket.id]) return;
    setLoadingMessages(ticket.id);

    const { data } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, content, content_type, ai_generated, sent_by, created_at')
      .eq('conversation_id', ticket.conversation_id)
      .gte('created_at', ticket.opened_at)
      .lte('created_at', ticket.closed_at || new Date().toISOString())
      .order('created_at', { ascending: true });

    setTicketMessages(prev => ({ ...prev, [ticket.id]: (data || []) as TicketMessage[] }));
    setLoadingMessages(null);
  };

  const toggleTicket = (ticket: TicketRecord) => {
    if (expandedTicket === ticket.id) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticket.id);
      loadTicketMessages(ticket);
    }
  };

  if (closedTickets.length === 0) return null;

  const openTicket = tickets?.find(t => t.status === 'open');

  return (
    <div className="border-b border-border bg-card/80">
      {/* Current open ticket indicator */}
      {openTicket && (
        <div className="px-4 py-2 flex items-center gap-2 bg-yellow-500/5 border-b border-yellow-500/20">
          <Ticket className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-medium text-yellow-600">
            Ticket #{openTicket.id.slice(0, 6)} aberto
          </span>
          {openTicket.category && openTicket.category !== 'geral' && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded-full">
              {openTicket.category}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {format(new Date(openTicket.opened_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      )}

      {/* Closed tickets history */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">
            Histórico ({closedTickets.length} ticket{closedTickets.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {closedTickets.map(ticket => {
            const isExpanded = expandedTicket === ticket.id;
            const msgs = ticketMessages[ticket.id];
            const isLoadingMsgs = loadingMessages === ticket.id;

            return (
              <div key={ticket.id} className="rounded-lg border border-border/60 overflow-hidden">
                {/* Ticket header */}
                <button
                  onClick={() => toggleTicket(ticket)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-foreground truncate">
                        {ticket.subject || `Ticket #${ticket.id.slice(0, 6)}`}
                      </span>
                      {ticket.category && ticket.category !== 'geral' && (
                        <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                          {ticket.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{format(new Date(ticket.opened_at), 'dd/MM/yy', { locale: ptBR })}</span>
                      {ticket.closed_by && <span>{closedByLabel[ticket.closed_by] || ticket.closed_by}</span>}
                      {ticket.message_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {ticket.message_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>

                {/* Expanded: messages */}
                {isExpanded && (
                  <div className="border-t border-border/50 bg-muted/20 px-3 py-2 max-h-[250px] overflow-y-auto">
                    {ticket.resolution && (
                      <div className="mb-2 bg-green-500/5 rounded p-2 border border-green-500/20">
                        <p className="text-[10px] text-green-600 font-medium">Resolução:</p>
                        <p className="text-[11px] text-foreground">{ticket.resolution}</p>
                      </div>
                    )}

                    {isLoadingMsgs ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      </div>
                    ) : msgs && msgs.length > 0 ? (
                      <div className="space-y-1.5">
                        {msgs.map(msg => (
                          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                              msg.direction === 'outbound'
                                ? msg.ai_generated
                                  ? 'bg-blue-500/10 border border-blue-500/20'
                                  : 'bg-green-500/10 border border-green-500/20'
                                : 'bg-background border border-border'
                            }`}>
                              {msg.ai_generated && (
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Bot className="w-2.5 h-2.5 text-blue-400" />
                                  <span className="text-[9px] text-blue-400">{msg.sent_by || 'IA'}</span>
                                </div>
                              )}
                              <p className="text-[11px] text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content || `[${msg.content_type}]`}
                              </p>
                              <span className="text-[9px] text-muted-foreground/60 float-right mt-0.5">
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma mensagem encontrada</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TicketHistory;
