import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, MapPin, Clock, Truck, RefreshCw, Lock, Eye, EyeOff, User, AlertTriangle } from 'lucide-react';

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

// ─── Constantes ──────────────────────────────────────────────────────────────
const TV_PIN = '7890';
const REFRESH_INTERVAL = 120_000; // 2 min

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

/**
 * Regra de corte: horário de corte = primeiro horário da coleta - 1h
 * Se a hora atual já passou o horário de corte, a coleta que seria para hoje
 * na verdade deveria ter sido agendada ontem (já está atrasada).
 */
const getCorteInfo = (coletas: OrdemColeta[]): { horarioCorte: string; primeiroHorario: string } | null => {
  if (coletas.length === 0) return null;

  const horarios = coletas
    .map(c => parseTime(c.dataHoraColeta))
    .filter(h => h < 9999)
    .sort((a, b) => a - b);

  if (horarios.length === 0) return null;

  const primeiro = horarios[0];
  const corte = primeiro - 60; // 1h antes

  const fmtMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    horarioCorte: fmtMinutes(corte < 0 ? 0 : corte),
    primeiroHorario: fmtMinutes(primeiro),
  };
};

// ─── Agrupar coletas por faixa horária ───────────────────────────────────────
interface GrupoHorario {
  label: string;
  sortKey: number;
  coletas: OrdemColeta[];
  totalObjetos: number;
}

const agruparPorHorario = (coletas: OrdemColeta[]): GrupoHorario[] => {
  const map = new Map<string, OrdemColeta[]>();

  for (const c of coletas) {
    const time = formatTimeRange(c.dataHoraColeta);
    const key = time === 'Sem horário' ? 'ZZ:ZZ' : time;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }

  const grupos: GrupoHorario[] = [];
  for (const [key, items] of map) {
    grupos.push({
      label: key === 'ZZ:ZZ' ? 'Sem horário definido' : key,
      sortKey: key === 'ZZ:ZZ' ? 9999 : parseTime(key),
      coletas: items.sort((a, b) => a.cliente.localeCompare(b.cliente)),
      totalObjetos: items.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0),
    });
  }

  return grupos.sort((a, b) => a.sortKey - b.sortKey);
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

// ─── Painel principal (TV Board) ─────────────────────────────────────────────
const TvBoard = () => {
  const [data, setData] = useState<OrdemColeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tick, setTick] = useState(0);

  const datas = useMemo(() => calcularDatasColeta(), []);

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

      // Filtro de segurança: apenas PRE_POSTADO
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
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const grupos = useMemo(() => agruparPorHorario(data), [data]);
  const totalObjetos = useMemo(() => data.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0), [data]);
  const corteInfo = useMemo(() => getCorteInfo(data), [data]);

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

  // Verificar se já passou do horário de corte
  const horaAtualMinutos = new Date().getHours() * 60 + new Date().getMinutes();
  const passouCorte = corteInfo ? horaAtualMinutos >= parseTime(corteInfo.horarioCorte) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col select-none">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0f1523] to-[#0a0e17] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">Painel de Coleta</h1>
            <p className="text-gray-500 text-xs tracking-widest uppercase">{datas.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Regra de corte */}
          {corteInfo && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              passouCorte
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${passouCorte ? 'text-red-400' : 'text-emerald-400'}`} />
              <div className="text-xs">
                <p className={`font-bold ${passouCorte ? 'text-red-400' : 'text-emerald-400'}`}>
                  Corte: {corteInfo.horarioCorte}
                </p>
                <p className="text-gray-500">
                  {passouCorte ? 'Novas etiquetas vão p/ amanhã' : 'Aceitando etiquetas p/ hoje'}
                </p>
              </div>
            </div>
          )}

          {/* Contadores */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-widest">Clientes</p>
              <p className="text-3xl font-black text-white tabular-nums">{data.length}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-widest">Objetos</p>
              <p className="text-3xl font-black text-amber-400 tabular-nums">{totalObjetos}</p>
            </div>
          </div>

          <div className="w-px h-10 bg-white/10" />

          {/* Relógio */}
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums tracking-tight text-white">{horaAtual}</p>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">
              Atualiza em {proximoRefresh}
            </p>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Package className="w-20 h-20" />
            <p className="text-xl font-bold uppercase tracking-widest">Nenhuma coleta pendente</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grupos.map((grupo) => (
              <div key={grupo.label} className="flex flex-col">
                {/* Group header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-black text-sm uppercase tracking-wider">
                      {grupo.label}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    {grupo.coletas.length} cliente{grupo.coletas.length > 1 ? 's' : ''} · {grupo.totalObjetos} obj
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[40px_1fr_1.5fr_120px_80px] gap-3 px-4 py-2 bg-white/[0.02] rounded-t-lg border-b border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">#</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cliente</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Local de Coleta</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Motorista</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-right">Qtd</span>
                </div>

                {/* Rows */}
                {grupo.coletas.map((ordem, i) => (
                  <div
                    key={`${ordem.cliente}-${i}`}
                    className={`grid grid-cols-[40px_1fr_1.5fr_120px_80px] gap-3 px-4 py-3 items-center border-b border-white/[0.03] ${
                      i % 2 === 0 ? 'bg-white/[0.01]' : ''
                    } hover:bg-white/[0.04] transition-colors`}
                  >
                    {/* Nº */}
                    <span className="text-amber-400/60 font-bold text-sm tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Cliente */}
                    <span className="text-white font-bold text-sm truncate uppercase tracking-wide">
                      {ordem.cliente}
                    </span>

                    {/* Local */}
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                      <span className="text-gray-400 text-xs truncate">
                        {ordem.localColeta || '—'}
                      </span>
                    </div>

                    {/* Motorista */}
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400/70 flex-shrink-0" />
                      <span className="text-blue-300 text-xs font-semibold uppercase truncate">
                        {ordem.responsavel || '—'}
                      </span>
                    </div>

                    {/* Qtd */}
                    <div className="flex justify-end">
                      <span className="bg-amber-500/20 text-amber-400 font-black text-base px-3 py-0.5 rounded-md tabular-nums min-w-[50px] text-center">
                        {ordem.totalObjeto}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="px-6 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-widest flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>Apenas objetos pré-postados</span>
          {corteInfo && (
            <>
              <span className="text-white/10">|</span>
              <span>
                1ª coleta: {corteInfo.primeiroHorario} · Corte p/ novas etiquetas: {corteInfo.horarioCorte}
              </span>
            </>
          )}
        </div>
        <span>
          Última atualização:{' '}
          {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
