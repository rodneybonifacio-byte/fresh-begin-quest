import { MapPin, User, MapPinned } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { FormCard } from '../../../../components/FormCard';
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
export const Step2Destinatario = ({
  onNext,
  onBack,
  setDestinatarioSelecionado
}: Step2DestinatarioProps) => {
  const {
    setValue
  } = useFormContext();
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
  const buscarCep = async (cepValue: string) => {
    const cepLimpo = cepValue.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const endereco = await viacepService.consulta(cepLimpo);
        if (endereco && endereco.logradouro) {
          setLogradouro(endereco.logradouro || '');
          setBairro(endereco.bairro || '');
          setLocalidade(endereco.localidade || '');
          setUf(endereco.uf || '');
          toast.success('✓ Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP');
      } finally {
        setBuscandoCep(false);
      }
    }
  };
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
  const isFormValid = !!(nome.trim() && cpfCnpj.trim() && celular.trim() && cep.trim() && logradouro.trim() && numero.trim() && localidade.trim() && uf.trim());
  const handleNext = async () => {
    if (isFormValid) {
      console.log('✅ Avançando para tela de frete com dados:', {
        destinatario: {
          nome,
          cpfCnpj,
          celular
        },
        endereco: {
          cep,
          logradouro,
          numero,
          bairro,
          localidade,
          uf
        }
      });

      // Define o destinatário selecionado antes de avançar
      setDestinatarioSelecionado({
        nome,
        cpfCnpj,
        celular,
        endereco: {
          cep,
          logradouro,
          numero,
          bairro,
          localidade,
          uf,
          complemento
        }
      } as IDestinatario);
      onNext();
    }
  };
  const handleDestinatarioSelect = (d: IDestinatario) => {
    setNome(d.nome || '');
    setCpfCnpj(d.cpfCnpj ? formatCpfCnpj(d.cpfCnpj) : '');
    const tel = d.celular || d.telefone || '';
    setCelular(tel ? formatTelefone(tel) : '');
    if (d.endereco) {
      setCep(d.endereco.cep || '');
      setLogradouro(d.endereco.logradouro || '');
      setNumero(d.endereco.numero || '');
      setBairro(d.endereco.bairro || '');
      setLocalidade(d.endereco.localidade || '');
      setUf(d.endereco.uf || '');
      setComplemento(d.endereco.complemento || '');
      toast.success('✓ Destinatário carregado!');
    }
    setDestinatarioSelecionado(d);
  };
  return <FormCard icon={MapPin} title="Destinatário" description="Dados de entrega e endereço">
      <div className="space-y-4 md:space-y-5">
        <div className="p-3 md:p-4 bg-primary/5 rounded-lg border border-primary/20">
          <AutocompleteDestinatario onSelect={handleDestinatarioSelect} />
          <p className="text-xs text-muted-foreground mt-2">💡 Busque ou preencha novo</p>
        </div>

        <div className="space-y-3 p-3 md:p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 pb-2 border-b">
            <User className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Dados Pessoais</h4>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome *</label>
            <input type="text" placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">CPF/CNPJ *</label>
              <input type="text" placeholder="000.000.000-00" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Celular *</label>
              <input type="text" placeholder="(11) 99999-9999" value={celular} onChange={e => setCelular(e.target.value)} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3 md:p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 pb-2 border-b">
            <MapPinned className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Endereço</h4>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">CEP *</label>
            <div className="relative">
              <input type="text" placeholder="00000-000" value={cep} onChange={e => {
              setCep(e.target.value);
              buscarCep(e.target.value);
            }} disabled={buscandoCep} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
              {buscandoCep && <div className="absolute right-3 top-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div></div>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Logradouro *</label>
            <input type="text" placeholder="Rua, Avenida..." value={logradouro} onChange={e => setLogradouro(e.target.value)} disabled={buscandoCep} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
          </div>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Número *</label>
              <input type="text" placeholder="123" value={numero} onChange={e => setNumero(e.target.value)} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1.5 block">Bairro</label>
              <input type="text" placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} disabled={buscandoCep} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Cidade *</label>
              <input type="text" placeholder="Cidade" value={localidade} onChange={e => setLocalidade(e.target.value)} disabled={buscandoCep} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">UF *</label>
              <input type="text" placeholder="SP" maxLength={2} value={uf} onChange={e => setUf(e.target.value.toUpperCase())} disabled={buscandoCep} className="w-full h-12 px-4 text-base text-center rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Complemento <span className="text-muted-foreground">(opcional)</span></label>
            <input type="text" placeholder="Apto, Bloco..." value={complemento} onChange={e => setComplemento(e.target.value)} className="w-full h-12 px-4 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs p-3 bg-muted/30 rounded-lg">
          {[{
          l: 'Nome',
          v: nome
        }, {
          l: 'CPF',
          v: cpfCnpj
        }, {
          l: 'Tel',
          v: celular
        }, {
          l: 'CEP',
          v: cep
        }, {
          l: 'Log',
          v: logradouro
        }, {
          l: 'Nº',
          v: numero
        }, {
          l: 'Cidade',
          v: localidade
        }, {
          l: 'UF',
          v: uf
        }].map(f => <span key={f.l} className={`px-2.5 py-1.5 rounded-full font-medium ${f.v.trim() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
              {f.v.trim() ? "✓" : "○"} {f.l}
            </span>)}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <ButtonComponent type="button" onClick={onBack} variant="primary" border="outline" className="w-full sm:flex-1 h-12">← Voltar</ButtonComponent>
          <ButtonComponent type="button" onClick={handleNext} disabled={!isFormValid} variant="primary" className="w-full sm:flex-1 h-12 font-semibold text-slate-50">Próximo: Frete →</ButtonComponent>
        </div>
      </div>
    </FormCard>;
};