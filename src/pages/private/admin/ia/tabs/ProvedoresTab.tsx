import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { ToggleLeft, ToggleRight, Key, Brain, Eye, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface AiProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  is_active: boolean;
  config: any;
  secret_key_name: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  llm: <Brain className="w-5 h-5" />,
  vision: <Eye className="w-5 h-5" />,
  stt: <Mic className="w-5 h-5" />,
};

const typeLabels: Record<string, string> = {
  llm: 'Lógica / Conversação',
  vision: 'Visão / Imagens',
  stt: 'Transcrição de Áudio',
};

const ProvedoresTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => aiManagementQuery<AiProvider>({
      action: 'select',
      table: 'ai_providers',
      orderBy: { column: 'name', ascending: true },
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await aiManagementUpdate('ai_providers', id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success('Provedor atualizado!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Carregando provedores...</div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p><strong>Arquitetura Multi-Provedor:</strong> OpenAI para lógica/conversação, Google Gemini para visão e análise de imagens, ElevenLabs para transcrição de áudio (STT).</p>
      </div>

      {providers?.map((provider) => (
        <div key={provider.id} className={`border rounded-xl p-5 transition-colors ${provider.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${provider.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {typeIcons[provider.provider_type] || <Brain className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{provider.display_name}</h3>
                <p className="text-sm text-muted-foreground">{typeLabels[provider.provider_type] || provider.provider_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {provider.secret_key_name && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Key className="w-3 h-3" /> {provider.secret_key_name}
                </span>
              )}
              <button onClick={() => toggleMutation.mutate({ id: provider.id, is_active: !provider.is_active })}>
                {provider.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProvedoresTab;
