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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-orange-600">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-purple-200 shadow-lg sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-purple-900">BRHUB Widget</h1>
              <p className="text-sm text-purple-600 font-medium">Documentação de Integração</p>
            </div>
          </div>
          <a 
            href="https://brhubenvios.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105"
          >
            Acessar Painel →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Intro */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Widget de Cotação de Frete
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl">
            Integre o calculador de frete do BRHUB Envios em qualquer site com apenas algumas linhas de código.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 border border-purple-100">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg text-purple-900 mb-2">Fácil Instalação</h3>
              <p className="text-purple-600">Apenas 3 linhas de código para começar</p>
            </div>
            <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 border border-purple-100">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Code className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg text-purple-900 mb-2">Personalizável</h3>
              <p className="text-purple-600">Configure cores, campos e callbacks</p>
            </div>
            <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 border border-purple-100">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg text-purple-900 mb-2">E-commerce Ready</h3>
              <p className="text-purple-600">Integra com WooCommerce, Shopify e mais</p>
            </div>
          </div>
        </section>

        {/* Instalação Básica */}
        <section className="mb-12 bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-purple-600 to-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">1</span>
            Instalação Básica (HTML)
          </h3>
          
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <span className="text-sm text-orange-400 font-medium">HTML</span>
              <button 
                onClick={() => copyToClipboard(htmlCode, 'html')}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-gray-700"
              >
                {copiedSection === 'html' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'html' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-5 text-sm text-gray-300 overflow-x-auto font-mono">
              <code>{htmlCode}</code>
            </pre>
          </div>
        </section>

        {/* WordPress */}
        <section className="mb-12 bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-purple-600 to-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">2</span>
            WordPress (Shortcode)
          </h3>
          
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <span className="text-sm text-purple-400 font-medium">PHP (functions.php)</span>
              <button 
                onClick={() => copyToClipboard(wordpressCode, 'wordpress')}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-gray-700"
              >
                {copiedSection === 'wordpress' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'wordpress' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-5 text-sm text-gray-300 overflow-x-auto font-mono">
              <code>{wordpressCode}</code>
            </pre>
          </div>
        </section>

        {/* WooCommerce */}
        <section className="mb-12 bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-purple-600 to-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">3</span>
            WooCommerce (Página do Produto)
          </h3>
          
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <span className="text-sm text-green-400 font-medium">PHP (functions.php)</span>
              <button 
                onClick={() => copyToClipboard(woocommerceCode, 'woocommerce')}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-gray-700"
              >
                {copiedSection === 'woocommerce' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'woocommerce' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-5 text-sm text-gray-300 overflow-x-auto font-mono">
              <code>{woocommerceCode}</code>
            </pre>
          </div>
        </section>

        {/* Opções de Configuração */}
        <section className="mb-12 bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-purple-900 mb-6">
            Opções de Configuração
          </h3>
          
          <div className="bg-white rounded-xl border border-purple-100 overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-purple-50 to-orange-50 border-b border-purple-100">
                <tr>
                  <th className="text-left px-4 py-4 font-bold text-purple-900">Parâmetro</th>
                  <th className="text-left px-4 py-4 font-bold text-purple-900">Tipo</th>
                  <th className="text-left px-4 py-4 font-bold text-purple-900">Obrigatório</th>
                  <th className="text-left px-4 py-4 font-bold text-purple-900">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {configOptions.map((opt, i) => (
                  <tr key={opt.nome} className={`${i % 2 === 0 ? 'bg-white' : 'bg-purple-50/50'} hover:bg-purple-50 transition-colors`}>
                    <td className="px-4 py-3 font-mono text-purple-600 font-medium">{opt.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{opt.tipo}</td>
                    <td className="px-4 py-3">
                      {opt.obrigatorio ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Sim</span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{opt.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Demo */}
        <section className="mb-12 bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-purple-900 mb-6">
            Demonstração
          </h3>
          <div className="bg-gradient-to-br from-purple-100 to-orange-100 p-8 rounded-xl flex justify-center">
            <div id="brhub-cotacao-demo" className="w-full max-w-md">
              {/* Widget será carregado aqui via script externo */}
              <div className="bg-white p-8 rounded-2xl border-2 border-purple-200 shadow-lg text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Package className="w-9 h-9 text-white" />
                </div>
                <p className="text-purple-700 font-medium">
                  O widget será exibido aqui quando você publicar e configurar com suas credenciais.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Suporte */}
        <section className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 shadow-xl">
          <h3 className="font-bold text-xl text-white mb-3">Precisa de ajuda?</h3>
          <p className="text-green-100 mb-6">
            Entre em contato com nosso suporte para obter sua API Key ou tirar dúvidas sobre a integração.
          </p>
          <a 
            href="https://wa.me/5511911544095?text=Olá! Preciso de ajuda com o widget de cotação de frete." 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-green-600 px-6 py-3 rounded-xl text-lg font-bold hover:bg-green-50 transition-all hover:scale-105 shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            (11) 91154-4095 - Falar com Suporte
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-purple-900/50 backdrop-blur mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p className="text-purple-200 font-medium">
            © {new Date().getFullYear()} BRHUB Envios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
