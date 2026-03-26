import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minimize2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { jwtDecode } from 'jwt-decode';
import veronicaAvatar from '@/assets/veronica-avatar.png';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UserInfo {
  name: string;
  email: string;
  clienteId: string;
}

function getLoggedUser(): UserInfo | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded: any = jwtDecode(token);
    return {
      name: decoded.name || decoded.email || 'Cliente',
      email: decoded.email || '',
      clienteId: decoded.clienteId || decoded.sub || decoded.id || '',
    };
  } catch {
    return null;
  }
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! 👋 Sou a Veronica, do time de suporte da BRHUB. Posso te ajudar com:\n\n• **Rastreio** de encomendas\n• **Gerar etiquetas** de envio\n• **Status** dos seus objetos\n• Dúvidas sobre **envios e serviços**\n\nComo posso te ajudar hoje?',
  timestamp: new Date(),
};

const PROACTIVE_GREETINGS = [
  (name: string) => `E aí ${name}! 👋 Precisando de alguma ajuda?\nEstou por aqui.`,
  (name: string) => `Opa ${name}! Tudo certo por aí? 😊\nSe precisar de algo, é só chamar!`,
  (name: string) => `Fala ${name}! Vi que você tá online 👀\nPosso te ajudar com alguma coisa?`,
  (name: string) => `Hey ${name}! 🚀 Quer que eu dê uma olhada nos seus envios?\nTô aqui pra isso!`,
  (name: string) => `${name}, tudo bem? 😄\nPrecisa rastrear algum pacote ou gerar etiqueta?`,
  (name: string) => `Oi ${name}! 💜\nPassando pra ver se precisa de uma mãozinha com algo!`,
  (name: string) => `E aí ${name}, beleza? 📦\nQuer que eu verifique o status das suas encomendas?`,
  (name: string) => `${name}! Que bom te ver por aqui! 🎉\nPosso te ajudar com seus envios hoje?`,
  (name: string) => `Fala ${name}! Tô de plantão aqui 💪\nPrecisa de etiqueta, rastreio ou alguma dúvida?`,
  (name: string) => `Opa ${name}! 👋 Como vão os envios?\nSe precisar agilizar algo, conta comigo!`,
  (name: string) => `${name}, tudo tranquilo? 😊\nTô aqui caso precise consultar saldo, rastrear ou emitir etiqueta!`,
  (name: string) => `Hey ${name}! Bora resolver algo hoje? 🔥\nÉ só me dizer o que precisa!`,
  (name: string) => `Oi ${name}! 📬 Alguma encomenda pra acompanhar?\nMe fala que eu busco pra você!`,
  (name: string) => `E aí ${name}! Tô vendo que você tá ativo 👀\nQuer saber o que eu consigo fazer por aqui?`,
  (name: string) => `${name}! 😄 Sabia que posso gerar etiquetas, rastrear pacotes e muito mais?\nMe testa!`,
  (name: string) => `Fala ${name}! Tô online e pronta pra te ajudar 🙋‍♀️\nÉ só mandar!`,
  (name: string) => `Opa ${name}! Precisa de ajuda com algum envio? 📦\nTô aqui rapidinho!`,
  (name: string) => `${name}, passou por aqui e eu já vi! 👀✨\nQuer que eu faça algo por você?`,
];

function getProactiveGreeting(name: string): string {
  const sessionKey = 'veronica_greeting_index';
  let index = parseInt(sessionStorage.getItem(sessionKey) || '0', 10);
  if (isNaN(index) || index >= PROACTIVE_GREETINGS.length) index = 0;
  const greeting = PROACTIVE_GREETINGS[index](name);
  sessionStorage.setItem(sessionKey, String((index + 1) % PROACTIVE_GREETINGS.length));
  return greeting;
}

const FOLLOWUP_MESSAGE = 'Quer saber o que eu consigo fazer por aqui? 😉';

export function VeronicaChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUser(getLoggedUser());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // Load chat history when opening for the first time
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      loadHistory();
    }
  }, [isOpen, historyLoaded]);

  const loadHistory = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data, error } = await supabase.functions.invoke('veronica-client-chat', {
        body: { action: 'load-history' },
        headers: { 'x-brhub-authorization': `Bearer ${token}` },
      });

      if (error) throw error;

      if (data?.messages && data.messages.length > 0) {
        const loaded: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        }));
        setMessages([WELCOME_MESSAGE, ...loaded]);
        if (data.conversationId) setConversationId(data.conversationId);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar histórico:', err);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  const sendToBackend = useCallback(async (text: string) => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const { data, error } = await supabase.functions.invoke('veronica-client-chat', {
        body: { message: text, conversationId },
        headers: {
          'x-brhub-authorization': `Bearer ${token}`,
        },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('❌ Erro no chat:', err);
      return null;
    }
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const data = await sendToBackend(text);

    if (data?.reply) {
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } else {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes. 🔄',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setIsTyping(false);
  }, [input, isTyping, sendToBackend, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Abrir chat com Veronica"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full border-[3px] border-primary shadow-xl overflow-hidden transition-transform group-hover:scale-110 group-active:scale-95">
            <img src={veronicaAvatar} alt="Veronica" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
        
        </div>
      </button>
    );
  }

  // Minimized bar
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-full px-4 py-3 flex items-center gap-3 shadow-2xl cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setIsMinimized(false)}
      >
        <img src={veronicaAvatar} alt="Veronica" className="w-8 h-8 rounded-full object-cover border-2 border-primary" />
        <span className="text-sm font-medium">Veronica</span>
        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
          className="ml-1 hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Full chat window
  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[560px] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="bg-foreground text-background px-5 py-4 flex items-center gap-3 shrink-0">
        <div className="relative">
          <img src={veronicaAvatar} alt="Veronica" className="w-11 h-11 rounded-full object-cover border-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Veronica</h3>
          <p className="text-xs opacity-70">Suporte BRHUB • Online</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-background/10 transition-colors"
            aria-label="Minimizar"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setIsOpen(false); setIsMinimized(false); }}
            className="p-1.5 rounded-lg hover:bg-background/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User info bar */}
      {user && (
        <div className="bg-accent/50 px-4 py-2 flex items-center gap-2 text-xs border-b border-border shrink-0">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-foreground font-medium truncate">{user.name}</span>
          <span className="text-muted-foreground truncate">• {user.email}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <img src={veronicaAvatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-card text-card-foreground border border-border rounded-bl-md shadow-sm'
              }`}
            >
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>
                  {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={j}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 items-end">
            <img src={veronicaAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-3 py-3 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Suporte BRHUB • Suas informações são seguras 🔒
        </p>
      </div>
    </div>
  );
}
