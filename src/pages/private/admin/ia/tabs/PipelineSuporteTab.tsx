import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Clock, MessageSquare, User, ArrowRight } from 'lucide-react';
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
    queryFn: async () => {
      const token = localStorage.getItem('token');
      let query = supabase
        .from('ai_support_pipeline')
        .select('*')
        .order('created_at', { ascending: false })
        .setHeader('Authorization', `Bearer ${token}`);

      if (filterStatus !== 'todos') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = localStorage.getItem('token');
      const { error } = await supabase
        .from('ai_support_pipeline')
        .update({ status })
        .eq('id', id)
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw error;
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

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {['todos', 'aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filterStatus === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {status === 'todos' ? 'Todos' : statusLabels[status] || status}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando pipeline...</div>
      ) : (tickets || []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum ticket encontrado</p>
          <p className="text-sm mt-1">Quando a IA detectar reclamações, os tickets aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets?.map((ticket) => (
            <div key={ticket.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                    <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>
                      {ticket.priority === 'urgente' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                      {ticket.priority.toUpperCase()}
                    </span>
                    {ticket.sentiment && (
                      <span className="text-xs text-muted-foreground">{sentimentLabels[ticket.sentiment]}</span>
                    )}
                  </div>
                  <h4 className="font-medium text-foreground">{ticket.subject || 'Sem assunto'}</h4>
                  {ticket.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {ticket.contact_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.contact_name}</span>}
                    {ticket.contact_phone && <span>{ticket.contact_phone}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
                    <span className="text-xs">Detectado por: {ticket.detected_by}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {ticket.status === 'aberto' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: 'em_andamento' })}
                      className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs hover:bg-yellow-200 flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> Atender
                    </button>
                  )}
                  {ticket.status === 'em_andamento' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: 'resolvido' })}
                      className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs hover:bg-green-200 flex items-center gap-1"
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
