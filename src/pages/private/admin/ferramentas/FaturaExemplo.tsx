import { FileText } from 'lucide-react';
import { Content } from '../../Content';
import { ToggleSection } from '../../../../components/ToggleSection';
import { InfoGroup } from '../../../../components/InfoGroup';
import { Divider } from '../../../../components/divider';
import { TableCustom } from '../../../../components/table';
import { StatusBadge } from '../../../../components/StatusBadge';
import { ButtonComponent } from '../../../../components/button';
import { toast } from 'sonner';
import { useState } from 'react';

const FaturaExemplo = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const dadosFatura = {
    codigo: "FAT-LARAS-001",
    nomeCliente: "LARAS MODAS",
    cpfCnpj: "00.000.000/0001-00",
    telefone: "(11) 99999-9999",
    endereco: "Rua Exemplo, 123 - Centro, Campinas-SP 13000-000",
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    dataVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    valorTotal: "300,00",
    totalObjetos: 2,
    periodoInicial: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    periodoFinal: new Date().toLocaleDateString('pt-BR'),
    status: "PENDENTE",
    itens: [
      { codigo: "ENV001", destinatario: "TEREZINHA", cidade: "Campinas/SP", valor: "150,00", status: "POSTADO", data: new Date().toLocaleDateString('pt-BR') },
      { codigo: "ENV002", destinatario: "TEREZINHA", cidade: "Campinas/SP", valor: "150,00", status: "POSTADO", data: new Date().toLocaleDateString('pt-BR') }
    ]
  };

  const handleGerarPDF = async () => {
    setIsGenerating(true);
    try {
      // Gerar HTML da fatura
      const html = gerarHTMLFatura(dadosFatura);
      
      // Para este exemplo, vamos abrir em nova aba com botão de download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // Fallback: download direto do HTML
        const link = document.createElement('a');
        link.href = url;
        link.download = `FATURA_${dadosFatura.codigo}.html`;
        link.click();
      }
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Content
      titulo={`Fatura #${dadosFatura.codigo}`}
      subTitulo="Fatura de exemplo - Laras Modas"
    >
      <div className="mb-6 flex justify-end">
        <ButtonComponent
          variant="primary"
          onClick={handleGerarPDF}
          disabled={isGenerating}
          className="gap-2"
        >
          <FileText size={20} />
          {isGenerating ? "Gerando..." : "GERAR PDF"}
        </ButtonComponent>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-4">

          <ToggleSection title="Detalhes da Fatura" defaultOpen>
            <div className="bg-white dark:bg-slate-800 w-full p-6 rounded-sm flex flex-col gap-4">
              <div className="flex flex-row justify-between items-center gap-1">
                <InfoGroup label="Cliente" values={[dadosFatura.nomeCliente, dadosFatura.cpfCnpj]} />
                <InfoGroup label="Telefone" values={[dadosFatura.telefone]} align="right" />
              </div>
              <InfoGroup label="Endereço" values={[dadosFatura.endereco]} />
              <Divider />
              <div className="flex flex-row justify-between items-center gap-1">
                <InfoGroup label="Valor da Fatura" values={[`R$ ${dadosFatura.valorTotal}`]} />
                <InfoGroup label="Data de Vencimento" values={[dadosFatura.dataVencimento]} align="right" />
              </div>
              <div className="flex flex-row justify-between items-center gap-1">
                <InfoGroup label="Total Objetos" values={[`${dadosFatura.totalObjetos} objetos`]} />
                <InfoGroup label="Status" values={[<StatusBadge status={dadosFatura.status} tipo="faturamento" />]} align="right" />
              </div>
              <div className="flex flex-row justify-between items-center gap-1">
                <InfoGroup label="Período de Faturamento" values={[`${dadosFatura.periodoInicial} até ${dadosFatura.periodoFinal}`]} />
                <InfoGroup label="Data de Emissão" values={[dadosFatura.dataEmissao]} align="right" />
              </div>
            </div>
          </ToggleSection>

          <ToggleSection title="Itens da Fatura" defaultOpen>
            <TableCustom thead={['#', 'Objeto', 'Destinatário', 'Destino', 'Status', 'Valor', 'Data']}>
              {dadosFatura.itens.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{item.codigo}</td>
                  <td className="px-4 py-3">{item.destinatario}</td>
                  <td className="px-4 py-3">{item.cidade}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} tipo="envio" /></td>
                  <td className="px-4 py-3">R$ {item.valor}</td>
                  <td className="px-4 py-3">{item.data}</td>
                </tr>
              ))}
            </TableCustom>
          </ToggleSection>

        </div>
      </div>
    </Content>
  );
};

function gerarHTMLFatura(dados: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fatura ${dados.codigo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #F2541B; }
    .logo-section h1 { font-size: 28px; color: #F2541B; font-weight: 700; }
    .logo-section p { color: #666; font-size: 14px; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 24px; color: #333; margin-bottom: 10px; }
    .invoice-info p { font-size: 14px; color: #666; margin: 4px 0; }
    .client-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .client-section h3 { color: #F2541B; margin-bottom: 15px; font-size: 16px; }
    .client-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .client-info p { font-size: 14px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #F2541B; color: white; padding: 12px 15px; text-align: left; font-size: 14px; }
    .items-table th:last-child { text-align: right; }
    .items-table td { padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 14px; }
    .items-table td:last-child { text-align: right; font-weight: 600; }
    .items-table tr:nth-child(even) { background: #f9f9f9; }
    .total-section { display: flex; justify-content: flex-end; margin-top: 20px; }
    .total-box { background: linear-gradient(135deg, #F2541B 0%, #ff7043 100%); color: white; padding: 20px 40px; border-radius: 8px; text-align: right; }
    .total-box p { font-size: 14px; opacity: 0.9; }
    .total-box h2 { font-size: 32px; font-weight: 700; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fff3e0; color: #F2541B; }
    .download-btn { position: fixed; bottom: 20px; right: 20px; background: #F2541B; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(242, 84, 27, 0.4); }
    .download-btn:hover { background: #d94516; }
    @media print { .download-btn { display: none; } body { padding: 20px; } }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div id="fatura-content">
    <div class="header">
      <div class="logo-section">
        <h1>🚚 BRHUB ENVIOS</h1>
        <p>Sistema de Gestão de Envios</p>
      </div>
      <div class="invoice-info">
        <h2>FATURA</h2>
        <p><strong>Nº:</strong> ${dados.codigo}</p>
        <p><strong>Emissão:</strong> ${dados.dataEmissao}</p>
        <p><strong>Vencimento:</strong> ${dados.dataVencimento}</p>
        <p><span class="badge">${dados.status}</span></p>
      </div>
    </div>

    <div class="client-section">
      <h3>📋 DADOS DO CLIENTE</h3>
      <div class="client-info">
        <p><strong>Razão Social:</strong> ${dados.nomeCliente}</p>
        <p><strong>CNPJ:</strong> ${dados.cpfCnpj}</p>
        <p><strong>Telefone:</strong> ${dados.telefone}</p>
        <p><strong>Endereço:</strong> ${dados.endereco}</p>
      </div>
    </div>

    <h3 style="color: #333; margin-bottom: 15px; font-size: 16px;">📦 ITENS DA FATURA</h3>
    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Código</th>
          <th>Destinatário</th>
          <th>Destino</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${dados.itens.map((item: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.codigo}</td>
            <td>${item.destinatario}</td>
            <td>${item.cidade}</td>
            <td>R$ ${item.valor}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-box">
        <p>TOTAL A PAGAR</p>
        <h2>R$ ${dados.valorTotal}</h2>
      </div>
    </div>

    <div class="footer">
      <p>BRHUB Envios - Sistema de Gestão de Envios</p>
      <p>Período: ${dados.periodoInicial} até ${dados.periodoFinal}</p>
    </div>
  </div>

  <button class="download-btn" onclick="baixarPDF()">📥 Baixar PDF</button>

  <script>
    function baixarPDF() {
      const element = document.getElementById('fatura-content');
      const opt = {
        margin: 10,
        filename: 'FATURA_${dados.codigo}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    }
  </script>
</body>
</html>
  `;
}

export default FaturaExemplo;
