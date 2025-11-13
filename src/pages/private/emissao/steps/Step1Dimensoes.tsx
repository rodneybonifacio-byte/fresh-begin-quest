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
  const {
    register,
    setValue,
    trigger
  } = useFormContext();
  const handleNext = async () => {
    if (!clienteSelecionado) {
      return;
    }
    
    const isValid = await trigger(['remetenteId', 'embalagem.altura', 'embalagem.largura', 'embalagem.comprimento', 'embalagem.peso']);
    if (isValid) {
      onNext();
    }
  };
  return <FormCard icon={Box} title="Dimensões e Embalagem" description="Configure o remetente e as dimensões do pacote">
      <div className="space-y-6">
        <SelecionarRemetente remetenteSelecionado={clienteSelecionado} onSelect={(r: any) => {
        setClienteSelecionado(r);
        setValue('nomeRemetente', r.nome);
        setValue('remetenteId', r.id);
      }} />
        
        

        <div className="grid grid-cols-4 gap-4">
          <InputField label="Altura" type="number" {...register('embalagem.altura')} />
          <InputField label="Largura" type="number" {...register('embalagem.largura')} />
          <InputField label="Comprimento" type="number" {...register('embalagem.comprimento')} />
          <InputField label="Peso" type="number" {...register('embalagem.peso')} />
        </div>

        <ButtonComponent type="button" onClick={handleNext} disabled={!clienteSelecionado}>Próximo</ButtonComponent>
      </div>
    </FormCard>;
};