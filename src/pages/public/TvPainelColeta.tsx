import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Clock, Truck, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface OrdemColeta {
  cliente: string;
  localColeta: string;
  responsavel: string;
  dataHoraColeta: string;
  totalObjeto: string;
  status?: string;
  remetenteId?: string;
}

interface ClienteHorario {
  nome_cliente: string;
  horario_inicio: string;
  horario_fim: string | null;
  motorista: string | null;
  grupo: string | null;
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

// ─── Lógica de datas ─────────────────────────────────────────────────────────
const calcularDatasColeta = () => {
  const now = new Date();
  const dia = now.getDay();
  const hora = now.getHours();

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const hoje = fmt(now);
  const isFds = dia === 0 || dia === 6 || (dia === 5 && hora >= 15);

  if (isFds) {
    let diasAteSexta = dia === 5 ? 0 : dia === 6 ? 1 : 2;
    const sexta = new Date(now);
    sexta.setDate(now.getDate() - diasAteSexta);
    return { dataIni: fmt(sexta), dataFim: hoje, label: `Sexta ${fmt(sexta)} → Hoje` };
  }

  const ontem = new Date(now);
  ontem.setDate(now.getDate() - 1);
  return { dataIni: fmt(ontem), dataFim: hoje, label: `${fmt(ontem)} → ${hoje}` };
};

// ─── Helpers de horário ──────────────────────────────────────────────────────
const parseTime = (timeStr: string): number => {
  if (!timeStr) return 9999;
  const clean = timeStr.replace(/[^\d:]/g, '');
  const parts = clean.split(':');
  if (parts.length < 2) return 9999;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

const formatTimeRange = (time: string): string => {
  if (!time) return 'Sem horário';
  const clean = time.replace(/[^\d:]/g, '');
  const parts = clean.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const fmtMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Resolve horário: tabela auxiliar > API */
const resolverHorario = (ordem: OrdemColeta, horariosDb: ClienteHorario[]): string => {
  if (isBrhubClient(ordem.cliente)) return '16:00';
  
  const upper = ordem.cliente.toUpperCase().trim();
  const match = horariosDb.find(h => upper.includes(h.nome_cliente.toUpperCase().trim()));
  if (match) {
    return match.horario_inicio;
  }
  
  return formatTimeRange(ordem.dataHoraColeta);
};

/** Resolve label do grupo com faixa horária */
const resolverLabel = (ordem: OrdemColeta, horariosDb: ClienteHorario[]): string => {
  const upper = ordem.cliente.toUpperCase().trim();
  const match = horariosDb.find(h => upper.includes(h.nome_cliente.toUpperCase().trim()));
  if (match && match.horario_fim) {
    return `${match.horario_inicio} – ${match.horario_fim}`;
  }
  if (match) return match.horario_inicio;
  return formatTimeRange(ordem.dataHoraColeta);
};

const getCorteInfo = (coletas: OrdemColeta[], horariosDb: ClienteHorario[]): { horarioCorte: string; primeiroHorario: string } | null => {
  if (coletas.length === 0) return null;

  const horarios = coletas
    .map(c => {
      const resolved = resolverHorario(c, horariosDb);
      return parseTime(resolved);
    })
    .filter(h => h < 9999)
    .sort((a, b) => a - b);

  if (horarios.length === 0) return null;

  const primeiro = horarios[0];
  const corte = primeiro - 60;

  return {
    horarioCorte: fmtMinutes(corte < 0 ? 0 : corte),
    primeiroHorario: fmtMinutes(primeiro),
  };
};

// ─── Agrupar coletas ─────────────────────────────────────────────────────────
interface GrupoHorario {
  label: string;
  sortKey: number;
  coletas: OrdemColeta[];
  totalObjetos: number;
  isBrhub?: boolean;
}

const agruparColetas = (coletas: OrdemColeta[], horariosDb: ClienteHorario[]): { regulares: GrupoHorario[]; brhub: GrupoHorario | null } => {
  const brhubColetas: OrdemColeta[] = [];
  const outrasColetas: OrdemColeta[] = [];

  for (const c of coletas) {
    if (isBrhubClient(c.cliente)) {
      brhubColetas.push(c);
    } else {
      outrasColetas.push(c);
    }
  }

  // Agrupar regulares por horário (usando tabela auxiliar)
  const map = new Map<string, { coletas: OrdemColeta[]; label: string }>();
  for (const c of outrasColetas) {
    const time = resolverHorario(c, horariosDb);
    const label = resolverLabel(c, horariosDb);
    const key = time === 'Sem horário' ? 'ZZ:ZZ' : time;
    if (!map.has(key)) map.set(key, { coletas: [], label });
    map.get(key)!.coletas.push(c);
    // Use the most descriptive label (with range)
    if (label.includes('–') && !map.get(key)!.label.includes('–')) {
      map.get(key)!.label = label;
    }
  }

  const regulares: GrupoHorario[] = [];
  for (const [key, val] of map) {
    regulares.push({
      label: key === 'ZZ:ZZ' ? 'Sem horário' : val.label,
      sortKey: key === 'ZZ:ZZ' ? 9999 : parseTime(key),
      coletas: val.coletas.sort((a, b) => a.cliente.localeCompare(b.cliente)),
      totalObjetos: val.coletas.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0),
    });
  }

  regulares.sort((a, b) => a.sortKey - b.sortKey);

  const brhub: GrupoHorario | null = brhubColetas.length > 0
    ? {
        label: BRHUB_HORARIO,
        sortKey: 960,
        coletas: brhubColetas.sort((a, b) => a.cliente.localeCompare(b.cliente)),
        totalObjetos: brhubColetas.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0),
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

// ─── Componente de Grupo (tabela compacta) ───────────────────────────────────
const GrupoTable = ({ grupo }: { grupo: GrupoHorario }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-2 mb-1">
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
        grupo.isBrhub ? 'bg-cyan-500/20' : 'bg-amber-500/20'
      }`}>
        {grupo.isBrhub ? (
          <Users className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className={`font-black text-xs uppercase tracking-wider ${
          grupo.isBrhub ? 'text-cyan-400' : 'text-amber-400'
        }`}>
          {grupo.isBrhub ? `BRHUB · ${grupo.label}` : grupo.label}
        </span>
      </div>
      <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
        {grupo.coletas.length} · {grupo.totalObjetos} obj
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </div>

    <div className="rounded-md overflow-hidden border border-white/5">
      {grupo.coletas.map((ordem, i) => (
        <div
          key={`${ordem.cliente}-${i}`}
          className={`grid grid-cols-[28px_1fr_1fr_90px_55px] gap-2 px-2 py-1.5 items-center ${
            i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'
          }`}
        >
          <span className="text-amber-400/50 font-bold text-[11px] tabular-nums">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-white font-bold text-[11px] truncate uppercase tracking-wide">
            {ordem.cliente}
          </span>
          <span className="text-gray-500 text-[10px] truncate">
            {ordem.localColeta || '—'}
          </span>
          <span className="text-blue-300 text-[10px] font-semibold uppercase truncate">
            {ordem.responsavel || '—'}
          </span>
          <div className="flex justify-end">
            <span className="bg-amber-500/20 text-amber-400 font-black text-xs px-2 py-0.5 rounded tabular-nums text-center min-w-[36px]">
              {ordem.totalObjeto}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Painel principal ────────────────────────────────────────────────────────
const TvBoard = () => {
  const [data, setData] = useState<OrdemColeta[]>([]);
  const [horariosDb, setHorariosDb] = useState<ClienteHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tick, setTick] = useState(0);

  const datas = useMemo(() => calcularDatasColeta(), []);

  // Buscar horários da tabela auxiliar
  const fetchHorarios = useCallback(async () => {
    try {
      const { data: rows, error } = await supabase
        .from('clientes_coleta_horarios')
        .select('nome_cliente, horario_inicio, horario_fim, motorista, grupo')
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
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_BASE_API_URL || '';
      const url = `${baseUrl}/emissoes/ordem-coleta?dataIni=${datas.dataIni}&dataFim=${datas.dataFim}&status=PRE_POSTADO`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      const lista: OrdemColeta[] = json?.data || json || [];

      const filtered = lista.filter((item) => {
        if (!item.status) return true;
        return String(item.status).toUpperCase().replace('-', '_') === 'PRE_POSTADO';
      });

      setData(filtered);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[TV Painel] Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [datas]);

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

  const { regulares, brhub } = useMemo(() => agruparColetas(data, horariosDb), [data, horariosDb]);
  const totalObjetos = useMemo(() => data.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0), [data]);
  const corteInfo = useMemo(() => getCorteInfo(data, horariosDb), [data, horariosDb]);

  const horaAtual = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const proximoRefresh = useMemo(() => {
    const next = new Date(lastUpdate.getTime() + REFRESH_INTERVAL);
    const diff = Math.max(0, Math.floor((next.getTime() - Date.now()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdate, tick]);

  const horaAtualMinutos = new Date().getHours() * 60 + new Date().getMinutes();
  const passouCorte = corteInfo ? horaAtualMinutos >= parseTime(corteInfo.horarioCorte) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  const allGroups: GrupoHorario[] = [...regulares];
  if (brhub) allGroups.push(brhub);
  allGroups.sort((a, b) => a.sortKey - b.sortKey);

  const midpoint = Math.ceil(allGroups.length / 2);
  const col1 = allGroups.slice(0, midpoint);
  const col2 = allGroups.slice(midpoint);

  return (
    <div className="h-screen bg-[#0a0e17] text-white flex flex-col select-none overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#0f1523] to-[#0a0e17] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase leading-tight">Painel de Coleta</h1>
            <p className="text-gray-600 text-[10px] tracking-widest uppercase">{datas.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {corteInfo && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              passouCorte
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <AlertTriangle className={`w-3.5 h-3.5 ${passouCorte ? 'text-red-400' : 'text-emerald-400'}`} />
              <div className="text-[10px] leading-tight">
                <p className={`font-bold ${passouCorte ? 'text-red-400' : 'text-emerald-400'}`}>
                  Corte: {corteInfo.horarioCorte}
                </p>
                <p className="text-gray-500">
                  {passouCorte ? 'Novas → amanhã' : 'Aceitando p/ hoje'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-gray-600 text-[9px] uppercase tracking-widest">Clientes</p>
              <p className="text-2xl font-black text-white tabular-nums leading-tight">{data.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-gray-600 text-[9px] uppercase tracking-widest">Objetos</p>
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
            <p className="text-lg font-bold uppercase tracking-widest">Nenhuma coleta pendente</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
            <div className="flex flex-col gap-3 overflow-hidden">
              {col1.map((grupo) => (
                <GrupoTable key={grupo.label} grupo={grupo} />
              ))}
            </div>
            <div className="flex flex-col gap-3 overflow-hidden">
              {col2.map((grupo) => (
                <GrupoTable key={grupo.label} grupo={grupo} />
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="px-4 py-1.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 uppercase tracking-widest flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>Apenas pré-postados</span>
          {corteInfo && (
            <>
              <span className="text-white/10">|</span>
              <span>1ª coleta: {corteInfo.primeiroHorario} · Corte: {corteInfo.horarioCorte}</span>
            </>
          )}
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
