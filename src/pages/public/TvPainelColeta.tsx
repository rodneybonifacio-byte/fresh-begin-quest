import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Package, Clock, Truck, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, Users, ChevronDown, ChevronRight, MapPin, Volume2, VolumeX, Bell, Activity, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoBrhub from '@/assets/logo-brhub-new.png';

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

// ─── Audio Alert ─────────────────────────────────────────────────────────────
const playAlertSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Triple beep pattern
    const playBeep = (startTime: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playBeep(ctx.currentTime, 880, 0.15);
    playBeep(ctx.currentTime + 0.2, 880, 0.15);
    playBeep(ctx.currentTime + 0.4, 1100, 0.25);
  } catch (e) {
    console.warn('[TV Painel] Audio alert failed:', e);
  }
};

// ─── Helpers de horário ──────────────────────────────────────────────────────
const parseTime = (timeStr: string): number => {
  if (!timeStr) return 9999;
  const clean = timeStr.replace(/[^\d:]/g, '');
  const parts = clean.split(':');
  if (parts.length < 2) return 9999;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
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
    PRE_POSTADO: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    POSTADO: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    EM_TRANSITO: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    ENTREGUE: 'bg-green-500/20 text-green-400 border border-green-500/30',
    CANCELADO: 'bg-red-500/20 text-red-400 border border-red-500/30',
    DEVOLVIDO: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  };
  const style = colors[normalized] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${style}`}>
      {status?.replace(/_/g, ' ') || 'SEM STATUS'}
    </span>
  );
};

// ─── Agrupar etiquetas por remetente ─────────────────────────────────────────
interface GrupoHorario {
  label: string;
  sortKey: number;
  clientes: ClienteAgrupado[];
  totalObjetos: number;
  totalPrePostado: number;
  isBrhub?: boolean;
}

const agruparPorRemetente = (etiquetas: Etiqueta[], horariosDb: ClienteHorario[]): {
  regulares: GrupoHorario[];
  brhub: GrupoHorario | null;
} => {
  const clienteMap = new Map<string, ClienteAgrupado>();

  for (const et of etiquetas) {
    const nome = et.remetenteNome || et.remetente?.nome || 'Desconhecido';
    const key = nome.toUpperCase().trim();

    if (!clienteMap.has(key)) {
      const endereco = et.remetente
        ? [et.remetente.logradouro, et.remetente.numero, et.remetente.bairro, et.remetente.localidade, et.remetente.uf]
            .filter(Boolean).join(', ')
        : '';
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

  const brhubClientes: ClienteAgrupado[] = [];
  const outrosClientes: ClienteAgrupado[] = [];

  for (const cliente of clienteMap.values()) {
    if (isBrhubClient(cliente.nome)) {
      brhubClientes.push(cliente);
    } else {
      outrosClientes.push(cliente);
    }
  }

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
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <img src={logoBrhub} alt="BRHUB Envios" className="w-28 h-28 object-contain drop-shadow-2xl" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Painel de Coleta</h1>
            <p className="text-orange-500/60 text-sm mt-1 font-semibold tracking-widest uppercase">BRHUB Envios</p>
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
                  : 'border-white/10 focus:ring-orange-500/40 focus:border-orange-500/60'
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
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Acessar Painel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, icon: Icon, color, pulse }: { 
  label: string; value: number | string; icon: any; color: string; pulse?: boolean 
}) => {
  const colorMap: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r border backdrop-blur-sm ${c} ${pulse ? 'animate-pulse' : ''}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-widest opacity-70 font-bold">{label}</p>
        <p className="text-xl font-black tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
};

// ─── Cliente Row ─────────────────────────────────────────────────────────────
const ClienteRow = ({ cliente, index, isNew }: { cliente: ClienteAgrupado; index: number; isNew?: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-[24px_1fr_auto_50px] gap-2 px-3 py-2 items-center cursor-pointer transition-all duration-200 hover:bg-white/[0.06] ${
          isNew ? 'bg-orange-500/10 border-l-2 border-orange-400' : index % 2 === 0 ? 'bg-white/[0.015]' : 'bg-white/[0.035]'
        }`}
      >
        <span className="text-gray-600 flex items-center">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-orange-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="text-white font-bold text-xs truncate uppercase tracking-wide leading-tight">
            {isNew && <Zap className="w-3 h-3 inline text-orange-400 mr-1" />}
            {cliente.nome}
          </span>
          <span className="text-gray-500 text-[9px] truncate flex items-center gap-1 leading-tight">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-gray-600" />
            {cliente.endereco}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {cliente.totalPrePostado > 0 && (
            <span className="bg-blue-500/20 text-blue-400 font-bold text-[8px] px-1.5 py-0.5 rounded-sm border border-blue-500/20">
              {cliente.totalPrePostado} PRÉ
            </span>
          )}
        </div>
        <div className="flex justify-end">
          <span className="bg-white/10 text-white font-black text-xs px-2.5 py-1 rounded-md tabular-nums text-center min-w-[36px]">
            {cliente.etiquetas.length}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="bg-[#0c1222] border-l-2 border-orange-500/30 ml-4">
          <div className="grid grid-cols-[1fr_1.2fr_auto_70px] gap-2 px-4 py-1.5 text-[8px] text-gray-500 uppercase tracking-widest font-bold border-b border-white/5">
            <span>Código</span>
            <span>Destinatário</span>
            <span>Status</span>
            <span className="text-right">Gerado em</span>
          </div>
          {cliente.etiquetas
            .sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''))
            .map((et, i) => (
              <div
                key={et.id || i}
                className={`grid grid-cols-[1fr_1.2fr_auto_70px] gap-2 px-4 py-1.5 items-center border-b border-white/[0.03] ${
                  i % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.025]'
                }`}
              >
                <span className="text-orange-300/80 font-mono text-[10px] truncate">
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

// ─── Grupo Table ─────────────────────────────────────────────────────────────
const GrupoTable = ({ grupo }: { grupo: GrupoHorario }) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const corteGrupo = grupo.sortKey - 60;
  const urgente = grupo.sortKey < 9999 && nowMinutes >= corteGrupo && nowMinutes < grupo.sortKey;
  const jaPassou = grupo.sortKey < 9999 && nowMinutes >= grupo.sortKey;

  const headerColor = jaPassou 
    ? 'bg-red-500/10 border-red-500/30' 
    : urgente 
    ? 'bg-orange-500/10 border-orange-500/30' 
    : grupo.isBrhub 
    ? 'bg-cyan-500/10 border-cyan-500/30' 
    : 'bg-white/[0.03] border-white/10';

  const textColor = jaPassou 
    ? 'text-red-400' 
    : urgente 
    ? 'text-orange-400' 
    : grupo.isBrhub 
    ? 'text-cyan-400' 
    : 'text-orange-400';

  return (
    <div className="flex flex-col">
      {/* Header do grupo */}
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-lg border ${headerColor} ${urgente ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-2">
          {grupo.isBrhub ? (
            <Users className={`w-3.5 h-3.5 ${textColor}`} />
          ) : jaPassou ? (
            <AlertTriangle className={`w-3.5 h-3.5 ${textColor}`} />
          ) : urgente ? (
            <AlertTriangle className={`w-3.5 h-3.5 ${textColor}`} />
          ) : (
            <Clock className={`w-3.5 h-3.5 ${textColor}`} />
          )}
          <span className={`font-black text-xs uppercase tracking-wider ${textColor}`}>
            {grupo.isBrhub ? `BRHUB · ${grupo.label}` : grupo.label}
          </span>
          {jaPassou && (
            <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">Atrasado</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
            {grupo.clientes.length} clientes
          </span>
          <span className={`font-black text-sm tabular-nums ${textColor}`}>
            {grupo.totalObjetos}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="rounded-b-lg overflow-hidden border border-t-0 border-white/5 bg-[#0a0f1a]">
        {grupo.clientes.map((cliente, i) => (
          <ClienteRow key={cliente.nome} cliente={cliente} index={i} />
        ))}
      </div>
    </div>
  );
};

// ─── Progress Bar ────────────────────────────────────────────────────────────
const RefreshProgress = ({ lastUpdate }: { lastUpdate: Date }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastUpdate.getTime();
      const remaining = Math.max(0, 100 - (elapsed / REFRESH_INTERVAL) * 100);
      setProgress(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="w-full h-[3px] bg-white/5 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 transition-all duration-500 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// ─── Alert Banner ────────────────────────────────────────────────────────────
const AlertBanner = ({ count, onDismiss }: { count: number; onDismiss: () => void }) => {
  if (count <= 0) return null;

  return (
    <div 
      onClick={onDismiss}
      className="mx-4 mt-2 flex items-center justify-between px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500/20 via-orange-500/15 to-orange-500/20 border border-orange-500/30 cursor-pointer animate-pulse"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center">
          <Bell className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <p className="text-orange-400 font-black text-sm uppercase tracking-wide">
            {count} {count === 1 ? 'nova coleta detectada' : 'novas coletas detectadas'}
          </p>
          <p className="text-orange-400/50 text-[10px] uppercase tracking-widest">Clique para dispensar</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-ping" />
        <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const previousCountRef = useRef(0);

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

      const now = Date.now();
      const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
      const filtrada = lista.filter(et => {
        if (!et.criadoEm) return true;
        const criado = new Date(et.criadoEm).getTime();
        return (now - criado) <= FOUR_DAYS_MS;
      });

      console.log(`[TV Painel] ${lista.length} etiquetas recebidas, ${filtrada.length} após filtro de 4 dias`);

      // Detect new items
      const prevCount = previousCountRef.current;
      if (prevCount > 0 && filtrada.length > prevCount) {
        const diff = filtrada.length - prevCount;
        setNewAlertCount(diff);
        setFlashActive(true);
        if (soundEnabled) playAlertSound();
        setTimeout(() => setFlashActive(false), 3000);
      }
      previousCountRef.current = filtrada.length;

      setData(filtrada);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[TV Painel] Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

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

  // ─── Colunas por dia da semana ─────────────────────────────────────────
  const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const now = new Date();
  const diaAtual = now.getDay();
  const isFds = diaAtual === 0 || diaAtual === 6;

  const col1 = isFds ? 'Segunda-feira' : DIAS_SEMANA[diaAtual];
  const col2 = isFds ? null : (diaAtual === 5 ? 'Segunda-feira' : DIAS_SEMANA[diaAtual + 1]);

  const etiquetasCol1: Etiqueta[] = [];
  const etiquetasCol2: Etiqueta[] = [];

  for (const et of data) {
    if (!et.criadoEm) { etiquetasCol1.push(et); continue; }
    const criadoDate = new Date(et.criadoEm);
    const criadoDia = criadoDate.getDay();
    const criadoHora = criadoDate.getHours() * 60 + criadoDate.getMinutes();

    if (criadoDia === 0 || criadoDia === 6) { etiquetasCol1.push(et); continue; }
    if (isFds) { etiquetasCol1.push(et); continue; }

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
      if (criadoDia === 5 && criadoHora >= horarioColetaMin) {
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

  // Count urgent groups
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const urgentCount = [...allGroupsCol1, ...allGroupsCol2].filter(g => {
    const corte = g.sortKey - 60;
    return g.sortKey < 9999 && nowMinutes >= corte && nowMinutes < g.sortKey;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a13] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <RefreshCw className="w-6 h-6 text-orange-400 animate-spin absolute -bottom-2 -right-2" />
        </div>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-[#060a13] text-white flex flex-col select-none overflow-hidden ${flashActive ? 'ring-4 ring-orange-500/50 ring-inset' : ''}`}>
      {/* Flash overlay */}
      {flashActive && (
        <div className="fixed inset-0 bg-orange-500/5 pointer-events-none z-50 animate-pulse" />
      )}

      {/* Progress bar no topo */}
      <RefreshProgress lastUpdate={lastUpdate} />

      {/* Header - Control Tower style */}
      <header className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#0c1220] via-[#0a0f1a] to-[#0c1220] border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src={logoBrhub} alt="BRHUB Envios" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase leading-tight flex items-center gap-2">
              Painel de Coleta
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20">
                Live
              </span>
            </h1>
            <p className="text-gray-500 text-[10px] tracking-widest uppercase font-semibold">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3">
          <MetricCard label="Clientes" value={totalClientes} icon={Users} color="blue" />
          <MetricCard label="Etiquetas" value={totalObjetos} icon={Package} color="orange" />
          {urgentCount > 0 && (
            <MetricCard label="Urgentes" value={urgentCount} icon={AlertTriangle} color="red" pulse />
          )}
        </div>

        {/* Clock & Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled 
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                : 'bg-white/5 border-white/10 text-gray-600'
            }`}
            title={soundEnabled ? 'Som ativado' : 'Som desativado'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="text-right pl-4 border-l border-white/10">
            <p className="text-3xl font-black tabular-nums tracking-tight text-white leading-tight font-mono">{horaAtual}</p>
            <p className="text-[9px] text-gray-500 tracking-widest uppercase font-bold flex items-center justify-end gap-1.5">
              <RefreshCw className="w-2.5 h-2.5" />
              {proximoRefresh}
            </p>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      <AlertBanner count={newAlertCount} onDismiss={() => setNewAlertCount(0)} />

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 py-3">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
              <Package className="w-10 h-10" />
            </div>
            <div className="text-center">
              <p className="text-lg font-black uppercase tracking-widest">Nenhuma coleta pendente</p>
              <p className="text-sm text-gray-600 mt-1">Aguardando novas etiquetas...</p>
            </div>
          </div>
        ) : (
          <div className={`grid ${singleColumn ? 'grid-cols-1' : 'grid-cols-2'} gap-5 h-full overflow-hidden`}>
            {/* COLUNA 1 */}
            <div className="flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                  <div>
                    <h2 className="font-black text-base uppercase tracking-wider text-emerald-400 leading-tight">{col1}</h2>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                      {clientesCol1} clientes · {totalCol1} etiquetas
                    </p>
                  </div>
                </div>
                <span className="text-3xl font-black text-emerald-400/30 tabular-nums">{totalCol1}</span>
              </div>
              {allGroupsCol1.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-20">
                  <Package className="w-10 h-10" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma coleta</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-auto pr-1 scrollbar-thin">
                  {allGroupsCol1.map((grupo) => (
                    <GrupoTable key={grupo.label} grupo={grupo} />
                  ))}
                </div>
              )}
            </div>

            {/* COLUNA 2 */}
            {!singleColumn && (
              <div className="flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
                    <div>
                      <h2 className="font-black text-base uppercase tracking-wider text-blue-400 leading-tight">{col2}</h2>
                      <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                        {clientesCol2} clientes · {totalCol2} etiquetas
                      </p>
                    </div>
                  </div>
                  <span className="text-3xl font-black text-blue-400/30 tabular-nums">{totalCol2}</span>
                </div>
                {allGroupsCol2.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-20">
                    <Package className="w-10 h-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma coleta</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 overflow-auto pr-1 scrollbar-thin">
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

      {/* Footer */}
      <footer className="px-5 py-2 bg-[#0c1220] border-t border-white/[0.06] flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-widest flex-shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span>Sistema operacional · Auto-refresh 2min</span>
          <span className="text-white/10">|</span>
          <span className="text-cyan-400/60">BRHUB: {BRHUB_HORARIO}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={`w-2 h-2 rounded-full ${soundEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`} />
        </div>
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
