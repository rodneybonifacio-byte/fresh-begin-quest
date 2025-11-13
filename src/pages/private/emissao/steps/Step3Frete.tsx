import { Truck } from 'lucide-react';
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
    <FormCard icon={Truck} title="Escolha o Frete" description="Selecione a opção de envio">
      <div className="space-y-6">
        {isLoadingCotacao && <div className="text-center py-8">Carregando...</div>}
        {cotacoes && <ListaFretesDisponiveis data={cotacoes} onSelected={(c) => {
          setCotacaoSelecionado(c);
          setValue('cotacao.codigoServico', c.codigoServico);
          clearErrors('cotacao');
        }} selected={cotacaoSelecionado || null} />}

        <div className="flex justify-between">
          <ButtonComponent type="button" variant="primary" border="outline" onClick={onBack}>Voltar</ButtonComponent>
          <ButtonComponent type="button" onClick={handleNext} disabled={!cotacaoSelecionado}>Próximo</ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
