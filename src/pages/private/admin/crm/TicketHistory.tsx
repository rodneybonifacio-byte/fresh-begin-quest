import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Clock, CheckCircle2, Bot, MessageSquare, X, ArrowRight, Timer, Tag, Shield } from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';
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

const closedByLabel: Record<string, { label: string; icon: typeof Bot }> = {
  ai: { label: 'IA', icon: Bot },
  human: { label: 'Manual', icon: Shield },
  timeout: { label: 'Inatividade', icon: Timer },
};

const sentimentColors: Record<string, string> = {
  positivo: 'text-green-400',
  neutro: 'text-muted-foreground',
  negativo: 'text-red-400',
};

const TicketHistory = ({ conversationId, currentTicketId }: Props) => {
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
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
  const openTicket = tickets?.find(t => t.status === 'open');

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

  const selectTicket = (ticket: TicketRecord) => {
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket(null);
    } else {
      setSelectedTicket(ticket);
      loadTicketMessages(ticket);
    }
  };

  const getTicketDuration = (ticket: TicketRecord) => {
    if (!ticket.closed_at) return null;
    return formatDistanceStrict(new Date(ticket.opened_at), new Date(ticket.closed_at), { locale: ptBR });
  };

  if (closedTickets.length === 0 && !openTicket) return null;

  const msgs = selectedTicket ? ticketMessages[selectedTicket.id] : null;
  const isLoadingMsgs = selectedTicket ? loadingMessages === selectedTicket.id : false;

  return (
    <div className="border-b border-border">
      {/* Current open ticket indicator */}
      {openTicket && (
        <div className="px-4 py-2.5 flex items-center gap-2.5 bg-yellow-500/5 border-b border-yellow-500/20">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <Ticket className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-semibold text-yellow-600">
            Ticket aberto
          </span>
          {openTicket.category && openTicket.category !== 'geral' && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full font-medium">
              {openTicket.category}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {format(new Date(openTicket.opened_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      )}

      {closedTickets.length > 0 && (
        <div className="relative">
          {/* Ticket list */}
          <div className={`${selectedTicket ? 'hidden sm:block sm:w-1/2' : 'w-full'}`}>
            <div className="px-4 py-2.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Histórico — {closedTickets.length} ticket{closedTickets.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {closedTickets.map(ticket => {
                const duration = getTicketDuration(ticket);
                const closedInfo = closedByLabel[ticket.closed_by || ''];
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <button
                    key={ticket.id}
                    onClick={() => selectTicket(ticket)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2 hover:bg-muted/40 ${
                      isSelected
                        ? 'border-l-primary bg-primary/5'
                        : 'border-l-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate leading-relaxed">
                        {ticket.subject || `Ticket #${ticket.id.slice(0, 6)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(ticket.opened_at), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                        {duration && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <Timer className="w-3 h-3" />
                            {duration}
                          </span>
                        )}
                        {ticket.message_count > 0 && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.message_count}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {ticket.category && ticket.category !== 'geral' && (
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {ticket.category}
                        </span>
                      )}
                      {closedInfo && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <closedInfo.icon className="w-2.5 h-2.5" />
                          {closedInfo.label}
                        </span>
                      )}
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview panel */}
          {selectedTicket && (
            <div className={`${selectedTicket ? 'w-full sm:absolute sm:right-0 sm:top-0 sm:w-1/2 sm:h-full' : ''} border-l border-border bg-card`}>
              {/* Preview header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {selectedTicket.subject || `Ticket #${selectedTicket.id.slice(0, 6)}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(selectedTicket.opened_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                    {selectedTicket.closed_at && (
                      <>
                        <span className="text-[11px] text-muted-foreground">→</span>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(selectedTicket.closed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </>
                    )}
                    {selectedTicket.sentiment && (
                      <span className={`text-[11px] font-medium ${sentimentColors[selectedTicket.sentiment] || 'text-muted-foreground'}`}>
                        {selectedTicket.sentiment}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Resolution */}
              {selectedTicket.resolution && (
                <div className="mx-3 mt-2 bg-green-500/5 rounded-lg p-2.5 border border-green-500/20">
                  <p className="text-[11px] text-green-500 font-semibold mb-0.5">Resolução</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{selectedTicket.resolution}</p>
                </div>
              )}

              {/* Messages */}
              <div className="p-3 max-h-[250px] overflow-y-auto">
                {isLoadingMsgs ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : msgs && msgs.length > 0 ? (
                  <div className="space-y-2">
                    {msgs.map(msg => (
                      <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                          msg.direction === 'outbound'
                            ? msg.ai_generated
                              ? 'bg-blue-500/10 border border-blue-500/15'
                              : 'bg-green-500/10 border border-green-500/15'
                            : 'bg-muted/60 border border-border/50'
                        }`}>
                          {msg.ai_generated && (
                            <div className="flex items-center gap-1 mb-1">
                              <Bot className="w-3 h-3 text-blue-400" />
                              <span className="text-[10px] text-blue-400 font-medium">{msg.sent_by || 'IA'}</span>
                            </div>
                          )}
                          <p className="text-xs text-foreground/85 whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content || `[${msg.content_type}]`}
                          </p>
                          <span className="text-[10px] text-muted-foreground/50 float-right mt-1">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem neste período</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketHistory;
