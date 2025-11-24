import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import * as yup from 'yup';
import { AutocompleteDestinatario } from '../../../components/autocomplete/AutocompleteDestinatario';
import { ButtonComponent } from '../../../components/button';
import { Divider } from '../../../components/divider';
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
import type { IEmissao, IEmissaoItensDeclaracaoConteudo } from '../../../types/IEmissao';
import { formatCurrency, formatNumberString } from '../../../utils/formatCurrency';
import { formatCep, formatCpfCnpj, formatTelefone, removeNegativo } from '../../../utils/lib.formats';
import { Content } from '../Content';
import { ModalCadastrarDestinatario } from '../destinatario/ModalCadastrarDestinatario';
import { ModalNovaEmbalagem } from '../embalagem/ModalNovaEmbalagem';
import { SelecionarRemetente } from '../../../components/SelecionarRemetente';
import { ListaFretesDisponiveis } from './ListaFretesDisponiveis';

const createValidationSchema = (isNotaFiscalRequired: boolean) => {
    return yup.object().shape({
        nomeRemetente: yup.string().required('O nome do remetente é obrigatório'),
        remetenteId: yup.string().required('O remetente é obrigatório'),
        observacoes: yup.string(),
        rfid: yup.string(),
        cienteObjetoNaoProibido: yup.boolean().required('O ciente do objeto nao proibido é obrigatório'),
        numeroNotaFiscal: yup.string(),
        chaveNFe: yup.string(),
        embalagem: yup.object().shape({
            id: yup.string(),
            altura: yup.number().typeError('A altura deve ser um número').required('A altura do produto é obrigatório'),
            comprimento: yup.number().typeError('O comprimento deve ser um número').required('O comprimento do produto é obrigatório'),
            largura: yup.number().typeError('A largura deve ser um número').required('A largura do produto é obrigatório'),
            peso: yup.number().typeError('O peso deve ser um número').required('O peso do produto é obrigatório'),
            diametro: yup.number().optional().typeError('O diametro deve ser um número'),
            formatoObjeto: yup.string(),
        }),
        destinatario: yup.object().shape({
            nome: yup.string().required('O destinatario é obrigatório'),
            cpfCnpj: yup.string().required('O destinatario é obrigatório'),
            celular: yup.string().required('O celular é obrigatório'),
            endereco: yup.object().shape({
                cep: yup.string().required('O cep é obrigatório'),
                logradouro: yup.string().required('O logradouro é obrigatório'),
                numero: yup.string().required('O numero é obrigatório'),
                complemento: yup.string(),
                bairro: yup.string().required('O bairro é obrigatório'),
                localidade: yup.string().required('A cidade é obrigatória'),
                uf: yup.string().required('O estado é obrigatório'),
            }),
        }),
        cotacao: yup
            .object()
            .shape({
                codigoServico: yup.string(),
                idLote: yup.string(),
                nomeServico: yup.string().optional(),
                prazo: yup.string().optional(),
                preco: yup.string().optional(),
            })
            .test('cotacao-required', 'Selecione o serviço de frete que deseja', (value) => !!(value && value.codigoServico)),
        valorDeclarado: yup.string(),
        valorNotaFiscal: isNotaFiscalRequired ? yup.string().required('O valor da nota fiscal é obrigatório para este frete') : yup.string().optional(),
        logisticaReversa: yup.string(),
    });
};

// Schema inicial para o tipo
const schameFormProdutos = createValidationSchema(false);

type FormDataProduto = yup.InferType<typeof schameFormProdutos>;

interface FormularioProdutoProps {
    onCancel?: () => void;
}

const FormularioEmissao = ({ onCancel }: FormularioProdutoProps) => {
    const { setIsLoading } = useLoadingSpinner();
    const location = useLocation();

    // Estados necessários para o schema dinâmico
    const [cotacaoSelecionado, setCotacaoSelecionado] = useState<ICotacaoMinimaResponse>();

    // Schema dinâmico baseado na cotação selecionada
    const validationSchema = useMemo(() => {
        return createValidationSchema(cotacaoSelecionado?.isNotaFiscal === true);
    }, [cotacaoSelecionado?.isNotaFiscal]);

    const methods = useForm<FormDataProduto>({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            cienteObjetoNaoProibido: true,
            embalagem: { diametro: 0 },
        },
    });
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        setFocus,
        clearErrors,
        watch,
    } = methods;
    const [produtoId] = useParams().produtoId ? [useParams().produtoId] : [];

    const [declaracaoConteudo, setDeclaracaoConteudo] = useState<IEmissaoItensDeclaracaoConteudo[]>([]);
    const [selectedEmbalagem, setSelectedEmbalagem] = useState<IEmbalagem | null>();
    const [dimensoes, setDimensoes] = useState<Partial<IEmbalagem>>({});
    const [isModalOpenNovaEmbalagem, setIsModalOpenNovaEmbalagem] = useState<boolean>(false);

    const [destinatarioSelecionado, setDestinatarioSelecionado] = useState<IDestinatario | null>();
    const [isModalOpenDestinatario, setIsModalOpenDestinatario] = useState<boolean>(false);
    const [prefilledApplied, setPrefilledApplied] = useState(false);

    const [valorDeclarado, setValorDeclarado] = useState<string>('');
    const [valorNotaFiscal, setValorNotaFiscal] = useState<string>('');

    const { onGetCotacaoCorreios, cotacoes, setCotacoes, isLoadingCotacao } = useCotacao();
    const { onEmissaoCadastro } = useEmissao();
    const { user: userPayload } = useAuth();
    const { onBuscaCep } = useAddress();

    const { data: cliente } = useCliente(userPayload?.clienteId || '');
    const { data: remetentesResponse } = useRemetentes({
        clienteId: userPayload?.clienteId || '',
        page: 1,
        perPage: 100, // Busca uma quantidade grande para pegar todos
    });
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

    useEffect(() => {
        if (cliente && remetentesResponse?.data && !clienteSelecionado) {
            console.log('Cliente logado:', cliente);
            console.log('Lista de remetentes:', remetentesResponse.data);

            // Busca o remetente completo na lista que corresponde ao cliente logado
            const remetenteCompleto = remetentesResponse.data.find((remetente) => remetente.id === cliente.id);

            console.log('Remetente completo encontrado:', remetenteCompleto);

            if (remetenteCompleto) {
                setClienteSelecionado(remetenteCompleto);
                setValue('nomeRemetente', remetenteCompleto.nome);
                setValue('remetenteId', remetenteCompleto.id);
            } else {
                // Fallback: se não encontrar na lista, usa o cliente logado mesmo sem cpfCnpj
                console.warn('Remetente não encontrado na lista, usando cliente logado');
                setClienteSelecionado(cliente);
                setValue('nomeRemetente', cliente.nome);
                setValue('remetenteId', cliente.id);
            }
        }
    }, [cliente, remetentesResponse]);

    // Preencher formulário com dados da etiqueta a ser regerada
    useEffect(() => {
        const prefilledData = (location.state as any)?.prefilledData;
        if (prefilledData && !prefilledApplied) {
            console.log('Dados pré-preenchidos detectados:', prefilledData);
            setPrefilledApplied(true);

            // Preencher destinatário
            if (prefilledData.destinatario) {
                const dest = prefilledData.destinatario;
                setValue('destinatario.nome', dest.nome || '');
                setValue('destinatario.cpfCnpj', dest.cpfCnpj ? formatCpfCnpj(dest.cpfCnpj) : '');
                setValue('destinatario.celular', dest.celular ? formatTelefone(dest.celular) : '');
                
                if (dest.endereco) {
                    setValue('destinatario.endereco.cep', dest.endereco.cep ? formatCep(dest.endereco.cep) : '');
                    setValue('destinatario.endereco.logradouro', dest.endereco.logradouro || '');
                    setValue('destinatario.endereco.numero', dest.endereco.numero || '');
                    setValue('destinatario.endereco.complemento', dest.endereco.complemento || '');
                    setValue('destinatario.endereco.bairro', dest.endereco.bairro || '');
                    setValue('destinatario.endereco.localidade', dest.endereco.localidade || '');
                    setValue('destinatario.endereco.uf', dest.endereco.uf || '');
                }
                setDestinatarioSelecionado(dest);
            }

            // Preencher embalagem
            if (prefilledData.embalagem) {
                const emb = prefilledData.embalagem;
                setValue('embalagem.altura', emb.altura || 0);
                setValue('embalagem.largura', emb.largura || 0);
                setValue('embalagem.comprimento', emb.comprimento || 0);
                setValue('embalagem.peso', emb.peso || 0);
                setValue('embalagem.diametro', emb.diametro || 0);
                setSelectedEmbalagem(emb);
                setDimensoes(emb);
            }

            // Preencher outros campos
            if (prefilledData.valorDeclarado) {
                const valorFormatado = formatCurrency(String(prefilledData.valorDeclarado));
                setValorDeclarado(valorFormatado);
                setValue('valorDeclarado', valorFormatado);
            }

            if (prefilledData.observacao) {
                setValue('observacoes', prefilledData.observacao);
            }

            if (prefilledData.chaveNFe) {
                setValue('chaveNFe', prefilledData.chaveNFe);
            }

            if (prefilledData.numeroNotaFiscal) {
                setValue('numeroNotaFiscal', prefilledData.numeroNotaFiscal);
            }

            toast.success('Dados carregados! Revise e calcule o frete para gerar a nova etiqueta');
        }
    }, [location.state, prefilledApplied]);

    const handlerOnSubmit = async (data: FormDataProduto) => {
        const destinatario: IDestinatario = {
            ...data.destinatario,
            id: destinatarioSelecionado?.id || '',
            nome: data.destinatario.nome,
            cpfCnpj: formatCpfCnpj(data.destinatario.cpfCnpj),
            endereco: {
                ...data.destinatario.endereco,
                complemento: data.destinatario.endereco?.complemento ? data.destinatario.endereco?.complemento : '',
            },
        };

        try {
            const dataSend: IEmissao = {
                remetenteId: clienteSelecionado?.id || '',
                cienteObjetoNaoProibido: data.cienteObjetoNaoProibido,
                itensDeclaracaoConteudo: declaracaoConteudo,
                rfidObjeto: data.rfid || '',
                observacao: data.observacoes,
                chaveNFe: data.chaveNFe || '',
                numeroNotaFiscal: data.numeroNotaFiscal || '',
                logisticaReversa: logisticaReversa,
                cotacao: cotacaoSelecionado as ICotacaoMinimaResponse,
                embalagem: selectedEmbalagem as IEmbalagem,
                valorDeclarado: Number(formatNumberString(valorDeclarado || '0')),
                valorNotaFiscal: Number(formatNumberString(valorNotaFiscal || '0')),
                destinatario: destinatario,
                // Envia o remetente completo com endereço para replicar comportamento da API
                remetente: clienteSelecionado ? {
                    id: clienteSelecionado.id,
                    nome: clienteSelecionado.nome,
                    cpfCnpj: clienteSelecionado.cpfCnpj,
                    documentoEstrangeiro: clienteSelecionado.documentoEstrangeiro || '',
                    celular: clienteSelecionado.celular || '',
                    telefone: clienteSelecionado.telefone || '',
                    email: clienteSelecionado.email || '',
                    endereco: clienteSelecionado.endereco,
                } : undefined,
            };
            await onEmissaoCadastro(dataSend, setIsLoading);

            // Reseta o formulário e os estados utilizados
            reset();
            setSelectedEmbalagem(null);
            setValorDeclarado('');
            setDeclaracaoConteudo([]);

            setCotacoes(undefined);
            setDestinatarioSelecionado(undefined);
            setCotacaoSelecionado(undefined);

            // Redefine o remetente padrão (o cliente logado da lista de remetentes)
            if (remetentesResponse?.data && cliente) {
                const remetenteCompleto = remetentesResponse.data.find((remetente) => remetente.id === cliente.id);
                if (remetenteCompleto) {
                    setClienteSelecionado(remetenteCompleto);
                    setValue('nomeRemetente', remetenteCompleto.nome);
                    setValue('remetenteId', remetenteCompleto.id);
                } else {
                    setValue('nomeRemetente', cliente?.nome);
                    setValue('remetenteId', cliente?.id);
                }
            } else {
                setValue('nomeRemetente', cliente?.nome);
                setValue('remetenteId', cliente?.id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCancel = () => {
        clearErrors();
        onCancel?.();
        reset();
    };

    const handleSelecionaDestinatario = (destinatario: IDestinatario) => {
        setValue('destinatario.nome', destinatario.nome);
        setValue('destinatario.cpfCnpj', formatCpfCnpj(destinatario.cpfCnpj), { shouldValidate: true });
        setValue('destinatario.celular', formatTelefone(destinatario.celular), { shouldValidate: true });

        if (destinatario.endereco) {
            setValue('destinatario.endereco.cep', formatCep(destinatario.endereco?.cep), { shouldValidate: true });
            setValue('destinatario.endereco.logradouro', destinatario.endereco?.logradouro, { shouldValidate: true });
            setValue('destinatario.endereco.numero', destinatario.endereco?.numero, { shouldValidate: true });
            setValue('destinatario.endereco.complemento', destinatario.endereco?.complemento, { shouldValidate: true });
            setValue('destinatario.endereco.bairro', destinatario.endereco?.bairro, { shouldValidate: true });
            setValue('destinatario.endereco.localidade', destinatario.endereco?.localidade, { shouldValidate: true });
            setValue('destinatario.endereco.uf', destinatario.endereco?.uf, { shouldValidate: true });
        }

        setDestinatarioSelecionado(destinatario);
    };

    const handleCotacaoSelecionado = (cotacao: ICotacaoMinimaResponse) => {
        setCotacaoSelecionado(cotacao);

        setValue('cotacao.codigoServico', cotacao.codigoServico);
        setValue('cotacao.idLote', cotacao.idLote);
        setValue('cotacao.nomeServico', cotacao.nomeServico);
        setValue('cotacao.prazo', cotacao.prazo.toString());
        setValue('cotacao.preco', formatCurrency(cotacao.preco));
        clearErrors('cotacao');

        // Se não exige nota fiscal, limpa o erro se houver
        if (cotacao.isNotaFiscal !== true) {
            clearErrors('valorNotaFiscal');
        }
    };

    useEffect(() => {
        if (errors.cotacao && errors.cotacao.message) {
            toast.error('Selecione uma opção de frete', { duration: 5000, position: 'top-center' });
        }
    }, [errors.cotacao]);

    const handleReculcar = () => {
        setCotacaoSelecionado(undefined);
        setValue('cotacao.codigoServico', '');
        setValue('cotacao.idLote', '');
        setValue('cotacao.nomeServico', '');
        setValue('cotacao.prazo', '');
        setValue('cotacao.preco', '');
        if (selectedEmbalagem && clienteSelecionado && destinatarioSelecionado) {
            onGetCotacaoCorreios(
                clienteSelecionado.endereco.cep ?? '',
                destinatarioSelecionado?.endereco?.cep ?? '',
                selectedEmbalagem as IEmbalagem,
                valorDeclarado,
                watch('logisticaReversa') ? 'S' : 'N',
                clienteSelecionado
            );
        }
    };

    const handleOnSetEmbalagem = (valor: number, campo: keyof IEmbalagem) => {
        const atual = { ...dimensoes, [campo]: valor };

        setDimensoes(atual);

        if (atual.altura !== undefined && atual.largura !== undefined && atual.comprimento !== undefined && atual.peso !== undefined) {
            const embalagem: IEmbalagem = {
                id: '', // opcional, caso precise
                descricao: '',
                altura: atual.altura,
                largura: atual.largura,
                comprimento: atual.comprimento,
                peso: atual.peso,
                diametro: 0,
                formatoObjeto: 'CAIXA_PACOTE',
            };

            setSelectedEmbalagem(embalagem);
        }
    };

    const handleOnSetDestinatario = (valor: string, propertyPath: string) => {
        if (propertyPath.includes('.')) {
            const [parent, child] = propertyPath.split('.');
            if (parent === 'endereco') {
                setDestinatarioSelecionado(
                    (prev) =>
                        ({
                            ...prev,
                            endereco: {
                                ...prev?.endereco,
                                [child]: valor,
                            },
                        } as IDestinatario)
                );
            }
        } else {
            setDestinatarioSelecionado(
                (prev) =>
                    ({
                        ...prev,
                        [propertyPath]: valor,
                    } as IDestinatario)
            );
        }
    };

    const logisticaReversa = watch('logisticaReversa') ? 'S' : 'N';
    return (
        <Content titulo={` ${produtoId ? 'Editar' : 'Cadastro de'} Etiqueta`}>
            <FormProvider {...methods}>
                <form
                    className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 w-full p-6 gap-4 space-y-4 rounded-xl"
                    onSubmit={handleSubmit(handlerOnSubmit)}
                >
                    <SelecionarRemetente
                        remetenteSelecionado={clienteSelecionado}
                        onSelect={(remetente) => {
                            setClienteSelecionado(remetente);
                            setValue('nomeRemetente', remetente.nome);
                            setValue('remetenteId', remetente.id);
                        }}
                        titulo="Remetente:"
                        showChangeButton={true}
                        variant="default"
                    />
                    <Divider />

                    <div className="flex flex-col w-full gap-2">
                        <h1 className="font-semibold text-2xl">Destinatário:</h1>
                        <div className="flex flex-col w-full gap-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="w-full col-span-6">
                                    <AutocompleteDestinatario onSelect={handleSelecionaDestinatario} />
                                </div>
                                <div className="w-full col-span-3">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="CPF/CNPJ:"
                                        {...register('destinatario.cpfCnpj', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = formatCpfCnpj(e.target.value);
                                                setValue('destinatario.cpfCnpj', valor);
                                                handleOnSetDestinatario(valor, 'cpfCnpj');
                                            },
                                        })}
                                        fieldError={errors.destinatario?.cpfCnpj?.message}
                                    />
                                </div>
                                <div className="w-full col-span-3">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="Celular"
                                        {...register('destinatario.celular', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = formatTelefone(e.target.value, 'celular');
                                                setValue('destinatario.celular', valor);
                                                handleOnSetDestinatario(valor, 'celular');
                                            },
                                        })}
                                        fieldError={errors.destinatario?.celular?.message}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-12 gap-1 pb-4">
                                <div className="sm:col-span-3 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="CEP"
                                        {...register('destinatario.endereco.cep', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = formatCep(e.target.value);
                                                setValue('destinatario.endereco.cep', valor);
                                                handleOnSetDestinatario(valor, 'endereco.cep');
                                                clearErrors('destinatario.endereco.cep');
                                                //valida o cep com 8 caracteres e so podemos buscar o cep se o cep for valido e remover caracteres
                                                const responseAddress = await onBuscaCep(e.target.value, setIsLoading);

                                                if (responseAddress) {
                                                    setValue('destinatario.endereco.logradouro', responseAddress?.logradouro ?? '');

                                                    setValue('destinatario.endereco.bairro', responseAddress?.bairro ?? '');
                                                    setValue('destinatario.endereco.localidade', responseAddress?.localidade ?? '');
                                                    setValue('destinatario.endereco.uf', responseAddress?.uf ?? '');
                                                    handleOnSetDestinatario(valor, 'endereco.uf');
                                                    setFocus('destinatario.endereco.numero');
                                                }
                                            },
                                        })}
                                        fieldError={errors.destinatario?.endereco?.cep && errors.destinatario.endereco.cep.message}
                                    />
                                </div>
                                <div className="sm:col-span-6 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="Rua"
                                        {...register('destinatario.endereco.logradouro', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                setValue('destinatario.endereco.logradouro', valor);
                                                handleOnSetDestinatario(valor, 'endereco.logradouro');
                                                clearErrors('destinatario.endereco.logradouro');
                                            },
                                        })}
                                        fieldError={errors.destinatario?.endereco?.logradouro && errors.destinatario?.endereco?.logradouro.message}
                                    />
                                </div>
                                <div className="sm:col-span-3 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="Numero"
                                        {...register('destinatario.endereco.numero', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                setValue('destinatario.endereco.numero', valor);
                                                handleOnSetDestinatario(valor, 'endereco.numero');
                                                clearErrors('destinatario.endereco.numero');
                                            },
                                        })}
                                        fieldError={errors.destinatario?.endereco?.numero && errors.destinatario?.endereco?.numero.message}
                                    />
                                </div>
                                <div className="sm:col-span-12 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="Complemento"
                                        {...register('destinatario.endereco.complemento', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                setValue('destinatario.endereco.complemento', valor);
                                                handleOnSetDestinatario(valor, 'endereco.complemento');
                                            },
                                        })}
                                        fieldError={errors.destinatario?.endereco?.complemento && errors.destinatario?.endereco?.complemento.message}
                                    />
                                </div>
                                <div className="sm:col-span-4 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="Bairro"
                                        {...register('destinatario.endereco.bairro', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                setValue('destinatario.endereco.bairro', valor);
                                                handleOnSetDestinatario(valor, 'endereco.bairro');
                                                clearErrors('destinatario.endereco.bairro');
                                            },
                                        })}
                                        fieldError={errors.destinatario?.endereco?.bairro && errors.destinatario?.endereco?.bairro.message}
                                    />
                                </div>
                                <div className="sm:col-span-4 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="Cidade"
                                        {...register('destinatario.endereco.localidade', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                setValue('destinatario.endereco.localidade', valor);
                                                handleOnSetDestinatario(valor, 'endereco.localidade');
                                                clearErrors('destinatario.endereco.localidade');
                                            },
                                        })}
                                        disabled
                                        isDisabled
                                        fieldError={errors.destinatario?.endereco?.localidade && errors.destinatario?.endereco?.localidade.message}
                                    />
                                </div>
                                <div className="sm:col-span-4 col-span-12 w-full">
                                    <InputLabel
                                        type="text"
                                        labelTitulo="UF"
                                        {...register('destinatario.endereco.uf', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                setValue('destinatario.endereco.uf', valor);
                                                handleOnSetDestinatario(valor, 'endereco.uf');
                                                clearErrors('destinatario.endereco.uf');
                                            },
                                        })}
                                        disabled
                                        isDisabled
                                        fieldError={errors.destinatario?.endereco?.uf && errors.destinatario?.endereco?.uf.message}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" {...register('logisticaReversa')} className="h-5 w-5 accent-purple-600 cursor-pointer" />
                                Logistica Reversa
                            </label>
                            <p className="text-xs text-slate-400">
                                Somente para devoluções. Prazo de expiração: <span className="font-semibold text-black">10 dias</span> após a solicitação.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col w-full pt-4 gap-4">
                        <div className="flex gap-1 w-full rounded-lg flex-col">
                            <h1 className="font-semibold text-1xl col-span-6">Dimensões (cm):</h1>
                            <div className="grid sm:md:lg:grid-cols-12 gap-3 w-full rounded-lg flex-col">
                                <div className="col-span-3">
                                    <InputLabel
                                        labelTitulo="Altura:"
                                        type="number"
                                        placeholder="0"
                                        {...register('embalagem.altura', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = Number(e.target.value);
                                                handleOnSetEmbalagem(removeNegativo(valor), 'altura');
                                                setValue('embalagem.altura', removeNegativo(valor));
                                            },
                                        })}
                                        fieldError={errors?.embalagem?.altura?.message}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <InputLabel
                                        labelTitulo="largura:"
                                        type="number"
                                        placeholder="0"
                                        {...register('embalagem.largura', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = Number(e.target.value);
                                                handleOnSetEmbalagem(removeNegativo(valor), 'largura');
                                                setValue('embalagem.largura', removeNegativo(valor));
                                            },
                                        })}
                                        fieldError={errors.embalagem?.largura?.message}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <InputLabel
                                        labelTitulo="Comprimento:"
                                        type="number"
                                        placeholder="0"
                                        {...register('embalagem.comprimento', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = Number(e.target.value);
                                                handleOnSetEmbalagem(removeNegativo(valor), 'comprimento');
                                                setValue('embalagem.comprimento', removeNegativo(valor));
                                            },
                                        })}
                                        fieldError={errors.embalagem?.comprimento?.message}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <InputLabel
                                        labelTitulo="Peso:"
                                        type="number"
                                        placeholder="0"
                                        {...register('embalagem.peso', {
                                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const valor = e.target.value;
                                                handleOnSetEmbalagem(removeNegativo(valor), 'peso');
                                                setValue('embalagem.peso', removeNegativo(valor));
                                            },
                                        })}
                                        fieldError={errors.embalagem?.peso?.message}
                                    />
                                </div>
                            </div>
                            <small className="text-xs text-gray-500">
                                o peso deve ser em gramas. Ex: 100 gramas = 100 (<small className="text-red-500">Apenas números</small>)
                            </small>
                        </div>
                        <div className="flex flex-row w-full gap-3 items-end">
                            <div className="flex flex-col w-full">
                                <InputLabel
                                    labelTitulo="Valor Declarado:"
                                    type="text"
                                    placeholder="0"
                                    {...register('valorDeclarado', {
                                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const valor = formatCurrency(e.target.value);
                                            setValue('valorDeclarado', valor);
                                            setValorDeclarado(valor);
                                        },
                                    })}
                                    fieldError={errors.valorDeclarado?.message}
                                />
                            </div>
                        </div>

                        <div className="w-full">
                            <ButtonComponent
                                {...(selectedEmbalagem && destinatarioSelecionado ? {} : { disabled: true })}
                                type="button"
                                onClick={handleReculcar}
                            >
                                <Box /> Calcular Frete
                            </ButtonComponent>
                        </div>
                    </div>

                    {/* Fretes disponiveis */}
                    <div className="flex flex-col w-full pt-4 gap-4">
                        <ListaFretesDisponiveis
                            onSelected={handleCotacaoSelecionado}
                            data={cotacoes || []}
                            selected={cotacaoSelecionado || null}
                            isLoading={isLoadingCotacao}
                        />
                        {errors.cotacao && <span className="text-red-500 text-sm">{errors.cotacao.message}</span>}

                        {cotacaoSelecionado && (
                            <div className="p-4 bg-green-100 border border-green-300 text-green-800 rounded-md">
                                <p className="font-semibold">Serviço Selecionado:</p>
                                <p>{cotacaoSelecionado.nomeServico}</p>
                                <p>Prazo: {cotacaoSelecionado.prazo} dias úteis</p>
                                <p>Valor: {cotacaoSelecionado.preco.toString()}</p>
                            </div>
                        )}
                    </div>

                    {cotacaoSelecionado?.isNotaFiscal && (
                        <div className="flex flex-row w-full gap-3 items-end">
                            <div className="flex flex-col w-full">
                                <InputLabel
                                    labelTitulo="Valor da Nota Fiscal:"
                                    type="text"
                                    placeholder="0"
                                    {...register('valorNotaFiscal', {
                                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const valor = formatCurrency(e.target.value);
                                            setValue('valorNotaFiscal', valor);
                                            setValorNotaFiscal(valor);

                                            // Limpa o erro se preencheu e o frete exige nota fiscal
                                            if (cotacaoSelecionado?.isNotaFiscal === true && valor && valor.trim() !== '') {
                                                clearErrors('valorNotaFiscal');
                                            }
                                        },
                                    })}
                                    fieldError={errors.valorNotaFiscal?.message}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col w-full pt-4 gap-4">
                        <h1 className="font-semibold text-2xl">Dados complementares:</h1>
                        <div className="grid sm:md:lg:grid-cols-6 gap-3 w-full rounded-lg flex-col">
                            <div className="flex flex-col w-full col-span-6">
                                <InputLabel labelTitulo="Observação:" type="text" {...register('observacoes')} fieldError={errors.observacoes?.message} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-10">
                        <ButtonComponent {...(selectedEmbalagem && destinatarioSelecionado && cotacaoSelecionado ? {} : { disabled: true })}>
                            <Save /> Salvar
                        </ButtonComponent>
                        <ButtonComponent border="outline" onClick={handleCancel} type="button">
                            Limpar
                        </ButtonComponent>
                    </div>
                </form>
            </FormProvider>
            <ModalCadastrarDestinatario isOpen={isModalOpenDestinatario} onCancel={() => setIsModalOpenDestinatario(false)} />
            <ModalNovaEmbalagem isOpen={isModalOpenNovaEmbalagem} onCancel={() => setIsModalOpenNovaEmbalagem(false)} />
        </Content>
    );
};

export default FormularioEmissao;
