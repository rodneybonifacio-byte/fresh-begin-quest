import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmissoesExternasService, type IEmissaoExterna, type IEmissaoExternaCreate } from '../../../../services/EmissoesExternasService';
import { supabase } from '../../../../integrations/supabase/client';
import { InputLabel } from '../../../../components/input-label';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSalvar: () => void;
    emissaoParaEditar?: IEmissaoExterna | null;
}

interface FormData {
    codigo_objeto: string;
    remetente_id: string;
    servico: string;
    contrato: string;
    destinatario_nome: string;
    destinatario_logradouro: string;
    destinatario_numero: string;
    destinatario_bairro: string;
    destinatario_cidade: string;
    destinatario_uf: string;
    destinatario_cep: string;
    valor_venda: string;
    valor_custo: string;
    status: string;
    observacao: string;
}

const service = new EmissoesExternasService();

export const ModalAdicionarEmissaoExterna = ({ isOpen, onClose, onSalvar, emissaoParaEditar }: ModalProps) => {
    const [buscarCep, setBuscarCep] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
        defaultValues: {
            codigo_objeto: '',
            remetente_id: '',
            servico: '',
            contrato: '',
            destinatario_nome: '',
            destinatario_logradouro: '',
            destinatario_numero: '',
            destinatario_bairro: '',
            destinatario_cidade: '',
            destinatario_uf: '',
            destinatario_cep: '',
            valor_venda: '',
            valor_custo: '',
            status: 'postado',
            observacao: '',
        },
    });

    const cep = watch('destinatario_cep');

    // Busca remetentes
    const { data: remetentes } = useQuery({
        queryKey: ['remetentes-lista'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('remetentes')
                .select('id, nome, cpf_cnpj')
                .order('nome');
            if (error) throw error;
            return data || [];
        },
    });

    // Preencher form se for edição
    useEffect(() => {
        if (emissaoParaEditar) {
            setValue('codigo_objeto', emissaoParaEditar.codigo_objeto);
            setValue('remetente_id', emissaoParaEditar.remetente_id || '');
            setValue('servico', emissaoParaEditar.servico || '');
            setValue('contrato', emissaoParaEditar.contrato || '');
            setValue('destinatario_nome', emissaoParaEditar.destinatario_nome);
            setValue('destinatario_logradouro', emissaoParaEditar.destinatario_logradouro || '');
            setValue('destinatario_numero', emissaoParaEditar.destinatario_numero || '');
            setValue('destinatario_bairro', emissaoParaEditar.destinatario_bairro || '');
            setValue('destinatario_cidade', emissaoParaEditar.destinatario_cidade || '');
            setValue('destinatario_uf', emissaoParaEditar.destinatario_uf || '');
            setValue('destinatario_cep', emissaoParaEditar.destinatario_cep || '');
            setValue('valor_venda', String(emissaoParaEditar.valor_venda));
            setValue('valor_custo', String(emissaoParaEditar.valor_custo));
            setValue('status', emissaoParaEditar.status);
            setValue('observacao', emissaoParaEditar.observacao || '');
        }
    }, [emissaoParaEditar, setValue]);

    // Busca CEP
    useEffect(() => {
        const buscarEnderecoPorCep = async () => {
            const cepLimpo = cep?.replace(/\D/g, '');
            if (cepLimpo?.length === 8 && buscarCep) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        setValue('destinatario_logradouro', data.logradouro || '');
                        setValue('destinatario_bairro', data.bairro || '');
                        setValue('destinatario_cidade', data.localidade || '');
                        setValue('destinatario_uf', data.uf || '');
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                }
                setBuscarCep(false);
            }
        };
        buscarEnderecoPorCep();
    }, [cep, buscarCep, setValue]);

    // Mutation para criar/atualizar
    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            // Buscar cliente_id do remetente selecionado
            const remetente = remetentes?.find(r => r.id === data.remetente_id);
            if (!remetente && !emissaoParaEditar) {
                throw new Error('Selecione um remetente');
            }

            // Buscar cliente_id
            const remetenteIdParaBuscar = data.remetente_id || emissaoParaEditar?.remetente_id;
            let remetenteData: { cliente_id: string } | null = null;
            
            if (remetenteIdParaBuscar) {
                const { data: remData } = await supabase
                    .from('remetentes')
                    .select('cliente_id')
                    .eq('id', remetenteIdParaBuscar)
                    .single();
                remetenteData = remData;
            }

            const clienteId = remetenteData?.cliente_id || emissaoParaEditar?.cliente_id;
            if (!clienteId) {
                throw new Error('Não foi possível identificar o cliente');
            }

            const emissaoData: IEmissaoExternaCreate = {
                cliente_id: clienteId,
                remetente_id: data.remetente_id || undefined,
                codigo_objeto: data.codigo_objeto.toUpperCase().replace(/\s/g, ''),
                servico: data.servico || undefined,
                contrato: data.contrato || undefined,
                destinatario_nome: data.destinatario_nome,
                destinatario_logradouro: data.destinatario_logradouro || undefined,
                destinatario_numero: data.destinatario_numero || undefined,
                destinatario_bairro: data.destinatario_bairro || undefined,
                destinatario_cidade: data.destinatario_cidade || undefined,
                destinatario_uf: data.destinatario_uf || undefined,
                destinatario_cep: data.destinatario_cep?.replace(/\D/g, '') || undefined,
                valor_venda: parseFloat(data.valor_venda.replace(',', '.')) || 0,
                valor_custo: parseFloat(data.valor_custo.replace(',', '.')) || 0,
                status: data.status,
                observacao: data.observacao || undefined,
                origem: 'manual',
            };

            if (emissaoParaEditar) {
                return service.atualizar(emissaoParaEditar.id, emissaoData);
            } else {
                return service.criar(emissaoData);
            }
        },
        onSuccess: () => {
            toast.success(emissaoParaEditar ? 'Emissão atualizada com sucesso!' : 'Emissão cadastrada com sucesso!');
            reset();
            onSalvar();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao salvar emissão');
        },
    });

    const onSubmit = (data: FormData) => {
        mutation.mutate(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Package className="h-5 w-5 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {emissaoParaEditar ? 'Editar Emissão Externa' : 'Nova Emissão Externa'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Código de Rastreio */}
                        <div className="md:col-span-2">
                            <InputLabel
                                labelTitulo="Código de Rastreio *"
                                placeholder="Ex: AQ005483781BR"
                                {...register('codigo_objeto', { required: 'Código obrigatório' })}
                                fieldError={errors.codigo_objeto?.message}
                            />
                        </div>

                        {/* Remetente */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Remetente *</label>
                            <select
                                {...register('remetente_id', { required: 'Selecione um remetente' })}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Selecione um remetente</option>
                                {remetentes?.map((rem) => (
                                    <option key={rem.id} value={rem.id}>
                                        {rem.nome} - {rem.cpf_cnpj}
                                    </option>
                                ))}
                            </select>
                            {errors.remetente_id && (
                                <p className="text-red-500 text-xs mt-1">{errors.remetente_id.message}</p>
                            )}
                        </div>

                        {/* Serviço e Contrato */}
                        <InputLabel
                            labelTitulo="Serviço"
                            placeholder="Ex: PAC, SEDEX"
                            {...register('servico')}
                        />
                        <InputLabel
                            labelTitulo="Contrato"
                            placeholder="Número do contrato"
                            {...register('contrato')}
                        />

                        {/* Destinatário */}
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Destinatário</h3>
                        </div>

                        <div className="md:col-span-2">
                            <InputLabel
                                labelTitulo="Nome *"
                                placeholder="Nome do destinatário"
                                {...register('destinatario_nome', { required: 'Nome obrigatório' })}
                                fieldError={errors.destinatario_nome?.message}
                            />
                        </div>

                        <div className="relative">
                            <InputLabel
                                labelTitulo="CEP"
                                placeholder="00000-000"
                                {...register('destinatario_cep')}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length === 8) setBuscarCep(true);
                                }}
                            />
                        </div>

                        <InputLabel
                            labelTitulo="Logradouro"
                            placeholder="Rua, Avenida..."
                            {...register('destinatario_logradouro')}
                        />

                        <InputLabel
                            labelTitulo="Número"
                            placeholder="Número"
                            {...register('destinatario_numero')}
                        />

                        <InputLabel
                            labelTitulo="Bairro"
                            placeholder="Bairro"
                            {...register('destinatario_bairro')}
                        />

                        <InputLabel
                            labelTitulo="Cidade"
                            placeholder="Cidade"
                            {...register('destinatario_cidade')}
                        />

                        <InputLabel
                            labelTitulo="UF"
                            placeholder="UF"
                            maxLength={2}
                            {...register('destinatario_uf')}
                        />

                        {/* Valores */}
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Valores</h3>
                        </div>

                        <InputLabel
                            labelTitulo="Valor de Venda (R$) *"
                            placeholder="0.00"
                            {...register('valor_venda', { required: 'Valor de venda obrigatório' })}
                            fieldError={errors.valor_venda?.message}
                        />

                        <InputLabel
                            labelTitulo="Valor de Custo (R$) *"
                            placeholder="0.00"
                            {...register('valor_custo', { required: 'Valor de custo obrigatório' })}
                            fieldError={errors.valor_custo?.message}
                        />

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                            <select
                                {...register('status')}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="postado">Postado</option>
                                <option value="em_transito">Em Trânsito</option>
                                <option value="entregue">Entregue</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>

                        {/* Observação */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Observação</label>
                            <textarea
                                {...register('observacao')}
                                placeholder="Observações adicionais..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={mutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-semibold disabled:opacity-50"
                    >
                        {mutation.isPending ? 'Salvando...' : emissaoParaEditar ? 'Atualizar' : 'Cadastrar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
