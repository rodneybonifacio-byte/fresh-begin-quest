import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ButtonComponent } from '../../../../components/button';
import { StatusBadgeEmissao } from '../../../../components/StatusBadgeEmissao';
import { TableCustom } from '../../../../components/table';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { ManifestoService } from '../../../../services/ManifestoService';
import type { IEmissaoMimimalViewModel } from '../../../../types/emissao/IEmissaoMimimalViewModel';
import { viewPDF } from '../../../../utils/pdfUtils';
import { toastError, toastSuccess } from '../../../../utils/toastNotify';
import { Content } from '../../Content';
import { InputObjeto } from './InputObjeto';

const STORAGE_KEY = 'emissoes_manifesto';

const FManifestoFormulario = () => {
    const { setIsLoading } = useLoadingSpinner(); // Assuming you have a loading spinner context or hook
    const manifestoService = new ManifestoService(); // Assuming you have a service to handle API calls
    const [searchProduto, setSearchProduto] = useState('');
    const [emissoesOriginais, setEmissoesOriginais] = useState<IEmissaoMimimalViewModel[] | []>([]); // Assuming you have a state to hold the emissions
    const [loaded, setLoaded] = useState(false);

    // Leitura inicial
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setEmissoesOriginais(parsed);
                }
            } catch (e) {
                console.error('Erro ao parsear:', e);
            }
        }
        setLoaded(true); // marca que terminou de carregar
    }, []);

    // Gravação somente após leitura inicial
    useEffect(() => {
        if (loaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(emissoesOriginais));
        }
    }, [emissoesOriginais, loaded]);

    const mutation = useMutation({
        mutationFn: async (objeto: string) => {
            return (await manifestoService.getByObjeto({ objeto })).data;
        },
        onSuccess: () => {
            setSearchProduto('');
        },
    });

    const sendMutation = useMutation({
        mutationFn: async (data: IEmissaoMimimalViewModel[]) => {
            const result = await manifestoService.enviarManifesto(data);
            return result;
        },
        onSuccess: () => {
            setSearchProduto('');
        },
    });

    const handleProcessarEntrada = async (input: string) => {
        if (!input) {
            toastError('Campo vazio');
            return;
        }

        try {
            const result = await mutation.mutateAsync(input);
            // Check if the result is not already in the list before adding it
            const isAlreadyAdded = emissoesOriginais.some((emissao) => emissao.codigoObjeto === result.codigoObjeto);
            if (isAlreadyAdded) {
                toastError('Objeto ja adicionado');
                setSearchProduto('');
                return;
            }
            setEmissoesOriginais((prev) => [...prev, result]);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchProduto('');
        }
    };

    const handleRemover = (id: string) => {
        setEmissoesOriginais((prev) => prev.filter((e) => e.codigoObjeto !== id));
    };

    const handleEnviarEImprimir = async () => {
        if (emissoesOriginais.length === 0) {
            toastError('Nenhum objeto para enviar');
            return;
        }

        try {
            setIsLoading(true);
            const result = await sendMutation.mutateAsync(emissoesOriginais);
            if (result?.dados) {
                viewPDF(result?.dados, result.manifestoId);
            }
            localStorage.removeItem(STORAGE_KEY);
            setEmissoesOriginais([]);
            toastSuccess('Manifesto gerado com sucesso');
        } catch (_error) {
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Content titulo="Ferramentas > Manifestos >  Formulário" subTitulo="Criar um novo manifesto de postagem">
            <div className="bg-white dark:bg-gray-800 w-full p-6 gap-4 space-y-4 rounded-xl">
                <div className="flex flex-row w-full justify-center items-center">
                    <InputObjeto
                        value={searchProduto}
                        onChange={(e) => setSearchProduto(e.target.value)}
                        onProcessarEntrada={(input) => {
                            handleProcessarEntrada(input);
                            setSearchProduto('');
                        }}
                    />
                </div>
                {emissoesOriginais.length > 0 && (
                    <div className="flex flex-row w-full gap-4">
                        <ButtonComponent {...{ disabled: emissoesOriginais.length === 0 }} onClick={handleEnviarEImprimir}>
                            Enviar e Imprimir
                        </ButtonComponent>
                    </div>
                )}
            </div>

            <div className="rounded-lg flex flex-col gap-2">
                <div className="md:lg:xl:block">
                    <TableCustom thead={['Codigo Objeto', 'Nome do Destinatário', 'Status', 'Criado em', '']}>
                        {emissoesOriginais &&
                            emissoesOriginais.map((emissao: IEmissaoMimimalViewModel) => (
                                <tr key={emissao.codigoObjeto} className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer dark:text-white`}>
                                    <td className="px-4 py-3 flex-col flex">
                                        <span className="font-medium"> {emissao.codigoObjeto || '-------------'}</span>
                                        <span className="font-medium text-xs text-slate-400 dark:text-slate-300">{emissao.servico}</span>
                                    </td>
                                    <td className="px-4 py-3">{emissao.destinatario.nome || '-------------'}</td>
                                    <StatusBadgeEmissao
                                        status={emissao.status}
                                        handleOnViewErroPostagem={() => console.log('emissao.mensagensErrorPostagem')}
                                    />

                                    <td className="px-4 py-3">{format(new Date(emissao?.criadoEm || ''), 'dd/MM/yyyy') || emissao.criadoEm}</td>
                                    <td className="px-4 py-3">
                                        <X onClick={() => handleRemover(emissao.codigoObjeto)} className="cursor-pointer text-red-600" />
                                    </td>
                                </tr>
                            ))}
                    </TableCustom>
                </div>
            </div>
        </Content>
    );
};

export default FManifestoFormulario;
