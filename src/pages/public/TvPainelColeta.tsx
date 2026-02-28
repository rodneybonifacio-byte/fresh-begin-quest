import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Clock, Truck, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, Users, CalendarClock, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Etiqueta {
  id: string;
  codigoObjeto: string;
  status: string;
  criadoEm: string;
  destinatario?: {
    nome: string;
    cep?: string;
    localidade?: string;
    uf?: string;
  };
  remetente?: {
    nome: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  remetenteNome?: string;
  remetenteCpfCnpj?: string;
  servico?: string;
}

interface ClienteAgrupado {
  nome: string;
  endereco: string;
  etiquetas: Etiqueta[];
  totalPrePostado: number;
}

interface ClienteHorario {
  nome_cliente: string;
  horario_inicio: string;
  horario_fim: string | null;
  motorista: string | null;
  grupo: string | null;
  endereco: string | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const TV_PIN = '7890';
const REFRESH_INTERVAL = 120_000;

const BRHUB_CLIENTS = ['TG GRIFFES', '7 DAYS', 'CAIRO', 'NEXX', 'ERONIA', 'ATENDENCIA'];
const BRHUB_HORARIO = '16:00 – 17:00';

const isBrhubClient = (nome: string): boolean => {
  const upper = nome.toUpperCase().trim();
  return BRHUB_CLIENTS.some(c => upper.includes(c));
};

// ─── Helpers de horário ──────────────────────────────────────────────────────
const parseTime = (timeStr: string): number => {
  if (!timeStr) return 9999;
  const clean = timeStr.replace(/[^\d:]/g, '');
  const parts = clean.split(':');
  if (parts.length < 2) return 9999;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

const fmtMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  void fmtMinutes; // prevent unused warning
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatDataHora = (dateStr: string): string => {
  if (!dateStr) return '--/-- --:--';
  try {
    const d = new Date(dateStr);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${hora}:${min}`;
  } catch {
    return '--/-- --:--';
  }
};

const resolverHorario = (nome: string, horariosDb: ClienteHorario[]): string => {
  if (isBrhubClient(nome)) return '16:00';
  const upper = nome.toUpperCase().trim();
  const match = horariosDb.find(h => upper.includes(h.nome_cliente.toUpperCase().trim()));
  return match?.horario_inicio || '14:00';
};

const resolverLabel = (nome: string, horariosDb: ClienteHorario[]): string => {
  const upper = nome.toUpperCase().trim();
  const match = horariosDb.find(h => upper.includes(h.nome_cliente.toUpperCase().trim()));
  if (match?.horario_fim) return `${match.horario_inicio} – ${match.horario_fim}`;
  if (match) return match.horario_inicio;
  return '14:00';
};

// ─── Status badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const normalized = status?.toUpperCase().replace(/-/g, '_') || '';
  const colors: Record<string, string> = {
    PRE_POSTADO: 'bg-blue-500/20 text-blue-400',
    POSTADO: 'bg-green-500/20 text-green-400',
    EM_TRANSITO: 'bg-cyan-500/20 text-cyan-400',
    ENTREGUE: 'bg-emerald-500/20 text-emerald-400',
    CANCELADO: 'bg-red-500/20 text-red-400',
    DEVOLVIDO: 'bg-gray-500/20 text-gray-400',
  };
  const style = colors[normalized] || 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${style}`}>
      {status?.replace(/_/g, ' ') || 'SEM STATUS'}
    </span>
  );
};

// ─── Agrupar etiquetas por remetente ─────────────────────────────────────────
const agruparPorRemetente = (etiquetas: Etiqueta[], horariosDb: ClienteHorario[]): {
  regulares: GrupoHorario[];
  brhub: GrupoHorario | null;
} => {
  // Agrupar por nome do remetente
  const clienteMap = new Map<string, ClienteAgrupado>();

  for (const et of etiquetas) {
    const nome = et.remetenteNome || et.remetente?.nome || 'Desconhecido';
    const key = nome.toUpperCase().trim();

    if (!clienteMap.has(key)) {
      const endereco = et.remetente
        ? [et.remetente.logradouro, et.remetente.numero, et.remetente.bairro, et.remetente.localidade, et.remetente.uf]
            .filter(Boolean).join(', ')
        : '';
      
      // Tentar endereço da tabela auxiliar
      const upper = key;
      const matchDb = horariosDb.find(h => upper.includes(h.nome_cliente.toUpperCase().trim()));
      
      clienteMap.set(key, {
        nome,
        endereco: matchDb?.endereco || endereco || 'Endereço não informado',
        etiquetas: [],
        totalPrePostado: 0,
      });
    }
    const cliente = clienteMap.get(key)!;
    cliente.etiquetas.push(et);
    const statusNorm = et.status?.toUpperCase().replace(/-/g, '_') || '';
    if (statusNorm === 'PRE_POSTADO') cliente.totalPrePostado++;
  }

  // Agrupar clientes por horário
  const brhubClientes: ClienteAgrupado[] = [];
  const outrosClientes: ClienteAgrupado[] = [];

  for (const cliente of clienteMap.values()) {
    if (isBrhubClient(cliente.nome)) {
      brhubClientes.push(cliente);
    } else {
      outrosClientes.push(cliente);
    }
  }

  // Agrupar outros por faixa horária
  const horarioMap = new Map<string, { clientes: ClienteAgrupado[]; label: string }>();
  for (const c of outrosClientes) {
    const time = resolverHorario(c.nome, horariosDb);
    const label = resolverLabel(c.nome, horariosDb);
    const key = time === 'Sem horário' ? 'ZZ:ZZ' : time;
    if (!horarioMap.has(key)) horarioMap.set(key, { clientes: [], label });
    horarioMap.get(key)!.clientes.push(c);
    if (label.includes('–') && !horarioMap.get(key)!.label.includes('–')) {
      horarioMap.get(key)!.label = label;
    }
  }

  const regulares: GrupoHorario[] = [];
  for (const [key, val] of horarioMap) {
    const totalEtiquetas = val.clientes.reduce((acc, c) => acc + c.etiquetas.length, 0);
    const totalPrePostado = val.clientes.reduce((acc, c) => acc + c.totalPrePostado, 0);
    regulares.push({
      label: key === 'ZZ:ZZ' ? 'Sem horário' : val.label,
      sortKey: key === 'ZZ:ZZ' ? 9999 : parseTime(key),
      clientes: val.clientes.sort((a, b) => a.nome.localeCompare(b.nome)),
      totalObjetos: totalEtiquetas,
      totalPrePostado,
    });
  }
  regulares.sort((a, b) => a.sortKey - b.sortKey);

  const brhub: GrupoHorario | null = brhubClientes.length > 0
    ? {
        label: BRHUB_HORARIO,
        sortKey: 960,
        clientes: brhubClientes.sort((a, b) => a.nome.localeCompare(b.nome)),
        totalObjetos: brhubClientes.reduce((acc, c) => acc + c.etiquetas.length, 0),
        totalPrePostado: brhubClientes.reduce((acc, c) => acc + c.totalPrePostado, 0),
        isBrhub: true,
      }
    : null;

  return { regulares, brhub };
};

interface GrupoHorario {
  label: string;
  sortKey: number;
  clientes: ClienteAgrupado[];
  totalObjetos: number;
  totalPrePostado: number;
  isBrhub?: boolean;
}

// ─── Componente de Login (PIN) ───────────────────────────────────────────────
const TvLogin = ({ onAuth }: { onAuth: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === TV_PIN) {
      sessionStorage.setItem('tv_coleta_auth', '1');
      onAuth();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">Painel de Coleta</h1>
            <p className="text-gray-500 text-sm mt-1">Insira o PIN para acessar</p>
          </div>
        </div>
        <div className="w-full space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="PIN de acesso"
              inputMode="numeric"
              autoFocus
              className={`w-full pl-12 pr-12 py-4 rounded-xl bg-white/5 border text-white text-lg font-mono tracking-[0.3em] text-center placeholder:tracking-normal placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-500 focus:ring-red-500/40'
                  : 'border-white/10 focus:ring-amber-500/40 focus:border-amber-500/60'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm text-center font-medium">PIN incorreto.</p>}
          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Acessar Painel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Componente Cliente Expandível ───────────────────────────────────────────
const ClienteRow = ({ cliente, index }: { cliente: ClienteAgrupado; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-[28px_1fr_auto_55px] gap-2 px-2 py-1.5 items-center cursor-pointer hover:bg-white/[0.06] transition-colors ${
          index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'
        }`}
      >
        <span className="text-amber-400/50 font-bold text-[11px] tabular-nums flex items-center gap-0.5">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-white font-bold text-[11px] truncate uppercase tracking-wide">
            {cliente.nome}
          </span>
          <span className="text-gray-500 text-[9px] truncate flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            {cliente.endereco}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {cliente.totalPrePostado > 0 && (
            <span className="bg-blue-500/20 text-blue-400 font-bold text-[8px] px-1.5 py-0.5 rounded">
              {cliente.totalPrePostado} PRÉ
            </span>
          )}
          {cliente.etiquetas.length - cliente.totalPrePostado > 0 && (
            <span className="bg-gray-500/20 text-gray-400 font-bold text-[8px] px-1.5 py-0.5 rounded">
              {cliente.etiquetas.length - cliente.totalPrePostado} OUTROS
            </span>
          )}
        </div>
        <div className="flex justify-end">
          <span className="bg-amber-500/20 text-amber-400 font-black text-xs px-2 py-0.5 rounded tabular-nums text-center min-w-[36px]">
            {cliente.etiquetas.length}
          </span>
        </div>
      </div>

      {/* Sub-menu: etiquetas individuais */}
      {expanded && (
        <div className="bg-white/[0.01] border-l-2 border-amber-500/30 ml-6">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1.2fr_auto_70px] gap-2 px-3 py-1 text-[8px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">
            <span>Código</span>
            <span>Destinatário</span>
            <span>Status</span>
            <span>Gerado em</span>
          </div>
          {cliente.etiquetas
            .sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''))
            .map((et, i) => (
              <div
                key={et.id || i}
                className={`grid grid-cols-[1fr_1.2fr_auto_70px] gap-2 px-3 py-1 items-center ${
                  i % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.03]'
                }`}
              >
                <span className="text-amber-300/80 font-mono text-[10px] truncate">
                  {et.codigoObjeto || '—'}
                </span>
                <span className="text-gray-300 text-[10px] truncate">
                  {et.destinatario?.nome || '—'}
                </span>
                <StatusBadge status={et.status} />
                <span className="text-gray-500 text-[10px] font-mono text-right tabular-nums">
                  {formatDataHora(et.criadoEm)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

// ─── Componente de Grupo ─────────────────────────────────────────────────────
const GrupoTable = ({ grupo }: { grupo: GrupoHorario }) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const corteGrupo = grupo.sortKey - 60;
  const urgente = grupo.sortKey < 9999 && nowMinutes >= corteGrupo && nowMinutes < grupo.sortKey;
  const jaPassou = grupo.sortKey < 9999 && nowMinutes >= grupo.sortKey;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
          jaPassou ? 'bg-red-500/20' : urgente ? 'bg-orange-500/20 animate-pulse' : grupo.isBrhub ? 'bg-cyan-500/20' : 'bg-amber-500/20'
        }`}>
          {grupo.isBrhub ? (
            <Users className={`w-3.5 h-3.5 ${jaPassou ? 'text-red-400' : urgente ? 'text-orange-400' : 'text-cyan-400'}`} />
          ) : jaPassou ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : urgente ? (
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className={`font-black text-xs uppercase tracking-wider ${
            jaPassou ? 'text-red-400' : urgente ? 'text-orange-400' : grupo.isBrhub ? 'text-cyan-400' : 'text-amber-400'
          }`}>
            {grupo.isBrhub ? `BRHUB · ${grupo.label}` : grupo.label}
          </span>
        </div>
        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
          {grupo.clientes.length} clientes · {grupo.totalObjetos} obj
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className={`rounded-md overflow-hidden border ${
        jaPassou ? 'border-red-500/20' : urgente ? 'border-orange-500/20' : 'border-white/5'
      }`}>
        {grupo.clientes.map((cliente, i) => (
          <ClienteRow key={cliente.nome} cliente={cliente} index={i} />
        ))}
      </div>
    </div>
  );
};

// ─── Painel principal ────────────────────────────────────────────────────────
const TvBoard = () => {
  const [data, setData] = useState<Etiqueta[]>([]);
  const [horariosDb, setHorariosDb] = useState<ClienteHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tick, setTick] = useState(0);

  const fetchHorarios = useCallback(async () => {
    try {
      const { data: rows, error } = await supabase
        .from('clientes_coleta_horarios')
        .select('nome_cliente, horario_inicio, horario_fim, motorista, grupo, endereco')
        .eq('ativo', true);
      if (error) {
        console.error('[TV Painel] Erro ao buscar horários:', error);
        return;
      }
      setHorariosDb(rows || []);
    } catch (err) {
      console.error('[TV Painel] Erro ao buscar horários:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'xikvfybxthvqhpjbrszp';
      const url = `https://${projectId}.supabase.co/functions/v1/tv-painel-coleta?status=PRE_POSTADO`;

      const res = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
      });

      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      const lista: Etiqueta[] = json?.data || json || [];

      // Filtrar etiquetas com mais de 4 dias
      const now = Date.now();
      const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
      const filtrada = lista.filter(et => {
        if (!et.criadoEm) return true;
        const criado = new Date(et.criadoEm).getTime();
        return (now - criado) <= FOUR_DAYS_MS;
      });

      console.log(`[TV Painel] ${lista.length} etiquetas recebidas, ${filtrada.length} após filtro de 4 dias`);
      setData(filtrada);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[TV Painel] Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHorarios();
    fetchData();
    const interval = setInterval(() => {
      fetchHorarios();
      fetchData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHorarios, fetchData]);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const proximoRefresh = useMemo(() => {
    const next = new Date(lastUpdate.getTime() + REFRESH_INTERVAL);
    const diff = Math.max(0, Math.floor((next.getTime() - Date.now()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdate, tick]);

  // ─── Nomes dos dias da semana ─────────────────────────────────────────
  const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const now = new Date();
  const diaAtual = now.getDay();
  const isFds = diaAtual === 0 || diaAtual === 6;

  const col1 = isFds ? 'Segunda-feira' : DIAS_SEMANA[diaAtual];
  const col2 = isFds ? null : (diaAtual === 5 ? 'Segunda-feira' : DIAS_SEMANA[diaAtual + 1]);

  // Separar etiquetas por coluna
  const etiquetasCol1: Etiqueta[] = [];
  const etiquetasCol2: Etiqueta[] = [];

  for (const et of data) {
    if (!et.criadoEm) {
      etiquetasCol1.push(et);
      continue;
    }
    const criadoDate = new Date(et.criadoEm);
    const criadoDia = criadoDate.getDay();
    const criadoHora = criadoDate.getHours() * 60 + criadoDate.getMinutes();

    // Etiqueta gerada no sábado ou domingo → sempre Segunda (col1)
    if (criadoDia === 0 || criadoDia === 6) {
      etiquetasCol1.push(et);
      continue;
    }

    if (isFds) {
      etiquetasCol1.push(et);
      continue;
    }

    // Dia útil: verificar horário de coleta do cliente
    const nomeRemetente = et.remetenteNome || et.remetente?.nome || '';
    const horarioColeta = resolverHorario(nomeRemetente, horariosDb);
    const horarioColetaMin = parseTime(horarioColeta);
    const isHoje = criadoDate.toDateString() === now.toDateString();

    if (isHoje) {
      if (criadoHora < horarioColetaMin) {
        etiquetasCol1.push(et);
      } else if (col2) {
        etiquetasCol2.push(et);
      } else {
        etiquetasCol1.push(et);
      }
    } else {
      // Gerada em dia anterior que ainda não foi postada
      if (criadoDia === 5 && criadoHora >= horarioColetaMin) {
        // Sexta após horário → Segunda
        etiquetasCol1.push(et);
      } else {
        etiquetasCol1.push(et);
      }
    }
  }

  const { regulares: regularesCol1, brhub: brhubCol1 } = agruparPorRemetente(etiquetasCol1, horariosDb);
  const { regulares: regularesCol2, brhub: brhubCol2 } = agruparPorRemetente(etiquetasCol2, horariosDb);

  const allGroupsCol1: GrupoHorario[] = [...regularesCol1];
  if (brhubCol1) allGroupsCol1.push(brhubCol1);
  allGroupsCol1.sort((a, b) => a.sortKey - b.sortKey);

  const allGroupsCol2: GrupoHorario[] = [...regularesCol2];
  if (brhubCol2) allGroupsCol2.push(brhubCol2);
  allGroupsCol2.sort((a, b) => a.sortKey - b.sortKey);

  const totalObjetos = data.length;
  const totalClientes = new Set(data.map(e => (e.remetenteNome || e.remetente?.nome || '').toUpperCase().trim())).size;
  const totalCol1 = etiquetasCol1.length;
  const totalCol2 = etiquetasCol2.length;
  const clientesCol1 = allGroupsCol1.reduce((acc, g) => acc + g.clientes.length, 0);
  const clientesCol2 = allGroupsCol2.reduce((acc, g) => acc + g.clientes.length, 0);
  const singleColumn = col2 === null;
  const hoje = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0e17] text-white flex flex-col select-none overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#0f1523] to-[#0a0e17] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase leading-tight">Painel de Coleta</h1>
            <p className="text-gray-600 text-[10px] tracking-widest uppercase">{hoje}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-gray-600 text-[9px] uppercase tracking-widest">Clientes</p>
              <p className="text-2xl font-black text-white tabular-nums leading-tight">{totalClientes}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-gray-600 text-[9px] uppercase tracking-widest">Etiquetas</p>
              <p className="text-2xl font-black text-amber-400 tabular-nums leading-tight">{totalObjetos}</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="text-right">
            <p className="text-2xl font-black tabular-nums tracking-tight text-white leading-tight">{horaAtual}</p>
            <p className="text-[9px] text-gray-600 tracking-widest uppercase">
              Refresh {proximoRefresh}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden px-4 py-2">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Package className="w-16 h-16" />
            <p className="text-lg font-bold uppercase tracking-widest">Nenhuma etiqueta encontrada</p>
          </div>
        ) : (
          <div className={`grid ${singleColumn ? 'grid-cols-1' : 'grid-cols-2'} gap-4 h-full overflow-hidden`}>
            {/* COLUNA 1 */}
            <div className="flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/20">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span className="font-black text-sm uppercase tracking-wider text-emerald-400">{col1}</span>
                </div>
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  {clientesCol1} clientes · {totalCol1} etiq
                </span>
                <div className="flex-1 h-px bg-emerald-500/10" />
              </div>
              {allGroupsCol1.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-30">
                  <Package className="w-10 h-10" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma coleta pendente</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-auto">
                  {allGroupsCol1.map((grupo) => (
                    <GrupoTable key={grupo.label} grupo={grupo} />
                  ))}
                </div>
              )}
            </div>

            {/* COLUNA 2 (se existir) */}
            {!singleColumn && (
              <div className="flex flex-col gap-2 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-500/20">
                    <CalendarClock className="w-4 h-4 text-blue-400" />
                    <span className="font-black text-sm uppercase tracking-wider text-blue-400">{col2}</span>
                  </div>
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    {clientesCol2} clientes · {totalCol2} etiq
                  </span>
                  <div className="flex-1 h-px bg-blue-500/10" />
                </div>
                {allGroupsCol2.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-30">
                    <Package className="w-10 h-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma coleta pendente</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 overflow-auto">
                    {allGroupsCol2.map((grupo) => (
                      <GrupoTable key={grupo.label} grupo={grupo} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="px-4 py-1.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 uppercase tracking-widest flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>Etiquetas do dia · Clique para expandir</span>
          <span className="text-white/10">|</span>
          <span className="text-cyan-400/60">BRHUB: {BRHUB_HORARIO}</span>
        </div>
        <span>
          Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </footer>
    </div>
  );
};

// ─── Componente raiz ─────────────────────────────────────────────────────────
const TvPainelColeta = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('tv_coleta_auth') === '1');

  if (!authed) return <TvLogin onAuth={() => setAuthed(true)} />;
  return <TvBoard />;
};

export default TvPainelColeta;
