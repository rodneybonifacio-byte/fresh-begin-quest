import { CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { useEmissao } from '../../../../hooks/useEmissao';
import type { IEmissao } from '../../../../types/IEmissao';
import { formatNumberString } from '../../../../utils/formatCurrency';
import { toast } from 'sonner';

interface Step4ConfirmacaoProps {
  onBack: () => void;
  onSuccess: () => void;
  cotacaoSelecionado: any;
  selectedEmbalagem: any;
  clienteSelecionado: any;
}

export const Step4Confirmacao = ({ onBack, onSuccess, cotacaoSelecionado, selectedEmbalagem, clienteSelecionado }: Step4ConfirmacaoProps) => {
  const { handleSubmit } = useFormContext();
  const { onEmissaoCadastro } = useEmissao();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const emissao: IEmissao = {
        remetenteId: data.remetenteId,
        cienteObjetoNaoProibido: true,
        embalagem: { ...selectedEmbalagem, altura: Number(data.embalagem.altura), largura: Number(data.embalagem.largura), comprimento: Number(data.embalagem.comprimento), peso: Number(data.embalagem.peso), diametro: 0 },
        cotacao: cotacaoSelecionado,
        logisticaReversa: 'N',
        valorDeclarado: Number(formatNumberString('0')),
        valorNotaFiscal: Number(formatNumberString('0')),
        itensDeclaracaoConteudo: [],
      };
      await onEmissaoCadastro(emissao, setIsSubmitting);
      toast.success('Etiqueta gerada!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao gerar etiqueta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard icon={CheckCircle} title="Confirmação" description="Revise e confirme">
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <p><strong>Remetente:</strong> {clienteSelecionado?.nome}</p>
          <p><strong>Serviço:</strong> {cotacaoSelecionado?.nomeServico}</p>
          <p><strong>Prazo:</strong> {cotacaoSelecionado?.prazo} dias</p>
        </div>

        <div className="flex justify-between">
          <ButtonComponent type="button" variant="primary" border="outline" onClick={onBack} disabled={isSubmitting}>Voltar</ButtonComponent>
          <ButtonComponent type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Gerando...' : 'Gerar Etiqueta'}
          </ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
