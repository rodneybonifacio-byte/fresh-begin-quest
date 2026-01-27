import { useState } from "react";
import { Copy, Check, Code, Package, Zap, ShoppingCart } from "lucide-react";

export default function WidgetDocs() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const htmlCode = `<!-- Adicione onde deseja exibir o widget -->
<div id="brhub-cotacao"></div>

<!-- Inclua o script do widget -->
<script src="https://brhubenvios.com.br/widget/brhub-cotacao.js"></script>

<!-- Inicialize o widget -->
<script>
  BRHUBCotacao.init({
    cepOrigem: '01310100', // CEP fixo da sua loja (opcional)
    titulo: 'Calcular Frete',
    onSelect: function(opcao) {
      console.log('Frete selecionado:', opcao);
      // Use opcao.preco, opcao.prazo, opcao.servico, etc.
    }
  });
</script>`;

  const wordpressCode = `// Adicione no functions.php do seu tema ou use plugin "Insert Headers and Footers"

// Opção 1: Via shortcode
function brhub_cotacao_shortcode() {
    return '
    <div id="brhub-cotacao"></div>
    <script src="https://brhubenvios.com.br/widget/brhub-cotacao.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            BRHUBCotacao.init({
                cepOrigem: "01310100"
            });
        });
    </script>
    ';
}
add_shortcode('brhub_cotacao', 'brhub_cotacao_shortcode');

// Use o shortcode [brhub_cotacao] em qualquer página`;

  const woocommerceCode = `// Adicione no functions.php para exibir na página do produto

add_action('woocommerce_after_add_to_cart_form', 'brhub_shipping_calculator');

function brhub_shipping_calculator() {
    global $product;
    
    // Pegar dimensões do produto
    $weight = $product->get_weight() ? $product->get_weight() * 1000 : 500; // gramas
    $height = $product->get_height() ?: 10;
    $width = $product->get_width() ?: 15;
    $length = $product->get_length() ?: 20;
    $price = $product->get_price();
    
    echo '<div id="brhub-cotacao" style="margin-top: 20px;"></div>';
    echo '<script src="https://brhubenvios.com.br/widget/brhub-cotacao.js"></script>';
    echo '<script>
        document.addEventListener("DOMContentLoaded", function() {
            BRHUBCotacao.init({
                cepOrigem: "01310100",
                peso: ' . $weight . ',
                altura: ' . $height . ',
                largura: ' . $width . ',
                comprimento: ' . $length . ',
                valorDeclarado: ' . $price . ',
                titulo: "Calcule o frete",
                onSelect: function(opcao) {
                    alert("Frete: " + opcao.servico + " - R$ " + opcao.preco);
                }
            });
        });
    </script>';
}`;

  const configOptions = [
    { nome: 'containerId', tipo: 'string', obrigatorio: false, descricao: 'ID do elemento HTML (padrão: "brhub-cotacao")' },
    { nome: 'cepOrigem', tipo: 'string', obrigatorio: false, descricao: 'CEP de origem fixo (sua loja)' },
    { nome: 'titulo', tipo: 'string', obrigatorio: false, descricao: 'Título do widget (padrão: "Calcular Frete")' },
    { nome: 'peso', tipo: 'number', obrigatorio: false, descricao: 'Peso pré-definido em gramas' },
    { nome: 'altura', tipo: 'number', obrigatorio: false, descricao: 'Altura pré-definida em cm' },
    { nome: 'largura', tipo: 'number', obrigatorio: false, descricao: 'Largura pré-definida em cm' },
    { nome: 'comprimento', tipo: 'number', obrigatorio: false, descricao: 'Comprimento pré-definido em cm' },
    { nome: 'valorDeclarado', tipo: 'number', obrigatorio: false, descricao: 'Valor declarado para seguro' },
    { nome: 'onSelect', tipo: 'function', obrigatorio: false, descricao: 'Callback quando usuário seleciona uma opção' },
    { nome: 'onError', tipo: 'function', obrigatorio: false, descricao: 'Callback quando ocorre erro' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900">BRHUB Widget</h1>
              <p className="text-xs text-slate-500">Documentação de Integração</p>
            </div>
          </div>
          <a 
            href="https://brhubenvios.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Acessar Painel →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Intro */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Widget de Cotação de Frete
          </h2>
          <p className="text-lg text-slate-600 mb-6">
            Integre o calculador de frete do BRHUB Envios em qualquer site com apenas algumas linhas de código.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <Zap className="w-8 h-8 text-yellow-500 mb-2" />
              <h3 className="font-semibold text-slate-900">Fácil Instalação</h3>
              <p className="text-sm text-slate-600">Apenas 3 linhas de código para começar</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <Code className="w-8 h-8 text-blue-500 mb-2" />
              <h3 className="font-semibold text-slate-900">Personalizável</h3>
              <p className="text-sm text-slate-600">Configure cores, campos e callbacks</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <ShoppingCart className="w-8 h-8 text-green-500 mb-2" />
              <h3 className="font-semibold text-slate-900">E-commerce Ready</h3>
              <p className="text-sm text-slate-600">Integra com WooCommerce, Shopify e mais</p>
            </div>
          </div>
        </section>

        {/* Instalação Básica */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Instalação Básica (HTML)
          </h3>
          
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
              <span className="text-sm text-slate-400">HTML</span>
              <button 
                onClick={() => copyToClipboard(htmlCode, 'html')}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {copiedSection === 'html' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'html' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto">
              <code>{htmlCode}</code>
            </pre>
          </div>
        </section>

        {/* WordPress */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            WordPress (Shortcode)
          </h3>
          
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
              <span className="text-sm text-slate-400">PHP (functions.php)</span>
              <button 
                onClick={() => copyToClipboard(wordpressCode, 'wordpress')}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {copiedSection === 'wordpress' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'wordpress' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto">
              <code>{wordpressCode}</code>
            </pre>
          </div>
        </section>

        {/* WooCommerce */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            WooCommerce (Página do Produto)
          </h3>
          
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
              <span className="text-sm text-slate-400">PHP (functions.php)</span>
              <button 
                onClick={() => copyToClipboard(woocommerceCode, 'woocommerce')}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {copiedSection === 'woocommerce' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'woocommerce' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto">
              <code>{woocommerceCode}</code>
            </pre>
          </div>
        </section>

        {/* Opções de Configuração */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Opções de Configuração
          </h3>
          
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Parâmetro</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Obrigatório</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {configOptions.map((opt, i) => (
                  <tr key={opt.nome} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-mono text-blue-600">{opt.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{opt.tipo}</td>
                    <td className="px-4 py-3">
                      {opt.obrigatorio ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Sim</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{opt.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Demo */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Demonstração
          </h3>
          <div className="bg-slate-100 p-8 rounded-xl flex justify-center">
            <div id="brhub-cotacao-demo" className="w-full max-w-md">
              {/* Widget será carregado aqui via script externo */}
              <div className="bg-white p-6 rounded-xl border shadow text-center">
                <Package className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-slate-600 text-sm">
                  O widget será exibido aqui quando você publicar e configurar com suas credenciais.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Suporte */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-slate-900 mb-2">Precisa de ajuda?</h3>
          <p className="text-slate-600 text-sm mb-4">
            Entre em contato com nosso suporte para obter sua API Key ou tirar dúvidas sobre a integração.
          </p>
          <a 
            href="https://wa.me/5511999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar com Suporte
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} BRHUB Envios. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
