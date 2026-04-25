import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Search, CheckCircle2, ArrowRight, ArrowUp, ArrowDown, Download, Loader2, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '../../../../integrations/supabase/client';
import { toast } from 'sonner';

interface EtiquetaPlanilha {
  codigoObjeto: string;
  valorCustoPlanilha: number;
  novoValorVendaOverride?: number;
}

interface Resultado {
  codigoObjeto: string;
  dataPostagem: string;
  remetenteNome: string;
  emissaoId: string | null;
  valorCustoPlanilha: number;
  valorCustoSistema: number;
  valorVendaAtual: number;
  margemAtual: number;
  novoValorVenda: number | null;
  novoCusto: number | null;
  cenario: string;
}

type Etapa = 'upload' | 'preview' | 'analise' | 'resultado';
type Modo = 'corrigir_venda' | 'corrigir_custo';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (s: string): string => {
  if (!s) return '-';
  try { const d = new Date(s); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '-'; }
};

const parseValorBR = (v: string): number => {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
};

export default function AtualizarPrecosPlanilha() {
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [dadosPlanilha, setDadosPlanilha] = useState<EtiquetaPlanilha[]>([]);
  const [margemMinima, setMargemMinima] = useState(18);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [naoEncontradas, setNaoEncontradas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [valoresEditados, setValoresEditados] = useState<Record<string, number>>({});
  const [modoAtivo, setModoAtivo] = useState<Modo>('corrigir_venda');
  const [filtroDataIni, setFiltroDataIni] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [resultadoExecucao, setResultadoExecucao] = useState<{
    atualizadosVenda: string[];
    atualizadosCusto: string[];
    erros: { codigoObjeto: string; erro: string }[];
  } | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
        const etiquetas: EtiquetaPlanilha[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;
          const cod = row[0]?.toString()?.trim()?.toUpperCase() || '';
          if (!cod) continue;
          const val = typeof row[1] === 'number' ? row[1] : parseValorBR(row[1]?.toString() || '0');
          if (val > 0) etiquetas.push({ codigoObjeto: cod, valorCustoPlanilha: val });
        }
        if (!etiquetas.length) { toast.error('Nenhuma etiqueta válida'); return; }
        setDadosPlanilha(etiquetas);
        setEtapa('preview');
        toast.success(`${etiquetas.length} etiquetas carregadas`);
      } catch { toast.error('Erro ao ler planilha'); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleAnalisar = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke('analisar-precos-planilha', {
        body: { etiquetas: dadosPlanilha, margemMinima, executar: false },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro na análise');
      setResultados(data.resultados);
      setNaoEncontradas(data.naoEncontradas || []);
      // Auto-select items for the active mode
      const autoSelect = new Set<string>();
      const autoValues: Record<string, number> = {};
      (data.resultados as Resultado[]).forEach(r => {
        if (r.cenario === 'CUSTO_PLANILHA_MAIOR' && r.novoValorVenda) {
          autoSelect.add(r.codigoObjeto);
          autoValues[r.codigoObjeto] = r.novoValorVenda;
        }
      });
      setSelecionados(autoSelect);
      setValoresEditados(autoValues);
      setModoAtivo('corrigir_venda');
      setEtapa('analise');
      toast.success(`Análise concluída: ${data.resumo.total} etiquetas`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao analisar');
    } finally {
      setCarregando(false);
    }
  };

  // When switching tabs, auto-select items for that mode
  const switchModo = (modo: Modo) => {
    setModoAtivo(modo);
    const cenario = modo === 'corrigir_venda' ? 'CUSTO_PLANILHA_MAIOR' : 'CUSTO_PLANILHA_MENOR';
    const sel = new Set<string>();
    const vals: Record<string, number> = {};
    resultadosFiltradosPorData.forEach(r => {
      if (r.cenario === cenario) {
        sel.add(r.codigoObjeto);
        if (r.novoValorVenda) vals[r.codigoObjeto] = r.novoValorVenda;
      }
    });
    setSelecionados(sel);
    setValoresEditados(vals);
  };

  const handleExecutar = async () => {
    if (selecionados.size === 0) { toast.info('Selecione pelo menos uma etiqueta'); return; }

    const cenario = modoAtivo === 'corrigir_venda' ? 'CUSTO_PLANILHA_MAIOR' : 'CUSTO_PLANILHA_MENOR';
    const paraEnviar = resultados
      .filter(r => selecionados.has(r.codigoObjeto) && r.emissaoId && r.cenario === cenario)
      .map(r => ({
        codigoObjeto: r.codigoObjeto,
        valorCustoPlanilha: r.valorCustoPlanilha,
        novoValorVendaOverride: valoresEditados[r.codigoObjeto] ?? r.novoValorVenda,
      }));

    if (!paraEnviar.length) { toast.info('Nenhuma etiqueta válida para o modo selecionado'); return; }

    const msg = modoAtivo === 'corrigir_venda'
      ? `Etapa 1: Atualizar CUSTO + VENDA de ${paraEnviar.length} etiqueta(s)?\n(Custo planilha → custo sistema, Venda = custo + ${margemMinima}%)`
      : `Etapa 2: Atualizar CUSTO de ${paraEnviar.length} etiqueta(s)?\n(Custo planilha → custo sistema)`;
    if (!window.confirm(msg)) return;

    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke('analisar-precos-planilha', {
        body: { etiquetas: paraEnviar, margemMinima, executar: true, modo: modoAtivo },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro');
      setResultados(data.resultados);
      setResultadoExecucao({
        atualizadosVenda: data.atualizadosVenda || [],
        atualizadosCusto: data.atualizadosCusto || [],
        erros: data.erros || [],
      });
      setEtapa('resultado');
      const totalOps = (data.atualizadosVenda?.length || 0) + (data.atualizadosCusto?.length || 0);
      toast.success(`${totalOps} atualizações realizadas!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar');
    } finally {
      setCarregando(false);
    }
  };

  const handleReset = () => {
    setEtapa('upload');
    setDadosPlanilha([]);
    setResultados([]);
    setNaoEncontradas([]);
    setFileName('');
    setResultadoExecucao(null);
    setSelecionados(new Set());
    setValoresEditados({});
    setFiltroDataIni('');
    setFiltroDataFim('');
  };

  const resultadosFiltradosPorData = useMemo(() => {
    let filtered = resultados;
    if (filtroDataIni) {
      const d = new Date(filtroDataIni + 'T00:00:00');
      filtered = filtered.filter(r => r.dataPostagem && new Date(r.dataPostagem) >= d);
    }
    if (filtroDataFim) {
      const d = new Date(filtroDataFim + 'T23:59:59');
      filtered = filtered.filter(r => r.dataPostagem && new Date(r.dataPostagem) <= d);
    }
    return filtered;
  }, [resultados, filtroDataIni, filtroDataFim]);

  // Items for the current tab
  const itensModo = useMemo(() => {
    const cenario = modoAtivo === 'corrigir_venda' ? 'CUSTO_PLANILHA_MAIOR' : 'CUSTO_PLANILHA_MENOR';
    return resultadosFiltradosPorData.filter(r => r.cenario === cenario);
  }, [resultadosFiltradosPorData, modoAtivo]);

  const contadores = useMemo(() => ({
    etapa1: resultadosFiltradosPorData.filter(r => r.cenario === 'CUSTO_PLANILHA_MAIOR').length,
    etapa2: resultadosFiltradosPorData.filter(r => r.cenario === 'CUSTO_PLANILHA_MENOR').length,
    ok: resultadosFiltradosPorData.filter(r => r.cenario === 'OK').length,
  }), [resultadosFiltradosPorData]);

  const totais = useMemo(() => {
    const totalVenda = itensModo.reduce((s, r) => s + r.valorVendaAtual, 0);
    const totalCusto = itensModo.reduce((s, r) => s + r.valorCustoPlanilha, 0);
    return { totalVenda, totalCusto, lucro: totalVenda - totalCusto };
  }, [itensModo]);

  const toggleSelecionado = (cod: string) => {
    setSelecionados(prev => { const n = new Set(prev); n.has(cod) ? n.delete(cod) : n.add(cod); return n; });
  };
  const toggleTodos = () => {
    if (selecionados.size === itensModo.length) setSelecionados(new Set());
    else setSelecionados(new Set(itensModo.map(r => r.codigoObjeto)));
  };

  const exportarResultados = () => {
    const ws = XLSX.utils.json_to_sheet(resultados.map(r => ({
      'Código': r.codigoObjeto, 'Remetente': r.remetenteNome, 'Data': formatDate(r.dataPostagem),
      'Custo Planilha': r.valorCustoPlanilha, 'Custo Sistema': r.valorCustoSistema,
      'Venda Atual': r.valorVendaAtual, 'Margem %': r.margemAtual,
      'Nova Venda': r.novoValorVenda || '-', 'Novo Custo': r.novoCusto || '-', 'Cenário': r.cenario,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análise');
    XLSX.writeFile(wb, `analise-precos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Correção de Preços via Planilha</h1>
        <p className="text-muted-foreground mt-1">Corrija valores de venda e custo com base na planilha de custos reais</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['upload', 'preview', 'analise', 'resultado'] as Etapa[]).map((step, i) => {
          const labels = ['Upload', 'Preview', 'Análise', 'Resultado'];
          const isActive = step === etapa;
          const isPast = ['upload', 'preview', 'analise', 'resultado'].indexOf(etapa) > i;
          return (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground/50" />}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-primary text-primary-foreground' : isPast ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* UPLOAD */}
      {etapa === 'upload' && (
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="text-center max-w-md mx-auto">
            <FileSpreadsheet className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Importar Planilha Excel</h2>
            <p className="text-sm text-muted-foreground mb-6">Formato: <strong>Etiqueta | Valor Serviço (custo real)</strong></p>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{fileName || 'Clique para selecionar'}</span>
              <span className="text-xs text-muted-foreground/60 mt-1">.xlsx</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
            <div className="mt-6">
              <label className="text-sm font-medium text-foreground">Margem mínima (%)</label>
              <input type="number" value={margemMinima} onChange={(e) => setMargemMinima(Number(e.target.value))}
                className="mt-1 w-32 mx-auto block text-center px-4 py-2 bg-background border border-border rounded-lg text-foreground" min={1} max={100} />
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {etapa === 'preview' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Preview: {dadosPlanilha.length} etiquetas</h2>
              <p className="text-sm text-muted-foreground">Arquivo: {fileName} | Margem: {margemMinima}%</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Voltar</button>
              <button onClick={handleAnalisar} disabled={carregando}
                className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analisar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Etiqueta</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Custo Planilha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dadosPlanilha.map((item, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{item.codigoObjeto}</td>
                    <td className="px-4 py-2 text-right">{formatBRL(item.valorCustoPlanilha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANÁLISE - Two tabs */}
      {etapa === 'analise' && (
        <div className="space-y-4">
          {/* Date filter */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Data Início</label>
              <input type="date" value={filtroDataIni} onChange={(e) => setFiltroDataIni(e.target.value)}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Data Fim</label>
              <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            </div>
            {(filtroDataIni || filtroDataFim) && (
              <button onClick={() => { setFiltroDataIni(''); setFiltroDataFim(''); }}
                className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors">Limpar</button>
            )}
          </div>

          {/* Tab buttons */}
          <div className="flex gap-2">
            <button onClick={() => switchModo('corrigir_venda')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
                modoAtivo === 'corrigir_venda'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/30'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted'
              }`}>
              <ArrowUp className="w-4 h-4" />
              Etapa 1: Corrigir Venda ({contadores.etapa1})
              <span className="text-[10px] opacity-60 ml-1">Custo planilha {'>'} sistema</span>
            </button>
            <button onClick={() => switchModo('corrigir_custo')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
                modoAtivo === 'corrigir_custo'
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-400 ring-2 ring-sky-500/30'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted'
              }`}>
              <ArrowDown className="w-4 h-4" />
              Etapa 2: Corrigir Custo ({contadores.etapa2})
              <span className="text-[10px] opacity-60 ml-1">Custo planilha {'<'} sistema</span>
            </button>
            <div className="flex items-center px-4 py-2 bg-muted rounded-xl text-sm text-muted-foreground">
              ✅ OK: {contadores.ok}
            </div>
          </div>

          {/* Description of what this mode does */}
          <div className={`p-3 rounded-lg text-xs ${
            modoAtivo === 'corrigir_venda'
              ? 'bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-sky-500/5 border border-sky-500/20 text-sky-700 dark:text-sky-400'
          }`}>
            {modoAtivo === 'corrigir_venda' ? (
              <><strong>Etapa 1:</strong> O custo real (planilha) é MAIOR que o custo no sistema. Ação: atualiza o <strong>custo sistema = custo planilha</strong> e <strong>venda = custo planilha + {margemMinima}%</strong></>
            ) : (
              <><strong>Etapa 2:</strong> O custo real (planilha) é MENOR que o custo no sistema. Ação: atualiza apenas o <strong>custo sistema = custo planilha</strong> (venda permanece)</>
            )}
          </div>

          {/* Financial totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Venda Atual</p>
                <p className="text-lg font-bold text-foreground">{formatBRL(totais.totalVenda)}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-destructive/10"><Wallet className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Custo Planilha</p>
                <p className="text-lg font-bold text-foreground">{formatBRL(totais.totalCusto)}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro Estimado</p>
                <p className={`text-lg font-bold ${totais.lucro >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatBRL(totais.lucro)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {selecionados.size > 0 ? `${selecionados.size} selecionada(s)` : 'Selecione as etiquetas'}
            </p>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Nova análise</button>
              <button onClick={exportarResultados} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Exportar
              </button>
              {selecionados.size > 0 && (
                <button onClick={handleExecutar} disabled={carregando}
                  className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Executar {modoAtivo === 'corrigir_venda' ? 'Etapa 1' : 'Etapa 2'} ({selecionados.size})
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input type="checkbox" checked={selecionados.size > 0 && selecionados.size === itensModo.length}
                        onChange={toggleTodos} className="rounded border-border" />
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Etiqueta</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Remetente</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Custo Planilha</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Custo Sistema</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Venda Atual</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground" title="Margem atual: venda atual sobre custo sistema">
                      Margem Atual
                    </th>
                    {modoAtivo === 'corrigir_venda' && (
                      <>
                        <th className="text-right px-3 py-3 font-medium text-muted-foreground">Nova Venda</th>
                        <th className="text-right px-3 py-3 font-medium text-amber-700 dark:text-amber-400" title="Margem da nova venda sobre o custo da planilha (custo real)">
                          Margem s/ Planilha
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itensModo.map((r, i) => {
                    const isSelected = selecionados.has(r.codigoObjeto);
                    const novaVenda = valoresEditados[r.codigoObjeto] ?? r.novoValorVenda ?? 0;
                    const margemPlanilha = r.valorCustoPlanilha > 0 && novaVenda > 0
                      ? ((novaVenda - r.valorCustoPlanilha) / r.valorCustoPlanilha) * 100
                      : 0;
                    return (
                      <tr key={i} className={`hover:bg-muted/30 ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelecionado(r.codigoObjeto)} className="rounded border-border" />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.codigoObjeto}</td>
                        <td className="px-3 py-2 text-xs truncate max-w-[150px]" title={r.remetenteNome}>{r.remetenteNome}</td>
                        <td className="px-3 py-2 text-xs">{formatDate(r.dataPostagem)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatBRL(r.valorCustoPlanilha)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatBRL(r.valorCustoSistema)}
                          {modoAtivo === 'corrigir_venda' && r.valorCustoSistema < r.valorCustoPlanilha && (
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                              → {formatBRL(r.valorCustoPlanilha)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{formatBRL(r.valorVendaAtual)}</td>
                        {(() => {
                          const margemVsPlanilha = r.valorCustoPlanilha > 0
                            ? ((r.valorVendaAtual - r.valorCustoPlanilha) / r.valorCustoPlanilha) * 100
                            : 0;
                          return (
                            <td className={`px-3 py-2 text-right font-medium ${margemVsPlanilha < 0 ? 'text-destructive' : margemVsPlanilha < margemMinima ? 'text-amber-600' : 'text-primary'}`}>
                              {margemVsPlanilha.toFixed(1)}%
                            </td>
                          );
                        })()}
                        {modoAtivo === 'corrigir_venda' && (
                          <>
                            <td className="px-3 py-2 text-right">
                              <input type="number" step="0.01" min="0"
                                value={valoresEditados[r.codigoObjeto] ?? r.novoValorVenda ?? ''}
                                onChange={(e) => setValoresEditados(prev => ({ ...prev, [r.codigoObjeto]: parseFloat(e.target.value) || 0 }))}
                                className="w-24 text-right px-2 py-1 text-xs bg-background border border-border rounded text-foreground" />
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold ${
                              margemPlanilha < 0 ? 'text-destructive'
                              : margemPlanilha < margemMinima ? 'text-amber-600'
                              : 'text-primary'
                            }`}>
                              {margemPlanilha.toFixed(1)}%
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {itensModo.length === 0 && (
                    <tr><td colSpan={modoAtivo === 'corrigir_venda' ? 10 : 8} className="text-center py-8 text-muted-foreground">
                      Nenhuma etiqueta nesta categoria
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Not found */}
          {naoEncontradas.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-destructive mb-2">Não encontradas ({naoEncontradas.length})</h3>
              <div className="flex flex-wrap gap-2">
                {naoEncontradas.map(cod => (
                  <span key={cod} className="px-2 py-1 text-xs font-mono bg-destructive/10 text-destructive rounded">{cod}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTADO */}
      {etapa === 'resultado' && resultadoExecucao && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Atualização Concluída</h2>
            <p className="text-muted-foreground">
              {resultadoExecucao.atualizadosVenda.length > 0 && `${resultadoExecucao.atualizadosVenda.length} venda(s) atualizada(s)`}
              {resultadoExecucao.atualizadosVenda.length > 0 && resultadoExecucao.atualizadosCusto.length > 0 && ' • '}
              {resultadoExecucao.atualizadosCusto.length > 0 && `${resultadoExecucao.atualizadosCusto.length} custo(s) corrigido(s)`}
              {resultadoExecucao.erros.length > 0 && ` • ${resultadoExecucao.erros.length} erro(s)`}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard label="Vendas Atualizadas" value={resultadoExecucao.atualizadosVenda.length} color="bg-amber-500/10 text-amber-600" />
            <SummaryCard label="Custos Corrigidos" value={resultadoExecucao.atualizadosCusto.length} color="bg-sky-500/10 text-sky-600" />
            <SummaryCard label="Erros" value={resultadoExecucao.erros.length} color="bg-destructive/10 text-destructive" />
          </div>

          {/* Detail of updated items */}
          {(resultadoExecucao.atualizadosVenda.length > 0 || resultadoExecucao.atualizadosCusto.length > 0) && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Detalhes das atualizações
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Etiqueta</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Remetente</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Custo Planilha</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Custo Anterior</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Venda Anterior</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Nova Venda</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados
                      .filter(r => resultadoExecucao.atualizadosVenda.includes(r.codigoObjeto) || resultadoExecucao.atualizadosCusto.includes(r.codigoObjeto))
                      .map((r, i) => {
                        const vendaAtualizada = resultadoExecucao.atualizadosVenda.includes(r.codigoObjeto);
                        const custoAtualizado = resultadoExecucao.atualizadosCusto.includes(r.codigoObjeto);
                        const novaVenda = valoresEditados[r.codigoObjeto] ?? r.novoValorVenda;
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3 font-mono text-xs">{r.codigoObjeto}</td>
                            <td className="p-3 text-xs">{r.remetenteNome}</td>
                            <td className="p-3 text-right text-xs font-medium">{formatBRL(r.valorCustoPlanilha)}</td>
                            <td className="p-3 text-right text-xs text-muted-foreground line-through">{formatBRL(r.valorCustoSistema)}</td>
                            <td className="p-3 text-right text-xs text-muted-foreground">{formatBRL(r.valorVendaAtual)}</td>
                            <td className="p-3 text-right text-xs font-semibold text-primary">
                              {vendaAtualizada && novaVenda ? formatBRL(novaVenda) : '-'}
                            </td>
                            <td className="p-3 text-center text-xs space-x-1">
                              {custoAtualizado && <span className="inline-block px-2 py-0.5 rounded bg-sky-500/10 text-sky-600">Custo ✓</span>}
                              {vendaAtualizada && <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Venda ✓</span>}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultadoExecucao.erros.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-destructive mb-2">Erros ({resultadoExecucao.erros.length})</h3>
              {resultadoExecucao.erros.map((err, i) => (
                <div key={i} className="text-xs py-1"><span className="font-mono">{err.codigoObjeto}</span>: {err.erro}</div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <button onClick={exportarResultados} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button onClick={handleReset} className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Nova Análise
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, onClick, active }: {
  label: string; value: number; color: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all ${color} ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'} ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </button>
  );
}
