// deno-lint-ignore-file
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemFatura {
  codigo: string;
  destinatario: string;
  valor: number;
}

interface DadosFatura {
  nomeCliente: string;
  cpfCnpj: string;
  endereco: string;
  cep: string;
  itens: ItemFatura[];
  dataVencimento: string;
  multaPercentual: number;
  jurosPercentual: number;
}

function formatCpfCnpj(value: string): string {
  const numeros = value.replace(/\D/g, '');
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function gerarFaturaHtml(dados: DadosFatura, codigoFatura: string): string {
  const total = dados.itens.reduce((sum, item) => sum + item.valor, 0);
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  
  return `
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
    .payment-info {
      margin-top: 30px;
      padding: 20px;
      background: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #F2541B;
    }
    .payment-info h4 {
      color: #F2541B;
      margin-bottom: 10px;
    }
    .payment-info p {
      font-size: 13px;
      color: #666;
      margin: 5px 0;
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
      <p><strong>Vencimento:</strong> ${dados.dataVencimento}</p>
      <p><span class="badge badge-pending">PENDENTE</span></p>
    </div>
  </div>

  <div class="client-section">
    <h3>📋 DADOS DO CLIENTE</h3>
    <div class="client-info">
      <p><strong>Razão Social:</strong> ${dados.nomeCliente}</p>
      <p><strong>CNPJ:</strong> ${formatCpfCnpj(dados.cpfCnpj)}</p>
      <p><strong>Endereço:</strong> ${dados.endereco}</p>
      <p><strong>CEP:</strong> ${dados.cep}</p>
    </div>
  </div>

  <h3 style="color: #333; margin-bottom: 15px; font-size: 16px;">📦 ITENS DA FATURA</h3>
  <table class="items-table">
    <thead>
      <tr>
        <th>Código</th>
        <th>Destinatário</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${dados.itens.map(item => `
        <tr>
          <td>${item.codigo}</td>
          <td>${item.destinatario}</td>
          <td>R$ ${formatCurrency(item.valor)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-box">
      <p>TOTAL A PAGAR</p>
      <h2>R$ ${formatCurrency(total)}</h2>
    </div>
  </div>

  <div class="payment-info">
    <h4>⚠️ INFORMAÇÕES DE PAGAMENTO</h4>
    <p><strong>Multa após vencimento:</strong> ${dados.multaPercentual}%</p>
    <p><strong>Juros após vencimento:</strong> ${dados.jurosPercentual}% ao mês</p>
    <p>Realize o pagamento até a data de vencimento para evitar encargos.</p>
  </div>

  <div class="footer">
    <p>BRHUB Envios - Sistema de Gestão de Envios</p>
    <p>Este documento foi gerado automaticamente em ${dataEmissao}</p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      nomeCliente, 
      cpfCnpj, 
      endereco, 
      cep, 
      itens, 
      dataVencimento, 
      multaPercentual = 10,
      jurosPercentual = 1,
      gerarBoleto = true 
    } = body;

    if (!nomeCliente || !cpfCnpj || !itens || itens.length === 0) {
      throw new Error('Dados incompletos: nome, cpfCnpj e itens são obrigatórios');
    }

    const total = itens.reduce((sum: number, item: ItemFatura) => sum + item.valor, 0);
    const codigoFatura = `FAT-${Date.now().toString(36).toUpperCase()}`;

    console.log(`Gerando fatura ${codigoFatura} para ${nomeCliente}, total: R$ ${formatCurrency(total)}`);

    // Gerar HTML da fatura
    const faturaHtml = gerarFaturaHtml({
      nomeCliente,
      cpfCnpj,
      endereco: endereco || 'Não informado',
      cep: cep || '00000-000',
      itens,
      dataVencimento,
      multaPercentual,
      jurosPercentual,
    }, codigoFatura);

    const faturaBase64 = btoa(unescape(encodeURIComponent(faturaHtml)));

    let boletoInfo = null;

    if (gerarBoleto) {
      try {
        // Extrair dados do endereço
        const enderecoMatch = endereco?.match(/(.+?)\s+(\d+)/);
        const logradouro = enderecoMatch ? enderecoMatch[1] : endereco || 'Rua não informada';
        const numero = enderecoMatch ? enderecoMatch[2] : 'SN';

        // Converter data de vencimento DD/MM/YYYY para YYYY-MM-DD
        const [dia, mes, ano] = dataVencimento.split('/');
        const dataVencimentoFormatada = `${ano}-${mes}-${dia}`;

        // Chamar a edge function existente de boleto
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          throw new Error('Configuração do Supabase não encontrada');
        }

        console.log('Chamando banco-inter-create-boleto...');
        
        const boletoResponse = await fetch(`${SUPABASE_URL}/functions/v1/banco-inter-create-boleto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            faturaId: codigoFatura,
            codigoFatura: codigoFatura,
            valorCobrado: total,
            dataVencimento: dataVencimentoFormatada,
            pagadorNome: nomeCliente,
            pagadorCpfCnpj: cpfCnpj,
            pagadorEndereco: {
              logradouro,
              numero,
              bairro: 'Centro',
              cidade: 'São Paulo',
              uf: 'SP',
              cep: cep || '01000-000',
            },
            multa: {
              tipo: 'PERCENTUAL',
              valor: multaPercentual,
            },
            juros: {
              tipo: 'PERCENTUAL_DIA',
              valor: jurosPercentual / 30, // Converter mensal para diário
            },
          }),
        });

        if (boletoResponse.ok) {
          boletoInfo = await boletoResponse.json();
          console.log('Boleto gerado com sucesso:', boletoInfo.nossoNumero);
        } else {
          const errorText = await boletoResponse.text();
          console.error('Erro ao gerar boleto:', errorText);
        }
      } catch (boletoError) {
        console.error('Erro ao gerar boleto:', boletoError);
        // Continua sem boleto se houver erro
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        codigoFatura,
        nomeCliente,
        cpfCnpj: formatCpfCnpj(cpfCnpj),
        totalItens: itens.length,
        valorTotal: total,
        valorTotalFormatado: `R$ ${formatCurrency(total)}`,
        dataVencimento,
        multaPercentual,
        jurosPercentual,
        faturaHtml: faturaBase64,
        boleto: boletoInfo ? {
          nossoNumero: boletoInfo.nossoNumero,
          linhaDigitavel: boletoInfo.linhaDigitavel,
          codigoBarras: boletoInfo.codigoBarras,
          pdf: boletoInfo.pdf,
          status: boletoInfo.status,
        } : null,
        message: boletoInfo 
          ? 'Fatura e boleto gerados com sucesso' 
          : 'Fatura gerada com sucesso (boleto não gerado)',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao gerar fatura/boleto:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
