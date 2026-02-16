import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Search, CheckCircle2, AlertTriangle, Info, ArrowRight, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../../../integrations/supabase/client';
import { toast } from 'sonner';

interface EtiquetaPlanilha {
  codigoObjeto: string;
  valorCustoPlanilha: number;
}

interface ResultadoAnalise {
  codigoObjeto: string;
  dataPostagem: string;
  remetenteNome: string;
  emissaoId: string | null;
  valorCustoPlanilha: number;
  valorCustoSistema: number;
  valorVendaAtual: number;
  margemAtual: number;
  novoValorVenda: number | null;
  novaMargemCalculada: number | null;
  cenario: 'OK' | 'MARGEM_BAIXA' | 'CUSTO_MENOR';
  descricao: string;
}

interface Resumo {
  total: number;
  ok: number;
  margemBaixa: number;
  custoMenor: number;
  naoEncontradas: number;
  paraAtualizar: number;
  atualizados?: number;
  erros?: number;
}

type Etapa = 'upload' | 'preview' | 'analise' | 'resultado';

const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
};

const parseValorBR = (valor: string): number => {
  if (!valor) return 0;
  const cleaned = valor.toString().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export default function AtualizarPrecosPlanilha() {
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [dadosPlanilha, setDadosPlanilha] = useState<EtiquetaPlanilha[]>([]);
  const [margemMinima, setMargemMinima] = useState(18);
  const [resultados, setResultados] = useState<ResultadoAnalise[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [naoEncontradas, setNaoEncontradas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [fileName, setFileName] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'TODOS' | 'OK' | 'MARGEM_BAIXA' | 'CUSTO_MENOR'>('TODOS');
  const [resultadoExecucao, setResultadoExecucao] = useState<{ atualizados: string[]; erros: { codigoObjeto: string; erro: string }[] } | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [valoresEditados, setValoresEditados] = useState<Record<string, number>>({});

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Skip header row, parse: ETIQUETA | VALOR SERVICO (2 columns)
        const etiquetas: EtiquetaPlanilha[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;

          const codigoObjeto = row[0]?.toString()?.trim()?.toUpperCase() || '';
          const valorRaw = row[1];

          if (!codigoObjeto) continue;

          let valorCusto: number;
          if (typeof valorRaw === 'number') {
            valorCusto = valorRaw;
          } else {
            valorCusto = parseValorBR(valorRaw?.toString() || '0');
          }

          if (valorCusto > 0) {
            etiquetas.push({ codigoObjeto, valorCustoPlanilha: valorCusto });
          }
        }

        if (etiquetas.length === 0) {
          toast.error('Nenhuma etiqueta válida encontrada na planilha');
          return;
        }

        setDadosPlanilha(etiquetas);
        setEtapa('preview');
        toast.success(`${etiquetas.length} etiquetas carregadas`);
      } catch (err) {
        toast.error('Erro ao ler planilha. Verifique o formato.');
        console.error(err);
      }
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

      const res = data.resultados as ResultadoAnalise[];
      setResultados(res);
      setResumo(data.resumo);
      setNaoEncontradas(data.naoEncontradas || []);
      // Auto-select items that need updating
      const autoSelect = new Set<string>();
      const autoValues: Record<string, number> = {};
      res.forEach((r: ResultadoAnalise) => {
        if (r.novoValorVenda !== null) {
          autoSelect.add(r.codigoObjeto);
          autoValues[r.codigoObjeto] = r.novoValorVenda;
        }
      });
      setSelecionados(autoSelect);
      setValoresEditados(autoValues);
      setEtapa('analise');
      toast.success(`Análise concluída: ${data.resumo.total} etiquetas processadas`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao analisar');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const handleExecutar = async () => {
    if (selecionados.size === 0) {
      toast.info('Selecione pelo menos uma etiqueta para atualizar');
      return;
    }

    const paraAtualizar = resultados
      .filter(r => selecionados.has(r.codigoObjeto) && r.emissaoId)
      .map(r => ({
        ...r,
        novoValorVenda: valoresEditados[r.codigoObjeto] ?? r.novoValorVenda,
      }))
      .filter(r => r.novoValorVenda !== null && r.novoValorVenda > 0);

    if (paraAtualizar.length === 0) {
      toast.info('Nenhuma etiqueta válida para atualizar. Informe os valores.');
      return;
    }

    const confirmed = window.confirm(
      `Confirma a atualização de ${paraAtualizar.length} etiqueta(s)?\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setCarregando(true);
    try {
      // Build etiquetas payload with overridden values
      const etiquetasParaEnviar = paraAtualizar.map(r => ({
        codigoObjeto: r.codigoObjeto,
        valorCustoPlanilha: r.valorCustoPlanilha,
        novoValorVendaOverride: r.novoValorVenda,
      }));

      const { data, error } = await supabase.functions.invoke('analisar-precos-planilha', {
        body: { etiquetas: etiquetasParaEnviar, margemMinima, executar: true },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro na execução');

      setResultados(data.resultados);
      setResumo(data.resumo);
      setResultadoExecucao({ atualizados: data.atualizados || [], erros: data.erros || [] });
      setEtapa('resultado');
      toast.success(`${data.resumo.atualizados} etiquetas atualizadas!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const toggleSelecionado = (codigo: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === resultadosFiltrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(resultadosFiltrados.map(r => r.codigoObjeto)));
    }
  };

  const handleValorEditado = (codigo: string, valor: number) => {
    setValoresEditados(prev => ({ ...prev, [codigo]: valor }));
  };

  const handleReset = () => {
    setEtapa('upload');
    setDadosPlanilha([]);
    setResultados([]);
    setResumo(null);
    setNaoEncontradas([]);
    setFileName('');
    setResultadoExecucao(null);
    setSelecionados(new Set());
    setValoresEditados({});
    setFiltroAtivo('TODOS');
  };

  const resultadosFiltrados = filtroAtivo === 'TODOS'
    ? resultados
    : resultados.filter(r => r.cenario === filtroAtivo);

  const exportarResultados = () => {
    const wsData = resultados.map(r => ({
      'Código Objeto': r.codigoObjeto,
      'Remetente': r.remetenteNome,
      'Data Postagem': formatDate(r.dataPostagem),
      'Custo Planilha': r.valorCustoPlanilha,
      'Custo Sistema': r.valorCustoSistema,
      'Venda Atual': r.valorVendaAtual,
      'Margem Atual (%)': r.margemAtual,
      'Novo Valor Venda': r.novoValorVenda || '-',
      'Cenário': r.cenario === 'OK' ? '✅ OK' : r.cenario === 'MARGEM_BAIXA' ? '⚠️ Margem Baixa' : '🔵 Custo Menor',
      'Descrição': r.descricao,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análise Preços');
    XLSX.writeFile(wb, `analise-precos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Atualizar Preços via Planilha</h1>
        <p className="text-muted-foreground mt-1">
          Importe uma planilha com valores de custo e analise a margem de cada etiqueta
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['upload', 'preview', 'analise', 'resultado'] as Etapa[]).map((step, i) => {
          const labels = ['Upload', 'Preview', 'Análise', 'Resultado'];
          const isActive = step === etapa;
          const isPast = ['upload', 'preview', 'analise', 'resultado'].indexOf(etapa) > i;
          return (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground/50" />}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                isActive ? 'bg-primary text-primary-foreground' :
                isPast ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload */}
      {etapa === 'upload' && (
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="text-center max-w-md mx-auto">
            <FileSpreadsheet className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Importar Planilha Excel</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Formato esperado: <strong>Etiqueta | Valor Serviço</strong> (2 colunas)
            </p>

            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {fileName || 'Clique para selecionar ou arraste o arquivo'}
              </span>
              <span className="text-xs text-muted-foreground/60 mt-1">.xlsx</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="mt-6">
              <label className="text-sm font-medium text-foreground">Margem mínima (%)</label>
              <input
                type="number"
                value={margemMinima}
                onChange={(e) => setMargemMinima(Number(e.target.value))}
                className="mt-1 w-32 mx-auto block text-center px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                min={1}
                max={100}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Preview */}
      {etapa === 'preview' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Preview: {dadosPlanilha.length} etiquetas</h2>
              <p className="text-sm text-muted-foreground">Arquivo: {fileName} | Margem mínima: {margemMinima}%</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                Voltar
              </button>
              <button
                onClick={handleAnalisar}
                disabled={carregando}
                className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Analisar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
               <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Etiqueta</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor Custo</th>
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

      {/* STEP 3: Análise */}
      {etapa === 'analise' && resumo && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard label="Total" value={resumo.total} color="bg-muted" onClick={() => setFiltroAtivo('TODOS')} active={filtroAtivo === 'TODOS'} />
            <SummaryCard label="✅ OK" value={resumo.ok} color="bg-green-500/10 text-green-600" onClick={() => setFiltroAtivo('OK')} active={filtroAtivo === 'OK'} />
            <SummaryCard label="⚠️ Margem Baixa" value={resumo.margemBaixa} color="bg-yellow-500/10 text-yellow-600" onClick={() => setFiltroAtivo('MARGEM_BAIXA')} active={filtroAtivo === 'MARGEM_BAIXA'} />
            <SummaryCard label="🔵 Custo Menor" value={resumo.custoMenor} color="bg-blue-500/10 text-blue-600" onClick={() => setFiltroAtivo('CUSTO_MENOR')} active={filtroAtivo === 'CUSTO_MENOR'} />
            <SummaryCard label="❌ Não encontradas" value={resumo.naoEncontradas} color="bg-red-500/10 text-red-600" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
              {selecionados.size > 0
                ? `${selecionados.size} etiqueta(s) selecionadas para atualização`
                : 'Selecione as etiquetas que deseja atualizar'}
            </p>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                Nova análise
              </button>
              <button onClick={exportarResultados} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Exportar
              </button>
              {selecionados.size > 0 && (
                <button
                  onClick={handleExecutar}
                  disabled={carregando}
                  className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Executar Atualizações ({selecionados.size})
                </button>
              )}
            </div>
          </div>

          {/* Results table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selecionados.size > 0 && selecionados.size === resultadosFiltrados.length}
                        onChange={toggleTodos}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Etiqueta</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Remetente</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Custo Planilha</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Custo Sistema</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Venda Atual</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Margem</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Nova Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resultadosFiltrados.map((r, i) => {
                    const isSelected = selecionados.has(r.codigoObjeto);
                    const valorEditado = valoresEditados[r.codigoObjeto];
                    return (
                    <tr
                      key={i}
                      className={`hover:bg-muted/30 ${
                        isSelected ? 'bg-primary/5' :
                        r.cenario === 'MARGEM_BAIXA' ? 'bg-yellow-500/5' :
                        r.cenario === 'CUSTO_MENOR' ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelecionado(r.codigoObjeto)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {r.cenario === 'OK' && <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>}
                        {r.cenario === 'MARGEM_BAIXA' && <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" /> Ajustar</span>}
                        {r.cenario === 'CUSTO_MENOR' && <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium"><Info className="w-3.5 h-3.5" /> Info</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.codigoObjeto}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[150px]" title={r.remetenteNome}>{r.remetenteNome}</td>
                      <td className="px-3 py-2 text-xs">{formatDate(r.dataPostagem)}</td>
                      <td className="px-3 py-2 text-right">{formatBRL(r.valorCustoPlanilha)}</td>
                      <td className="px-3 py-2 text-right">{formatBRL(r.valorCustoSistema)}</td>
                      <td className="px-3 py-2 text-right">{formatBRL(r.valorVendaAtual)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        r.margemAtual < 0 ? 'text-red-600' :
                        r.margemAtual < margemMinima ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {r.margemAtual.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorEditado ?? r.novoValorVenda ?? ''}
                          onChange={(e) => handleValorEditado(r.codigoObjeto, parseFloat(e.target.value) || 0)}
                          placeholder="-"
                          className="w-24 text-right px-2 py-1 text-xs bg-background border border-border rounded text-foreground"
                        />
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Not found */}
          {naoEncontradas.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">Etiquetas não encontradas ({naoEncontradas.length})</h3>
              <div className="flex flex-wrap gap-2">
                {naoEncontradas.map(cod => (
                  <span key={cod} className="px-2 py-1 text-xs font-mono bg-red-500/10 text-red-600 rounded">{cod}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Resultado */}
      {etapa === 'resultado' && resumo && resultadoExecucao && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Atualização Concluída</h2>
            <p className="text-muted-foreground">
              {resultadoExecucao.atualizados.length} etiqueta(s) atualizadas com sucesso
              {resultadoExecucao.erros.length > 0 && `, ${resultadoExecucao.erros.length} com erro`}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Atualizadas" value={resultadoExecucao.atualizados.length} color="bg-green-500/10 text-green-600" />
            <SummaryCard label="Erros" value={resultadoExecucao.erros.length} color="bg-red-500/10 text-red-600" />
            <SummaryCard label="Sem alteração" value={resumo.ok} color="bg-muted" />
            <SummaryCard label="Não encontradas" value={resumo.naoEncontradas} color="bg-muted" />
          </div>

          {/* Tabela detalhada das atualizadas */}
          {resultadoExecucao.atualizados.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Etiquetas Atualizadas ({resultadoExecucao.atualizados.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Etiqueta</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Remetente</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Custo Planilha</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Venda Anterior</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Nova Venda</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Margem Anterior</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Nova Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados
                      .filter(r => resultadoExecucao.atualizados.includes(r.codigoObjeto))
                      .map((r, i) => {
                        const novoValor = valoresEditados[r.codigoObjeto] ?? r.novoValorVenda ?? r.valorVendaAtual;
                        const novaMargem = r.valorCustoPlanilha > 0 ? ((novoValor - r.valorCustoPlanilha) / r.valorCustoPlanilha) * 100 : 0;
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3 font-mono text-xs">{r.codigoObjeto}</td>
                            <td className="p-3 text-xs">{r.remetenteNome}</td>
                            <td className="p-3 text-xs">{formatDate(r.dataPostagem)}</td>
                            <td className="p-3 text-right text-xs">R$ {r.valorCustoPlanilha.toFixed(2)}</td>
                            <td className="p-3 text-right text-xs text-muted-foreground line-through">R$ {r.valorVendaAtual.toFixed(2)}</td>
                            <td className="p-3 text-right text-xs font-semibold text-green-600">R$ {novoValor.toFixed(2)}</td>
                            <td className="p-3 text-right text-xs text-muted-foreground">{r.margemAtual.toFixed(1)}%</td>
                            <td className="p-3 text-right text-xs font-semibold text-green-600">{novaMargem.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Etiquetas não encontradas */}
          {naoEncontradas.length > 0 && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-yellow-600 mb-2">Não encontradas no sistema ({naoEncontradas.length})</h3>
              <div className="flex flex-wrap gap-2">
                {naoEncontradas.map((cod, i) => (
                  <span key={i} className="text-xs font-mono bg-yellow-500/10 px-2 py-1 rounded">{cod}</span>
                ))}
              </div>
            </div>
          )}

          {resultadoExecucao.erros.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">Erros ({resultadoExecucao.erros.length})</h3>
              {resultadoExecucao.erros.map((err, i) => (
                <div key={i} className="text-xs py-1">
                  <span className="font-mono">{err.codigoObjeto}</span>: {err.erro}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <button onClick={exportarResultados} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
              <Download className="w-4 h-4" /> Exportar Relatório
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
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all ${color} ${
        onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'
      } ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </button>
  );
}
