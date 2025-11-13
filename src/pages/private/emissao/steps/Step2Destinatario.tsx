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
          console.log('📍 Destinatário selecionado:', d);
          
          // Preenche dados pessoais
          setValue('destinatario.nome', d.nome);
          setValue('destinatario.cpfCnpj', formatCpfCnpj(d.cpfCnpj));
          setValue('destinatario.celular', formatTelefone(d.celular));
          
          // Preenche endereço completo
          if (d.endereco) {
            setValue('destinatario.endereco.cep', d.endereco.cep || '');
            setValue('destinatario.endereco.logradouro', d.endereco.logradouro || '');
            setValue('destinatario.endereco.numero', d.endereco.numero || '');
            setValue('destinatario.endereco.bairro', d.endereco.bairro || '');
            setValue('destinatario.endereco.localidade', d.endereco.localidade || '');
            setValue('destinatario.endereco.uf', d.endereco.uf || '');
            setValue('destinatario.endereco.complemento', d.endereco.complemento || '');
            
            console.log('✅ Endereço preenchido:', d.endereco);
          }
          
          setDestinatarioSelecionado(d);
        }} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Nome" required {...register('destinatario.nome')} />
          <InputField label="CPF/CNPJ" required {...register('destinatario.cpfCnpj')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Celular" required {...register('destinatario.celular')} />
          <InputField label="CEP" required {...register('destinatario.endereco.cep')} />
        </div>

        <InputField label="Logradouro" required {...register('destinatario.endereco.logradouro')} />
        
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Número" required {...register('destinatario.endereco.numero')} />
          <InputField label="Bairro" {...register('destinatario.endereco.bairro')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Cidade" required {...register('destinatario.endereco.localidade')} />
          <InputField label="UF" required maxLength={2} {...register('destinatario.endereco.uf')} />
        </div>

        <div className="flex justify-between">
          <ButtonComponent type="button" variant="primary" border="outline" onClick={onBack}>Voltar</ButtonComponent>
          <ButtonComponent type="button" onClick={handleNext}>Próximo</ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
