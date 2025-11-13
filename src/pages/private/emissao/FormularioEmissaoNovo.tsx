import { yupResolver } from '@hookform/resolvers/yup';
import { Box, MapPin, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as yup from 'yup';
import { AutocompleteDestinatario } from '../../../components/autocomplete/AutocompleteDestinatario';
import { InputWithValidation } from '../../../components/input-with-validation';
import { useAddress } from '../../../hooks/useAddress';
import { useCliente } from '../../../hooks/useCliente';
import { useCotacao } from '../../../hooks/useCotacao';
import { useEmissao } from '../../../hooks/useEmissao';
import { useAuth } from '../../../providers/AuthContext';
import { useRemetentes } from '../../../hooks/useRemetente';
import type { ICotacaoMinimaResponse } from '../../../types/ICotacao';
import type { IDestinatario } from '../../../types/IDestinatario';
import type { IEmbalagem } from '../../../types/IEmbalagem';
import type { IEmissao } from '../../../types/IEmissao';
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
  const methods = useForm({
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
    reValidateMode: 'onChange'
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = methods;

  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [cotacaoSelecionado, setCotacaoSelecionado] = useState<ICotacaoMinimaResponse>();
  const [valorDeclarado, setValorDeclarado] = useState<string>('');
  const [isLoading, setIsLoadingLocal] = useState(false);

  const { onGetCotacaoCorreios, cotacoes } = useCotacao();
  const { onEmissaoCadastro } = useEmissao();
  const { user: userPayload } = useAuth();
  const { onBuscaCep } = useAddress();
  const { data: cliente } = useCliente(userPayload?.clienteId || '');
  const { data: remetentesResponse } = useRemetentes({
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
  }, [cliente, remetentesResponse, clienteSelecionado, setValue]);

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
    const embalagem = {
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
    if (!cotacaoSelecionado) {
      toast.error('Selecione uma cotação de frete');
      return;
    }

    const requestData: IEmissao = {
      ...data,
      cotacao: cotacaoSelecionado,
      valorDeclarado: parseFloat(valorDeclarado.replace(/\D/g, '')) / 100,
      valorNotaFiscal: 0,
      logisticaReversa: 'N',
      cienteObjetoNaoProibido: true
    };

    try {
      setIsLoadingLocal(true);
      await onEmissaoCadastro(requestData, setIsLoadingLocal);
      toast.success('Etiqueta criada com sucesso!');
      navigate('/app/emissao');
    } catch (error) {
      toast.error('Erro ao criar etiqueta');
      setIsLoadingLocal(false);
    }
  };

  const handleBuscarCep = async (cep: string) => {
    if (cep.length === 9) {
      const result = await onBuscaCep(cep.replace(/\D/g, ''), () => {});
      if (result) {
        setValue('destinatario.endereco.logradouro', result.logradouro);
        setValue('destinatario.endereco.bairro', result.bairro);
        setValue('destinatario.endereco.localidade', result.localidade);
        setValue('destinatario.endereco.uf', result.uf);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Nova etiqueta</h1>
          <p className="text-muted-foreground">Preencha os dados para criar uma nova etiqueta de envio</p>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handlerOnSubmit)} className="space-y-6">
            
            {/* Origem */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Informe a origem</h3>
              </div>

              <div className="space-y-2">
                {clienteSelecionado ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{clienteSelecionado.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {clienteSelecionado.endereco?.logradouro}, {clienteSelecionado.endereco?.numero}, {clienteSelecionado.endereco?.complemento}, {clienteSelecionado.endereco?.bairro}, {clienteSelecionado.endereco?.localidade}/{clienteSelecionado.endereco?.uf}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione um remetente...</p>
                )}
              </div>
            </div>

            {/* Pacote */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Informações do pacote</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Formato</label>
                  <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>Caixa / Pacote</option>
                    <option>Envelope</option>
                    <option>Rolo / Cilindro</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Peso (g)</label>
                    <input
                      type="number"
                      {...register('embalagem.peso')}
                      placeholder="100"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.embalagem?.peso && (
                      <p className="text-xs text-destructive mt-1">{errors.embalagem.peso.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Altura (cm)</label>
                    <input
                      type="number"
                      {...register('embalagem.altura')}
                      placeholder="10"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.embalagem?.altura && (
                      <p className="text-xs text-destructive mt-1">{errors.embalagem.altura.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Largura (cm)</label>
                    <input
                      type="number"
                      {...register('embalagem.largura')}
                      placeholder="15"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.embalagem?.largura && (
                      <p className="text-xs text-destructive mt-1">{errors.embalagem.largura.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Comprimento (cm)</label>
                    <input
                      type="number"
                      {...register('embalagem.comprimento')}
                      placeholder="20"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.embalagem?.comprimento && (
                      <p className="text-xs text-destructive mt-1">{errors.embalagem.comprimento.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Destino */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Informe o destino</h3>
              </div>

              <div className="space-y-4">
                <div className="mb-4">
                  <AutocompleteDestinatario onSelect={handleSelecionaDestinatario} />
                </div>

                <InputWithValidation
                  label="Nome do destinatário"
                  placeholder="Nome completo"
                  {...register('destinatario.nome')}
                  error={errors.destinatario?.nome?.message}
                  value={watch('destinatario.nome')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithValidation
                    label="CPF/CNPJ"
                    placeholder="000.000.000-00"
                    {...register('destinatario.cpfCnpj')}
                    error={errors.destinatario?.cpfCnpj?.message}
                    value={watch('destinatario.cpfCnpj')}
                    onChange={(e) => setValue('destinatario.cpfCnpj', formatCpfCnpj(e.target.value))}
                  />

                  <InputWithValidation
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    {...register('destinatario.celular')}
                    error={errors.destinatario?.celular?.message}
                    value={watch('destinatario.celular')}
                    onChange={(e) => setValue('destinatario.celular', formatTelefone(e.target.value))}
                  />
                </div>

                <InputWithValidation
                  label="CEP"
                  placeholder="00000-000"
                  {...register('destinatario.endereco.cep')}
                  error={errors.destinatario?.endereco?.cep?.message}
                  value={watch('destinatario.endereco.cep')}
                  onChange={(e) => {
                    const formatted = formatCep(e.target.value);
                    setValue('destinatario.endereco.cep', formatted);
                    handleBuscarCep(formatted);
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <InputWithValidation
                      label="Rua"
                      placeholder="Nome da rua"
                      {...register('destinatario.endereco.logradouro')}
                      error={errors.destinatario?.endereco?.logradouro?.message}
                      value={watch('destinatario.endereco.logradouro')}
                    />
                  </div>
                  <InputWithValidation
                    label="Número"
                    placeholder="123"
                    {...register('destinatario.endereco.numero')}
                    error={errors.destinatario?.endereco?.numero?.message}
                    value={watch('destinatario.endereco.numero')}
                  />
                </div>

                <InputWithValidation
                  label="Complemento"
                  placeholder="Apto, bloco, etc"
                  {...register('destinatario.endereco.complemento')}
                  value={watch('destinatario.endereco.complemento')}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputWithValidation
                    label="Bairro"
                    placeholder="Nome do bairro"
                    {...register('destinatario.endereco.bairro')}
                    error={errors.destinatario?.endereco?.bairro?.message}
                    value={watch('destinatario.endereco.bairro')}
                  />

                  <InputWithValidation
                    label="Cidade"
                    placeholder="Nome da cidade"
                    {...register('destinatario.endereco.localidade')}
                    error={errors.destinatario?.endereco?.localidade?.message}
                    value={watch('destinatario.endereco.localidade')}
                  />

                  <InputWithValidation
                    label="UF"
                    placeholder="SP"
                    {...register('destinatario.endereco.uf')}
                    error={errors.destinatario?.endereco?.uf?.message}
                    value={watch('destinatario.endereco.uf')}
                  />
                </div>
              </div>
            </div>

            {/* Valor Declarado */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Valor declarado</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Valor do conteúdo</label>
                  <input
                    type="text"
                    value={valorDeclarado}
                    onChange={(e) => setValorDeclarado(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Valor declarado para fins de seguro</p>
                </div>
              </div>
            </div>

            {/* Botão Calcular Frete */}
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={handleCalcularFrete}
                disabled={
                  !clienteSelecionado || 
                  !watch('destinatario.endereco.cep') ||
                  (!watch('embalagem.peso') || !watch('embalagem.altura') || !watch('embalagem.largura') || !watch('embalagem.comprimento'))
                }
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calcular Frete
              </button>
            </div>

            {/* Lista de Cotações */}
            {cotacoes && cotacoes.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Escolha uma opção de frete</h3>
                <ListaFretesDisponiveis
                  data={cotacoes}
                  selected={cotacaoSelecionado || null}
                  onSelected={(cotacao: ICotacaoMinimaResponse) => {
                    setCotacaoSelecionado(cotacao);
                    toast.success('Frete selecionado!');
                  }}
                />
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => navigate('/app/emissao')}
                className="px-6 py-2 border border-border text-foreground rounded-md font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !cotacaoSelecionado}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Criando...' : 'Criar etiqueta'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export default FormularioEmissaoNovo;
