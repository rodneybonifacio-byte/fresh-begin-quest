import { MapPin } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { FormCard } from '../../../../components/FormCard';
import { InputField } from '../../../../components/InputField';
import { ButtonComponent } from '../../../../components/button';
import { AutocompleteDestinatario } from '../../../../components/autocomplete/AutocompleteDestinatario';
import type { IDestinatario } from '../../../../types/IDestinatario';
import { formatCpfCnpj, formatTelefone } from '../../../../utils/lib.formats';
import { ViacepService } from '../../../../services/viacepService';
import { toast } from 'sonner';

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
  const [buscandoCep, setBuscandoCep] = useState<boolean>(false);

  const viacepService = new ViacepService();

  // Busca automática de endereço por CEP
  const buscarCep = async (cepValue: string) => {
    const cepLimpo = cepValue.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        console.log('🔍 Buscando CEP:', cepLimpo);
        const endereco = await viacepService.consulta(cepLimpo);
        
        if (endereco && endereco.logradouro) {
          setLogradouro(endereco.logradouro || '');
          setBairro(endereco.bairro || '');
          setLocalidade(endereco.localidade || '');
          setUf(endereco.uf || '');
          
          console.log('✅ Endereço encontrado:', endereco);
          toast.success('Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar CEP:', error);
        toast.error('Erro ao buscar CEP');
      } finally {
        setBuscandoCep(false);
      }
    }
  };

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
      <div className="space-y-5 md:space-y-6">
        {/* Busca de Destinatário */}
        <div className="p-3 md:p-4 bg-primary/5 rounded-lg md:rounded-xl border border-primary/20">
          <AutocompleteDestinatario onSelect={handleDestinatarioSelect} />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
            Digite para buscar ou preencha para novo
          </p>
        </div>

        {/* Seção: Dados Pessoais */}
        <div className="space-y-3 md:space-y-4 p-4 md:p-5 bg-gradient-to-br from-card to-muted/20 rounded-lg md:rounded-xl border border-border">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-sm md:text-base font-bold text-foreground">Dados Pessoais</h4>
          </div>
          
          {/* Nome - sempre full width */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Nome Completo *
            </label>
            <input
              type="text"
              placeholder="Digite o nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 md:h-11 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* CPF/CNPJ e Celular - full width no mobile, 2 colunas no desktop */}
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                CPF/CNPJ *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="w-full h-12 md:h-11 pl-10 pr-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Celular/WhatsApp *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  className="w-full h-12 md:h-11 pl-10 pr-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seção: Endereço */}
        <div className="space-y-3 md:space-y-4 p-4 md:p-5 bg-gradient-to-br from-card to-muted/20 rounded-lg md:rounded-xl border border-border">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPinned className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-sm md:text-base font-bold text-foreground">Endereço de Entrega</h4>
          </div>

          {/* CEP com busca automática */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              CEP *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => {
                  const valor = e.target.value;
                  setCep(valor);
                  buscarCep(valor);
                }}
                disabled={buscandoCep}
                className="w-full h-12 md:h-11 px-4 pr-10 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
              {buscandoCep && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
              {!buscandoCep && cep.replace(/\D/g, '').length === 8 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Digite o CEP para buscar automaticamente</p>
          </div>

          {/* Logradouro */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Logradouro *
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Rua, Avenida..."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                disabled={buscandoCep}
                className="w-full h-12 md:h-11 pl-10 pr-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          {/* Número e Bairro - full width no mobile, grid no desktop */}
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
            <div className="md:col-span-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Número *
              </label>
              <input
                type="text"
                placeholder="123"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full h-12 md:h-11 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Bairro
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Nome do bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  disabled={buscandoCep}
                  className="w-full h-12 md:h-11 pl-10 pr-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Cidade e UF - grid otimizado */}
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4">
            <div className="col-span-2 md:col-span-3">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Cidade *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <City className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={localidade}
                  onChange={(e) => setLocalidade(e.target.value)}
                  disabled={buscandoCep}
                  className="w-full h-12 md:h-11 pl-10 pr-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                UF *
              </label>
              <input
                type="text"
                placeholder="SP"
                maxLength={2}
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                disabled={buscandoCep}
                className="w-full h-12 md:h-11 px-4 text-base text-center rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          {/* Complemento */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Complemento <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Apto, Bloco, Sala..."
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="w-full h-12 md:h-11 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Indicadores de progresso */}
        <div className="flex flex-wrap gap-2 text-xs p-3 md:p-4 bg-muted/30 rounded-lg">
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${nome.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {nome.trim() ? "✓" : "○"} Nome
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${cpfCnpj.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {cpfCnpj.trim() ? "✓" : "○"} CPF/CNPJ
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${celular.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {celular.trim() ? "✓" : "○"} Celular
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${cep.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {cep.trim() ? "✓" : "○"} CEP
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${logradouro.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {logradouro.trim() ? "✓" : "○"} Logradouro
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${numero.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {numero.trim() ? "✓" : "○"} Número
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${localidade.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {localidade.trim() ? "✓" : "○"} Cidade
          </span>
          <span className={`px-2.5 py-1.5 rounded-full transition-all font-medium ${uf.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {uf.trim() ? "✓" : "○"} UF
          </span>
        </div>

        {/* Botões de navegação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <ButtonComponent 
            type="button" 
            onClick={onBack}
            variant="primary"
            border="outline"
            className="w-full sm:flex-1 h-12 md:h-11 text-base font-medium"
          >
            ← Voltar
          </ButtonComponent>

          <ButtonComponent 
            type="button" 
            onClick={handleNext} 
            disabled={!isFormValid}
            variant="primary"
            className="w-full sm:flex-1 h-12 md:h-11 text-base font-semibold"
          >
            Próximo: Frete →
          </ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
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
            <div className="relative">
              <InputField 
                label="CEP *" 
                type="text"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => {
                  const valor = e.target.value;
                  setCep(valor);
                  buscarCep(valor);
                }}
                disabled={buscandoCep}
              />
              {buscandoCep && (
                <div className="absolute right-3 top-9">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <InputField 
                label="Logradouro *" 
                type="text"
                placeholder="Rua, Avenida..."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                disabled={buscandoCep}
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
                disabled={buscandoCep}
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
                disabled={buscandoCep}
              />
            </div>
            <InputField 
              label="UF *" 
              type="text"
              placeholder="SP"
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              disabled={buscandoCep}
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
