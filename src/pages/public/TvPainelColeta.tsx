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
    PRE_POSTADO: 'bg-blue-100 text-blue-700 border border-blue-200',
    POSTADO: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    EM_TRANSITO: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    ENTREGUE: 'bg-green-100 text-green-700 border border-green-200',
    CANCELADO: 'bg-red-100 text-red-700 border border-red-200',
    DEVOLVIDO: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  const style = colors[normalized] || 'bg-gray-100 text-gray-600 border border-gray-200';
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
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6 font-sans">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <img src={logoBrhub} alt="BRHUB Envios" className="w-28 h-28 object-contain drop-shadow-lg" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase font-display">Painel de Coleta</h1>
            <p className="text-orange-500 text-sm mt-1 font-semibold tracking-widest uppercase">BRHUB Envios</p>
          </div>
        </div>
        <div className="w-full space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="PIN de acesso"
              inputMode="numeric"
              autoFocus
              className={`w-full pl-12 pr-12 py-4 rounded-xl bg-white border text-gray-800 text-lg font-mono tracking-[0.3em] text-center placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all shadow-sm ${
                error
                  ? 'border-red-300 focus:ring-red-300'
                  : 'border-gray-200 focus:ring-orange-300 focus:border-orange-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm text-center font-medium">PIN incorreto.</p>}
          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-lg shadow-md shadow-orange-200 hover:shadow-orange-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600',
    red: 'bg-red-50 border-red-200 text-red-600',
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <div className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg border whitespace-nowrap ${c} ${pulse ? 'animate-pulse' : ''}`}>
      <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
      <div>
        <p className="text-[8px] lg:text-[9px] uppercase tracking-widest opacity-60 font-bold">{label}</p>
        <p className="text-lg lg:text-xl font-black tabular-nums leading-tight font-display">{value}</p>
      </div>
    </div>
  );
};

// ─── Cliente Row ─────────────────────────────────────────────────────────────
const ClienteRow = ({ cliente, index, isNew, newIds }: { cliente: ClienteAgrupado; index: number; isNew?: boolean; newIds?: Set<string> }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-[24px_1fr_auto_50px] gap-2 px-3 py-2 items-center cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
          isNew ? 'bg-orange-50 border-l-2 border-orange-400' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
        }`}
      >
        <span className="text-gray-400 flex items-center">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-orange-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="text-gray-800 font-bold text-xs truncate uppercase tracking-wide leading-tight">
            {isNew && <Zap className="w-3 h-3 inline text-orange-500 mr-1" />}
            {cliente.nome}
          </span>
          <span className="text-gray-400 text-[9px] flex items-center gap-1 leading-tight">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-gray-300" />
            <span className="flex flex-col">
              <span className="truncate">{cliente.endereco}</span>
              {cliente.nome.toUpperCase().includes('BAUARTE') && (
                <span className="truncate text-orange-400">📍 Rua Ribeiro de Lima, 750 - Bom Retiro</span>
              )}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {cliente.totalPrePostado > 0 && (
            <span className="bg-blue-100 text-blue-600 font-bold text-[8px] px-1.5 py-0.5 rounded-sm border border-blue-200">
              {cliente.totalPrePostado} PRÉ
            </span>
          )}
        </div>
        <div className="flex justify-end">
          <span className="bg-gray-100 text-gray-700 font-black text-xs px-2.5 py-1 rounded-md tabular-nums text-center min-w-[36px]">
            {cliente.etiquetas.length}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="bg-orange-50/50 border-l-2 border-orange-300 ml-4">
          <div className="grid grid-cols-[1fr_1.2fr_auto_70px] gap-2 px-4 py-1.5 text-[8px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
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
                className={`grid grid-cols-[1fr_1.2fr_auto_70px] gap-2 px-4 py-1.5 items-center border-b border-gray-100/60 ${
                  newIds?.has(et.id || et.codigoObjeto)
                    ? 'bg-amber-50 border-l-2 border-amber-400'
                    : i % 2 === 0 ? 'bg-white/60' : 'bg-orange-50/30'
                }`}
              >
                <span className="text-orange-600 font-mono text-[10px] truncate">
                  {et.codigoObjeto || '—'}
                </span>
                <span className="text-gray-600 text-[10px] truncate">
                  {et.destinatario?.nome || '—'}
                </span>
                <StatusBadge status={et.status} />
                <span className="text-gray-400 text-[10px] font-mono text-right tabular-nums">
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
const GrupoTable = ({ grupo, coletaConfirmada, onConfirmarColeta, newIds }: { grupo: GrupoHorario; coletaConfirmada?: boolean; onConfirmarColeta?: () => void; newIds?: Set<string> }) => {
  const headerColor = coletaConfirmada
    ? 'bg-emerald-50 border-emerald-200'
    : grupo.isBrhub 
    ? 'bg-cyan-50 border-cyan-200' 
    : 'bg-gray-50 border-gray-200';

  const textColor = coletaConfirmada
    ? 'text-emerald-600'
    : grupo.isBrhub 
    ? 'text-cyan-600' 
    : 'text-orange-600';

  return (
    <div className={`flex flex-col ${coletaConfirmada ? 'opacity-70' : ''}`}>
      {/* Header do grupo */}
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-lg border ${headerColor}`}>
        <div className="flex items-center gap-2">
          {coletaConfirmada ? (
            <Truck className={`w-3.5 h-3.5 ${textColor}`} />
          ) : grupo.isBrhub ? (
            <Users className={`w-3.5 h-3.5 ${textColor}`} />
          ) : (
            <Clock className={`w-3.5 h-3.5 ${textColor}`} />
          )}
          <span className={`font-black text-xs uppercase tracking-wider ${textColor}`}>
            {grupo.isBrhub ? `BRHUB · ${grupo.label}` : grupo.label}
          </span>
          {coletaConfirmada && (
            <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">✓ Coletado</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">
            {grupo.clientes.length} clientes
          </span>
          <span className={`font-black text-sm tabular-nums ${textColor}`}>
            {grupo.totalObjetos}
          </span>
          {!coletaConfirmada && onConfirmarColeta && (
            <button
              onClick={onConfirmarColeta}
              className="ml-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wide border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
            >
              Confirmar Coleta
            </button>
          )}
          {coletaConfirmada && onConfirmarColeta && (
            <button
              onClick={onConfirmarColeta}
              className="ml-1 px-2.5 py-1 rounded-md bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-wide border border-gray-200 hover:bg-gray-100 transition-all"
            >
              Desfazer
            </button>
          )}
        </div>
      </div>

      {/* Corpo */}
      <div className={`rounded-b-lg overflow-hidden border border-t-0 ${coletaConfirmada ? 'border-emerald-100' : 'border-gray-100'} bg-white`}>
        {grupo.clientes.map((cliente, i) => {
          const hasNew = newIds ? cliente.etiquetas.some(et => newIds.has(et.id || et.codigoObjeto)) : false;
          return <ClienteRow key={cliente.nome} cliente={cliente} index={i} isNew={hasNew} newIds={newIds} />;
        })}
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
    <div className="w-full h-[3px] bg-gray-100 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300 transition-all duration-500 ease-linear"
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
      className="mx-4 mt-2 flex items-center justify-between px-4 py-2.5 rounded-lg bg-orange-50 border border-orange-200 cursor-pointer animate-pulse"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <Bell className="w-4 h-4 text-orange-500" />
        </div>
        <div>
          <p className="text-orange-600 font-black text-sm uppercase tracking-wide">
            {count} {count === 1 ? 'nova coleta detectada' : 'novas coletas detectadas'}
          </p>
          <p className="text-orange-400 text-[10px] uppercase tracking-widest">Clique para dispensar</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-ping" />
        <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
      </div>
    </div>
  );
};

// ─── New Collection Popup ────────────────────────────────────────────────────
const NewCollectionPopup = ({ count, onConfirm }: { count: number; onConfirm: () => void }) => {
  if (count <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer" onClick={onConfirm}>
      <div className="bg-white border-2 border-orange-200 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-orange-100 flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center animate-pulse">
          <Bell className="w-8 h-8 text-orange-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wide font-display">
            Nova Coleta Detectada!
          </h2>
          <p className="text-orange-500 text-lg font-bold">
            {count} {count === 1 ? 'nova etiqueta' : 'novas etiquetas'}
          </p>
          <p className="text-gray-400 text-sm">
            Foram detectadas novas etiquetas no painel de coleta.
          </p>
        </div>
        <button
          onClick={onConfirm}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-black text-lg uppercase tracking-wider shadow-md shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.02] transition-all active:scale-95"
        >
          Confirmar
        </button>
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
  const previousIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [coletasConfirmadas, setColetasConfirmadas] = useState<Set<string>>(new Set());

  const toggleColeta = useCallback((label: string) => {
    setColetasConfirmadas(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

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
      const prevIds = previousIdsRef.current;
      const currentIds = new Set(filtrada.map(et => et.id || et.codigoObjeto));
      
      if (prevIds.size > 0) {
        const brandNewIds = new Set<string>();
        for (const id of currentIds) {
          if (!prevIds.has(id)) brandNewIds.add(id);
        }
        if (brandNewIds.size > 0) {
          setNewAlertCount(brandNewIds.size);
          setNewIds(prev => new Set([...prev, ...brandNewIds]));
          setFlashActive(true);
          if (soundEnabled) playAlertSound();
          setTimeout(() => setFlashActive(false), 3000);
        }
      }
      previousIdsRef.current = currentIds;
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
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <RefreshCw className="w-6 h-6 text-orange-400 animate-spin absolute -bottom-2 -right-2" />
        </div>
        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-gray-50 text-gray-800 flex flex-col select-none overflow-hidden font-sans ${flashActive ? 'ring-4 ring-orange-300 ring-inset' : ''}`}>
      {/* Flash overlay */}
      {flashActive && (
        <div className="fixed inset-0 bg-orange-100/40 pointer-events-none z-50 animate-pulse" />
      )}

      {/* Progress bar no topo */}
      <RefreshProgress lastUpdate={lastUpdate} />

      {/* Header */}
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-3 lg:px-5 py-2 lg:py-3 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm gap-2 lg:gap-0">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3 lg:gap-4">
            <img src={logoBrhub} alt="BRHUB Envios" className="w-8 h-8 lg:w-12 lg:h-12 object-contain" />
            <div>
              <h1 className="text-sm lg:text-xl font-black tracking-tight uppercase leading-tight flex items-center gap-2 font-display text-gray-800">
                Painel de Coleta
                <span className="text-[8px] lg:text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 lg:px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-200 font-sans">
                  Live
                </span>
              </h1>
              <p className="text-gray-400 text-[9px] lg:text-[10px] tracking-widest uppercase font-semibold hidden sm:block">
                {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Clock & Controls - mobile inline */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition-all ${
                soundEnabled 
                  ? 'bg-orange-50 border-orange-200 text-orange-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums tracking-tight text-gray-800 leading-tight font-display">{horaAtual}</p>
              <p className="text-[8px] text-gray-400 tracking-widest uppercase font-bold flex items-center justify-end gap-1">
                <RefreshCw className="w-2 h-2" />
                {proximoRefresh}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics - scroll horizontal no mobile */}
        <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <MetricCard label="Clientes" value={totalClientes} icon={Users} color="blue" />
          <MetricCard label="Etiquetas" value={totalObjetos} icon={Package} color="orange" />
          {urgentCount > 0 && (
            <MetricCard label="Urgentes" value={urgentCount} icon={AlertTriangle} color="red" pulse />
          )}
        </div>

        {/* Clock & Controls - desktop */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled 
                ? 'bg-orange-50 border-orange-200 text-orange-500' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
            title={soundEnabled ? 'Som ativado' : 'Som desativado'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="text-right pl-4 border-l border-gray-200">
            <p className="text-3xl font-black tabular-nums tracking-tight text-gray-800 leading-tight font-display">{horaAtual}</p>
            <p className="text-[9px] text-gray-400 tracking-widest uppercase font-bold flex items-center justify-end gap-1.5">
              <RefreshCw className="w-2.5 h-2.5" />
              {proximoRefresh}
            </p>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      <AlertBanner count={newAlertCount} onDismiss={() => setNewAlertCount(0)} />

      {/* Popup de nova coleta */}
      <NewCollectionPopup count={newAlertCount} onConfirm={() => setNewAlertCount(0)} />

      {/* Content */}
      <div className="flex-1 overflow-hidden px-3 lg:px-4 py-2 lg:py-3">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-black uppercase tracking-widest text-gray-500">Nenhuma coleta pendente</p>
              <p className="text-sm text-gray-400 mt-1">Aguardando novas etiquetas...</p>
            </div>
          </div>
        ) : (
          <div className={`grid ${singleColumn ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4 lg:gap-5 h-full overflow-auto lg:overflow-hidden`}>
            {/* COLUNA 1 */}
            <div className="flex flex-col gap-3 overflow-visible lg:overflow-hidden">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500" />
                  <div>
                    <h2 className="font-black text-sm lg:text-base uppercase tracking-wider text-emerald-600 leading-tight font-display">{col1}</h2>
                    <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                      {clientesCol1} clientes · {totalCol1} etiquetas
                    </p>
                  </div>
                </div>
                <span className="text-2xl lg:text-3xl font-black text-emerald-200 tabular-nums font-display">{totalCol1}</span>
              </div>
              {allGroupsCol1.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-20">
                  <Package className="w-10 h-10 text-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Nenhuma coleta</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-auto pr-1 scrollbar-thin">
                  {allGroupsCol1.map((grupo) => (
                    <GrupoTable key={grupo.label} grupo={grupo} coletaConfirmada={coletasConfirmadas.has(grupo.label)} onConfirmarColeta={() => toggleColeta(grupo.label)} newIds={newIds} />
                  ))}
                </div>
              )}
            </div>

            {/* COLUNA 2 */}
            {!singleColumn && (
              <div className="flex flex-col gap-3 overflow-visible lg:overflow-hidden">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-300 to-blue-500" />
                    <div>
                      <h2 className="font-black text-sm lg:text-base uppercase tracking-wider text-blue-600 leading-tight font-display">{col2}</h2>
                      <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                        {clientesCol2} clientes · {totalCol2} etiquetas
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl lg:text-3xl font-black text-blue-200 tabular-nums font-display">{totalCol2}</span>
                </div>
                {allGroupsCol2.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-20">
                    <Package className="w-10 h-10 text-gray-300" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Nenhuma coleta</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 overflow-auto pr-1 scrollbar-thin">
                    {allGroupsCol2.map((grupo) => (
                      <GrupoTable key={grupo.label} grupo={grupo} coletaConfirmada={coletasConfirmadas.has(grupo.label)} onConfirmarColeta={() => toggleColeta(grupo.label)} newIds={newIds} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-3 lg:px-5 py-2 bg-white border-t border-gray-100 flex items-center justify-between text-[8px] lg:text-[9px] text-gray-400 uppercase tracking-widest flex-shrink-0">
        <div className="flex items-center gap-2 lg:gap-3 overflow-hidden">
          <Activity className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="hidden sm:inline">Sistema operacional · Auto-refresh 2min</span>
          <span className="sm:hidden">Auto-refresh 2min</span>
          <span className="text-gray-200 hidden lg:inline">|</span>
          <span className="text-cyan-500 hidden lg:inline">BRHUB: {BRHUB_HORARIO}</span>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <span className="hidden sm:inline">
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={`w-2 h-2 rounded-full ${soundEnabled ? 'bg-emerald-400' : 'bg-gray-300'}`} />
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
