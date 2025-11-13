import { Box } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useEffect } from 'react';
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
  const {
    register,
    setValue,
    watch
  } = useFormContext();

  const embalagem = watch('embalagem');

  // Validação - converte strings para números se necessário
  const altura = Number(embalagem?.altura) || 0;
  const largura = Number(embalagem?.largura) || 0;
  const comprimento = Number(embalagem?.comprimento) || 0;
  const peso = Number(embalagem?.peso) || 0;

  const isFormValid = !!(
    clienteSelecionado && 
    altura > 0 && 
    largura > 0 && 
    comprimento > 0 && 
    peso > 0
  );

  useEffect(() => {
    console.log('=== VALIDAÇÃO ===', {
      clienteSelecionado: !!clienteSelecionado,
      altura,
      largura,
      comprimento,
      peso,
      isFormValid
    });
  }, [clienteSelecionado, altura, largura, comprimento, peso, isFormValid]);

  const handleNext = () => {
    console.log('=== CLICOU NO PRÓXIMO ===');
    console.log('Validação passou:', isFormValid);
    console.log('Cliente:', clienteSelecionado);
    console.log('Embalagem:', embalagem);
    onNext();
  };
  return <FormCard icon={Box} title="Dimensões e Embalagem" description="Configure o remetente e as dimensões do pacote">
      <div className="space-y-6">
        <SelecionarRemetente remetenteSelecionado={clienteSelecionado} onSelect={(r: any) => {
        setClienteSelecionado(r);
        setValue('nomeRemetente', r.nome);
        setValue('remetenteId', r.id);
      }} />
        
        

        <div className="grid grid-cols-4 gap-4">
          <InputField 
            label="Altura (cm)" 
            type="number" 
            {...register('embalagem.altura', { valueAsNumber: true })} 
            min="0"
            step="0.01"
          />
          <InputField 
            label="Largura (cm)" 
            type="number" 
            {...register('embalagem.largura', { valueAsNumber: true })} 
            min="0"
            step="0.01"
          />
          <InputField 
            label="Comprimento (cm)" 
            type="number" 
            {...register('embalagem.comprimento', { valueAsNumber: true })} 
            min="0"
            step="0.01"
          />
          <InputField 
            label="Peso (g)" 
            type="number" 
            {...register('embalagem.peso', { valueAsNumber: true })} 
            min="0"
            step="1"
          />
        </div>

        <ButtonComponent 
          type="button" 
          onClick={handleNext} 
          disabled={!isFormValid}
        >
          Próximo
        </ButtonComponent>
      </div>
    </FormCard>;
};