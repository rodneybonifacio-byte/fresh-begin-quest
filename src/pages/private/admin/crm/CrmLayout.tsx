import { useState, useCallback } from 'react';
import { MessageSquare, Columns3, Bell } from 'lucide-react';
import CrmWhatsApp from './CrmWhatsApp';
import CrmPipelineKanban from './CrmPipelineKanban';
import CrmNotificationTemplates from './CrmNotificationTemplates';
import MobileCrmLayout from './MobileCrmLayout';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const CrmLayout = () => {
  const isDesktop = useBreakpoint('lg');
  const [activeTab, setActiveTab] = useState<'conversas' | 'pipeline' | 'notificacoes'>('conversas');
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  const handleOpenConversation = useCallback((conversationId: string) => {
    setInitialConversationId(conversationId);
    setActiveTab('conversas');
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0">
        <button
          onClick={() => setActiveTab('conversas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
            activeTab === 'conversas'
              ? 'border-green-500 text-green-600 bg-green-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Conversas
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
            activeTab === 'pipeline'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Columns3 className="w-4 h-4" />
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('notificacoes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
            activeTab === 'notificacoes'
              ? 'border-amber-500 text-amber-600 bg-amber-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Bell className="w-4 h-4" />
          Mensagens Ativas
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        {activeTab === 'conversas' && (
          <CrmWhatsApp
            initialConversationId={initialConversationId}
            onConversationOpened={() => setInitialConversationId(null)}
          />
        )}
        {activeTab === 'pipeline' && <CrmPipelineKanban onOpenConversation={handleOpenConversation} />}
        {activeTab === 'notificacoes' && <CrmNotificationTemplates />}
      </div>
    </div>
  );
};

export default CrmLayout;
