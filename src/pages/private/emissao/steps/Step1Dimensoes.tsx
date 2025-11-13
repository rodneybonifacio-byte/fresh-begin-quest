import { Box } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
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
  const { setValue, getValues } = useFormContext();
  
  const [altura, setAltura] = useState<number>(0);
  const [largura, setLargura] = useState<number>(0);
  const [comprimento, setComprimento] = useState<number>(0);
  const [peso, setPeso] = useState<number>(0);

  // Atualiza o formulário quando os valores mudam
  useEffect(() => {
    setValue('embalagem.altura', altura);
    setValue('embalagem.largura', largura);
    setValue('embalagem.comprimento', comprimento);
    setValue('embalagem.peso', peso);
    
    console.log('📦 Dimensões atualizadas:', { altura, largura, comprimento, peso });
  }, [altura, largura, comprimento, peso, setValue]);

  const isFormValid = !!(
    clienteSelecionado && 
    altura > 0 && 
    largura > 0 && 
    comprimento > 0 && 
    peso > 0
  );

  const handleNext = () => {
    const formData = getValues();
    console.log('=== AVANÇANDO PARA DESTINATÁRIO ===');
    console.log('Cliente:', clienteSelecionado?.nome);
    console.log('Dimensões locais:', { altura, largura, comprimento, peso });
    console.log('Dados do form:', formData);
    console.log('Válido:', isFormValid);
    
    if (isFormValid) {
      onNext();
    } else {
      console.error('❌ Formulário inválido!');
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
            console.log('✅ Remetente selecionado:', r.nome);
            setClienteSelecionado(r);
            setValue('nomeRemetente', r.nome);
            setValue('remetenteId', r.id);
          }} 
        />

        <div className="grid grid-cols-4 gap-4">
          <InputField 
            label="Altura (cm)" 
            type="number" 
            min="0"
            step="0.01"
            placeholder="0"
            defaultValue={0}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              console.log('Altura mudou:', value);
              setAltura(value);
            }}
          />
          <InputField 
            label="Largura (cm)" 
            type="number" 
            min="0"
            step="0.01"
            placeholder="0"
            defaultValue={0}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              console.log('Largura mudou:', value);
              setLargura(value);
            }}
          />
          <InputField 
            label="Comprimento (cm)" 
            type="number" 
            min="0"
            step="0.01"
            placeholder="0"
            defaultValue={0}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              console.log('Comprimento mudou:', value);
              setComprimento(value);
            }}
          />
          <InputField 
            label="Peso (g)" 
            type="number" 
            min="0"
            step="1"
            placeholder="0"
            defaultValue={0}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              console.log('Peso mudou:', value);
              setPeso(value);
            }}
          />
        </div>

        <div className="space-y-3">
          {/* Status da validação */}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className={clienteSelecionado ? "text-green-600" : "text-muted-foreground"}>
              {clienteSelecionado ? "✓ Remetente selecionado" : "○ Selecione um remetente"}
            </span>
            <span className={altura > 0 ? "text-green-600" : "text-muted-foreground"}>
              {altura > 0 ? "✓ Altura" : "○ Altura"}
            </span>
            <span className={largura > 0 ? "text-green-600" : "text-muted-foreground"}>
              {largura > 0 ? "✓ Largura" : "○ Largura"}
            </span>
            <span className={comprimento > 0 ? "text-green-600" : "text-muted-foreground"}>
              {comprimento > 0 ? "✓ Comprimento" : "○ Comprimento"}
            </span>
            <span className={peso > 0 ? "text-green-600" : "text-muted-foreground"}>
              {peso > 0 ? "✓ Peso" : "○ Peso"}
            </span>
          </div>

          <ButtonComponent 
            type="button" 
            onClick={handleNext} 
            disabled={!isFormValid}
            variant="primary"
            className="w-full"
          >
            Próximo: Destinatário →
          </ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
