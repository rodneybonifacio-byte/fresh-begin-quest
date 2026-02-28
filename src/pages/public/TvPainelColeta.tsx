import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, MapPin, Clock, Truck, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface OrdemColeta {
  cliente: string;
  localColeta: string;
  responsavel: string;
  dataHoraColeta: string;
  totalObjeto: string;
  status?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const TV_PIN = '7890';
const REFRESH_INTERVAL = 120_000; // 2 min

// ─── Lógica de datas (mesma regra de negócio do painel interno) ──────────────
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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Painel de Coleta
            </h1>
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
                  ? 'border-red-500 focus:ring-red-500/40 animate-shake'
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

          {error && (
            <p className="text-red-400 text-sm text-center font-medium">
              PIN incorreto. Tente novamente.
            </p>
          )}

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

// ─── Board Row (estilo aeroporto) ────────────────────────────────────────────
const BoardRow = ({ ordem, index }: { ordem: OrdemColeta; index: number }) => (
  <div
    className="grid grid-cols-[1fr_1.2fr_0.8fr_0.5fr] items-center gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-amber-400 font-black text-lg tabular-nums w-8 text-right flex-shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="text-white font-bold text-base truncate uppercase tracking-wide">
        {ordem.cliente}
      </span>
    </div>

    <div className="flex items-center gap-2 min-w-0">
      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <span className="text-gray-300 text-sm truncate">
        {ordem.localColeta || '—'}
      </span>
    </div>

    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <span className="text-gray-300 text-sm">
        {ordem.dataHoraColeta || '—'}
      </span>
    </div>

    <div className="flex justify-end">
      <span className="bg-amber-500/20 text-amber-400 font-black text-lg px-4 py-1 rounded-lg tabular-nums min-w-[60px] text-center">
        {ordem.totalObjeto}
      </span>
    </div>
  </div>
);

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
        if (!item.status) return true; // API já filtrou
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
    const interval = setInterval(() => {
      fetchData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Relógio (tick a cada segundo)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const totalObjetos = useMemo(
    () => data.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0),
    [data]
  );

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
      <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0f1523] to-[#0a0e17] border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              Painel de Coleta
            </h1>
            <p className="text-gray-500 text-xs tracking-widest uppercase">
              {datas.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
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
            <p className="text-3xl font-black tabular-nums tracking-tight text-white">
              {horaAtual}
            </p>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">
              Atualiza em {proximoRefresh}
            </p>
          </div>
        </div>
      </header>

      {/* ── Table header ────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.5fr] gap-4 px-6 py-3 bg-white/[0.03] border-b border-white/5">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold pl-11">
          Cliente
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          Local de Coleta
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          Horário
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-right">
          Qtd
        </span>
      </div>

      {/* ── Rows ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Package className="w-20 h-20" />
            <p className="text-xl font-bold uppercase tracking-widest">
              Nenhuma coleta pendente
            </p>
          </div>
        ) : (
          data.map((ordem, i) => <BoardRow key={i} ordem={ordem} index={i} />)
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="px-6 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-widest">
        <span>Apenas objetos pré-postados</span>
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
