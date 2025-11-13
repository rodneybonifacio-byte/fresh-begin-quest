import { yupResolver } from '@hookform/resolvers/yup';
import { Box } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { CotacaoList } from '../../../components/CotacaoList';
import { InputLabel } from '../../../components/input-label';
import { SelecionarRemetente } from '../../../components/SelecionarRemetente';
import { useAddress } from '../../../hooks/useAddress';
import { useCliente } from '../../../hooks/useCliente';
import { useCotacao } from '../../../hooks/useCotacao';
import { useAuth } from '../../../providers/AuthContext';
import { useLoadingSpinner } from '../../../providers/LoadingSpinnerContext';
import type { IEmbalagem } from '../../../types/IEmbalagem';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatCep, removeNegativo } from '../../../utils/lib.formats';
import { Content } from '../Content';

const schame = yup.object().shape({
    cepOrigem: yup.string().required('O  cep de origem é obrigatório'),
    cepDestino: yup.string().required('O cep do destinatário é obrigatório'),
    endereco: yup.object().shape({
        cep: yup.string().required('O CEP é obrigatório'),
        logradouro: yup.string().optional(),
        complemento: yup.string().optional(),
        bairro: yup.string().optional(),
        localidade: yup.string().optional(),
        uf: yup.string().optional(),
    }),
    embalagem: yup.object().shape({
        altura: yup.number().typeError('A altura deve ser um número').required('A altura do produto é obrigatório'),
        comprimento: yup.number().typeError('O comprimento deve ser um número').required('O comprimento do produto é obrigatório'),
        largura: yup.number().typeError('A largura deve ser um número').required('A largura do produto é obrigatório'),
        peso: yup.number().typeError('O peso deve ser um número').required('O peso do produto é obrigatório'),
        formatoObjeto: yup.string().default('CAIXA_PACOTE'),
    }),
    valorDeclarado: yup.string().optional(),
});

type FormDataSchema = yup.InferType<typeof schame>;

const SimuladorFreteForm = () => {
    const { setIsLoading } = useLoadingSpinner();
    const { user: userPayload } = useAuth();
    const { onBuscaCep, response: enderecoDestino } = useAddress();
    const { data: cliente } = useCliente(userPayload?.clienteId || '');

    const [dimensoes, setDimensoes] = useState<Partial<IEmbalagem>>({});
    const [selectedEmbalagem, setSelectedEmbalagem] = useState<IEmbalagem | null>();
    const [valorDeclarado, setValorDeclarado] = useState<string>('');
    const [remetenteSelecionado, setRemetenteSelecionado] = useState<any>(null);

    const methods = useForm<FormDataSchema>({
        resolver: yupResolver(schame),
        defaultValues: {
            cepOrigem: cliente?.endereco?.cep ?? '',
        },
    });

    // Inicializa o remetente com o cliente quando carregado
    useEffect(() => {
        if (cliente && !remetenteSelecionado) {
            setRemetenteSelecionado(cliente);
        }
    }, [cliente, remetenteSelecionado]);
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = methods;
    const { onGetCotacaoCorreios, cotacoes } = useCotacao();

    const cepDestino = watch('endereco.cep');
    const handlerOnSubmit = async (_data: FormDataSchema) => {
        if (!remetenteSelecionado?.endereco?.cep) {
            // toast ou alerta informando que precisa selecionar um remetente
            return;
        }
        
        setIsLoading(true);
        await onGetCotacaoCorreios(
            remetenteSelecionado.endereco.cep, 
            cepDestino, 
            selectedEmbalagem as IEmbalagem, 
            valorDeclarado, 
            "N", 
            remetenteSelecionado
        );
        setIsLoading(false);
    };

    const handleOnSetEmbalagem = (valor: number, campo: keyof IEmbalagem) => {
        const atual = {
            ...dimensoes,
            [campo]: valor,
        };

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

    useEffect(() => {
        // console.log("Form errors:", methods.formState.errors);
    }, [methods.formState.errors]);
    return (
        <Content titulo={`Simulador de Frete`} subTitulo={`Simule o valor do frete para o seu pedido`}>
            <FormProvider {...methods}>
                <form
                    className="bg-white dark:bg-slate-800 w-full p-6 gap-4 space-y-4 rounded-xl border border-gray-200 dark:border-slate-600"
                    onSubmit={handleSubmit(handlerOnSubmit)}
                >
                    <SelecionarRemetente
                        remetenteSelecionado={remetenteSelecionado}
                        onSelect={(remetente) => {
                            setRemetenteSelecionado(remetente);
                            setValue('cepOrigem', remetente.endereco?.cep ?? '');
                        }}
                        titulo="Origem:"
                        showChangeButton={true}
                        variant="compact"
                    />
                    <div className="flex flex-col">
                        <div className="w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="CEP"
                                {...register('endereco.cep', {
                                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const valor = formatCep(e.target.value);
                                        setValue('endereco.cep', valor);
                                        setValue('cepDestino', valor);
                                        setValue('cepOrigem', cliente?.endereco?.cep ?? '03101200');
                                        //valida o cep com 8 caracteres e so podemos buscar o cep se o cep for valido e remover caracteres
                                        const responseAddress = await onBuscaCep(e.target.value, setIsLoading);

                                        if (responseAddress) {
                                            setValue('endereco.logradouro', responseAddress?.logradouro ?? '');
                                            setValue('endereco.bairro', responseAddress?.bairro ?? '');
                                            setValue('endereco.localidade', responseAddress?.localidade ?? '');
                                            setValue('endereco.uf', responseAddress?.uf ?? '');
                                        }
                                    },
                                })}
                                fieldError={errors.endereco?.cep && errors.endereco.cep.message}
                            />
                        </div>

                        {enderecoDestino && (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {enderecoDestino?.logradouro}, {enderecoDestino?.bairro} - {enderecoDestino?.localidade}/{enderecoDestino?.uf}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-1 w-full rounded-lg flex-col">
                        <h1 className="font-semibold text-1xl col-span-6 text-gray-900 dark:text-gray-100">Dimensões (cm):</h1>
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
                                    type="text"
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
                        <small className="text-xs text-gray-500 dark:text-gray-400">
                            o peso deve ser em gramas. Ex: 100 gramas = 100 (<small className="text-red-500 dark:text-red-400">Apenas números</small>)
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
                        <div className="w-full flex-1">
                            <button
                                {...(selectedEmbalagem ? {} : { disabled: true })}
                                className="px-6 py-[17px] bg-secondary dark:bg-secondary-dark text-neutral-50 hover:bg-secondary/80 dark:hover:bg-secondary-dark/80 flex justify-center items-center gap-2 rounded-lg text-base font-medium disabled:bg-disabled dark:disabled:bg-slate-600 disabled:text-disabledSecondary dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                                <Box /> Calcular
                            </button>
                        </div>
                    </div>
                </form>
            </FormProvider>

            <CotacaoList
                cotacoes={cotacoes || []}
                showSelectButtons
                emptyStateMessage="Preencha os dados acima e clique em calcular para ver as opções de frete disponíveis"
            />
        </Content>
    );
};

export default SimuladorFreteForm;
