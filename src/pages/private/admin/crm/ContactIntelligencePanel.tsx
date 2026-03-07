import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Package, CreditCard, MapPin, Phone, Mail,
  Clock, AlertTriangle, MessageSquare,
  ChevronDown, ChevronUp, Truck,
  X, ExternalLink, Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactIntelligencePanelProps {
  contactPhone: string;
  contactName?: string | null;
  conversationId?: string;
  onClose?: () => void;
}

interface ClientProfile {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  clienteId: string | null;
  origem: string | null;
}

interface ShipmentSummary {
  total: number;
  recentes: { codigo: string; status: string; servico: string; data: string; destNome: string }[];
}

interface FinancialSummary {
  saldoDisponivel: number;
  totalRecargas: number;
  totalConsumos: number;
  totalBloqueado: number;
}

interface InteractionSummary {
  totalTickets: number;
  ticketsAbertos: number;
  ticketsFechados: number;
  pipelineCards: number;
  ultimaInteracao: string | null;
}

interface RemetenteSummary {
  id: string;
  nome: string;
  cpfMasked: string;
  cidade: string | null;
  uf: string | null;
}

const formatPhone = (phone: string) => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  return phone;
};

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SectionHeader = ({ icon: Icon, label, count, color, expanded, onToggle }: {
  icon: any; label: string; count?: number; color: string; expanded: boolean; onToggle: () => void;
}) => (
  <button onClick={onToggle} className="flex items-center gap-2 w-full py-2 px-1 text-left hover:bg-muted/50 rounded-lg transition-colors">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
    {count !== undefined && count > 0 && (
      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
    )}
    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
  </button>
);

export const ContactIntelligencePanel = ({
  contactPhone, contactName, onClose,
}: ContactIntelligencePanelProps) => {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [shipments, setShipments] = useState<ShipmentSummary>({ total: 0, recentes: [] });
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [interactions, setInteractions] = useState<InteractionSummary | null>(null);
  const [remetentes, setRemetentes] = useState<RemetenteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedSections, setExpandedSections] = useState({
    profile: true, shipments: true, financial: false, interactions: false, remetentes: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const normalizePhone = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) clean = '55' + clean;
    return clean;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const normalized = normalizePhone(contactPhone);

    // All parallel queries
    const [
      cadastroRes,
      remetentesRes,
      pedidosRes,
      ticketsRes,
      pipelineRes,
    ] = await Promise.all([
      // 1. Profile from cadastros_origem
      supabase
        .from('cadastros_origem')
        .select('cliente_id, nome_cliente, email_cliente, telefone_cliente, origem')
        .or(`telefone_cliente.ilike.%${normalized.slice(-9)}%`)
        .limit(1),

      // 2. Remetentes by phone match
      supabase
        .from('remetentes_masked')
        .select('id, nome, cpf_cnpj_masked, celular, telefone, localidade, uf')
        .or(`celular.ilike.%${normalized.slice(-9)}%,telefone.ilike.%${normalized.slice(-9)}%`)
        .limit(10),

      // 3. Shipments (as destinatario)
      supabase
        .from('pedidos_importados')
        .select('codigo_rastreio, status, servico_frete, criado_em, destinatario_nome, destinatario_telefone')
        .or(`destinatario_telefone.ilike.%${normalized.slice(-9)}%`)
        .order('criado_em', { ascending: false })
        .limit(50),

      // 4. Tickets
      supabase
        .from('whatsapp_tickets')
        .select('id, status, created_at')
        .eq('contact_phone', normalized)
        .order('created_at', { ascending: false })
        .limit(50),

      // 5. Pipeline cards
      supabase
        .from('ai_support_pipeline')
        .select('id, status, category, created_at')
        .eq('contact_phone', normalized)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Profile
    let clienteId: string | null = null;
    if (cadastroRes.data && cadastroRes.data.length > 0) {
      const c = cadastroRes.data[0];
      clienteId = c.cliente_id;
      setProfile({
        nome: c.nome_cliente,
        email: c.email_cliente,
        telefone: c.telefone_cliente,
        clienteId: c.cliente_id,
        origem: c.origem,
      });
    } else {
      setProfile({
        nome: contactName || null,
        email: null,
        telefone: contactPhone,
        clienteId: null,
        origem: null,
      });
    }

    // Remetentes
    if (remetentesRes.data) {
      setRemetentes(remetentesRes.data.map(r => ({
        id: r.id || '',
        nome: r.nome || '',
        cpfMasked: r.cpf_cnpj_masked || '',
        cidade: r.localidade,
        uf: r.uf,
      })));

      // If no profile found but remetente exists, use remetente's client_id
      if (!clienteId && remetentesRes.data.length > 0) {
        // Try to find client_id from remetentes via a separate query
        const remId = remetentesRes.data[0].id;
        if (remId) {
          const { data: remFull } = await supabase
            .from('remetentes')
            .select('cliente_id, nome, email')
            .eq('id', remId)
            .limit(1)
            .single();
          if (remFull) {
            clienteId = remFull.cliente_id;
            if (!profile?.nome || profile.nome === contactName) {
              setProfile(prev => ({
                ...prev!,
                nome: remFull.nome || prev?.nome || null,
                email: remFull.email || prev?.email || null,
                clienteId: remFull.cliente_id,
              }));
            }
          }
        }
      }
    }

    // Shipments
    if (pedidosRes.data) {
      setShipments({
        total: pedidosRes.data.length,
        recentes: pedidosRes.data.slice(0, 5).map(p => ({
          codigo: p.codigo_rastreio || '—',
          status: p.status || 'pendente',
          servico: p.servico_frete || '—',
          data: p.criado_em || '',
          destNome: p.destinatario_nome || '',
        })),
      });
    }

    // Financial (only if we have clienteId)
    if (clienteId) {
      const [recargasRes, consumosRes, bloqueadosRes] = await Promise.all([
        supabase
          .from('transacoes_credito')
          .select('valor')
          .eq('cliente_id', clienteId)
          .eq('tipo', 'recarga'),
        supabase
          .from('transacoes_credito')
          .select('valor')
          .eq('cliente_id', clienteId)
          .eq('tipo', 'consumo')
          .eq('status', 'consumido'),
        supabase
          .from('transacoes_credito')
          .select('valor')
          .eq('cliente_id', clienteId)
          .eq('tipo', 'consumo')
          .eq('status', 'bloqueado'),
      ]);

      const totalRecargas = recargasRes.data?.reduce((s, t) => s + Number(t.valor), 0) || 0;
      const totalConsumos = consumosRes.data?.reduce((s, t) => s + Math.abs(Number(t.valor)), 0) || 0;
      const totalBloqueado = bloqueadosRes.data?.reduce((s, t) => s + Math.abs(Number(t.valor)), 0) || 0;

      setFinancial({
        saldoDisponivel: totalRecargas - totalConsumos - totalBloqueado,
        totalRecargas,
        totalConsumos,
        totalBloqueado,
      });
    }

    // Interactions
    const tickets = ticketsRes.data || [];
    setInteractions({
      totalTickets: tickets.length,
      ticketsAbertos: tickets.filter(t => t.status === 'open').length,
      ticketsFechados: tickets.filter(t => t.status === 'closed').length,
      pipelineCards: pipelineRes.data?.length || 0,
      ultimaInteracao: tickets.length > 0 ? tickets[0].created_at : null,
    });

    // Also fetch emissoes_externas for total shipments from this client
    if (clienteId) {
      const { count } = await supabase
        .from('emissoes_externas')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', clienteId);
      if (count !== null && count > shipments.total) {
        setShipments(prev => ({ ...prev, total: count }));
      }
    }

    setLoading(false);
  }, [contactPhone, contactName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <p className="text-xs">Carregando dados...</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pendente: 'bg-yellow-500/10 text-yellow-600',
    processando: 'bg-blue-500/10 text-blue-600',
    em_transito: 'bg-purple-500/10 text-purple-600',
    entregue: 'bg-green-500/10 text-green-600',
    cancelado: 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">
                {profile?.nome || contactName || 'Contato'}
              </h3>
              <p className="text-[10px] text-muted-foreground">{formatPhone(contactPhone)}</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-background rounded-lg p-2 text-center border border-border">
            <Package className="w-3.5 h-3.5 mx-auto text-blue-500 mb-0.5" />
            <p className="text-sm font-bold text-foreground">{shipments.total}</p>
            <p className="text-[9px] text-muted-foreground">Envios</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border border-border">
            <CreditCard className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-0.5" />
            <p className="text-sm font-bold text-foreground">
              {financial ? formatCurrency(financial.saldoDisponivel) : '—'}
            </p>
            <p className="text-[9px] text-muted-foreground">Saldo</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border border-border">
            <MessageSquare className="w-3.5 h-3.5 mx-auto text-amber-500 mb-0.5" />
            <p className="text-sm font-bold text-foreground">{interactions?.totalTickets || 0}</p>
            <p className="text-[9px] text-muted-foreground">Tickets</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Profile Section */}
        <SectionHeader icon={User} label="Perfil" color="text-primary" expanded={expandedSections.profile} onToggle={() => toggleSection('profile')} />
        {expandedSections.profile && (
          <div className="pl-6 pb-3 space-y-2 text-xs">
            {profile?.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="truncate">{profile.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{formatPhone(contactPhone)}</span>
            </div>
            {profile?.origem && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ExternalLink className="w-3 h-3" />
                <span>Origem: <span className="text-foreground font-medium">{profile.origem}</span></span>
              </div>
            )}
            {profile?.clienteId && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="w-3 h-3" />
                <span className="text-[10px] font-mono truncate">{profile.clienteId}</span>
              </div>
            )}
          </div>
        )}

        {/* Shipments Section */}
        <SectionHeader icon={Package} label="Envios" count={shipments.total} color="text-blue-500" expanded={expandedSections.shipments} onToggle={() => toggleSection('shipments')} />
        {expandedSections.shipments && (
          <div className="pl-2 pb-3 space-y-1.5">
            {shipments.recentes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60 pl-4 py-2">Nenhum envio encontrado</p>
            ) : (
              shipments.recentes.map((s, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                  <Truck className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-semibold text-foreground">{s.codigo}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[s.status] || 'bg-muted text-muted-foreground'}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{s.servico} • {s.destNome}</p>
                    {s.data && (
                      <p className="text-[9px] text-muted-foreground/60">
                        {format(new Date(s.data), "dd/MM/yy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Financial Section */}
        <SectionHeader icon={CreditCard} label="Financeiro" color="text-emerald-500" expanded={expandedSections.financial} onToggle={() => toggleSection('financial')} />
        {expandedSections.financial && (
          <div className="pl-2 pb-3">
            {financial ? (
              <div className="space-y-2 px-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Saldo disponível</span>
                  <span className={`font-bold ${financial.saldoDisponivel >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(financial.saldoDisponivel)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total recargas</span>
                  <span className="text-foreground font-medium">{formatCurrency(financial.totalRecargas)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total consumido</span>
                  <span className="text-foreground font-medium">{formatCurrency(financial.totalConsumos)}</span>
                </div>
                {financial.totalBloqueado > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Bloqueado
                    </span>
                    <span className="text-amber-600 font-medium">{formatCurrency(financial.totalBloqueado)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60 pl-4 py-2">Cliente não identificado no sistema</p>
            )}
          </div>
        )}

        {/* Interactions Section */}
        <SectionHeader icon={MessageSquare} label="Interações" count={interactions?.totalTickets} color="text-amber-500" expanded={expandedSections.interactions} onToggle={() => toggleSection('interactions')} />
        {expandedSections.interactions && interactions && (
          <div className="pl-2 pb-3 space-y-2 px-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tickets abertos</span>
              <span className="font-bold text-orange-500">{interactions.ticketsAbertos}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tickets fechados</span>
              <span className="font-bold text-green-600">{interactions.ticketsFechados}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cards no pipeline</span>
              <span className="font-bold text-primary">{interactions.pipelineCards}</span>
            </div>
            {interactions.ultimaInteracao && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border">
                <Clock className="w-3 h-3" />
                Última: {format(new Date(interactions.ultimaInteracao), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
        )}

        {/* Remetentes Section */}
        <SectionHeader icon={MapPin} label="Remetentes" count={remetentes.length} color="text-purple-500" expanded={expandedSections.remetentes} onToggle={() => toggleSection('remetentes')} />
        {expandedSections.remetentes && (
          <div className="pl-2 pb-3 space-y-1.5">
            {remetentes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60 pl-4 py-2">Nenhum remetente vinculado</p>
            ) : (
              remetentes.map((r) => (
                <div key={r.id} className="px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                  <p className="text-[11px] font-semibold text-foreground">{r.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{r.cpfMasked}</p>
                  {(r.cidade || r.uf) && (
                    <p className="text-[10px] text-muted-foreground">{[r.cidade, r.uf].filter(Boolean).join(' - ')}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};