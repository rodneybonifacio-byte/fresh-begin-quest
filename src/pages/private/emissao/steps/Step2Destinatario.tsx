import { MapPin } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
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
  const { setValue } = useFormContext();
  
  const [nome, setNome] = useState<string>('');
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [celular, setCelular] = useState<string>('');
  const [cep, setCep] = useState<string>('');
  const [logradouro, setLogradouro] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [localidade, setLocalidade] = useState<string>('');
  const [uf, setUf] = useState<string>('');
  const [complemento, setComplemento] = useState<string>('');

  // Atualiza o formulário quando os valores mudam
  useEffect(() => {
    setValue('destinatario.nome', nome);
    setValue('destinatario.cpfCnpj', cpfCnpj);
    setValue('destinatario.celular', celular);
    setValue('destinatario.endereco.cep', cep);
    setValue('destinatario.endereco.logradouro', logradouro);
    setValue('destinatario.endereco.numero', numero);
    setValue('destinatario.endereco.bairro', bairro);
    setValue('destinatario.endereco.localidade', localidade);
    setValue('destinatario.endereco.uf', uf);
    setValue('destinatario.endereco.complemento', complemento);
  }, [nome, cpfCnpj, celular, cep, logradouro, numero, bairro, localidade, uf, complemento, setValue]);

  const isFormValid = !!(
    nome.trim() && 
    cpfCnpj.trim() && 
    celular.trim() && 
    cep.trim() && 
    logradouro.trim() && 
    numero.trim() && 
    localidade.trim() && 
    uf.trim()
  );

  const handleNext = () => {
    console.log('=== AVANÇANDO PARA FRETE ===');
    if (isFormValid) {
      onNext();
    }
  };

  const handleDestinatarioSelect = (d: IDestinatario) => {
    console.log('📍 Destinatário selecionado do banco:', d);
    
    // Preenche dados pessoais
    setNome(d.nome || '');
    setCpfCnpj(d.cpfCnpj ? formatCpfCnpj(d.cpfCnpj) : '');
    
    // Usa celular ou telefone
    const tel = d.celular || d.telefone || '';
    setCelular(tel ? formatTelefone(tel) : '');
    
    // Preenche endereço completo
    if (d.endereco) {
      setCep(d.endereco.cep || '');
      setLogradouro(d.endereco.logradouro || '');
      setNumero(d.endereco.numero || '');
      setBairro(d.endereco.bairro || '');
      setLocalidade(d.endereco.localidade || '');
      setUf(d.endereco.uf || '');
      setComplemento(d.endereco.complemento || '');
      
      console.log('✅ Todos os campos preenchidos automaticamente');
    }
    
    setDestinatarioSelecionado(d);
  };

  return (
    <FormCard 
      icon={MapPin} 
      title="Destinatário" 
      description="Dados de entrega e endereço do destinatário"
    >
      <div className="space-y-6">
        <div>
          <AutocompleteDestinatario onSelect={handleDestinatarioSelect} />
          <p className="text-xs text-muted-foreground mt-1">
            💡 Digite o nome para buscar ou preencha para novo cadastro
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Dados Pessoais</h4>
          
          <InputField 
            label="Nome Completo *" 
            type="text"
            placeholder="Nome do destinatário"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="CPF/CNPJ *" 
              type="text"
              placeholder="000.000.000-00"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
            />
            <InputField 
              label="Celular *" 
              type="text"
              placeholder="(00) 00000-0000"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Endereço de Entrega</h4>
          
          <div className="grid grid-cols-3 gap-4">
            <InputField 
              label="CEP *" 
              type="text"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
            />
            <div className="col-span-2">
              <InputField 
                label="Logradouro *" 
                type="text"
                placeholder="Rua, Avenida..."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <InputField 
              label="Número *" 
              type="text"
              placeholder="123"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
            <div className="col-span-2">
              <InputField 
                label="Bairro" 
                type="text"
                placeholder="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <InputField 
                label="Cidade *" 
                type="text"
                placeholder="Cidade"
                value={localidade}
                onChange={(e) => setLocalidade(e.target.value)}
              />
            </div>
            <InputField 
              label="UF *" 
              type="text"
              placeholder="SP"
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
            />
          </div>

          <InputField 
            label="Complemento" 
            type="text"
            placeholder="Apto, Bloco, Sala..."
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className={nome.trim() ? "text-green-600" : "text-muted-foreground"}>
              {nome.trim() ? "✓ Nome" : "○ Nome"}
            </span>
            <span className={cpfCnpj.trim() ? "text-green-600" : "text-muted-foreground"}>
              {cpfCnpj.trim() ? "✓ CPF/CNPJ" : "○ CPF/CNPJ"}
            </span>
            <span className={celular.trim() ? "text-green-600" : "text-muted-foreground"}>
              {celular.trim() ? "✓ Celular" : "○ Celular"}
            </span>
            <span className={cep.trim() ? "text-green-600" : "text-muted-foreground"}>
              {cep.trim() ? "✓ CEP" : "○ CEP"}
            </span>
            <span className={logradouro.trim() ? "text-green-600" : "text-muted-foreground"}>
              {logradouro.trim() ? "✓ Logradouro" : "○ Logradouro"}
            </span>
            <span className={numero.trim() ? "text-green-600" : "text-muted-foreground"}>
              {numero.trim() ? "✓ Número" : "○ Número"}
            </span>
            <span className={localidade.trim() ? "text-green-600" : "text-muted-foreground"}>
              {localidade.trim() ? "✓ Cidade" : "○ Cidade"}
            </span>
            <span className={uf.trim() ? "text-green-600" : "text-muted-foreground"}>
              {uf.trim() ? "✓ UF" : "○ UF"}
            </span>
          </div>

          <div className="flex gap-3">
            <ButtonComponent 
              type="button" 
              onClick={onBack}
              variant="primary"
              border="outline"
              className="flex-1"
            >
              ← Voltar
            </ButtonComponent>

            <ButtonComponent 
              type="button" 
              onClick={handleNext} 
              disabled={!isFormValid}
              variant="primary"
              className="flex-1"
            >
              Próximo: Frete →
            </ButtonComponent>
          </div>
        </div>
      </div>
    </FormCard>
  );
};
