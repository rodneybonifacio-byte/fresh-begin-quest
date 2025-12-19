import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Link2, Trash2, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import { Content } from '../../Content';
import { LoadSpinner } from '../../../../components/loading';
import { InputLabel } from '../../../../components/input-label';
import { IntegracaoService, type IIntegracao } from '../../../../services/IntegracaoService';
import { SelecionarRemetente } from '../../../../components/SelecionarRemetente';
import { toastError, toastSuccess } from '../../../../utils/toastNotify';
import { formatDateTime } from '../../../../utils/date-utils';
import { RemetenteSupabaseDirectService } from '../../../../services/RemetenteSupabaseDirectService';

const schema = yup.object().shape({
    accessToken: yup.string().required('Access Token é obrigatório'),
    shopDomain: yup.string().required('Domínio da loja é obrigatório'),
});

type FormData = yup.InferType<typeof schema>;

interface Remetente {
    id: string;
    nome: string;
    cpfCnpj?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    endereco?: {
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        cep?: string;
    };
}

const ShopifyIntegracao = () => {
    const queryClient = useQueryClient();
    const service = new IntegracaoService();
    const remetenteService = new RemetenteSupabaseDirectService();
    const [selectedRemetente, setSelectedRemetente] = useState<Remetente | null>(null);
    const [integracaoExistente, setIntegracaoExistente] = useState<IIntegracao | null>(null);

    const methods = useForm<FormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            accessToken: '',
            shopDomain: '',
        },
    });

    // Buscar integrações existentes
    const { data: integracoes, isLoading } = useQuery({
        queryKey: ['integracoes-shopify'],
        queryFn: async () => {
            const response = await service.getAll();
            return response.data.filter((i) => i.plataforma === 'shopify');
        },
    });

    useEffect(() => {
        const loadIntegracao = async () => {
            if (integracoes && integracoes.length > 0) {
                const shopify = integracoes[0];
                setIntegracaoExistente(shopify);

                // As credenciais ficam criptografadas no backend, então não voltam para o client.
                // O domínio da loja é salvo em storeId (não sensível) para exibição.
                methods.reset({
                    accessToken: '',
                    shopDomain: shopify.storeId || '',
                });

                // Buscar dados completos do remetente
                if (shopify.remetenteId) {
                    try {
                        const response = await remetenteService.getById(shopify.remetenteId);
                        if (response?.data) {
                            setSelectedRemetente({
                                id: response.data.id,
                                nome: response.data.nome,
                                cpfCnpj: response.data.cpfCnpj,
                                cep: response.data.endereco?.cep,
                                logradouro: response.data.endereco?.logradouro,
                                numero: response.data.endereco?.numero,
                                bairro: response.data.endereco?.bairro,
                                localidade: response.data.endereco?.localidade,
                                uf: response.data.endereco?.uf,
                            });
                        } else {
                            setSelectedRemetente({
                                id: shopify.remetenteId,
                                nome: `Remetente (${shopify.remetenteId.slice(0, 8)}...)`,
                            });
                        }
                    } catch (error) {
                        console.error('Erro ao buscar remetente:', error);
                        setSelectedRemetente({ id: shopify.remetenteId, nome: `Remetente (${shopify.remetenteId.slice(0, 8)}...)` });
                    }
                }
            }
        };
        
        loadIntegracao();
    }, [integracoes, methods]);

    // Mutation para criar/atualizar integração
    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            if (!selectedRemetente) {
                throw new Error('Selecione um remetente');
            }

            const credenciais = {
                accessToken: data.accessToken,
                shopDomain: data.shopDomain.replace('https://', '').replace('http://', '').replace('/', ''),
            };

            if (integracaoExistente) {
                return service.update(integracaoExistente.id!, {
                    credenciais,
                    remetenteId: selectedRemetente.id,
                });
            } else {
                return service.create({
                    plataforma: 'shopify',
                    credenciais,
                    remetenteId: selectedRemetente.id,
                });
            }
        },
        onSuccess: () => {
            toastSuccess(integracaoExistente ? 'Integração atualizada!' : 'Integração criada!');
            queryClient.invalidateQueries({ queryKey: ['integracoes-shopify'] });
        },
        onError: (error: Error) => {
            toastError(error.message || 'Erro ao salvar integração');
        },
    });

    // Mutation para deletar integração
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!integracaoExistente) throw new Error('Nenhuma integração para deletar');
            return service.delete(integracaoExistente.id!);
        },
        onSuccess: () => {
            toastSuccess('Integração removida!');
            setIntegracaoExistente(null);
            methods.reset({ accessToken: '', shopDomain: '' });
            setSelectedRemetente(null);
            queryClient.invalidateQueries({ queryKey: ['integracoes-shopify'] });
        },
        onError: (error: Error) => {
            toastError(error.message || 'Erro ao remover integração');
        },
    });


    const onSubmit = (data: FormData) => {
        mutation.mutate(data);
    };

    if (isLoading) {
        return <LoadSpinner mensagem="Carregando..." />;
    }

    return (
        <Content
            titulo="Integração Shopify"
            subTitulo="Configure sua loja Shopify para importar pedidos automaticamente"
            isButton={false}
        >
            <div className="max-w-2xl mx-auto">
                {/* Status Card */}
                <div className={`p-4 rounded-lg mb-6 ${integracaoExistente ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
                    {integracaoExistente ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <div>
                                    <p className="font-medium text-green-800 dark:text-green-200">Integração Ativa</p>
                                    <p className="text-sm text-green-600 dark:text-green-400">
                                        Configurada em {formatDateTime(integracaoExistente.criadoEm || '')}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-green-200 dark:border-green-800 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <ShoppingBag className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-green-700 dark:text-green-300 font-medium">Loja:</span>
                                    <span className="text-green-800 dark:text-green-200">
                                        {integracaoExistente.storeId || methods.getValues('shopDomain') || 'Não informada'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-green-700 dark:text-green-300 font-medium">Remetente:</span>
                                    <span className="text-green-800 dark:text-green-200">
                                        {selectedRemetente?.nome || 'Carregando...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            <div>
                                <p className="font-medium text-yellow-800 dark:text-yellow-200">Integração Não Configurada</p>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                    Configure abaixo para começar a importar pedidos
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Formulário */}
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="bg-card rounded-lg p-6 border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <ShoppingBag className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-foreground">Credenciais Shopify</h3>
                            </div>

                            <div className="space-y-4">
                                <InputLabel
                                    labelTitulo="Domínio da Loja"
                                    placeholder="minha-loja.myshopify.com"
                                    type="text"
                                    {...methods.register('shopDomain')}
                                    fieldError={methods.formState.errors.shopDomain?.message}
                                />
                                <p className="text-xs text-muted-foreground -mt-2">
                                    Exemplo: minha-loja.myshopify.com (sem https://)
                                </p>

                                <InputLabel
                                    labelTitulo="Access Token"
                                    placeholder="shpat_xxxxxxxxxxxxx"
                                    type="password"
                                    {...methods.register('accessToken')}
                                    fieldError={methods.formState.errors.accessToken?.message}
                                />
                                <p className="text-xs text-muted-foreground -mt-2">
                                    Gere um token em: Shopify Admin → Settings → Apps → Develop apps
                                </p>
                            </div>
                        </div>

                        <div className="bg-card rounded-lg p-6 border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Link2 className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-foreground">Remetente Padrão</h3>
                            </div>

                            <SelecionarRemetente
                                remetenteSelecionado={selectedRemetente}
                                onSelect={setSelectedRemetente}
                                titulo="Selecione o remetente"
                                variant="compact"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={mutation.isPending || !selectedRemetente}
                                className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {mutation.isPending ? (
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                {integracaoExistente ? 'Atualizar Integração' : 'Criar Integração'}
                            </button>

                            {integracaoExistente && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm('Tem certeza que deseja remover esta integração?')) {
                                            deleteMutation.mutate();
                                        }
                                    }}
                                    disabled={deleteMutation.isPending}
                                    className="bg-destructive text-destructive-foreground py-3 px-4 rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remover
                                </button>
                            )}
                        </div>
                    </form>
                </FormProvider>

                {/* Instruções */}
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Como obter o Access Token:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Acesse o painel admin da sua loja Shopify</li>
                        <li>Vá em Settings → Apps and sales channels → Develop apps</li>
                        <li>Crie um novo app ou selecione um existente</li>
                        <li>Em "API credentials", clique em "Install app"</li>
                        <li>Copie o "Admin API access token" gerado</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-3">
                        <strong>Permissões necessárias:</strong> read_orders, read_customers, read_products
                    </p>
                </div>
            </div>
        </Content>
    );
};

export default ShopifyIntegracao;
