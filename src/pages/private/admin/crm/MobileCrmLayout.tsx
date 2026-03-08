import { useState, useCallback } from 'react';
import { MessageSquare, Columns3, Bell, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CrmWhatsApp from './CrmWhatsApp';
import MobileCrmPipeline from './MobileCrmPipeline';
import CrmNotificationTemplates from './CrmNotificationTemplates';

type Tab = 'conversas' | 'pipeline' | 'notificacoes';

const tabs: { id: Tab; label: string; icon: React.ElementType; color: string; activeColor: string }[] = [
  { id: 'conversas', label: 'Conversas', icon: MessageSquare, color: 'text-muted-foreground', activeColor: 'text-green-500' },
  { id: 'pipeline', label: 'Pipeline', icon: Columns3, color: 'text-muted-foreground', activeColor: 'text-primary' },
  { id: 'notificacoes', label: 'Ativas', icon: Bell, color: 'text-muted-foreground', activeColor: 'text-amber-500' },
];

const MobileCrmLayout = () => {
  const [activeTab, setActiveTab] = useState<Tab>('conversas');
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  const handleOpenConversation = useCallback((conversationId: string) => {
    setInitialConversationId(conversationId);
    setActiveTab('conversas');
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-background">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'conversas' && (
          <CrmWhatsApp
            initialConversationId={initialConversationId}
            onConversationOpened={() => setInitialConversationId(null)}
          />
        )}
        {activeTab === 'pipeline' && (
          <MobileCrmPipeline onOpenConversation={handleOpenConversation} />
        )}
        {activeTab === 'notificacoes' && (
          <div className="h-full overflow-y-auto p-3">
            <CrmNotificationTemplates />
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="flex-shrink-0 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileCrmTabIndicator"
                    className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 transition-colors ${isActive ? tab.activeColor : tab.color}`} />
                <span className={`text-[10px] font-medium transition-colors ${isActive ? tab.activeColor : tab.color}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileCrmLayout;
