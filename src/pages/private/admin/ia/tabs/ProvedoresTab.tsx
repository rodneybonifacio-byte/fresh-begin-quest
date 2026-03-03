import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .order('name')
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw error;
      return data as AiProvider[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const token = localStorage.getItem('token');
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_active })
        .eq('id', id)
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw error;
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
            <button onClick={() => toggleMutation.mutate({ id: provider.id, is_active: !provider.is_active })}>
              {provider.is_active ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
            </button>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Modelos Disponíveis</p>
              <div className="flex flex-wrap gap-1.5">
                {(provider.config?.models || []).map((m: string) => (
                  <span key={m} className={`text-xs px-2 py-1 rounded-md ${m === provider.config?.default_model ? 'bg-primary/10 text-primary font-medium border border-primary/30' : 'bg-muted text-muted-foreground'}`}>
                    {m} {m === provider.config?.default_model && '(padrão)'}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Chave de API</p>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground font-mono">{provider.secret_key_name || 'N/A'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Configurada</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProvedoresTab;
