import { yupResolver } from '@hookform/resolvers/yup';
import { Box, MapPin, Package2, DollarSign, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as yup from 'yup';
import { AutocompleteDestinatario } from '../../../components/autocomplete/AutocompleteDestinatario';
import { InputLabel } from '../../../components/input-label';
import { useAddress } from '../../../hooks/useAddress';
import { useCliente } from '../../../hooks/useCliente';
import { useCotacao } from '../../../hooks/useCotacao';
import { useEmissao } from '../../../hooks/useEmissao';
import { useAuth } from '../../../providers/AuthContext';
import { useLoadingSpinner } from '../../../providers/LoadingSpinnerContext';
import { useRemetentes } from '../../../hooks/useRemetente';
import type { ICotacaoMinimaResponse } from '../../../types/ICotacao';
import type { IDestinatario } from '../../../types/IDestinatario';
import type { IEmbalagem } from '../../../types/IEmbalagem';
import type { IEmissao } from '../../../types/IEmissao';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatCep, formatCpfCnpj, formatTelefone } from '../../../utils/lib.formats';
import { ListaFretesDisponiveis } from './ListaFretesDisponiveis';
const validationSchema = yup.object().shape({
  remetenteId: yup.string().required('O remetente é obrigatório'),
  embalagem: yup.object().shape({
    altura: yup.number().required('A altura é obrigatória'),
    comprimento: yup.number().required('O comprimento é obrigatório'),
    largura: yup.number().required('A largura é obrigatória'),
    peso: yup.number().required('O peso é obrigatório'),
    formatoObjeto: yup.string()
  }),
  destinatario: yup.object().shape({
    nome: yup.string().required('O nome é obrigatório'),
    cpfCnpj: yup.string().required('O CPF/CNPJ é obrigatório'),
    celular: yup.string().required('O celular é obrigatório'),
    endereco: yup.object().shape({
      cep: yup.string().required('O CEP é obrigatório'),
      logradouro: yup.string().required('O logradouro é obrigatório'),
      numero: yup.string().required('O número é obrigatório'),
      complemento: yup.string(),
      bairro: yup.string().required('O bairro é obrigatório'),
      localidade: yup.string().required('A cidade é obrigatória'),
      uf: yup.string().required('O estado é obrigatório')
    })
  })
});
const FormularioEmissaoNovo = () => {
  const navigate = useNavigate();
  const {
    setIsLoading
  } = useLoadingSpinner();
  const methods = useForm({
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
    reValidateMode: 'onChange'
  });
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    setValue,
    setFocus,
    watch
  } = methods;
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [selectedEmbalagem, setSelectedEmbalagem] = useState<IEmbalagem | null>();
  const [cotacaoSelecionado, setCotacaoSelecionado] = useState<ICotacaoMinimaResponse>();
  const [valorDeclarado, setValorDeclarado] = useState<string>('');
  const {
    onGetCotacaoCorreios,
    cotacoes,
    isLoadingCotacao
  } = useCotacao();
  const {
    onEmissaoCadastro
  } = useEmissao();
  const {
    user: userPayload
  } = useAuth();
  const {
    onBuscaCep
  } = useAddress();
  const {
    data: cliente
  } = useCliente(userPayload?.clienteId || '');
  const {
    data: remetentesResponse
  } = useRemetentes({
    clienteId: userPayload?.clienteId || '',
    page: 1,
    perPage: 100
  });
  useEffect(() => {
    if (cliente && remetentesResponse?.data && !clienteSelecionado) {
      const remetenteCompleto = remetentesResponse.data.find(r => r.id === cliente.id);
      if (remetenteCompleto) {
        setClienteSelecionado(remetenteCompleto);
        setValue('remetenteId', remetenteCompleto.id);
      }
    }
  }, [cliente, remetentesResponse]);
  const handleSelecionaDestinatario = (destinatario: IDestinatario) => {
    if (destinatario) {
      setValue('destinatario.nome', destinatario.nome);
      setValue('destinatario.cpfCnpj', destinatario.cpfCnpj);
      setValue('destinatario.celular', destinatario.celular);
      setValue('destinatario.endereco.cep', destinatario.endereco?.cep || '');
      setValue('destinatario.endereco.logradouro', destinatario.endereco?.logradouro || '');
      setValue('destinatario.endereco.numero', destinatario.endereco?.numero || '');
      setValue('destinatario.endereco.complemento', destinatario.endereco?.complemento || '');
      setValue('destinatario.endereco.bairro', destinatario.endereco?.bairro || '');
      setValue('destinatario.endereco.localidade', destinatario.endereco?.localidade || '');
      setValue('destinatario.endereco.uf', destinatario.endereco?.uf || '');
    }
  };
  const handleCalcularFrete = () => {
    const cepDestino = watch('destinatario.endereco.cep');
    const embalagem = selectedEmbalagem || {
      altura: watch('embalagem.altura'),
      largura: watch('embalagem.largura'),
      comprimento: watch('embalagem.comprimento'),
      peso: watch('embalagem.peso'),
      diametro: 0
    } as IEmbalagem;

    if (embalagem && clienteSelecionado && cepDestino) {
      onGetCotacaoCorreios(
        clienteSelecionado.endereco.cep ?? '', 
        cepDestino, 
        embalagem, 
        valorDeclarado, 
        'N', 
        clienteSelecionado
      );
    } else {
      toast.error('Preencha todos os campos obrigatórios: embalagem e CEP de destino');
    }
  };
  const handlerOnSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const dataSend: IEmissao = {
        remetenteId: clienteSelecionado?.id || '',
        cienteObjetoNaoProibido: true,
        itensDeclaracaoConteudo: [],
        rfidObjeto: '',
        observacao: '',
        chaveNFe: '',
        numeroNotaFiscal: '',
        valorNotaFiscal: 0,
        logisticaReversa: 'N',
        cotacao: cotacaoSelecionado as ICotacaoMinimaResponse,
        embalagem: selectedEmbalagem as IEmbalagem,
        destinatario: data.destinatario,
        valorDeclarado: Number(valorDeclarado.replace(/\D/g, '')) / 100 || 0
      };
      await onEmissaoCadastro(dataSend, setIsLoading);
      toast.success('Etiqueta criada com sucesso!');
      navigate('/app/emissao');
    } catch (error) {
      toast.error('Erro ao criar etiqueta');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Nova etiqueta</h1>
                <p className="text-muted-foreground mt-1">Preencha os dados para criar uma nova etiqueta de envio</p>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handlerOnSubmit)} className="space-y-6">
                    {/* Seção Origem */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold text-primary uppercase">Informe a origem</h2>
                        </div>
                        {clienteSelecionado && <div className="space-y-1">
                                <p className="font-semibold text-foreground">{clienteSelecionado.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                    {clienteSelecionado.endereco?.logradouro}, {clienteSelecionado.endereco?.numero}
                                    {clienteSelecionado.endereco?.complemento && `, ${clienteSelecionado.endereco.complemento}`}
                                    , {clienteSelecionado.endereco?.bairro}, {clienteSelecionado.endereco?.localidade}/{clienteSelecionado.endereco?.uf}
                                </p>
                            </div>}
                    </div>

                    {/* Seção Informações do Pacote */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Package2 className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold text-primary uppercase">Informações do pacote</h2>
                        </div>
                        <div className="space-y-4">
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">Peso (g)</label>
                                    <div className="relative">
                                        <input type="number" {...register('embalagem.peso')} onChange={e => {
                    const peso = Number(e.target.value);
                    setValue('embalagem.peso', peso, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    });
                    setSelectedEmbalagem({
                      ...selectedEmbalagem,
                      peso
                    } as IEmbalagem);
                  }} className={`w-full h-11 px-4 pr-10 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-colors ${errors.embalagem?.peso ? 'border-destructive focus:ring-destructive' : watch('embalagem.peso') && !errors.embalagem?.peso ? 'border-green-500 focus:ring-green-500' : 'border-input focus:ring-ring'}`} placeholder="100" />
                                        {watch('embalagem.peso') && <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {errors.embalagem?.peso ? <AlertCircle className="w-5 h-5 text-destructive" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                                            </div>}
                                    </div>
                                    {errors.embalagem?.peso && <span className="text-xs text-destructive mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.embalagem.peso.message}
                                        </span>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">Altura (cm)</label>
                                    <div className="relative">
                                        <input type="number" {...register('embalagem.altura')} onChange={e => {
                    const altura = Number(e.target.value);
                    setValue('embalagem.altura', altura, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    });
                    setSelectedEmbalagem({
                      ...selectedEmbalagem,
                      altura
                    } as IEmbalagem);
                  }} className={`w-full h-11 px-4 pr-10 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-colors ${errors.embalagem?.altura ? 'border-destructive focus:ring-destructive' : watch('embalagem.altura') && !errors.embalagem?.altura ? 'border-green-500 focus:ring-green-500' : 'border-input focus:ring-ring'}`} placeholder="10" />
                                        {watch('embalagem.altura') && <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {errors.embalagem?.altura ? <AlertCircle className="w-5 h-5 text-destructive" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                                            </div>}
                                    </div>
                                    {errors.embalagem?.altura && <span className="text-xs text-destructive mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.embalagem.altura.message}
                                        </span>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">Largura (cm)</label>
                                    <div className="relative">
                                        <input type="number" {...register('embalagem.largura')} onChange={e => {
                    const largura = Number(e.target.value);
                    setValue('embalagem.largura', largura, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    });
                    setSelectedEmbalagem({
                      ...selectedEmbalagem,
                      largura
                    } as IEmbalagem);
                  }} className={`w-full h-11 px-4 pr-10 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-colors ${errors.embalagem?.largura ? 'border-destructive focus:ring-destructive' : watch('embalagem.largura') && !errors.embalagem?.largura ? 'border-green-500 focus:ring-green-500' : 'border-input focus:ring-ring'}`} placeholder="15" />
                                        {watch('embalagem.largura') && <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {errors.embalagem?.largura ? <AlertCircle className="w-5 h-5 text-destructive" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                                            </div>}
                                    </div>
                                    {errors.embalagem?.largura && <span className="text-xs text-destructive mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.embalagem.largura.message}
                                        </span>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">Comprimento (cm)</label>
                                    <div className="relative">
                                        <input type="number" {...register('embalagem.comprimento')} onChange={e => {
                    const comprimento = Number(e.target.value);
                    setValue('embalagem.comprimento', comprimento, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    });
                    setSelectedEmbalagem({
                      ...selectedEmbalagem,
                      comprimento
                    } as IEmbalagem);
                  }} className={`w-full h-11 px-4 pr-10 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-colors ${errors.embalagem?.comprimento ? 'border-destructive focus:ring-destructive' : watch('embalagem.comprimento') && !errors.embalagem?.comprimento ? 'border-green-500 focus:ring-green-500' : 'border-input focus:ring-ring'}`} placeholder="20" />
                                        {watch('embalagem.comprimento') && <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {errors.embalagem?.comprimento ? <AlertCircle className="w-5 h-5 text-destructive" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                                            </div>}
                                    </div>
                                    {errors.embalagem?.comprimento && <span className="text-xs text-destructive mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.embalagem.comprimento.message}
                                        </span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção Destino */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold text-primary uppercase">Informe o destino</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="mb-4">
                                <AutocompleteDestinatario onSelect={handleSelecionaDestinatario} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputLabel labelTitulo="Nome do destinatário" {...register('destinatario.nome')} fieldError={errors.destinatario?.nome?.message} placeholder="Nome completo" />
                                <InputLabel labelTitulo="CPF/CNPJ" {...register('destinatario.cpfCnpj', {
                onChange: e => setValue('destinatario.cpfCnpj', formatCpfCnpj(e.target.value))
              })} fieldError={errors.destinatario?.cpfCnpj?.message} placeholder="000.000.000-00" />
                                <InputLabel labelTitulo="Telefone" {...register('destinatario.celular', {
                onChange: e => setValue('destinatario.celular', formatTelefone(e.target.value))
              })} fieldError={errors.destinatario?.celular?.message} placeholder="(11) 99999-9999" />
                                <InputLabel labelTitulo="CEP" {...register('destinatario.endereco.cep', {
                onChange: async e => {
                  const cep = formatCep(e.target.value);
                  setValue('destinatario.endereco.cep', cep);
                  if (cep.replace(/\D/g, '').length === 8) {
                    const responseAddress = await onBuscaCep(cep, setIsLoading);
                    if (responseAddress) {
                      setValue('destinatario.endereco.logradouro', responseAddress.logradouro);
                      setValue('destinatario.endereco.bairro', responseAddress.bairro);
                      setValue('destinatario.endereco.localidade', responseAddress.localidade);
                      setValue('destinatario.endereco.uf', responseAddress.uf);
                      setFocus('destinatario.endereco.numero');
                    }
                  }
                }
              })} fieldError={errors.destinatario?.endereco?.cep?.message} placeholder="00000-000" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <InputLabel labelTitulo="Rua" {...register('destinatario.endereco.logradouro')} fieldError={errors.destinatario?.endereco?.logradouro?.message} placeholder="Nome da rua" />
                                </div>
                                <InputLabel labelTitulo="Número" {...register('destinatario.endereco.numero')} fieldError={errors.destinatario?.endereco?.numero?.message} placeholder="123" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputLabel labelTitulo="Complemento" {...register('destinatario.endereco.complemento')} placeholder="Apto, Bloco, etc" />
                                <InputLabel labelTitulo="Bairro" {...register('destinatario.endereco.bairro')} fieldError={errors.destinatario?.endereco?.bairro?.message} placeholder="Nome do bairro" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputLabel labelTitulo="Cidade" {...register('destinatario.endereco.localidade')} fieldError={errors.destinatario?.endereco?.localidade?.message} placeholder="Cidade" />
                                    <InputLabel labelTitulo="UF" {...register('destinatario.endereco.uf')} fieldError={errors.destinatario?.endereco?.uf?.message} placeholder="SP" maxLength={2} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção Valor Declarado */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold text-primary uppercase">Valor declarado</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">Valor do conteúdo</label>
                                <input type="text" onChange={e => {
                const valor = formatCurrency(e.target.value);
                setValorDeclarado(valor);
              }} className="w-full h-11 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="R$ 0,00" />
                                <p className="text-xs text-muted-foreground mt-1">Valor declarado para fins de seguro</p>
                            </div>
                            <div className="flex items-end">
                                <button 
                                    type="button" 
                                    onClick={handleCalcularFrete}
                                    disabled={
                                        !clienteSelecionado || 
                                        !watch('destinatario.endereco.cep') ||
                                        (!selectedEmbalagem && (!watch('embalagem.peso') || !watch('embalagem.altura') || !watch('embalagem.largura') || !watch('embalagem.comprimento')))
                                    }
                                    className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Box className="w-5 h-5" />
                                    Calcular Frete
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Fretes */}
                    {cotacoes && cotacoes.length > 0 && <div className="bg-card border border-border rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-foreground mb-4">Opções de frete</h2>
                            <ListaFretesDisponiveis onSelected={cotacao => {
            setCotacaoSelecionado(cotacao);
          }} data={cotacoes || []} selected={cotacaoSelecionado || null} isLoading={isLoadingCotacao} />
                        </div>}

                    {/* Botões de Ação */}
                    <div className="flex gap-4 justify-end pt-6">
                        <button type="button" onClick={() => navigate('/app/emissao')} className="px-6 py-3 border border-border rounded-lg text-foreground font-medium hover:bg-accent transition-colors flex items-center gap-2">
                            <X className="w-5 h-5" />
                            Cancelar
                        </button>
                        <button type="submit" disabled={!cotacaoSelecionado} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Criar etiqueta
                        </button>
                    </div>
                </form>
            </FormProvider>
        </div>;
};
export default FormularioEmissaoNovo;