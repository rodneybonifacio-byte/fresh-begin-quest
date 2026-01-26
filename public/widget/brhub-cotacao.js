/**
 * BRHUB Envios - Widget de Cotação de Frete
 * Versão: 1.0.0
 * 
 * Widget embedável para cotação de frete em qualquer site.
 * Documentação: https://envios.brhubb.com.br/widget-docs
 * 
 * Uso simples:
 * 1. Adicione: <div id="brhub-cotacao"></div>
 * 2. Inclua: <script src="https://envios.brhubb.com.br/widget/brhub-cotacao.js"></script>
 * 3. Inicialize: BRHUBCotacao.init({ apiKey: 'SUA_API_KEY', cepOrigem: '01310100' });
 */
(function() {
  'use strict';

  // Configuração global
  const CONFIG = {
    API_URL: 'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/api-cotacao-widget',
    VERSION: '1.0.0'
  };

  // Estilos do widget
  const STYLES = `
    .brhub-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 400px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 20px;
      border: 1px solid #e5e7eb;
    }
    .brhub-widget * {
      box-sizing: border-box;
    }
    .brhub-widget-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brhub-widget-title svg {
      width: 24px;
      height: 24px;
      color: #2563eb;
    }
    .brhub-form-group {
      margin-bottom: 12px;
    }
    .brhub-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 4px;
    }
    .brhub-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .brhub-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .brhub-input::placeholder {
      color: #9ca3af;
    }
    .brhub-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .brhub-row-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .brhub-btn {
      width: 100%;
      padding: 12px 16px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 8px;
    }
    .brhub-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
    .brhub-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .brhub-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .brhub-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: brhub-spin 0.8s linear infinite;
    }
    @keyframes brhub-spin {
      to { transform: rotate(360deg); }
    }
    .brhub-results {
      margin-top: 16px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
    }
    .brhub-results-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    .brhub-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .brhub-option:hover {
      border-color: #2563eb;
      background: #f0f9ff;
    }
    .brhub-option.selected {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .brhub-option-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .brhub-option-name {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }
    .brhub-option-carrier {
      font-size: 12px;
      color: #6b7280;
    }
    .brhub-option-price-box {
      text-align: right;
    }
    .brhub-option-price {
      font-size: 16px;
      font-weight: 700;
      color: #059669;
    }
    .brhub-option-time {
      font-size: 12px;
      color: #6b7280;
    }
    .brhub-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 12px;
    }
    .brhub-powered {
      text-align: center;
      margin-top: 16px;
      font-size: 11px;
      color: #9ca3af;
    }
    .brhub-powered a {
      color: #2563eb;
      text-decoration: none;
    }
    .brhub-powered a:hover {
      text-decoration: underline;
    }
  `;

  // Template HTML do widget
  function getTemplate(config) {
    const showCepOrigem = !config.cepOrigem;
    const showDimensoes = !config.peso || !config.altura || !config.largura || !config.comprimento;
    
    return `
      <div class="brhub-widget">
        <h3 class="brhub-widget-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          ${config.titulo || 'Calcular Frete'}
        </h3>
        
        <form id="brhub-form">
          <div class="brhub-row">
            ${showCepOrigem ? `
            <div class="brhub-form-group">
              <label class="brhub-label">CEP Origem</label>
              <input type="text" class="brhub-input" id="brhub-cep-origem" placeholder="00000-000" maxlength="9" required>
            </div>
            ` : ''}
            <div class="brhub-form-group" ${!showCepOrigem ? 'style="grid-column: span 2"' : ''}>
              <label class="brhub-label">CEP Destino</label>
              <input type="text" class="brhub-input" id="brhub-cep-destino" placeholder="00000-000" maxlength="9" required>
            </div>
          </div>
          
          ${showDimensoes ? `
          <div class="brhub-row-4">
            <div class="brhub-form-group">
              <label class="brhub-label">Peso (g)</label>
              <input type="number" class="brhub-input" id="brhub-peso" placeholder="500" min="1" required>
            </div>
            <div class="brhub-form-group">
              <label class="brhub-label">Alt (cm)</label>
              <input type="number" class="brhub-input" id="brhub-altura" placeholder="10" min="1" required>
            </div>
            <div class="brhub-form-group">
              <label class="brhub-label">Larg (cm)</label>
              <input type="number" class="brhub-input" id="brhub-largura" placeholder="15" min="1" required>
            </div>
            <div class="brhub-form-group">
              <label class="brhub-label">Comp (cm)</label>
              <input type="number" class="brhub-input" id="brhub-comprimento" placeholder="20" min="1" required>
            </div>
          </div>
          ` : ''}
          
          <button type="submit" class="brhub-btn" id="brhub-submit">
            Calcular Frete
          </button>
        </form>
        
        <div id="brhub-results"></div>
        
        <div class="brhub-powered">
          Powered by <a href="https://envios.brhubb.com.br" target="_blank" rel="noopener">BRHUB Envios</a>
        </div>
      </div>
    `;
  }

  // Classe principal do Widget
  class BRHUBCotacaoWidget {
    constructor() {
      this.config = {};
      this.selectedOption = null;
    }

    init(options = {}) {
      // Validar API Key obrigatória
      if (!options.apiKey) {
        console.error('[BRHUB Widget] apiKey é obrigatória');
        return;
      }

      this.config = {
        apiKey: options.apiKey,
        containerId: options.containerId || 'brhub-cotacao',
        cepOrigem: options.cepOrigem || '',
        titulo: options.titulo || 'Calcular Frete',
        peso: options.peso || null,
        altura: options.altura || null,
        largura: options.largura || null,
        comprimento: options.comprimento || null,
        valorDeclarado: options.valorDeclarado || 0,
        onSelect: options.onSelect || null,
        onError: options.onError || null
      };

      this.render();
      this.attachEvents();
    }

    render() {
      // Injetar estilos
      if (!document.getElementById('brhub-widget-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'brhub-widget-styles';
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
      }

      // Renderizar widget
      const container = document.getElementById(this.config.containerId);
      if (!container) {
        console.error('[BRHUB Widget] Container não encontrado:', this.config.containerId);
        return;
      }

      container.innerHTML = getTemplate(this.config);
    }

    attachEvents() {
      const form = document.getElementById('brhub-form');
      if (!form) return;

      // Máscara de CEP
      const cepInputs = form.querySelectorAll('input[id^="brhub-cep"]');
      cepInputs.forEach(input => {
        input.addEventListener('input', (e) => {
          let value = e.target.value.replace(/\D/g, '');
          if (value.length > 5) {
            value = value.substring(0, 5) + '-' + value.substring(5, 8);
          }
          e.target.value = value;
        });
      });

      // Submit do form
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.calcularFrete();
      });
    }

    async calcularFrete() {
      const btn = document.getElementById('brhub-submit');
      const resultsDiv = document.getElementById('brhub-results');
      
      // Estado de loading
      btn.disabled = true;
      btn.innerHTML = '<span class="brhub-loading"><span class="brhub-spinner"></span> Calculando...</span>';
      resultsDiv.innerHTML = '';

      try {
        // Coletar dados
        const cepOrigemEl = document.getElementById('brhub-cep-origem');
        const cepOrigem = cepOrigemEl ? cepOrigemEl.value : this.config.cepOrigem;
        const cepDestino = document.getElementById('brhub-cep-destino').value;
        
        const pesoEl = document.getElementById('brhub-peso');
        const alturaEl = document.getElementById('brhub-altura');
        const larguraEl = document.getElementById('brhub-largura');
        const comprimentoEl = document.getElementById('brhub-comprimento');

        const payload = {
          cepOrigem: cepOrigem.replace(/\D/g, ''),
          cepDestino: cepDestino.replace(/\D/g, ''),
          peso: pesoEl ? Number(pesoEl.value) : this.config.peso,
          altura: alturaEl ? Number(alturaEl.value) : this.config.altura,
          largura: larguraEl ? Number(larguraEl.value) : this.config.largura,
          comprimento: comprimentoEl ? Number(comprimentoEl.value) : this.config.comprimento,
          valorDeclarado: this.config.valorDeclarado
        };

        // Chamar API
        const response = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Erro ao calcular frete');
        }

        this.renderResults(data.data.opcoes);

      } catch (error) {
        console.error('[BRHUB Widget] Erro:', error);
        resultsDiv.innerHTML = `<div class="brhub-error">${error.message}</div>`;
        
        if (this.config.onError) {
          this.config.onError(error);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Calcular Frete';
      }
    }

    renderResults(opcoes) {
      const resultsDiv = document.getElementById('brhub-results');
      
      if (!opcoes || opcoes.length === 0) {
        resultsDiv.innerHTML = '<div class="brhub-error">Nenhuma opção de frete encontrada para este destino.</div>';
        return;
      }

      let html = `
        <div class="brhub-results">
          <div class="brhub-results-title">Opções de Envio (${opcoes.length})</div>
      `;

      opcoes.forEach((opcao, index) => {
        html += `
          <div class="brhub-option" data-index="${index}">
            <div class="brhub-option-info">
              <span class="brhub-option-name">${opcao.servico}</span>
              <span class="brhub-option-carrier">${opcao.transportadora}</span>
            </div>
            <div class="brhub-option-price-box">
              <span class="brhub-option-price">R$ ${opcao.preco}</span>
              <span class="brhub-option-time">${opcao.prazoTexto}</span>
            </div>
          </div>
        `;
      });

      html += '</div>';
      resultsDiv.innerHTML = html;

      // Eventos de seleção
      const optionEls = resultsDiv.querySelectorAll('.brhub-option');
      optionEls.forEach((el) => {
        el.addEventListener('click', () => {
          // Remover seleção anterior
          optionEls.forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');

          const index = parseInt(el.dataset.index);
          this.selectedOption = opcoes[index];

          if (this.config.onSelect) {
            this.config.onSelect(this.selectedOption);
          }
        });
      });
    }

    getSelectedOption() {
      return this.selectedOption;
    }
  }

  // Expor globalmente
  window.BRHUBCotacao = new BRHUBCotacaoWidget();

})();
