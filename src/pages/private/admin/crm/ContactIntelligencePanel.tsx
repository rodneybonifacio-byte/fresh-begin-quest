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

interface ShipmentRecord {
  codigo: string;
  status: string;
  servico: string;
  data: string;
  destNome: string;
  destEndereco: string;
  remetenteNome: string;
  valorVenda: number;
}

interface ShipmentSummary {
  total: number;
  totalGasto: number;
  recentes: ShipmentRecord[];
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
  contactPhone, contactName, conversationId, onClose,
}: ContactIntelligencePanelProps) => {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [shipments, setShipments] = useState<ShipmentSummary>({ total: 0, totalGasto: 0, recentes: [] });
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
    const phoneSuffix = normalized.slice(-9);

    // Phase 1: All parallel queries by phone + conversation messages for tracking codes
    const [
      cadastroRes,
      remetentesRes,
      pedidosRes,
      ticketsRes,
      pipelineRes,
      messagesRes,
    ] = await Promise.all([
      supabase
        .from('cadastros_origem')
        .select('cliente_id, nome_cliente, email_cliente, telefone_cliente, origem')
        .or(`telefone_cliente.ilike.%${phoneSuffix}%`)
        .limit(1),
      supabase
        .from('remetentes_masked')
        .select('id, nome, cpf_cnpj_masked, celular, telefone, localidade, uf')
        .or(`celular.ilike.%${phoneSuffix}%,telefone.ilike.%${phoneSuffix}%`)
        .limit(10),
      supabase
        .from('pedidos_importados')
        .select('codigo_rastreio, status, servico_frete, criado_em, destinatario_nome, destinatario_telefone')
        .or(`destinatario_telefone.ilike.%${phoneSuffix}%`)
        .order('criado_em', { ascending: false })
        .limit(50),
      supabase
        .from('whatsapp_tickets')
        .select('id, status, created_at')
        .eq('contact_phone', normalized)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('ai_support_pipeline')
        .select('id, status, category, created_at, description, subject')
        .eq('contact_phone', normalized)
        .order('created_at', { ascending: false })
        .limit(20),
      // Get messages from conversation to extract tracking codes
      conversationId ? supabase
        .from('whatsapp_messages')
        .select('metadata')
        .eq('conversation_id', conversationId)
        .not('metadata', 'is', null)
        .limit(50) : Promise.resolve({ data: [] as any[] }),
    ]);

    // Extract tracking codes and shipment info from messages metadata and pipeline
    const trackingCodes = new Set<string>();
    const trackingFromMeta: ShipmentRecord[] = [];
    const metaRemetenteNames = new Set<string>();
    
    // From messages metadata
    if (messagesRes.data) {
      for (const msg of messagesRes.data) {
        const meta = msg.metadata as any;
        if (meta?.variables?.codigo_rastreio) {
          const code = meta.variables.codigo_rastreio;
          const remNome = meta.variables.nome_remetente || '';
          if (remNome && remNome.length > 1) metaRemetenteNames.add(remNome);
          if (!trackingCodes.has(code)) {
            trackingCodes.add(code);
            trackingFromMeta.push({
              codigo: code,
              status: meta.trigger_key === 'etiqueta_criada' ? 'criado' : (meta.trigger_key || 'notificado'),
              servico: meta.trigger_label || meta.template_name || '—',
              data: '',
              destNome: meta.variables.nome_destinatario || contactName || '',
              destEndereco: '',
              remetenteNome: remNome,
              valorVenda: 0,
            });
          }
        }
      }
    }
    
    // From pipeline card descriptions/subjects
    if (pipelineRes.data) {
      for (const card of pipelineRes.data) {
        const text = `${card.description || ''} ${card.subject || ''}`;
        const matches = text.match(/[A-Z]{2}\d{9,}[A-Z]{2}|[A-Z0-9]{13,}/g);
        // Try to extract remetente from pipeline description
        const remMatch = (card.description || '').match(/Remetente:\s*([^|]+)/i);
        const remFromPipeline = remMatch ? remMatch[1].trim() : '';
        if (remFromPipeline && remFromPipeline.length > 1) metaRemetenteNames.add(remFromPipeline);
        
        if (matches) {
          for (const code of matches) {
            if (!trackingCodes.has(code)) {
              trackingCodes.add(code);
              trackingFromMeta.push({
                codigo: code,
                status: card.status || 'verificando',
                servico: card.category || '—',
                data: card.created_at || '',
                destNome: contactName || '',
                destEndereco: '',
                remetenteNome: remFromPipeline,
                valorVenda: 0,
              });
            } else {
              const existing = trackingFromMeta.find(t => t.codigo === code);
              if (existing) {
                if (card.created_at) existing.data = existing.data || card.created_at;
                existing.status = card.status || existing.status;
                if (remFromPipeline && !existing.remetenteNome) existing.remetenteNome = remFromPipeline;
              }
            }
          }
        }
      }
    }

    // Phase 2: Use tracking codes to find shipments and client via emissoes_externas
    let clienteId: string | null = null;
    let emissaoShipments: ShipmentRecord[] = [];
    let emissaoTotal = 0;
    let totalGastoEmissoes = 0;

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

    // Cross-reference: search emissoes_externas by tracking codes if we have them
    if (trackingCodes.size > 0) {
      const codes = Array.from(trackingCodes);
      const { data: emissoes } = await supabase
        .from('emissoes_externas')
        .select('codigo_objeto, cliente_id, destinatario_nome, destinatario_logradouro, destinatario_numero, destinatario_bairro, destinatario_cidade, destinatario_uf, destinatario_cep, servico, status, created_at, remetente_id, valor_venda, remetente:remetentes(id, nome)')
        .in('codigo_objeto', codes)
        .order('created_at', { ascending: false })
        .limit(20);

      if (emissoes && emissoes.length > 0) {
        if (!clienteId) {
          clienteId = emissoes[0].cliente_id;
        }

        const buildEndereco = (e: any) => {
          const parts = [e.destinatario_logradouro, e.destinatario_numero, e.destinatario_bairro, e.destinatario_cidade ? `${e.destinatario_cidade}-${e.destinatario_uf || ''}` : null].filter(Boolean);
          return parts.join(', ') || '';
        };

        emissaoShipments = emissoes.slice(0, 5).map(e => ({
          codigo: e.codigo_objeto || '—',
          status: e.status || 'pendente',
          servico: e.servico || '—',
          data: e.created_at || '',
          destNome: e.destinatario_nome || '',
          destEndereco: buildEndereco(e),
          remetenteNome: (e.remetente as any)?.nome || '',
          valorVenda: Number(e.valor_venda || 0),
        }));
        emissaoTotal = emissoes.length;
        totalGastoEmissoes = emissoes.reduce((s, e) => s + Number(e.valor_venda || 0), 0);

        // Also try to get remetente info from the emissao
        const remIds = [...new Set(emissoes.map(e => e.remetente_id).filter(Boolean))];
        if (remIds.length > 0 && remetentesRes.data?.length === 0) {
          const { data: remsFromEmissao } = await supabase
            .from('remetentes_masked')
            .select('id, nome, cpf_cnpj_masked, celular, telefone, localidade, uf')
            .in('id', remIds as string[])
            .limit(10);
          if (remsFromEmissao && remsFromEmissao.length > 0) {
            setRemetentes(remsFromEmissao.map(r => ({
              id: r.id || '',
              nome: r.nome || '',
              cpfMasked: r.cpf_cnpj_masked || '',
              cidade: r.localidade,
              uf: r.uf,
            })));
          }
        }
      }
    }

    // Remetentes from phone search
    if (remetentesRes.data && remetentesRes.data.length > 0) {
      setRemetentes(remetentesRes.data.map(r => ({
        id: r.id || '',
        nome: r.nome || '',
        cpfMasked: r.cpf_cnpj_masked || '',
        cidade: r.localidade,
        uf: r.uf,
      })));

      if (!clienteId) {
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
            setProfile(prev => ({
              ...prev!,
              nome: remFull.nome || prev?.nome || null,
              email: remFull.email || prev?.email || null,
              clienteId: remFull.cliente_id,
            }));
          }
        }
      }
    } else {
      // Fallback: use remetente names collected from metadata/pipeline
      const metaRemetentes: RemetenteSummary[] = [];
      for (const nome of metaRemetenteNames) {
        if (nome.length > 1) {
          metaRemetentes.push({ id: '', nome, cpfMasked: '', cidade: null, uf: null });
        }
      }
      if (metaRemetentes.length > 0) {
        setRemetentes(metaRemetentes);
      }
    }

    // Update profile with clienteId if discovered via cross-reference
    if (clienteId && !profile?.clienteId) {
      setProfile(prev => prev ? { ...prev, clienteId } : prev);
    }

    // Shipments: merge phone-based + tracking-code-based results
    const phoneShipments = pedidosRes.data || [];
    const allShipmentCodes = new Set<string>();
    const mergedRecentes: ShipmentRecord[] = [];

    // Add phone-based shipments first
    for (const p of phoneShipments) {
      const code = p.codigo_rastreio || `phone-${phoneShipments.indexOf(p)}`;
      if (!allShipmentCodes.has(code)) {
        allShipmentCodes.add(code);
        mergedRecentes.push({
          codigo: p.codigo_rastreio || '—',
          status: p.status || 'pendente',
          servico: p.servico_frete || '—',
          data: p.criado_em || '',
          destNome: p.destinatario_nome || '',
          destEndereco: '',
          remetenteNome: '',
          valorVenda: 0,
        });
      }
    }

    // Add emissao-based shipments (from tracking codes in DB)
    for (const e of emissaoShipments) {
      if (!allShipmentCodes.has(e.codigo)) {
        allShipmentCodes.add(e.codigo);
        mergedRecentes.push(e);
      }
    }

    // Add shipments discovered from message metadata / pipeline (fallback)
    for (const t of trackingFromMeta) {
      if (!allShipmentCodes.has(t.codigo)) {
        allShipmentCodes.add(t.codigo);
        mergedRecentes.push({
          ...t,
          destEndereco: '',
          remetenteNome: '',
          valorVenda: 0,
        });
      }
    }

    setShipments({
      total: Math.max(phoneShipments.length, emissaoTotal, mergedRecentes.length),
      totalGasto: totalGastoEmissoes,
      recentes: mergedRecentes.slice(0, 5),
    });

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

      // Get total emissoes for this client
      const { count } = await supabase
        .from('emissoes_externas')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', clienteId);
      if (count !== null) {
        setShipments(prev => ({ ...prev, total: Math.max(prev.total, count) }));
      }
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

    setLoading(false);
  }, [contactPhone, contactName, conversationId]);

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
    criado: 'bg-blue-500/10 text-blue-600',
    verificando: 'bg-amber-500/10 text-amber-600',
    notificado: 'bg-cyan-500/10 text-cyan-600',
    etiqueta_criada: 'bg-blue-500/10 text-blue-600',
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
            <Package className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
            <p className="text-sm font-bold text-foreground">{shipments.total}</p>
            <p className="text-[9px] text-muted-foreground">Envios</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border border-border">
            <CreditCard className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
            <p className="text-sm font-bold text-foreground">
              {shipments.totalGasto > 0 ? formatCurrency(shipments.totalGasto) : (financial ? formatCurrency(financial.totalConsumos) : '—')}
            </p>
            <p className="text-[9px] text-muted-foreground">Gasto</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border border-border">
            <MessageSquare className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
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
                <div key={i} className="px-2 py-2 rounded-md hover:bg-muted/50 transition-colors border border-border/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] font-mono font-semibold text-foreground">{s.codigo}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[s.status] || 'bg-muted text-muted-foreground'}`}>
                      {s.status}
                    </span>
                  </div>
                  {s.remetenteNome && (
                    <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Rem:</span> {s.remetenteNome}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Dest:</span> {s.destNome || '—'}</p>
                  {s.destEndereco && (
                    <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{s.destEndereco}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{s.servico}</span>
                    {s.valorVenda > 0 && (
                      <span className="font-bold text-foreground">{formatCurrency(s.valorVenda)}</span>
                    )}
                  </div>
                  {s.data && (
                    <p className="text-[9px] text-muted-foreground/60">
                      {format(new Date(s.data), "dd/MM/yy", { locale: ptBR })}
                    </p>
                  )}
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