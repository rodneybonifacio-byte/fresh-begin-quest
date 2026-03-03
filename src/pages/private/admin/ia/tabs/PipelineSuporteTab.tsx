import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiManagementQuery, aiManagementUpdate } from '@/services/aiManagementApi';
import { CheckCircle, Clock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  conversation_id: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string | null;
  description: string | null;
  assigned_to: string | null;
  resolution: string | null;
  sentiment: string | null;
  detected_by: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  aberto: 'bg-red-100 text-red-700',
  em_andamento: 'bg-yellow-100 text-yellow-700',
  aguardando_cliente: 'bg-blue-100 text-blue-700',
  resolvido: 'bg-green-100 text-green-700',
  fechado: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  aguardando_cliente: 'Aguardando Cliente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const priorityColors: Record<string, string> = {
  baixa: 'text-gray-500',
  normal: 'text-blue-500',
  alta: 'text-orange-500',
  urgente: 'text-red-600',
};

const sentimentLabels: Record<string, string> = {
  positivo: '😊 Positivo',
  neutro: '😐 Neutro',
  negativo: '😠 Negativo',
  muito_negativo: '🤬 Muito Negativo',
};

const PipelineSuporteTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('aberto');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-pipeline', filterStatus],
    queryFn: () => aiManagementQuery<SupportTicket>({
      action: 'select',
      table: 'ai_support_pipeline',
      filters: filterStatus !== 'todos' ? [{ column: 'status', op: 'eq', value: filterStatus }] : undefined,
      orderBy: { column: 'created_at', ascending: false },
      limit: 50,
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await aiManagementUpdate('ai_support_pipeline', id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-pipeline'] });
      toast.success('Status atualizado!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });


  return (
    <div className="mt-4 space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p><strong>Pipeline de Suporte:</strong> A IA detecta automaticamente quando um cliente está reclamando e cria um ticket no pipeline. Você pode acompanhar, classificar e resolver os chamados aqui.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['todos', 'aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === 'todos' ? 'Todos' : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-4 text-muted-foreground">Carregando pipeline...</div>
      ) : !tickets?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum ticket encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground text-sm">{ticket.subject || 'Sem assunto'}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[ticket.status] || 'bg-gray-100'}`}>
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                    <span className={`text-xs font-medium ${priorityColors[ticket.priority] || ''}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  {ticket.contact_name && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {ticket.contact_name}
                      {ticket.contact_phone && ` · ${ticket.contact_phone}`}
                    </p>
                  )}
                  {ticket.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  {ticket.sentiment && (
                    <span className="text-xs">{sentimentLabels[ticket.sentiment] || ticket.sentiment}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.created_at).toLocaleDateString('pt-BR')} {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {ticket.detected_by && (
                    <span className="ml-2">Detectado por: {ticket.detected_by}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {ticket.status === 'aberto' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: 'em_andamento' })}
                      className="text-[10px] px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> Em Andamento
                    </button>
                  )}
                  {ticket.status === 'em_andamento' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: 'resolvido' })}
                      className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Resolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelineSuporteTab;
