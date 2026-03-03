import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { ToggleLeft, ToggleRight, Key, Brain, Eye, Mic, Volume2 } from 'lucide-react';
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
  stt_tts: <Volume2 className="w-5 h-5" />,
  tts: <Volume2 className="w-5 h-5" />,
};

const typeLabels: Record<string, string> = {
  llm: 'Lógica / Conversação',
  vision: 'Visão / Imagens',
  stt: 'Transcrição de Áudio',
  stt_tts: 'Voz (STT + TTS)',
  tts: 'Síntese de Voz',
};

const typeDescriptions: Record<string, string> = {
  llm: 'Processa texto, responde perguntas, executa tools e gera respostas inteligentes',
  vision: 'Analisa imagens enviadas pelos clientes, identifica conteúdo e extrai informações',
  stt: 'Transcreve mensagens de áudio dos clientes para texto',
  stt_tts: 'Transcreve áudio recebido e gera áudio de resposta com voz natural',
  tts: 'Gera áudio com voz sintetizada para respostas por voz',
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

  if (isLoading) return <div className="p-8 text-muted-foreground text-center">Carregando provedores...</div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-2xl p-5 border border-primary/10">
        <h3 className="text-sm font-bold text-foreground mb-1">Arquitetura Multi-Provedor</h3>
        <p className="text-xs text-muted-foreground">
          OpenAI para lógica conversacional e raciocínio · Google Gemini para visão computacional · ElevenLabs para voz (transcrição STT + síntese TTS)
        </p>
      </div>

      <div className="space-y-3">
        {providers?.map((provider) => (
          <div key={provider.id} className={`border rounded-2xl overflow-hidden transition-all ${provider.is_active ? 'border-border bg-card shadow-sm' : 'border-border/50 bg-muted/20 opacity-60'}`}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${provider.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {typeIcons[provider.provider_type] || <Brain className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-lg">{provider.display_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${provider.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {provider.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{typeLabels[provider.provider_type] || provider.provider_type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{typeDescriptions[provider.provider_type] || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.secret_key_name && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl font-mono">
                      <Key className="w-3 h-3" /> {provider.secret_key_name}
                    </span>
                  )}
                  <button onClick={() => toggleMutation.mutate({ id: provider.id, is_active: !provider.is_active })} className="p-2 rounded-xl hover:bg-muted transition-colors">
                    {provider.is_active ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Config details */}
              {provider.config && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {provider.config.default_model && (
                    <span className="text-[10px] bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                      Modelo padrão: <strong className="text-foreground">{provider.config.default_model}</strong>
                    </span>
                  )}
                  {provider.config.models && (
                    <span className="text-[10px] bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                      Modelos: {provider.config.models.join(', ')}
                    </span>
                  )}
                  {provider.config.tts_models && (
                    <span className="text-[10px] bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                      TTS: {provider.config.tts_models.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProvedoresTab;
