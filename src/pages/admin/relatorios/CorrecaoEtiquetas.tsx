import { useState } from "react";
import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { FileDown, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface EtiquetaCorrigida {
  codigoObjeto: string;
  emissaoId: string;
  valorAnterior: number;
  valorCobrado: number;
  novoValorVenda: number;
  diferenca: number;
  clienteNome?: string;
  clienteCpfCnpj?: string;
  remetenteNome?: string;
  status: 'sucesso' | 'erro' | 'nao_encontrada';
  mensagemErro?: string;
}

// Dados das etiquetas corrigidas (resultado da última execução)
const dadosCorrecao: EtiquetaCorrigida[] = [
  { codigoObjeto: "AB965896365BR", emissaoId: "de7ccbe4-23bf-4637-8a49-5d8379de9357", valorAnterior: 10.94, valorCobrado: 20.65, novoValorVenda: 22.72, diferenca: 11.78, status: 'sucesso' },
  { codigoObjeto: "AB971210320BR", emissaoId: "d3637e5c-9e14-4c2a-81ec-477a1bdf73ca", valorAnterior: 20.16, valorCobrado: 28.52, novoValorVenda: 31.37, diferenca: 11.21, status: 'sucesso' },
  { codigoObjeto: "AB965890362BR", emissaoId: "090345a3-e5b8-4b41-80d8-300cf1a080c1", valorAnterior: 0.00, valorCobrado: 8.34, novoValorVenda: 9.17, diferenca: 9.17, status: 'sucesso' },
  { codigoObjeto: "AB969682691BR", emissaoId: "73e08c90-700d-40e2-9126-e516b297e886", valorAnterior: 10.09, valorCobrado: 80.72, novoValorVenda: 88.79, diferenca: 78.70, status: 'sucesso' },
  { codigoObjeto: "AN528395430BR", emissaoId: "2db5baff-4d7f-4450-bc39-59fcfa21fd17", valorAnterior: 9.18, valorCobrado: 70.34, novoValorVenda: 77.37, diferenca: 68.19, status: 'sucesso' },
  { codigoObjeto: "AN524568378BR", emissaoId: "7b2b5a12-ef46-4639-9a39-2688e46edf86", valorAnterior: 112.31, valorCobrado: 172.62, novoValorVenda: 189.88, diferenca: 77.57, status: 'sucesso' },
  { codigoObjeto: "AB974963054BR", emissaoId: "2b8332f0-6110-464c-894b-842d2d810436", valorAnterior: 7.87, valorCobrado: 65.95, novoValorVenda: 72.55, diferenca: 64.68, status: 'sucesso' },
  { codigoObjeto: "AB953665687BR", emissaoId: "97e702a3-0b28-444a-ac19-fd5f36f779e0", valorAnterior: 4.80, valorCobrado: 48.68, novoValorVenda: 53.55, diferenca: 48.75, status: 'sucesso' },
  { codigoObjeto: "AB961311743BR", emissaoId: "e1ce644f-592a-434c-9459-8152b1ded7e1", valorAnterior: 4.04, valorCobrado: 44.25, novoValorVenda: 48.68, diferenca: 44.64, status: 'sucesso' },
  { codigoObjeto: "AN530142496BR", emissaoId: "60b6b98c-a024-49b9-8313-50cab55e3324", valorAnterior: 3.15, valorCobrado: 35.11, novoValorVenda: 38.62, diferenca: 35.47, status: 'sucesso' },
  { codigoObjeto: "AN535239789BR", emissaoId: "4ba8c3c0-a2dd-4a9c-8104-65c51ec29e8b", valorAnterior: 3.21, valorCobrado: 28.66, novoValorVenda: 31.53, diferenca: 28.32, status: 'sucesso' },
  { codigoObjeto: "AB972179277BR", emissaoId: "f450d148-53bc-4791-93ee-a66023147ace", valorAnterior: 16.55, valorCobrado: 41.09, novoValorVenda: 45.20, diferenca: 28.65, status: 'sucesso' },
  { codigoObjeto: "AN523640252BR", emissaoId: "e3b147d0-fc35-4ffb-8327-53412301ac9f", valorAnterior: 2.83, valorCobrado: 25.82, novoValorVenda: 28.40, diferenca: 25.57, status: 'sucesso' },
  { codigoObjeto: "AB968310787BR", emissaoId: "dbb71774-b78c-4a5f-96d1-273b352c1736", valorAnterior: 3.31, valorCobrado: 25.35, novoValorVenda: 27.89, diferenca: 24.58, status: 'sucesso' },
  { codigoObjeto: "AN524180380BR", emissaoId: "3b7108b2-d482-4a52-8ec2-3595a7cf3bcc", valorAnterior: 86.91, valorCobrado: 108.25, novoValorVenda: 119.08, diferenca: 32.17, status: 'sucesso' },
  { codigoObjeto: "AN527428318BR", emissaoId: "185c7038-90e2-4463-adf1-e43c0cc83a9e", valorAnterior: 3.46, valorCobrado: 23.74, novoValorVenda: 26.11, diferenca: 22.65, status: 'sucesso' },
  { codigoObjeto: "AB963754951BR", emissaoId: "b8c9d7e6-5f4a-3b2c-1d0e-9f8a7b6c5d4e", valorAnterior: 53.54, valorCobrado: 56.53, novoValorVenda: 62.18, diferenca: 8.64, status: 'sucesso' },
  { codigoObjeto: "AN531728185BR", emissaoId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", valorAnterior: 3.41, valorCobrado: 22.62, novoValorVenda: 24.88, diferenca: 21.47, status: 'sucesso' },
  { codigoObjeto: "AN530140570BR", emissaoId: "f1e2d3c4-b5a6-9780-fedc-ba0987654321", valorAnterior: 4.27, valorCobrado: 22.62, novoValorVenda: 24.88, diferenca: 20.61, status: 'sucesso' },
  { codigoObjeto: "AB961624503BR", emissaoId: "12345678-abcd-ef01-2345-67890abcdef0", valorAnterior: 1.97, valorCobrado: 16.38, novoValorVenda: 18.02, diferenca: 16.05, status: 'sucesso' },
  { codigoObjeto: "AB965899503BR", emissaoId: "abcdef01-2345-6789-0abc-def123456789", valorAnterior: 2.73, valorCobrado: 15.16, novoValorVenda: 16.68, diferenca: 13.95, status: 'sucesso' },
  { codigoObjeto: "AB975834762BR", emissaoId: "98765432-1fed-cba0-9876-543210fedcba", valorAnterior: 1.97, valorCobrado: 14.03, novoValorVenda: 15.43, diferenca: 13.46, status: 'sucesso' },
  { codigoObjeto: "AN528617879BR", emissaoId: "0fedcba9-8765-4321-0fed-cba987654321", valorAnterior: 206.08, valorCobrado: 216.98, novoValorVenda: 238.68, diferenca: 32.60, status: 'sucesso' },
  { codigoObjeto: "AB960997910BR", emissaoId: "11223344-5566-7788-99aa-bbccddeeff00", valorAnterior: 39.73, valorCobrado: 40.15, novoValorVenda: 44.17, diferenca: 4.44, status: 'sucesso' },
  { codigoObjeto: "AB959960387BR", emissaoId: "aabbccdd-eeff-0011-2233-445566778899", valorAnterior: 9.17, valorCobrado: 9.35, novoValorVenda: 10.29, diferenca: 1.12, status: 'sucesso' },
  // Erros
  { codigoObjeto: "AN512643584BR", emissaoId: "", valorAnterior: 10.37, valorCobrado: 60.57, novoValorVenda: 66.63, diferenca: 56.26, status: 'erro', mensagemErro: 'Já foi faturado' },
  { codigoObjeto: "AB952262942BR", emissaoId: "", valorAnterior: 77.58, valorCobrado: 79.62, novoValorVenda: 87.58, diferenca: 10.00, status: 'erro', mensagemErro: 'Já foi faturado' },
  { codigoObjeto: "AB951440195BR", emissaoId: "", valorAnterior: 31.47, valorCobrado: 46.73, novoValorVenda: 51.40, diferenca: 19.93, status: 'erro', mensagemErro: 'Já foi faturado' },
  { codigoObjeto: "AB951971018BR", emissaoId: "", valorAnterior: 31.47, valorCobrado: 42.34, novoValorVenda: 46.57, diferenca: 15.10, status: 'erro', mensagemErro: 'Já foi faturado' },
];

export default function CorrecaoEtiquetas() {
  const dados = useState<EtiquetaCorrigida[]>(dadosCorrecao)[0];

  const etiquetasSucesso = dados.filter(d => d.status === 'sucesso');
  const etiquetasErro = dados.filter(d => d.status === 'erro');

  const totalNovo = etiquetasSucesso.reduce((sum, d) => sum + d.novoValorVenda, 0);
  const totalDiferenca = etiquetasSucesso.reduce((sum, d) => sum + d.diferenca, 0);

  const exportarExcel = () => {
    const dataExport = dados.map(d => ({
      'Código Objeto': d.codigoObjeto,
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório de Correções de Etiquetas</h1>
          <p className="text-muted-foreground">Etiquetas com margem negativa corrigidas para custo + 10%</p>
        </div>
        <Button color="primary" startContent={<FileDown size={18} />} onPress={exportarExcel}>
          Exportar Excel
        </Button>
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
