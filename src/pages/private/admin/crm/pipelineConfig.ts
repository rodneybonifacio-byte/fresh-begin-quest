import {
  AlertCircle, Clock, MessageSquare, CheckCircle2, Archive,
  Search, MapPin, Truck, Package, FileText, CreditCard,
  ThumbsUp, Ban, ShieldCheck, HelpCircle, Star, Heart,
  Flame, AlertTriangle, Circle, RotateCcw, Send,
  Eye, UserCheck, XCircle, CheckCheck
} from 'lucide-react';

export interface PipelineStage {
  key: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  count_bg: string;
}

export interface CategoryPipeline {
  key: string;
  label: string;
  icon: any;
  color: string;
  stages: PipelineStage[];
}

export const CATEGORY_PIPELINES: CategoryPipeline[] = [
  {
    key: 'reclamacao',
    label: 'Reclamação',
    icon: AlertCircle,
    color: 'text-red-500',
    stages: [
      { key: 'triagem', label: 'Triagem', icon: Eye, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', count_bg: 'bg-red-500' },
      { key: 'investigacao', label: 'Investigação', icon: Search, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', count_bg: 'bg-orange-500' },
      { key: 'resolucao', label: 'Resolução', icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', count_bg: 'bg-blue-500' },
      { key: 'concluido', label: 'Concluído', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
    ],
  },
  {
    key: 'rastreio',
    label: 'Rastreio',
    icon: MapPin,
    color: 'text-blue-500',
    stages: [
      { key: 'verificando', label: 'Verificando', icon: Search, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', count_bg: 'bg-yellow-500' },
      { key: 'localizado', label: 'Localizado', icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', count_bg: 'bg-blue-500' },
      { key: 'em_transito', label: 'Em Trânsito', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', count_bg: 'bg-purple-500' },
      { key: 'entregue', label: 'Entregue', icon: Package, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: CreditCard,
    color: 'text-emerald-500',
    stages: [
      { key: 'analise', label: 'Análise', icon: FileText, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', count_bg: 'bg-yellow-500' },
      { key: 'processamento', label: 'Processamento', icon: RotateCcw, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', count_bg: 'bg-blue-500' },
      { key: 'aprovado', label: 'Aprovado', icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
      { key: 'concluido', label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', count_bg: 'bg-emerald-500' },
    ],
  },
  {
    key: 'cancelamento',
    label: 'Cancelamento',
    icon: Ban,
    color: 'text-rose-500',
    stages: [
      { key: 'solicitado', label: 'Solicitado', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', count_bg: 'bg-red-500' },
      { key: 'em_analise', label: 'Em Análise', icon: Search, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', count_bg: 'bg-orange-500' },
      { key: 'retido', label: 'Retido', icon: UserCheck, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
      { key: 'cancelado', label: 'Cancelado', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', count_bg: 'bg-muted-foreground' },
    ],
  },
  {
    key: 'duvida',
    label: 'Dúvida',
    icon: HelpCircle,
    color: 'text-sky-500',
    stages: [
      { key: 'recebido', label: 'Recebido', icon: MessageSquare, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30', count_bg: 'bg-sky-500' },
      { key: 'respondido', label: 'Respondido', icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', count_bg: 'bg-blue-500' },
      { key: 'concluido', label: 'Concluído', icon: CheckCheck, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
    ],
  },
  {
    key: 'elogio',
    label: 'Elogio',
    icon: Star,
    color: 'text-amber-500',
    stages: [
      { key: 'recebido', label: 'Recebido', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/30', count_bg: 'bg-pink-500' },
      { key: 'agradecido', label: 'Agradecido', icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
    ],
  },
  {
    key: 'outros',
    label: 'Outros',
    icon: Archive,
    color: 'text-muted-foreground',
    stages: [
      { key: 'novo', label: 'Novo', icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', count_bg: 'bg-yellow-500' },
      { key: 'em_andamento', label: 'Em Andamento', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', count_bg: 'bg-blue-500' },
      { key: 'resolvido', label: 'Resolvido', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', count_bg: 'bg-green-500' },
    ],
  },
];

// Map from old generic status to the first stage of each category
export function getInitialStageForCategory(category: string): string {
  const pipeline = CATEGORY_PIPELINES.find(p => p.key === category);
  return pipeline?.stages[0]?.key || 'novo';
}

// Get next stage key for a ticket
export function getNextStage(category: string, currentStage: string): string | null {
  const pipeline = CATEGORY_PIPELINES.find(p => p.key === category);
  if (!pipeline) return null;
  const idx = pipeline.stages.findIndex(s => s.key === currentStage);
  if (idx < 0 || idx >= pipeline.stages.length - 1) return null;
  return pipeline.stages[idx + 1].key;
}

export const priorityConfig: Record<string, { icon: any; color: string; label: string }> = {
  urgente: { icon: Flame, color: 'text-red-600', label: 'Urgente' },
  alta: { icon: AlertTriangle, color: 'text-orange-500', label: 'Alta' },
  normal: { icon: Circle, color: 'text-blue-400', label: 'Normal' },
  baixa: { icon: Circle, color: 'text-muted-foreground', label: 'Baixa' },
};

export const sentimentEmoji: Record<string, string> = {
  positivo: '😊',
  neutro: '😐',
  negativo: '😠',
  muito_negativo: '🤬',
};
