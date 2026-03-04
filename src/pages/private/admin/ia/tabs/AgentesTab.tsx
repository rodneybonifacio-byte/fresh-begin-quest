import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Save, ToggleLeft, ToggleRight, Pencil, Volume2, VolumeX, X, ChevronDown, ChevronUp, Play, Square } from 'lucide-react';
import { toast } from 'sonner';

interface AiAgent {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  system_prompt: string;
  personality: string | null;
  avatar_url: string | null;
  is_active: boolean;
  model: string;
  provider: string;
  temperature: number;
  max_tokens: number;
  voice_id: string | null;
  voice_name: string | null;
  tts_enabled: boolean;
  tts_model: string | null;
  voice_stability: number;
  voice_similarity_boost: number;
  voice_style: number;
  voice_speed: number;
  respond_with_audio: boolean;
  created_at: string;
  updated_at: string;
}

const ELEVENLABS_VOICES = [
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Feminino', lang: 'PT-BR' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Feminino', lang: 'EN' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Masculino', lang: 'EN' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Masculino', lang: 'EN' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Feminino', lang: 'EN' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Feminino', lang: 'EN' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Masculino', lang: 'EN' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Masculino', lang: 'EN' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Feminino', lang: 'EN' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Masculino', lang: 'EN' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Masculino', lang: 'EN' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'Não-binário', lang: 'EN' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Feminino', lang: 'EN' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'Masculino', lang: 'EN' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Masculino', lang: 'EN' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Masculino', lang: 'EN' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Masculino', lang: 'EN' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Masculino', lang: 'EN' },
];

const TTS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', desc: 'Alta qualidade, 29 idiomas' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', desc: 'Baixa latência, ideal para tempo real' },
];

const AgentesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AiAgent>>({});
  const [expandedSection, setExpandedSection] = useState<string>('prompt');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoicePreview = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingVoiceId(voiceId);

    try {
      const { data, error } = await supabase.functions.invoke('ai-voice-preview', {
        body: {
          voiceId,
          model: editForm.tts_model || 'eleven_multilingual_v2',
          text: 'Olá! Este é um teste da voz configurada para este agente.',
          voiceSettings: {
            stability: editForm.voice_stability ?? 0.5,
            similarity_boost: editForm.voice_similarity_boost ?? 0.75,
            style: editForm.voice_style ?? 0,
            speed: editForm.voice_speed ?? 1,
          },
        },
      });

      if (error) throw new Error(error.message || 'Falha ao buscar preview');
      if (!data?.audioContent) throw new Error(data?.error || 'Preview sem áudio');

      const audio = new Audio(`data:${data.mimeType || 'audio/mpeg'};base64,${data.audioContent}`);
      audio.preload = 'auto';
      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        toast.error('Erro ao reproduzir preview');
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audioRef.current = audio;
      await audio.play();
    } catch (err: any) {
      console.error('Erro audio preview:', err);
      toast.error(`Erro ao reproduzir preview${err?.message ? `: ${err.message}` : ''}`);
      setPlayingVoiceId(null);
      audioRef.current = null;
    }
  };
  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiManagementQuery<AiAgent>({
      action: 'select',
      table: 'ai_agents',
      orderBy: { column: 'name', ascending: true },
    }),
  });

  const updateMutation = useMutation({
    mutationFn: async (agent: Partial<AiAgent> & { id: string }) => {
      const { id, created_at, updated_at, name, ...updates } = agent;
      await aiManagementUpdate('ai_agents', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      setEditingId(null);
      toast.success('Agente atualizado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message),
  });

  const toggleActive = (agent: AiAgent) => {
    updateMutation.mutate({ id: agent.id, is_active: !agent.is_active } as any);
  };

  const startEditing = (agent: AiAgent) => {
    setEditingId(agent.id);
    setEditForm({ ...agent });
    setExpandedSection('prompt');
  };

  const saveEdit = () => {
    if (!editingId || !editForm) return;
    updateMutation.mutate({ id: editingId, ...editForm } as any);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  if (isLoading) return <div className="p-8 text-muted-foreground text-center">Carregando agentes...</div>;

  return (
    <div className="mt-4 space-y-6">
      {agents?.map((agent) => (
        <div key={agent.id} className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
          {/* Header */}
          <div className="p-5 flex items-center justify-between bg-gradient-to-r from-card to-muted/20">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${agent.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-lg">{agent.display_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${agent.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {agent.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent.tts_enabled ? (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <Volume2 className="w-3.5 h-3.5" /> {agent.voice_name || 'Laura'}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                  <VolumeX className="w-3.5 h-3.5" /> Sem voz
                </span>
              )}
              <button onClick={() => toggleActive(agent)} className="p-2 rounded-xl hover:bg-muted transition-colors" title={agent.is_active ? 'Desativar' : 'Ativar'}>
                {agent.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
              </button>
              <button onClick={() => startEditing(agent)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {editingId === agent.id ? (
            <div className="p-5 border-t border-border space-y-1">
              {/* Section: Identidade */}
              <SectionHeader title="Identidade" section="identity" current={expandedSection} toggle={toggleSection} />
              {expandedSection === 'identity' && (
                <div className="p-4 space-y-4 bg-muted/20 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Nome de Exibição</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.display_name || ''} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Personalidade</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.personality || ''} onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })} placeholder="Ex: Simpática, acolhedora, direta" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Descrição</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Section: Prompt */}
              <SectionHeader title="Prompt do Sistema" section="prompt" current={expandedSection} toggle={toggleSection} />
              {expandedSection === 'prompt' && (
                <div className="p-4 bg-muted/20 rounded-xl">
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm min-h-[250px] font-mono leading-relaxed"
                    value={editForm.system_prompt || ''}
                    onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                    placeholder="Instruções do sistema para o agente..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">{(editForm.system_prompt || '').length} caracteres</p>
                </div>
              )}

              {/* Section: Modelo IA */}
              <SectionHeader title="Modelo de IA" section="model" current={expandedSection} toggle={toggleSection} />
              {expandedSection === 'model' && (
                <div className="p-4 bg-muted/20 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Modelo</label>
                      <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.model || 'gpt-4o'} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Provedor</label>
                      <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.provider || 'openai'} onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Temperatura ({editForm.temperature ?? 0.7})</label>
                      <input type="range" min="0" max="2" step="0.1" className="w-full accent-primary" value={editForm.temperature ?? 0.7} onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })} />
                      <div className="flex justify-between text-[10px] text-muted-foreground"><span>Preciso</span><span>Criativo</span></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Max Tokens</label>
                      <input type="number" min="50" max="4000" step="50" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.max_tokens ?? 300} onChange={(e) => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Voz / TTS */}
              <SectionHeader title="Voz (ElevenLabs)" section="voice" current={expandedSection} toggle={toggleSection} />
              {expandedSection === 'voice' && (
                <div className="p-4 bg-muted/20 rounded-xl space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm.tts_enabled ?? true} onChange={(e) => setEditForm({ ...editForm, tts_enabled: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
                      <span className="text-sm font-medium text-foreground">TTS Ativo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm.respond_with_audio ?? true} onChange={(e) => setEditForm({ ...editForm, respond_with_audio: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
                      <span className="text-sm font-medium text-foreground">Responder com áudio quando cliente enviar áudio</span>
                    </label>
                  </div>

                  {editForm.tts_enabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Voz</label>
                          <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.voice_id || 'FGY2WhTYpPnrIDTdsKH5'} onChange={(e) => {
                            const voice = ELEVENLABS_VOICES.find(v => v.id === e.target.value);
                            setEditForm({ ...editForm, voice_id: e.target.value, voice_name: voice?.name || '' });
                          }}>
                            {ELEVENLABS_VOICES.map(v => (
                              <option key={v.id} value={v.id}>{v.name} ({v.gender} · {v.lang})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => playVoicePreview(editForm.voice_id || 'FGY2WhTYpPnrIDTdsKH5')}
                            className={`mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${playingVoiceId === (editForm.voice_id || 'FGY2WhTYpPnrIDTdsKH5') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                          >
                            {playingVoiceId === (editForm.voice_id || 'FGY2WhTYpPnrIDTdsKH5') ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            {playingVoiceId === (editForm.voice_id || 'FGY2WhTYpPnrIDTdsKH5') ? 'Parar' : 'Ouvir voz'}
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Modelo TTS</label>
                          <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" value={editForm.tts_model || 'eleven_multilingual_v2'} onChange={(e) => setEditForm({ ...editForm, tts_model: e.target.value })}>
                            {TTS_MODELS.map(m => (
                              <option key={m.id} value={m.id}>{m.name} — {m.desc}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Estabilidade ({editForm.voice_stability ?? 0.5})</label>
                          <input type="range" min="0" max="1" step="0.05" className="w-full accent-primary" value={editForm.voice_stability ?? 0.5} onChange={(e) => setEditForm({ ...editForm, voice_stability: parseFloat(e.target.value) })} />
                          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Expressivo</span><span>Consistente</span></div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Similaridade ({editForm.voice_similarity_boost ?? 0.75})</label>
                          <input type="range" min="0" max="1" step="0.05" className="w-full accent-primary" value={editForm.voice_similarity_boost ?? 0.75} onChange={(e) => setEditForm({ ...editForm, voice_similarity_boost: parseFloat(e.target.value) })} />
                          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Natural</span><span>Fiel</span></div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Estilo ({editForm.voice_style ?? 0})</label>
                          <input type="range" min="0" max="1" step="0.05" className="w-full accent-primary" value={editForm.voice_style ?? 0} onChange={(e) => setEditForm({ ...editForm, voice_style: parseFloat(e.target.value) })} />
                          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Neutro</span><span>Estilizado</span></div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Velocidade ({editForm.voice_speed ?? 1.0})</label>
                          <input type="range" min="0.7" max="1.2" step="0.05" className="w-full accent-primary" value={editForm.voice_speed ?? 1.0} onChange={(e) => setEditForm({ ...editForm, voice_speed: parseFloat(e.target.value) })} />
                          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Lento</span><span>Rápido</span></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4">
                <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button onClick={saveEdit} disabled={updateMutation.isPending} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 border-t border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <InfoItem label="Modelo" value={agent.model} />
                <InfoItem label="Provedor" value={agent.provider} />
                <InfoItem label="Temperatura" value={String(agent.temperature)} />
                <InfoItem label="Max Tokens" value={String(agent.max_tokens)} />
                <InfoItem label="Voz" value={agent.tts_enabled ? `${agent.voice_name || 'Laura'} (${agent.tts_model === 'eleven_turbo_v2_5' ? 'Turbo' : 'Multi v2'})` : 'Desativada'} />
              </div>
              <div className="bg-muted/30 rounded-xl p-4 mt-4">
                <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Prompt do Sistema</p>
                <p className="text-sm text-foreground whitespace-pre-line line-clamp-3">{agent.system_prompt}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; section: string; current: string; toggle: (s: string) => void }> = ({ title, section, current, toggle }) => (
  <button onClick={() => toggle(section)} className="w-full flex items-center justify-between py-3 px-1 text-sm font-semibold text-foreground hover:text-primary transition-colors">
    <span>{title}</span>
    {current === section ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
  </button>
);

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <p className="font-medium text-foreground text-sm mt-0.5">{value}</p>
  </div>
);

export default AgentesTab;
