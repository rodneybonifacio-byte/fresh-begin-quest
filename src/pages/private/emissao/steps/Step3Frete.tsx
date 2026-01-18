import { Truck, BadgePercent, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { ListaFretesDisponiveis } from '../ListaFretesDisponiveis';
import { useCotacao } from '../../../../hooks/useCotacao';
import type { ICotacaoMinimaResponse } from '../../../../types/ICotacao';
import { toast } from 'sonner';

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
  const handleNext = async () => {
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