import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import veronicaAvatar from '@/assets/veronica-avatar.png';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! 👋 Sou a Veronica, sua assistente virtual da BRHUB. Posso te ajudar com:\n\n• **Rastreio** de encomendas\n• **Gerar etiquetas** de envio\n• **Status** dos seus objetos\n• Dúvidas sobre **envios e serviços**\n\nComo posso te ajudar hoje?',
  timestamp: new Date(),
};

export function VeronicaChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulated response for design preview
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Estou processando sua solicitação. Em breve esta funcionalidade estará totalmente integrada! 🚀',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

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
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          {/* Avatar button */}
          <div className="relative w-16 h-16 rounded-full border-[3px] border-primary shadow-xl overflow-hidden transition-transform group-hover:scale-110 group-active:scale-95">
            <img src={veronicaAvatar} alt="Veronica" className="w-full h-full object-cover" />
          </div>
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
          {/* Badge */}
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
            IA
          </div>
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
        <div className="w-2 h-2 bg-green-500 rounded-full" />
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
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="bg-foreground text-background px-5 py-4 flex items-center gap-3 shrink-0">
        <div className="relative">
          <img src={veronicaAvatar} alt="Veronica" className="w-11 h-11 rounded-full object-cover border-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Veronica</h3>
          <p className="text-xs opacity-70">Assistente BRHUB • Online</p>
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
                  ? 'bg-primary text-primary-foreground rounded-br-md'
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
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Assistente IA • Suas informações são seguras 🔒
        </p>
      </div>
    </div>
  );
}
