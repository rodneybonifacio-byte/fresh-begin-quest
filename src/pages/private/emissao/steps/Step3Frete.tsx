import { Truck, BadgePercent } from 'lucide-react';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { ListaFretesDisponiveis } from '../ListaFretesDisponiveis';
import { useCotacao } from '../../../../hooks/useCotacao';
import type { ICotacaoMinimaResponse } from '../../../../types/ICotacao';

interface Step3FreteProps {
  onNext: () => void;
  onBack: () => void;
  clienteSelecionado: any;
  cotacaoSelecionado?: ICotacaoMinimaResponse;
  setCotacaoSelecionado: (c: ICotacaoMinimaResponse | undefined) => void;
}

export const Step3Frete = ({ onNext, onBack, clienteSelecionado, cotacaoSelecionado, setCotacaoSelecionado }: Step3FreteProps) => {
  const { setValue, clearErrors, trigger, getValues } = useFormContext();
  const { onGetCotacaoCorreios, cotacoes, isLoadingCotacao } = useCotacao();

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

      await onGetCotacaoCorreios(
        clienteSelecionado.endereco?.cep || clienteSelecionado.cep,
        destinatarioData.endereco.cep,
        embalagem as any,
        '0',
        'N',
        clienteSelecionado
      );
    };

    calcularFrete();
  }, [clienteSelecionado, getValues]);

  const handleNext = async () => {
    const isValid = await trigger(['cotacao']);
    if (isValid && cotacaoSelecionado) onNext();
  };

  return (
    <FormCard icon={Truck} title="Escolha o Frete" description="Selecione a melhor opção de envio com desconto exclusivo">
      <div className="space-y-6">
        {/* Header com destaque de desconto */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3 justify-center">
            <BadgePercent className="h-6 w-6 text-green-600 dark:text-green-400" />
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              Aproveite 50% de desconto em todos os fretes!
            </p>
          </div>
        </div>

        {isLoadingCotacao && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
            <span className="text-lg font-medium text-muted-foreground animate-pulse">Calculando melhores fretes...</span>
          </div>
        )}
        
        {cotacoes && cotacoes.length > 0 && (
          <ListaFretesDisponiveis 
            data={cotacoes} 
            onSelected={(c) => {
              setCotacaoSelecionado(c);
              setValue('cotacao.codigoServico', c.codigoServico);
              clearErrors('cotacao');
            }} 
            selected={cotacaoSelecionado || null} 
          />
        )}

        {cotacoes && cotacoes.length === 0 && !isLoadingCotacao && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum frete disponível para esta rota. Verifique os dados informados.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <ButtonComponent 
            type="button" 
            variant="primary" 
            border="outline" 
            onClick={onBack}
            className="flex-1 h-12"
          >
            Voltar
          </ButtonComponent>
          <ButtonComponent 
            type="button" 
            onClick={handleNext} 
            disabled={!cotacaoSelecionado}
            className="flex-1 h-12 font-bold"
          >
            {cotacaoSelecionado ? 'Confirmar Frete →' : 'Selecione um Frete'}
          </ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
