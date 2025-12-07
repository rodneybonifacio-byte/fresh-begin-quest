// deno-lint-ignore-file
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF generation using raw PDF syntax
function gerarPdfFatura(dados: {
  nomeCliente: string;
  cpfCnpj: string;
  codigoFatura: string;
  dataEmissao: string;
  dataVencimento: string;
  valorTotal: string;
  itens: Array<{
    codigo: string;
    destinatario: string;
    cidade: string;
    valor: string;
  }>;
}): string {
  const { nomeCliente, cpfCnpj, codigoFatura, dataEmissao, dataVencimento, valorTotal, itens } = dados;

  // Create HTML invoice
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fatura ${codigoFatura}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      padding: 40px; 
      background: #fff;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #F2541B;
    }
    .logo-section h1 {
      font-size: 28px;
      color: #F2541B;
      font-weight: 700;
    }
    .logo-section p {
      color: #666;
      font-size: 14px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      font-size: 24px;
      color: #333;
      margin-bottom: 10px;
    }
    .invoice-info p {
      font-size: 14px;
      color: #666;
      margin: 4px 0;
    }
    .client-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .client-section h3 {
      color: #F2541B;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .client-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .client-info p {
      font-size: 14px;
    }
    .client-info strong {
      color: #333;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #F2541B;
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-size: 14px;
    }
    .items-table th:last-child {
      text-align: right;
    }
    .items-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    .items-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .items-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .total-box {
      background: linear-gradient(135deg, #F2541B 0%, #ff7043 100%);
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      text-align: right;
    }
    .total-box p {
      font-size: 14px;
      opacity: 0.9;
    }
    .total-box h2 {
      font-size: 32px;
      font-weight: 700;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-pending {
      background: #fff3e0;
      color: #F2541B;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>🚚 BRHUB ENVIOS</h1>
      <p>Sistema de Gestão de Envios</p>
    </div>
    <div class="invoice-info">
      <h2>FATURA</h2>
      <p><strong>Nº:</strong> ${codigoFatura}</p>
      <p><strong>Emissão:</strong> ${dataEmissao}</p>
      <p><strong>Vencimento:</strong> ${dataVencimento}</p>
      <p><span class="badge badge-pending">PENDENTE</span></p>
    </div>
  </div>

  <div class="client-section">
    <h3>📋 DADOS DO CLIENTE</h3>
    <div class="client-info">
      <p><strong>Razão Social:</strong> ${nomeCliente}</p>
      <p><strong>CNPJ:</strong> ${cpfCnpj}</p>
    </div>
  </div>

  <h3 style="color: #333; margin-bottom: 15px; font-size: 16px;">📦 ITENS DA FATURA</h3>
  <table class="items-table">
    <thead>
      <tr>
        <th>Código</th>
        <th>Destinatário</th>
        <th>Destino</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${itens.map(item => `
        <tr>
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
      <h2>R$ ${valorTotal}</h2>
    </div>
  </div>

  <div class="footer">
    <p>BRHUB Envios - Sistema de Gestão de Envios</p>
    <p>Este documento foi gerado automaticamente</p>
  </div>
</body>
</html>
  `;

  // Convert HTML to base64
  const base64 = btoa(unescape(encodeURIComponent(html)));
  return base64;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Gerando fatura de exemplo...');

    // Dados da fatura conforme solicitado
    const dadosFatura = {
      nomeCliente: "LARAS MODAS",
      cpfCnpj: "00.000.000/0001-00",
      codigoFatura: "FAT-EXEMPLO-001",
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      dataVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      valorTotal: "300,00",
      itens: [
        {
          codigo: "ENV001",
          destinatario: "TEREZINHA",
          cidade: "Campinas/SP",
          valor: "150,00"
        },
        {
          codigo: "ENV002",
          destinatario: "TEREZINHA",
          cidade: "Campinas/SP",
          valor: "150,00"
        }
      ]
    };

    const htmlBase64 = gerarPdfFatura(dadosFatura);

    console.log('Fatura HTML gerada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        htmlBase64,
        dados: dadosFatura,
        message: 'Fatura gerada com sucesso. Use o HTML para visualizar ou converter em PDF.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao gerar fatura:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
