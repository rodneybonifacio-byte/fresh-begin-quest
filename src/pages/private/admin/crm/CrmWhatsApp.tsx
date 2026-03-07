import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../integrations/supabase/client';
import { MessageSquare, Send, Search, Phone, User, Bot, Clock, ChevronLeft, ToggleLeft, ToggleRight, Smile, Check, CheckCheck, Ticket, Mic, Paperclip, X, FileText, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TicketHistory from './TicketHistory';
import { ContactIntelligencePanel } from './ContactIntelligencePanel';

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
  metadata: Record<string, any> | null;
}

const CrmWhatsApp = ({ initialConversationId, onConversationOpened }: { initialConversationId?: string | null; onConversationOpened?: () => void }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [templateBodies, setTemplateBodies] = useState<Record<string, { body: string; header?: string; footer?: string; buttons?: { text: string }[]; variables?: any[] }>>({});
  const [conversationTab, setConversationTab] = useState<'sem_atendimento' | 'ia' | 'fechados'>('sem_atendimento');
  const [closedConversationIds, setClosedConversationIds] = useState<Set<string>>(new Set());

  // Load template bodies for HSM rendering
  useEffect(() => {
    const loadTemplateBodies = async () => {
      const { data } = await supabase
        .from('whatsapp_notification_templates')
        .select('template_name, template_body, variables')
        .not('template_body', 'is', null);
      if (data) {
        const map: typeof templateBodies = {};
        data.forEach((t: any) => {
          try {
            const parsed = JSON.parse(t.template_body);
            map[t.template_name] = { ...parsed, variables: t.variables };
          } catch {}
        });
        setTemplateBodies(map);
      }
    };
    loadTemplateBodies();
  }, []);

  // Load closed ticket conversation IDs
  const loadClosedConversationIds = useCallback(async () => {
    const { data } = await supabase
      .from('whatsapp_tickets')
      .select('conversation_id')
      .in('status', ['closed', 'resolved']);
    if (data) {
      setClosedConversationIds(new Set(data.map((t: any) => t.conversation_id)));
    }
  }, []);

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

  // Abrir conversa vinda do Pipeline
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) {
        setSelectedConversation(conv);
        loadMessages(conv.id);
        setMobileShowChat(true);
      }
      onConversationOpened?.();
    }
  }, [initialConversationId, conversations, loadMessages, onConversationOpened]);

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

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || localStorage.getItem('token') || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messagebird-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
        alert(err?.error || 'Erro ao enviar mensagem');
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
      alert('Erro ao enviar mensagem.');
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

  // Upload file to storage and send
  const uploadAndSend = async (file: File) => {
    if (!selectedConversation || sending) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;
      if (!ownerId) throw new Error('Sessão inválida para upload.');

      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const fileName = `${ownerId}/crm-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Sanitize contentType - remove codecs parameter that can cause storage issues
      const uploadContentType = file.type.split(';')[0].trim() || 'application/octet-stream';

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: uploadContentType, upsert: true });

      if (uploadError) {
        console.error('Erro upload storage:', uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const mediaUrl = publicUrlData.publicUrl;

      const isImage = uploadContentType.startsWith('image/');
      const isAudio = uploadContentType.startsWith('audio/');
      const contentType = isImage ? 'image' : isAudio ? 'audio' : 'file';
      const msgText = isImage ? '📷 Imagem' : isAudio ? '🎤 Áudio' : `📎 ${file.name}`;

      const token = await getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messagebird-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: msgText,
          contentType,
          mediaUrl,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Erro ao enviar mídia:', err);
        throw new Error(err?.error || 'Erro ao enviar mídia.');
      }
    } catch (e: any) {
      console.error('Erro ao enviar arquivo:', e);
      alert(e?.message || 'Erro ao enviar arquivo.');
    }
    setSending(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndSend(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio recording - getUserMedia called directly in click handler for security compliance
  const startRecording = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        alert('Seu navegador não suporta gravação de áudio.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });

      // Prefer WhatsApp-friendly formats when available
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);

        if (audioChunksRef.current.length === 0) {
          console.warn('Nenhum chunk de áudio capturado');
          alert('Não foi possível capturar o áudio, tente gravar novamente.');
          return;
        }

        const baseMime = mimeType.split(';')[0].trim();
        const ext = baseMime.includes('ogg')
          ? 'ogg'
          : baseMime.includes('webm')
          ? 'webm'
          : baseMime.includes('mp4')
          ? 'mp4'
          : 'bin';

        const audioBlob = new Blob(audioChunksRef.current, { type: baseMime });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: baseMime });
        console.log(`🎤 Áudio gravado: ${audioFile.size} bytes, tipo: ${baseMime}`);
        await uploadAndSend(audioFile);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e: any) {
      console.error('Erro ao gravar áudio:', e);
      if (e?.name === 'NotAllowedError') {
        alert('Permissão de microfone negada. Verifique as configurações do navegador.');
      } else {
        alert('Erro ao iniciar gravação. Tente novamente.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
        // ignore requestData errors on unsupported browsers
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
      <div className={`flex-1 flex ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex flex-col min-w-0">
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
              <button
                onClick={() => setShowContactPanel(!showContactPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showContactPanel
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
                title="Dados do contato"
              >
                <UserCircle className="w-3.5 h-3.5" />
                Perfil
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
                      {msg.content_type === 'hsm' ? (
                        msg.metadata?.hsm ? (
                          (() => {
                            // Try rendered_body from metadata first
                            let rendered: { header?: string; body?: string; footer?: string; buttons?: { text: string; type: string }[] } | null = null;
                            try {
                              if (msg.metadata.rendered_body) {
                                rendered = JSON.parse(msg.metadata.rendered_body as string);
                              }
                            } catch {}

                            // Fallback: render client-side from template_body + variables
                            if (!rendered?.body && msg.metadata.template_name) {
                              const tmpl = templateBodies[msg.metadata.template_name as string];
                              if (tmpl?.body) {
                                const vars = msg.metadata.variables as Record<string, string> || {};
                                const tmplVars = (tmpl.variables || []) as { key: string; system_field?: string; component_type?: string; component_var_index?: number }[];
                                
                                let bodyText = tmpl.body;
                                const bodyVars = tmplVars.filter(v => v.component_type === 'BODY' || !v.component_type);
                                bodyVars.forEach((v, i) => {
                                  const val = vars[v.system_field || v.key] || vars[v.key] || '';
                                  bodyText = bodyText.replace(`{{${i + 1}}}`, val);
                                });

                                let headerText = tmpl.header || '';
                                const headerVars = tmplVars.filter(v => v.component_type === 'HEADER');
                                headerVars.forEach((v, i) => {
                                  const val = vars[v.system_field || v.key] || vars[v.key] || '';
                                  headerText = headerText.replace(`{{${i + 1}}}`, val);
                                });

                                rendered = {
                                  header: headerText,
                                  body: bodyText,
                                  footer: tmpl.footer || '',
                                  buttons: (tmpl.buttons || []) as { text: string; type: string }[],
                                };
                              }
                            }

                            if (rendered?.body) {
                              return (
                                <div className="space-y-1.5">
                                  {rendered.header && (
                                    <p className="text-xs font-bold">{rendered.header}</p>
                                  )}
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{rendered.body}</p>
                                  {rendered.footer && (
                                    <p className="text-[10px] opacity-60 mt-1">{rendered.footer}</p>
                                  )}
                                  {rendered.buttons && rendered.buttons.length > 0 && (
                                    <div className="border-t border-white/20 pt-1.5 mt-1.5 flex flex-col gap-1">
                                      {rendered.buttons.map((btn, bi) => (
                                        <div key={bi} className="text-center text-xs font-medium text-blue-300 py-0.5">
                                          {btn.text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Final fallback: show label + variables
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <FileText className="w-3.5 h-3.5 opacity-70" />
                                  <span className="text-[10px] font-medium opacity-70">Mensagem Ativa</span>
                                </div>
                                <p className="text-xs font-semibold">{msg.metadata.trigger_label || msg.metadata.template_name}</p>
                                {msg.metadata.variables && Object.keys(msg.metadata.variables).length > 0 && (
                                  <div className="text-[11px] opacity-80 space-y-0.5 mt-1 border-t border-white/20 pt-1">
                                    {Object.entries(msg.metadata.variables as Record<string, string>).map(([key, val]) => (
                                      <div key={key}><span className="opacity-60">{key}:</span> {val}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <FileText className="w-3.5 h-3.5 opacity-70" />
                              <span className="text-[10px] font-medium opacity-70">Mensagem Ativa</span>
                            </div>
                            {msg.content ? (
                              <p className="text-xs">{msg.content}</p>
                            ) : (
                              <p className="text-xs opacity-70">Notificação enviada</p>
                            )}
                          </div>
                        )
                      ) : (
                        <>
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
                        </>
                      )}
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={cancelRecording}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-sm font-medium text-destructive">{formatRecordingTime(recordingTime)}</span>
                    <span className="text-xs text-muted-foreground">Gravando...</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
                    title="Enviar áudio"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm outline-none text-foreground placeholder:text-muted-foreground"
                    disabled={sending}
                  />
                  {newMessage.trim() ? (
                    <button
                      onClick={sendMessage}
                      disabled={sending}
                      className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={sending}
                      className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-40 flex items-center justify-center transition-colors"
                      title="Gravar áudio"
                    >
                      <Mic className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              )}
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

        {/* Contact Intelligence Panel */}
        {showContactPanel && selectedConversation && (
          <ContactIntelligencePanel
            contactPhone={selectedConversation.contact_phone}
            contactName={selectedConversation.contact_name}
            conversationId={selectedConversation.id}
            onClose={() => setShowContactPanel(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CrmWhatsApp;
