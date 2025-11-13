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
  selectedEmbalagem: any;
  destinatarioSelecionado: any;
  clienteSelecionado: any;
  cotacaoSelecionado?: ICotacaoMinimaResponse;
  setCotacaoSelecionado: (c: ICotacaoMinimaResponse | undefined) => void;
}

export const Step3Frete = ({ onNext, onBack, selectedEmbalagem, destinatarioSelecionado, clienteSelecionado, cotacaoSelecionado, setCotacaoSelecionado }: Step3FreteProps) => {
  const { setValue, clearErrors, trigger } = useFormContext();
  const { onGetCotacaoCorreios, cotacoes, isLoadingCotacao } = useCotacao();

  useEffect(() => {
    if (selectedEmbalagem && clienteSelecionado && destinatarioSelecionado) {
      onGetCotacaoCorreios(clienteSelecionado.endereco.cep, destinatarioSelecionado.endereco.cep, selectedEmbalagem, '0', 'N', clienteSelecionado);
    }
  }, []);

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
