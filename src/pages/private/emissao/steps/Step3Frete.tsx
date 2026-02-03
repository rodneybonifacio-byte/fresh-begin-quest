import { Truck, BadgePercent, AlertTriangle, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { ListaFretesDisponiveis } from '../ListaFretesDisponiveis';
import { useCotacao } from '../../../../hooks/useCotacao';
import type { ICotacaoMinimaResponse } from '../../../../types/ICotacao';
import { toast } from 'sonner';
import { formatCurrency } from '../../../../utils/formatCurrency';

interface Step3FreteProps {
  onNext: () => void;
  onBack: () => void;
  clienteSelecionado: any;
  cotacaoSelecionado?: ICotacaoMinimaResponse;
  setCotacaoSelecionado: (c: ICotacaoMinimaResponse | undefined) => void;
  isLogisticaReversa?: boolean;
}
export const Step3Frete = ({
  onNext,
  onBack,
  clienteSelecionado,
  cotacaoSelecionado,
  setCotacaoSelecionado,
  isLogisticaReversa = false
}: Step3FreteProps) => {
  const {
    setValue,
    clearErrors,
    trigger,
    getValues
  } = useFormContext();
  
  // Estado local para valor da nota fiscal
  const [valorNotaFiscal, setValorNotaFiscal] = useState<string>('');
  const {
    onGetCotacaoCorreios,
    cotacoes,
    isLoadingCotacao
  } = useCotacao();

  // Obter quantidade de volumes do formulário
  const quantidadeVolumes = getValues('embalagem.quantidadeVolumes') || 1;
  const isMultiVolume = quantidadeVolumes > 1;

  // Função para verificar se é Correios
  const isCorreios = (cotacao: ICotacaoMinimaResponse) => {
    const nomeServico = cotacao.nomeServico?.toLowerCase() || '';
    const imagem = cotacao.imagem?.toLowerCase() || '';
    return !nomeServico.includes('rodonaves') && !imagem.includes('rodonaves');
  };

  // Handler para seleção com validação de multi-volume
  const handleSelectCotacao = (cotacao: ICotacaoMinimaResponse) => {
    if (isMultiVolume && isCorreios(cotacao)) {
      toast.error(
        'Os Correios não permitem envio de múltiplos volumes. Por favor, selecione Rodonaves ou reduza para 1 volume.',
        { duration: 5000 }
      );
      return;
    }
    setCotacaoSelecionado(cotacao);
    setValue('cotacao.codigoServico', cotacao.codigoServico);
    clearErrors('cotacao');
  };

  useEffect(() => {
    const calcularFrete = async () => {
      console.log('🚚 Iniciando cálculo de frete...');
      const formData = getValues();
      console.log('📦 Dados do formulário:', formData);

      // Pega os dados da embalagem do formulário
      const embalagemData = formData.embalagem;
      const destinatarioData = formData.destinatario;
      if (!embalagemData || !clienteSelecionado || !destinatarioData?.endereco?.cep) {
        console.error('❌ Dados insuficientes para cotação:', {
          embalagem: !!embalagemData,
          cliente: !!clienteSelecionado,
          destinatarioCep: !!destinatarioData?.endereco?.cep
        });
        return;
      }
      const embalagem = {
        altura: embalagemData.altura,
        largura: embalagemData.largura,
        comprimento: embalagemData.comprimento,
        peso: embalagemData.peso,
        diametro: 0
      };
      console.log('📮 Cotação:', {
        cepOrigem: clienteSelecionado.endereco?.cep,
        cepDestino: destinatarioData.endereco.cep,
        embalagem,
        remetente: clienteSelecionado
      });
      await onGetCotacaoCorreios(clienteSelecionado.endereco?.cep || clienteSelecionado.cep, destinatarioData.endereco.cep, embalagem as any, '0', isLogisticaReversa ? 'S' : 'N', clienteSelecionado);
      console.log('✅ Cotação finalizada com logisticaReversa:', isLogisticaReversa ? 'S' : 'N');
    };
    calcularFrete();
  }, [clienteSelecionado, getValues, isLogisticaReversa]);

  // Log quando as cotações mudam
  useEffect(() => {
    if (cotacoes) {
      console.log('📋 Cotações atualizadas no Step3:', {
        quantidade: cotacoes.length,
        servicos: cotacoes.map(c => c.nomeServico)
      });
    }
  }, [cotacoes]);

  // Verificar se frete selecionado exige nota fiscal (Rodonaves)
  const requiresNotaFiscal = cotacaoSelecionado?.isNotaFiscal === true;

  const handleValorNotaFiscalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = formatCurrency(e.target.value);
    setValorNotaFiscal(valor);
    setValue('valorNotaFiscal', valor);
    
    // Limpa erro se preencheu
    if (valor && valor.trim() !== '' && valor !== 'R$ 0,00') {
      clearErrors('valorNotaFiscal');
    }
  };

  const handleNext = async () => {
    // Validar nota fiscal se Rodonaves
    if (requiresNotaFiscal) {
      const valorAtual = valorNotaFiscal || getValues('valorNotaFiscal') || '';
      const valorNumerico = valorAtual.replace(/[^\d,]/g, '').replace(',', '.');
      
      if (!valorAtual || valorAtual.trim() === '' || parseFloat(valorNumerico) <= 0) {
        toast.error('Informe o valor da nota fiscal para continuar com Rodonaves.');
        return;
      }
    }
    
    const isValid = await trigger(['cotacao']);
    if (isValid && cotacaoSelecionado) onNext();
  };
  return <FormCard icon={Truck} title="Escolha o Frete" description="Selecione a melhor opção de envio com desconto exclusivo">
      <div className="space-y-6">
        {/* Aviso de multi-volume */}
        {isMultiVolume && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Envio com {quantidadeVolumes} volumes
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Os Correios não permitem envio de múltiplos volumes. Apenas Rodonaves está disponível para esta opção.
              </p>
            </div>
          </div>
        )}

        {/* Header com destaque de desconto */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3 justify-center">
            <BadgePercent className="h-6 w-6 text-green-600 dark:text-green-400" />
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              Descontos de até 80% em todos os fretes!
            </p>
          </div>
        </div>

        {isLoadingCotacao && <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
            <span className="text-lg font-medium text-muted-foreground animate-pulse">Calculando melhores fretes...</span>
          </div>}
        
        {cotacoes && cotacoes.length > 0 && (
          <ListaFretesDisponiveis 
            data={cotacoes} 
            onSelected={handleSelectCotacao} 
            selected={cotacaoSelecionado || null}
            disabledServices={isMultiVolume ? ['correios'] : []}
          />
        )}

        {cotacoes && cotacoes.length === 0 && !isLoadingCotacao && <div className="text-center py-8 text-muted-foreground">
            Nenhum frete disponível para esta rota. Verifique os dados informados.
          </div>}

        {/* Campo de Valor da Nota Fiscal - Apenas para Rodonaves */}
        {requiresNotaFiscal && cotacaoSelecionado && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  Rodonaves exige Nota Fiscal
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Informe o valor da nota fiscal para emitir a etiqueta.
                </p>
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                Valor da Nota Fiscal *
              </label>
              <input
                type="text"
                value={valorNotaFiscal}
                onChange={handleValorNotaFiscalChange}
                placeholder="R$ 0,00"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-600 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 transition-all duration-300"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <ButtonComponent type="button" variant="primary" border="outline" onClick={onBack} className="flex-1 h-12">
            Voltar
          </ButtonComponent>
          <ButtonComponent type="button" onClick={handleNext} disabled={!cotacaoSelecionado} className="flex-1 h-12 font-bold">
            {cotacaoSelecionado ? 'Confirmar Frete →' : 'Selecione um Frete'}
          </ButtonComponent>
        </div>
      </div>
    </FormCard>;
};