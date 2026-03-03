import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../integrations/supabase/client';
import { MessageSquare, Send, Search, Phone, User, Bot, Clock, ChevronLeft, ToggleLeft, ToggleRight, Smile, Check, CheckCheck, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TicketHistory from './TicketHistory';

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  ai_enabled: boolean;
  tags: string[];
  notes: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  content_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  sent_by: string | null;
  ai_generated: boolean;
  created_at: string;
}

const CrmWhatsApp = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Carregar conversas
  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data as Conversation[]);
    }
    setLoadingConversations(false);
  }, []);

  // Carregar mensagens de uma conversa
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
    setLoadingMessages(false);

    // Zerar unread
    await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime para novas mensagens
  useEffect(() => {
    const convId = selectedConversation?.id;
    
    const channel = supabase
      .channel(`whatsapp-realtime-${convId || 'global'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        ...(convId ? { filter: `conversation_id=eq.${convId}` } : {}),
      }, (payload: any) => {
        if (convId) {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id, loadConversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    loadMessages(conv.id);
    setMobileShowChat(true);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messagebird-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
      } else {
        const err = await response.json();
        console.error('Erro ao enviar:', err);
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
    }
    setSending(false);
  };

  const toggleAI = async (conv: Conversation) => {
    await supabase
      .from('whatsapp_conversations')
      .update({ ai_enabled: !conv.ai_enabled })
      .eq('id', conv.id);
    loadConversations();
    if (selectedConversation?.id === conv.id) {
      setSelectedConversation({ ...conv, ai_enabled: !conv.ai_enabled });
    }
  };

  const closeTicketManually = async (conversationId: string) => {
    const { data: openTicket } = await supabase
      .from('whatsapp_tickets')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('status', 'open')
      .limit(1)
      .single();

    if (openTicket) {
      await supabase
        .from('whatsapp_tickets')
        .update({ status: 'closed', closed_by: 'human', closed_at: new Date().toISOString() })
        .eq('id', openTicket.id);
    }
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return phone;
  };

  const filteredConversations = conversations.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.contact_name || '').toLowerCase().includes(term) ||
      c.contact_phone.includes(term) ||
      (c.last_message_preview || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="h-[calc(100vh-120px)] flex bg-background rounded-xl border border-border overflow-hidden">
      {/* Lista de Conversas */}
      <div className={`w-full md:w-96 border-r border-border flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-green-500" />
            <h2 className="font-bold text-lg text-foreground">CRM WhatsApp</h2>
            <span className="ml-auto text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">
              {conversations.length} conversas
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50 text-left ${
                  selectedConversation?.id === conv.id ? 'bg-muted' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {conv.contact_name || formatPhone(conv.contact_phone)}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                        {format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {conv.ai_enabled && <Bot className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message_preview || 'Sem mensagens'}
                    </p>
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className={`flex-1 flex flex-col ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-3 border-b border-border bg-card flex items-center gap-3">
              <button
                onClick={() => setMobileShowChat(false)}
                className="md:hidden p-1 hover:bg-muted rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {selectedConversation.contact_name || formatPhone(selectedConversation.contact_phone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <Phone className="w-3 h-3 inline mr-1" />
                  {formatPhone(selectedConversation.contact_phone)}
                </p>
              </div>
              <button
                onClick={() => toggleAI(selectedConversation)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedConversation.ai_enabled
                    ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={selectedConversation.ai_enabled ? 'IA ativada' : 'IA desativada'}
              >
                {selectedConversation.ai_enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <Bot className="w-3.5 h-3.5" />
                IA
              </button>
              <button
                onClick={() => closeTicketManually(selectedConversation.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                title="Fechar ticket manualmente"
              >
                <Ticket className="w-3.5 h-3.5" />
                Fechar
              </button>
            </div>

            {/* Ticket History */}
            <TicketHistory conversationId={selectedConversation.id} />

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Smile className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        msg.direction === 'outbound'
                          ? msg.ai_generated
                            ? 'bg-blue-500 text-white'
                            : 'bg-green-600 text-white'
                          : 'bg-card text-foreground border border-border'
                      }`}
                    >
                      {msg.ai_generated && (
                        <div className="flex items-center gap-1 mb-1 opacity-70">
                          <Bot className="w-3 h-3" />
                          <span className="text-[10px]">{msg.sent_by || 'IA'}</span>
                        </div>
                      )}
                      {msg.content_type === 'image' && msg.media_url ? (
                        <img src={msg.media_url} alt="Imagem" className="rounded-lg max-w-full mb-1" />
                      ) : null}
                      {(msg.content_type === 'audio' || msg.content_type === 'voice' || msg.content_type === 'ptt') && msg.media_url ? (
                        <audio controls className="max-w-full mb-1" preload="metadata">
                          <source src={msg.media_url} />
                          Seu navegador não suporta áudio.
                        </audio>
                      ) : null}
                      {msg.content ? (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (msg.content_type !== 'image' && msg.content_type !== 'audio' && msg.content_type !== 'voice' && msg.content_type !== 'ptt') ? (
                        <p className="text-sm whitespace-pre-wrap break-words">[mídia]</p>
                      ) : null}
                      <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === 'outbound' ? 'text-white/60' : 'text-muted-foreground'}`}>
                        <span className="text-[10px]">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {msg.direction === 'outbound' && (
                          msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5" />
                          ) : msg.status === 'sent' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-20 h-20 rounded-full bg-green-500/5 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-green-500/30" />
            </div>
            <h3 className="text-lg font-semibold mb-1">CRM WhatsApp</h3>
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmWhatsApp;
