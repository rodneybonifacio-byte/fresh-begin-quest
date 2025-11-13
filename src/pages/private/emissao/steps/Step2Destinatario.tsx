import { MapPin } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { InputField } from '../../../../components/InputField';
import { ButtonComponent } from '../../../../components/button';
import { AutocompleteDestinatario } from '../../../../components/autocomplete/AutocompleteDestinatario';
import type { IDestinatario } from '../../../../types/IDestinatario';
import { formatCpfCnpj, formatTelefone } from '../../../../utils/lib.formats';

interface Step2DestinatarioProps {
  onNext: () => void;
  onBack: () => void;
  setDestinatarioSelecionado: (d: IDestinatario | undefined) => void;
}

export const Step2Destinatario = ({ onNext, onBack, setDestinatarioSelecionado }: Step2DestinatarioProps) => {
  const { register, setValue, trigger } = useFormContext();

  const handleNext = async () => {
    const isValid = await trigger(['destinatario']);
    if (isValid) onNext();
  };

  return (
    <FormCard icon={MapPin} title="Destinatário" description="Dados de entrega">
      <div className="space-y-4">
        <AutocompleteDestinatario onSelect={(d: IDestinatario) => {
          setValue('destinatario.nome', d.nome);
          setValue('destinatario.cpfCnpj', formatCpfCnpj(d.cpfCnpj));
          setValue('destinatario.celular', formatTelefone(d.celular));
          setDestinatarioSelecionado(d);
        }} />
        
        <InputField label="Nome" required {...register('destinatario.nome')} />
        <InputField label="CPF/CNPJ" required {...register('destinatario.cpfCnpj')} />
        <InputField label="Celular" required {...register('destinatario.celular')} />
        <InputField label="CEP" required {...register('destinatario.endereco.cep')} />
        <InputField label="Logradouro" required {...register('destinatario.endereco.logradouro')} />
        <InputField label="Número" required {...register('destinatario.endereco.numero')} />
        <InputField label="Cidade" required {...register('destinatario.endereco.localidade')} />
        <InputField label="UF" required maxLength={2} {...register('destinatario.endereco.uf')} />

        <div className="flex justify-between">
          <ButtonComponent type="button" variant="primary" border="outline" onClick={onBack}>Voltar</ButtonComponent>
          <ButtonComponent type="button" onClick={handleNext}>Próximo</ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
