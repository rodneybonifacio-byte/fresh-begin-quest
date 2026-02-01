import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Button, Chip, Spinner } from "@heroui/react";
import { FileDown, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../../integrations/supabase/client";
import { toast } from "sonner";

interface EtiquetaCorrigida {
  codigoObjeto: string;
  emissaoId: string;
  valorAnterior: number;
  valorCobrado: number;
  novoValorVenda: number;
  diferenca: number;
  clienteNome?: string;
  clienteId?: string;
  remetenteNome?: string;
  remetenteCpfCnpj?: string;
  status: 'sucesso' | 'erro' | 'nao_encontrada';
  mensagemErro?: string;
}

export default function CorrecaoEtiquetas() {
  const [dados, setDados] = useState<EtiquetaCorrigida[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buscar-dados-correcao-etiquetas', {
        method: 'POST',
        body: {},
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setDados(data.data);
        toast.success(`${data.data.length} etiquetas carregadas`);
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const etiquetasSucesso = dados.filter(d => d.status === 'sucesso');
  const etiquetasErro = dados.filter(d => d.status === 'erro');

  const totalNovo = etiquetasSucesso.reduce((sum, d) => sum + d.novoValorVenda, 0);
  const totalDiferenca = etiquetasSucesso.reduce((sum, d) => sum + d.diferenca, 0);

  const exportarExcel = () => {
    const dataExport = dados.map(d => ({
      'Código Objeto': d.codigoObjeto,
      'Remetente': d.remetenteNome || '-',
      'Cliente': d.clienteNome || '-',
      'Valor Anterior': d.valorAnterior.toFixed(2),
      'Valor Cobrado (Custo)': d.valorCobrado.toFixed(2),
      'Novo Valor (Custo + 10%)': d.novoValorVenda.toFixed(2),
      'Diferença': d.diferenca.toFixed(2),
      'Status': d.status === 'sucesso' ? 'Atualizado' : 'Erro',
      'Observação': d.mensagemErro || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Correções");
    XLSX.writeFile(wb, `relatorio_correcoes_etiquetas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Carregando dados das etiquetas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório de Correções de Etiquetas</h1>
          <p className="text-muted-foreground">Etiquetas com margem negativa corrigidas para custo + 10%</p>
        </div>
        <div className="flex gap-2">
          <Button color="default" variant="flat" startContent={<RefreshCw size={18} />} onPress={fetchDados}>
            Atualizar
          </Button>
          <Button color="primary" startContent={<FileDown size={18} />} onPress={exportarExcel}>
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-muted-foreground">Total Etiquetas</p>
            <p className="text-3xl font-bold text-foreground">{dados.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-muted-foreground">Atualizadas</p>
            <p className="text-3xl font-bold text-success">{etiquetasSucesso.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-muted-foreground">Com Erro</p>
            <p className="text-3xl font-bold text-danger">{etiquetasErro.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-muted-foreground">Aumento Total</p>
            <p className="text-3xl font-bold text-primary">R$ {totalDiferenca.toFixed(2)}</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabela de Etiquetas Atualizadas */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-success" size={20} />
            <h2 className="text-lg font-semibold">Etiquetas Atualizadas com Sucesso ({etiquetasSucesso.length})</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Código Objeto</th>
                  <th className="p-3 text-left font-medium">Remetente</th>
                  <th className="p-3 text-right font-medium">Valor Anterior</th>
                  <th className="p-3 text-right font-medium">Custo (Cobrado)</th>
                  <th className="p-3 text-right font-medium">Novo Valor (+10%)</th>
                  <th className="p-3 text-right font-medium">Diferença</th>
                  <th className="p-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {etiquetasSucesso.map((etiqueta, index) => (
                  <tr key={etiqueta.codigoObjeto} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="p-3 font-mono text-primary">{etiqueta.codigoObjeto}</td>
                    <td className="p-3 text-foreground">{etiqueta.remetenteNome || '-'}</td>
                    <td className="p-3 text-right text-danger">R$ {etiqueta.valorAnterior.toFixed(2)}</td>
                    <td className="p-3 text-right">R$ {etiqueta.valorCobrado.toFixed(2)}</td>
                    <td className="p-3 text-right font-semibold text-success">R$ {etiqueta.novoValorVenda.toFixed(2)}</td>
                    <td className="p-3 text-right text-success">+R$ {etiqueta.diferenca.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <Chip color="success" size="sm" variant="flat">Atualizado</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-semibold">
                <tr>
                  <td className="p-3">TOTAL</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right text-danger">R$ {etiquetasSucesso.reduce((s, e) => s + e.valorAnterior, 0).toFixed(2)}</td>
                  <td className="p-3 text-right">R$ {etiquetasSucesso.reduce((s, e) => s + e.valorCobrado, 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-success">R$ {totalNovo.toFixed(2)}</td>
                  <td className="p-3 text-right text-success">+R$ {totalDiferenca.toFixed(2)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Tabela de Erros */}
      {etiquetasErro.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <XCircle className="text-danger" size={20} />
            <h2 className="text-lg font-semibold">Etiquetas com Erro ({etiquetasErro.length})</h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Código Objeto</th>
                    <th className="p-3 text-left font-medium">Remetente</th>
                    <th className="p-3 text-right font-medium">Valor Anterior</th>
                    <th className="p-3 text-right font-medium">Custo (Cobrado)</th>
                    <th className="p-3 text-right font-medium">Novo Valor Esperado</th>
                    <th className="p-3 text-left font-medium">Motivo do Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {etiquetasErro.map((etiqueta, index) => (
                    <tr key={etiqueta.codigoObjeto} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-mono text-primary">{etiqueta.codigoObjeto}</td>
                      <td className="p-3 text-foreground">{etiqueta.remetenteNome || '-'}</td>
                      <td className="p-3 text-right">R$ {etiqueta.valorAnterior.toFixed(2)}</td>
                      <td className="p-3 text-right">R$ {etiqueta.valorCobrado.toFixed(2)}</td>
                      <td className="p-3 text-right">R$ {etiqueta.novoValorVenda.toFixed(2)}</td>
                      <td className="p-3">
                        <Chip color="danger" size="sm" variant="flat" startContent={<AlertTriangle size={12} />}>
                          {etiqueta.mensagemErro}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ⚠️ Estas etiquetas já foram faturadas e não podem ter seus valores alterados no sistema.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Informações Adicionais */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-warning mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-foreground">Informações da Correção</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Data da execução: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</li>
                <li>• Fórmula aplicada: <code className="bg-muted px-1 rounded">Novo Valor = Custo × 1.10</code> (margem de 10%)</li>
                <li>• Total de etiquetas processadas: {dados.length}</li>
                <li>• Recuperação de margem: R$ {totalDiferenca.toFixed(2)}</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
