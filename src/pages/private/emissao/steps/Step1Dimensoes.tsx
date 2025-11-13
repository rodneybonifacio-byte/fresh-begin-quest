import { Box } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { InputField } from '../../../../components/InputField';
import { ButtonComponent } from '../../../../components/button';
import type { IEmbalagem } from '../../../../types/IEmbalagem';
import { SelecionarRemetente } from '../../../../components/SelecionarRemetente';

interface Step1DimensoesProps {
  onNext: () => void;
  selectedEmbalagem?: IEmbalagem;
  setSelectedEmbalagem: (embalagem: IEmbalagem | undefined) => void;
  clienteSelecionado: any;
  setClienteSelecionado: (cliente: any) => void;
}

export const Step1Dimensoes = ({
  onNext,
  clienteSelecionado,
  setClienteSelecionado
}: Step1DimensoesProps) => {
  const { register, setValue, watch } = useFormContext();

  const altura = watch('embalagem.altura');
  const largura = watch('embalagem.largura');
  const comprimento = watch('embalagem.comprimento');
  const peso = watch('embalagem.peso');

  const isFormValid = !!(
    clienteSelecionado && 
    altura > 0 && 
    largura > 0 && 
    comprimento > 0 && 
    peso > 0
  );

  const handleNext = () => {
    console.log('=== CLICOU PRÓXIMO ===');
    console.log('Cliente:', clienteSelecionado?.nome);
    console.log('Dimensões:', { altura, largura, comprimento, peso });
    console.log('Válido:', isFormValid);
    
    if (isFormValid) {
      onNext();
    }
  };

  return (
    <FormCard 
      icon={Box} 
      title="Dimensões e Embalagem" 
      description="Configure o remetente e as dimensões do pacote"
    >
      <div className="space-y-6">
        <SelecionarRemetente 
          remetenteSelecionado={clienteSelecionado} 
          onSelect={(r: any) => {
            setClienteSelecionado(r);
            setValue('nomeRemetente', r.nome);
            setValue('remetenteId', r.id);
          }} 
        />

        <div className="grid grid-cols-4 gap-4">
          <InputField 
            label="Altura (cm)" 
            type="number" 
            {...register('embalagem.altura', { valueAsNumber: true })} 
            min="0"
            step="0.01"
            placeholder="0"
          />
          <InputField 
            label="Largura (cm)" 
            type="number" 
            {...register('embalagem.largura', { valueAsNumber: true })} 
            min="0"
            step="0.01"
            placeholder="0"
          />
          <InputField 
            label="Comprimento (cm)" 
            type="number" 
            {...register('embalagem.comprimento', { valueAsNumber: true })} 
            min="0"
            step="0.01"
            placeholder="0"
          />
          <InputField 
            label="Peso (g)" 
            type="number" 
            {...register('embalagem.peso', { valueAsNumber: true })} 
            min="0"
            step="1"
            placeholder="0"
          />
        </div>

        <div className="flex items-center gap-4">
          <ButtonComponent 
            type="button" 
            onClick={handleNext} 
            disabled={!isFormValid}
            variant="primary"
          >
            Próximo
          </ButtonComponent>
          
          {!isFormValid && (
            <span className="text-sm text-muted-foreground">
              {!clienteSelecionado ? 'Selecione um remetente' : 'Preencha todas as dimensões'}
            </span>
          )}
        </div>
      </div>
    </FormCard>
  );
};
