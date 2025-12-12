import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Package, Scale, Calculator, Truck, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCotacao } from '../../hooks/useCotacao';
import { useAddress } from '../../hooks/useAddress';
import { useCliente } from '../../hooks/useCliente';
import { useAuth } from '../../providers/AuthContext';
import { useLoadingSpinner } from '../../providers/LoadingSpinnerContext';
import { formatCep, removeNegativo } from '../../utils/lib.formats';
import { formatCurrency } from '../../utils/formatCurrency';
import type { IEmbalagem } from '../../types/IEmbalagem';
import type { ICotacaoMinimaResponse } from '../../types/ICotacao';
import { ModalListaRemetente } from '../../pages/private/remetente/ModalListaRemetente';

interface Remetente {
  id: string;
  nome: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    cep?: string;
  };
}

export const MobileSimulador = () => {
  const navigate = useNavigate();
  const { setIsLoading } = useLoadingSpinner();
  const { user: userPayload } = useAuth();
  const { onBuscaCep, response: enderecoDestino } = useAddress();
  const { data: cliente } = useCliente(userPayload?.clienteId || '');
  const { onGetCotacaoCorreios, cotacoes, isLoadingCotacao } = useCotacao();

  const [dimensoes, setDimensoes] = useState<Partial<IEmbalagem>>({});
  const [selectedEmbalagem, setSelectedEmbalagem] = useState<IEmbalagem | null>(null);
  const [valorDeclarado, setValorDeclarado] = useState('');
  const [cepDestino, setCepDestino] = useState('');
  const [remetenteSelecionado, setRemetenteSelecionado] = useState<Remetente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Inicializa o remetente com o cliente quando carregado
  useEffect(() => {
    if (cliente && !remetenteSelecionado) {
      setRemetenteSelecionado(cliente as Remetente);
    }
  }, [cliente, remetenteSelecionado]);

  useEffect(() => {
    if (dimensoes.altura && dimensoes.largura && dimensoes.comprimento && dimensoes.peso) {
      setSelectedEmbalagem({
        id: '',
        descricao: '',
        altura: dimensoes.altura,
        largura: dimensoes.largura,
        comprimento: dimensoes.comprimento,
        peso: dimensoes.peso,
        diametro: 0,
        formatoObjeto: 'CAIXA_PACOTE',
      });
    }
  }, [dimensoes]);

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    setCepDestino(formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      await onBuscaCep(formatted, setIsLoading);
    }
  };

  const handleCalcular = async () => {
    if (!remetenteSelecionado?.endereco?.cep || !cepDestino || !selectedEmbalagem) return;
    
    setIsLoading(true);
    await onGetCotacaoCorreios(
      remetenteSelecionado.endereco.cep,
      cepDestino,
      selectedEmbalagem,
      valorDeclarado,
      'N',
      remetenteSelecionado
    );
    setIsLoading(false);
  };

  const canCalculate = cepDestino && selectedEmbalagem && remetenteSelecionado;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Simular Frete</h1>
            <p className="text-xs text-muted-foreground">Calcule o valor do seu envio</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Origin Card - Seleção de Remetente */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-card rounded-2xl p-4 border border-border text-left active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origem (Remetente)</p>
                {remetenteSelecionado ? (
                  <>
                    <p className="font-semibold text-foreground">{remetenteSelecionado.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {remetenteSelecionado.endereco?.cep} - {remetenteSelecionado.endereco?.localidade}/{remetenteSelecionado.endereco?.uf}
                    </p>
                  </>
                ) : (
                  <p className="font-medium text-primary">Selecionar remetente</p>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>

        <ModalListaRemetente
          isOpen={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onSelect={(remetente) => {
            setRemetenteSelecionado(remetente);
            setIsModalOpen(false);
          }}
        />

        {/* Destination Input */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <p className="font-medium text-foreground">Destino</p>
          </div>
          <input
            type="text"
            placeholder="Digite o CEP de destino"
            value={cepDestino}
            onChange={(e) => handleCepChange(e.target.value)}
            maxLength={9}
            className="w-full px-4 py-4 rounded-xl border border-input bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {enderecoDestino && (
            <p className="text-xs text-muted-foreground mt-2">
              {enderecoDestino.logradouro}, {enderecoDestino.bairro} - {enderecoDestino.localidade}/{enderecoDestino.uf}
            </p>
          )}
        </div>

        {/* Dimensions */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Package className="h-5 w-5 text-purple-500" />
            </div>
            <p className="font-medium text-foreground">Dimensões (cm)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Altura</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => setDimensoes(prev => ({ ...prev, altura: removeNegativo(Number(e.target.value)) }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Largura</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => setDimensoes(prev => ({ ...prev, largura: removeNegativo(Number(e.target.value)) }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Comprimento</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => setDimensoes(prev => ({ ...prev, comprimento: removeNegativo(Number(e.target.value)) }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Peso (g)</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => setDimensoes(prev => ({ ...prev, peso: removeNegativo(Number(e.target.value)) }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Valor Declarado */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <Scale className="h-5 w-5 text-green-500" />
            </div>
            <p className="font-medium text-foreground">Valor Declarado (opcional)</p>
          </div>
          <input
            type="text"
            placeholder="R$ 0,00"
            value={valorDeclarado}
            onChange={(e) => setValorDeclarado(formatCurrency(e.target.value))}
            className="w-full px-4 py-4 rounded-xl border border-input bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalcular}
          disabled={!canCalculate || isLoadingCotacao}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform shadow-lg"
        >
          <Calculator className="h-5 w-5" />
          {isLoadingCotacao ? 'Calculando...' : 'Calcular Frete'}
        </button>

        {/* Results */}
        {cotacoes && cotacoes.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 mt-6 mb-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Opções de Frete</h2>
            </div>
            {cotacoes.map((cotacao: ICotacaoMinimaResponse, index: number) => (
              <div
                key={index}
                onClick={() => navigate('/app/emissao/adicionar')}
                className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-4 active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">{cotacao.nomeServico}</p>
                    <p className="text-sm text-muted-foreground">
                      {cotacao.prazo} {Number(cotacao.prazo) === 1 ? 'dia útil' : 'dias úteis'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      R$ {cotacao.preco.replace('R$', '').trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">Clique para emitir</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!cotacoes || cotacoes.length === 0) && !isLoadingCotacao && (
          <div className="bg-muted/50 rounded-2xl p-8 text-center mt-4">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Preencha os dados acima para ver as opções de frete disponíveis
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
