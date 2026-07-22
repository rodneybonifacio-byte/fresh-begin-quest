import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { MessageCircle, Search, User, Bot, Clock, ChevronLeft, Send } from 'lucide-react';
import { formatTimeBRT, formatDateTimeBRT } from '@/utils/formatBRT';
import rosaneAvatar from '@/assets/rosane-avatar.png';

interface ChatConversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  cliente_id: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  ai_enabled: boolean;
  tags: string[];
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  direction: string;
  content: string | null;
  status: string;
  sent_by: string | null;
  ai_generated: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
}

const CrmChat = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await aiManagementQuery<ChatConversation>({
        action: 'select',
        table: 'whatsapp_conversations',
        filters: [{ column: 'contact_phone', op: 'like', value: 'web-panel-%' }],
        orderBy: { column: 'last_message_at', ascending: false },
      });
      setConversations(data);
    } catch (error) {
      console.error('Erro ao carregar conversas do chat:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    const data = await aiManagementQuery<ChatMessage>({
      action: 'select',
      table: 'whatsapp_messages',
      filters: [{ column: 'conversation_id', op: 'eq', value: convId }],
      orderBy: { column: 'created_at', ascending: true },
    });

    setMessages(data);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (conv: ChatConversation) => {
    setSelected(conv);
    setMobileShowChat(true);
    loadMessages(conv.id);
  };

  // Realtime subscription for selected conversation
  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel(`crm-chat-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `conversation_id=eq.${selected.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  const getClienteName = (conv: ChatConversation) => {
    return conv.contact_name || conv.contact_phone.replace('web-panel-', 'Cliente ').slice(0, 20);
  };

  const getClienteId = (conv: ChatConversation) => {
    return conv.contact_phone.replace('web-panel-', '');
  };

  const filtered = conversations.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.contact_name || '').toLowerCase().includes(term) ||
      (c.last_message_preview || '').toLowerCase().includes(term) ||
      getClienteId(c).toLowerCase().includes(term)
    );
  });

  const formatTime = (date: string) => formatTimeBRT(date);
  const formatDate = (date: string) => formatDateTimeBRT(date);

  return (
    <div className="h-full lg:h-[calc(100vh-120px)] flex bg-background lg:rounded-xl lg:border lg:border-border overflow-hidden">
      {/* Lista de Conversas */}
      <div className={`w-full lg:w-96 border-r border-border flex flex-col ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg text-foreground">CRM Chat</h2>
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {conversations.length} conversas
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conversa de chat</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50 text-left ${
                  selected?.id === conv.id ? 'bg-muted' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground truncate">
                      {getClienteName(conv)}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.last_message_preview || 'Sem mensagens'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className={`flex-1 flex flex-col ${!mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
              <button
                className="lg:hidden p-1"
                onClick={() => setMobileShowChat(false)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground">{getClienteName(selected)}</h3>
                <p className="text-xs text-muted-foreground">
                  ID: {getClienteId(selected).slice(0, 8)}...
                  {selected.status === 'open' && ' • Ativo'}
                </p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.direction === 'inbound';
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <img
                          src={rosaneAvatar}
                          alt="Sergio"
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
                        />
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isUser
                            ? 'bg-primary text-white rounded-br-md'
                            : 'bg-card text-card-foreground border border-border rounded-bl-md shadow-sm'
                        }`}
                      >
                        {!isUser && msg.ai_generated && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                            <Bot className="w-3 h-3" />
                            Sergio IA
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isUser ? 'text-white/70 justify-end' : 'text-muted-foreground'}`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(msg.created_at)}
                          {isUser && msg.metadata?.user_name && (
                            <span className="ml-1">• {msg.metadata.user_name}</span>
                          )}
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin reply input */}
            <div className="px-3 py-2 border-t border-border bg-card">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!replyText.trim() || !selected || sending) return;
                  setSending(true);
                  try {
                    await aiManagementQuery({
                      action: 'insert',
                      table: 'whatsapp_messages',
                      data: {
                      conversation_id: selected.id,
                      direction: 'outbound',
                      content: replyText.trim(),
                      content_type: 'text',
                      status: 'sent',
                      sent_by: 'admin-crm',
                      ai_generated: false,
                      metadata: { source: 'crm-chat-admin' },
                      },
                    });
                    await aiManagementUpdate('whatsapp_conversations', selected.id, {
                      last_message_preview: replyText.trim().slice(0, 100),
                      last_message_at: new Date().toISOString(),
                    });
                    setReplyText('');
                  } catch (err) {
                    console.error('Erro ao enviar:', err);
                  }
                  setSending(false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Responder como admin..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border-none outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-primary/30" />
            </div>
            <h3 className="text-lg font-semibold mb-1">CRM Chat</h3>
            <p className="text-sm">Conversas do painel web com a Sergio</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmChat;
