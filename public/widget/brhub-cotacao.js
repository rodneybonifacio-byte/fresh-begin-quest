/**
 * BRHUB Envios - Widget de Cotação de Frete
 * Versão: 1.0.0
 * 
 * Como usar:
 * 1. Adicione o container no HTML: <div id="brhub-cotacao"></div>
 * 2. Inclua este script: <script src="https://envios.brhubb.com.br/widget/brhub-cotacao.js"></script>
 * 3. Inicialize o widget: BRHUBCotacao.init({ apiKey: 'SUA_API_KEY', email: 'seu@email.com', senha: 'suaSenha' });
 */

(function(global) {
  'use strict';

  const WIDGET_VERSION = '1.0.0';
  const API_BASE_URL = 'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1';

  // Estilos do widget
  const WIDGET_STYLES = `
    .brhub-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 400px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .brhub-widget * {
      box-sizing: border-box;
    }
    .brhub-widget-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brhub-widget-title svg {
      width: 24px;
      height: 24px;
      color: #3b82f6;
    }
    .brhub-widget-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .brhub-widget-row {
      display: flex;
      gap: 12px;
    }
    .brhub-widget-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .brhub-widget-label {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
    }
    .brhub-widget-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .brhub-widget-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .brhub-widget-input::placeholder {
      color: #94a3b8;
    }
    .brhub-widget-btn {
      width: 100%;
      padding: 12px 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 8px;
    }
    .brhub-widget-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .brhub-widget-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .brhub-widget-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .brhub-widget-spinner {
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
    .brhub-widget-results {
      margin-top: 16px;
    }
    .brhub-widget-results-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .brhub-widget-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .brhub-widget-option:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }
    .brhub-widget-option.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .brhub-widget-option-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .brhub-widget-option-name {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .brhub-widget-option-carrier {
      font-size: 12px;
      color: #64748b;
    }
    .brhub-widget-option-details {
      text-align: right;
    }
    .brhub-widget-option-price {
      font-size: 16px;
      font-weight: 700;
      color: #059669;
    }
    .brhub-widget-option-deadline {
      font-size: 12px;
      color: #64748b;
    }
    .brhub-widget-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 12px;
    }
    .brhub-widget-empty {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 14px;
    }
    .brhub-widget-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .brhub-widget-footer a {
      font-size: 11px;
      color: #94a3b8;
      text-decoration: none;
    }
    .brhub-widget-footer a:hover {
      color: #3b82f6;
    }
  `;

  // Template HTML do widget
  function getWidgetHTML(config) {
    return `
      <div class="brhub-widget" id="brhub-widget-container">
        <div class="brhub-widget-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          ${config.titulo || 'Calcular Frete'}
        </div>
        
        <form class="brhub-widget-form" id="brhub-form">
          <div class="brhub-widget-row">
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">CEP de Origem</label>
              <input type="text" class="brhub-widget-input" id="brhub-cep-origem" 
                     placeholder="00000-000" maxlength="9" ${config.cepOrigem ? `value="${config.cepOrigem}" readonly` : ''}>
            </div>
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">CEP de Destino</label>
              <input type="text" class="brhub-widget-input" id="brhub-cep-destino" 
                     placeholder="00000-000" maxlength="9">
            </div>
          </div>
          
          <div class="brhub-widget-row">
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">Peso (g)</label>
              <input type="number" class="brhub-widget-input" id="brhub-peso" 
                     placeholder="Ex: 500" min="1" ${config.peso ? `value="${config.peso}"` : ''}>
            </div>
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">Valor (R$)</label>
              <input type="number" class="brhub-widget-input" id="brhub-valor" 
                     placeholder="Ex: 100" min="0" step="0.01" ${config.valorDeclarado ? `value="${config.valorDeclarado}"` : ''}>
            </div>
          </div>
          
          <div class="brhub-widget-row">
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">Altura (cm)</label>
              <input type="number" class="brhub-widget-input" id="brhub-altura" 
                     placeholder="2" min="1" ${config.altura ? `value="${config.altura}"` : ''}>
            </div>
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">Largura (cm)</label>
              <input type="number" class="brhub-widget-input" id="brhub-largura" 
                     placeholder="11" min="1" ${config.largura ? `value="${config.largura}"` : ''}>
            </div>
            <div class="brhub-widget-field">
              <label class="brhub-widget-label">Compr. (cm)</label>
              <input type="number" class="brhub-widget-input" id="brhub-comprimento" 
                     placeholder="16" min="1" ${config.comprimento ? `value="${config.comprimento}"` : ''}>
            </div>
          </div>
          
          <button type="submit" class="brhub-widget-btn" id="brhub-btn-calcular">
            Calcular Frete
          </button>
        </form>
        
        <div id="brhub-results"></div>
        
        <div class="brhub-widget-footer">
          <a href="https://envios.brhubb.com.br" target="_blank">Powered by BRHUB Envios</a>
        </div>
      </div>
    `;
  }

  // Classe principal do Widget
  class BRHUBCotacao {
    constructor() {
      this.config = {};
      this.selectedOption = null;
      this.results = [];
    }

    init(options = {}) {
      if (!options.apiKey) {
        console.error('[BRHUB Widget] API Key é obrigatória');
        return;
      }
      if (!options.email || !options.senha) {
        console.error('[BRHUB Widget] Email e senha do cliente são obrigatórios');
        return;
      }

      this.config = {
        containerId: options.containerId || 'brhub-cotacao',
        apiKey: options.apiKey,
        email: options.email,
        senha: options.senha,
        titulo: options.titulo || 'Calcular Frete',
        cepOrigem: options.cepOrigem || '',
        peso: options.peso || '',
        altura: options.altura || '',
        largura: options.largura || '',
        comprimento: options.comprimento || '',
        valorDeclarado: options.valorDeclarado || '',
        onSelect: options.onSelect || null,
        onError: options.onError || null,
      };

      this.injectStyles();
      this.render();
      this.bindEvents();

      console.log(`[BRHUB Widget] Inicializado v${WIDGET_VERSION}`);
    }

    injectStyles() {
      if (document.getElementById('brhub-widget-styles')) return;
      
      const styleEl = document.createElement('style');
      styleEl.id = 'brhub-widget-styles';
      styleEl.textContent = WIDGET_STYLES;
      document.head.appendChild(styleEl);
    }

    render() {
      const container = document.getElementById(this.config.containerId);
      if (!container) {
        console.error(`[BRHUB Widget] Container #${this.config.containerId} não encontrado`);
        return;
      }
      container.innerHTML = getWidgetHTML(this.config);
    }

    bindEvents() {
      const form = document.getElementById('brhub-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.calcular();
        });
      }

      // Máscara de CEP
      ['brhub-cep-origem', 'brhub-cep-destino'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
              value = value.slice(0, 5) + '-' + value.slice(5, 8);
            }
            e.target.value = value;
          });
        }
      });
    }

    async calcular() {
      const btn = document.getElementById('brhub-btn-calcular');
      const resultsDiv = document.getElementById('brhub-results');

      // Coletar dados
      const cepOrigem = document.getElementById('brhub-cep-origem')?.value || this.config.cepOrigem;
      const cepDestino = document.getElementById('brhub-cep-destino')?.value;
      const peso = document.getElementById('brhub-peso')?.value || this.config.peso;
      const altura = document.getElementById('brhub-altura')?.value || this.config.altura;
      const largura = document.getElementById('brhub-largura')?.value || this.config.largura;
      const comprimento = document.getElementById('brhub-comprimento')?.value || this.config.comprimento;
      const valorDeclarado = document.getElementById('brhub-valor')?.value || this.config.valorDeclarado || 0;

      // Validar
      if (!cepOrigem || !cepDestino) {
        this.showError('Preencha os CEPs de origem e destino');
        return;
      }
      if (!peso || !altura || !largura || !comprimento) {
        this.showError('Preencha todas as dimensões');
        return;
      }

      // Loading
      btn.disabled = true;
      btn.innerHTML = '<span class="brhub-widget-loading"><span class="brhub-widget-spinner"></span>Calculando...</span>';
      resultsDiv.innerHTML = '';

      try {
        const response = await fetch(`${API_BASE_URL}/api-cotacao-widget`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            cepOrigem,
            cepDestino,
            peso: Number(peso),
            altura: Number(altura),
            largura: Number(largura),
            comprimento: Number(comprimento),
            valorDeclarado: Number(valorDeclarado),
            clienteEmail: this.config.email,
            clienteSenha: this.config.senha,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Erro ao calcular frete');
        }

        this.results = data.data.opcoes || [];
        this.renderResults();

      } catch (error) {
        console.error('[BRHUB Widget] Erro:', error);
        this.showError(error.message);
        if (this.config.onError) {
          this.config.onError(error);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Calcular Frete';
      }
    }

    renderResults() {
      const resultsDiv = document.getElementById('brhub-results');
      
      if (this.results.length === 0) {
        resultsDiv.innerHTML = '<div class="brhub-widget-empty">Nenhuma opção de frete disponível para esta rota.</div>';
        return;
      }

      let html = '<div class="brhub-widget-results">';
      html += `<div class="brhub-widget-results-title">${this.results.length} opção(ões) encontrada(s)</div>`;
      
      this.results.forEach((opcao, index) => {
        html += `
          <div class="brhub-widget-option" data-index="${index}">
            <div class="brhub-widget-option-info">
              <span class="brhub-widget-option-name">${opcao.servico}</span>
              <span class="brhub-widget-option-carrier">${opcao.transportadora}</span>
            </div>
            <div class="brhub-widget-option-details">
              <span class="brhub-widget-option-price">R$ ${opcao.preco}</span>
              <span class="brhub-widget-option-deadline">${opcao.prazoTexto}</span>
            </div>
          </div>
        `;
      });

      html += '</div>';
      resultsDiv.innerHTML = html;

      // Bind click events
      resultsDiv.querySelectorAll('.brhub-widget-option').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.index);
          this.selectOption(index);
        });
      });
    }

    selectOption(index) {
      this.selectedOption = this.results[index];
      
      // Visual feedback
      document.querySelectorAll('.brhub-widget-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
      });

      // Callback
      if (this.config.onSelect) {
        this.config.onSelect(this.selectedOption);
      }

      console.log('[BRHUB Widget] Opção selecionada:', this.selectedOption);
    }

    showError(message) {
      const resultsDiv = document.getElementById('brhub-results');
      resultsDiv.innerHTML = `<div class="brhub-widget-error">${message}</div>`;
    }

    getSelectedOption() {
      return this.selectedOption;
    }

    getResults() {
      return this.results;
    }
  }

  // Expor globalmente
  global.BRHUBCotacao = new BRHUBCotacao();

})(typeof window !== 'undefined' ? window : this);
