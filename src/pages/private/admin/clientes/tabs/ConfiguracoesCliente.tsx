import { useFormContext } from 'react-hook-form';
import { Divider } from '../../../../../components/divider';
import type { FormDataCliente } from '../../../../../utils/schames/clientes';
import SelectCustom from '../../../../../components/SelectCustom';
import { InputLabel } from '../../../../../components/input-label';
import { formatCurrency } from '../../../../../utils/formatCurrency';

export const ConfiguracoesCliente = () => {
    const {
        register,
        setValue,
        watch,
        formState: { errors },
        clearErrors,
    } = useFormContext<FormDataCliente>();

    const configuracoes = watch('configuracoes');

    const aplicarValorDeclarado = configuracoes?.aplicar_valor_declarado;
    const rastreioViaWhatsapp = configuracoes?.rastreio_via_whatsapp;
    const faturaViaWhatsapp = configuracoes?.fatura_via_whatsapp;
    const periodoDeFaturamento = configuracoes?.periodo_faturamento;
    const horarioColeta = configuracoes?.horario_coleta;
    const incluirValorDeclaradoNaNota = configuracoes?.incluir_valor_declarado_na_nota;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-semibold">Configurações do Cliente</h2>
            <Divider />

            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('configuracoes.aplicar_valor_declarado')}
                        checked={!!aplicarValorDeclarado}
                        onChange={(e) => setValue('configuracoes.aplicar_valor_declarado', e.target.checked)}
                        className="h-5 w-5 accent-purple-600 cursor-pointer"
                    />
                    Aplicar valor declarado no frete
                </label>
                <span className="text-xs text-slate-400">
                    Ao ativar, o valor declarado informado pelo cliente será incluído na cotação do frete. Caso desativado, o frete será calculado sem esse
                    valor.
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('configuracoes.incluir_valor_declarado_na_nota')}
                        checked={!!incluirValorDeclaradoNaNota}
                        onChange={(e) => setValue('configuracoes.incluir_valor_declarado_na_nota', e.target.checked)}
                        className="h-5 w-5 accent-purple-600 cursor-pointer"
                    />
                    Incluir valor declarado na nota fiscal
                </label>
                <span className="text-xs text-slate-400">
                     Quando ativado, o valor declarado pelo cliente será somado ao valor total da nota fiscal.
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <SelectCustom
                    label="Periodo de Faturamento:"
                    data={[
                        { label: 'DIÁRIO', value: 'diario' },
                        { label: 'SEMANAL', value: 'semanal' },
                        { label: 'MENSAL', value: 'mensal' },
                        { label: 'SEMESTRAL', value: 'semestral' },
                        { label: 'ANUAL', value: 'anual' },
                    ]}
                    valueSelected={periodoDeFaturamento}
                    onChange={(value) => {
                        const selected = Array.isArray(value) ? value[0] : value;
                        setValue('configuracoes.periodo_faturamento', selected);
                        clearErrors('configuracoes.periodo_faturamento');
                    }}
                />
                {errors.configuracoes?.periodo_faturamento && <span className="text-red-500 text-sm">{errors.configuracoes.periodo_faturamento.message}</span>}

                <span className="text-xs text-slate-400">
                    Defina o periodo de faturamento do cliente, podendo ser diário, semanal, mensal, semestral ou anual.
                </span>
            </div>

            <div className="sm:col-span-3 col-span-12 w-full">
                <SelectCustom
                    label="Horário de Coleta:"
                    searchable
                    data={[
                        { label: '08:00', value: '08:00' },
                        { label: '08:10', value: '08:10' },
                        { label: '08:20', value: '08:20' },
                        { label: '08:30', value: '08:30' },
                        { label: '08:40', value: '08:40' },
                        { label: '08:50', value: '08:50' },
                        { label: '09:00', value: '09:00' },
                        { label: '09:10', value: '09:10' },
                        { label: '09:20', value: '09:20' },
                        { label: '09:30', value: '09:30' },
                        { label: '09:40', value: '09:40' },
                        { label: '09:50', value: '09:50' },
                        { label: '10:00', value: '10:00' },
                        { label: '10:10', value: '10:10' },
                        { label: '10:20', value: '10:20' },
                        { label: '10:30', value: '10:30' },
                        { label: '10:40', value: '10:40' },
                        { label: '10:50', value: '10:50' },
                        { label: '11:00', value: '11:00' },
                        { label: '11:10', value: '11:10' },
                        { label: '11:20', value: '11:20' },
                        { label: '11:30', value: '11:30' },
                        { label: '11:40', value: '11:40' },
                        { label: '11:50', value: '11:50' },
                        { label: '12:00', value: '12:00' },
                        { label: '12:10', value: '12:10' },
                        { label: '12:20', value: '12:20' },
                        { label: '12:30', value: '12:30' },
                        { label: '12:40', value: '12:40' },
                        { label: '12:50', value: '12:50' },
                        { label: '13:00', value: '13:00' },
                        { label: '13:10', value: '13:10' },
                        { label: '13:20', value: '13:20' },
                        { label: '13:30', value: '13:30' },
                        { label: '13:40', value: '13:40' },
                        { label: '13:50', value: '13:50' },
                        { label: '14:00', value: '14:00' },
                        { label: '14:10', value: '14:10' },
                        { label: '14:20', value: '14:20' },
                        { label: '14:30', value: '14:30' },
                        { label: '14:40', value: '14:40' },
                        { label: '14:50', value: '14:50' },
                        { label: '15:00', value: '15:00' },
                        { label: '15:10', value: '15:10' },
                        { label: '15:20', value: '15:20' },
                        { label: '15:30', value: '15:30' },
                        { label: '15:40', value: '15:40' },
                        { label: '15:50', value: '15:50' },
                        { label: '16:00', value: '16:00' },
                        { label: '16:10', value: '16:10' },
                        { label: '16:20', value: '16:20' },
                        { label: '16:30', value: '16:30' },
                        { label: '16:40', value: '16:40' },
                        { label: '16:50', value: '16:50' },
                        { label: '17:00', value: '17:00' },
                        { label: '17:10', value: '17:10' },
                        { label: '17:20', value: '17:20' },
                        { label: '17:30', value: '17:30' },
                        { label: '17:40', value: '17:40' },
                        { label: '17:50', value: '17:50' },
                        { label: '18:00', value: '18:00' },
                    ]}
                    valueSelected={horarioColeta || ''}
                    onChange={(value) => {
                        const selected = Array.isArray(value) ? value[0] : value;
                        setValue('configuracoes.horario_coleta', selected);
                        clearErrors('configuracoes.horario_coleta');
                    }}
                />
                <span className="text-xs text-slate-400">Horário em que o cliente deseja que a coleta seja realizada.</span>
            </div>

            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('configuracoes.fatura_via_whatsapp')}
                        checked={!!faturaViaWhatsapp}
                        onChange={(e) => setValue('configuracoes.fatura_via_whatsapp', e.target.checked)}
                        className="h-5 w-5 accent-purple-600 cursor-pointer"
                    />
                    Notificação de fatura via WhatsApp
                </label>
                <span className="text-xs text-slate-400">
                    Ao ativar, o cliente será notificado automaticamente no WhatsApp sempre que uma nova fatura for gerada.
                </span>
            </div>

            <h2 className="font-semibold mt-4">Configurações de notificações via WhatsApp</h2>
            <Divider />

            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('configuracoes.rastreio_via_whatsapp')}
                        checked={!!rastreioViaWhatsapp}
                        onChange={(e) => setValue('configuracoes.rastreio_via_whatsapp', e.target.checked)}
                        className="h-5 w-5 accent-purple-600 cursor-pointer"
                    />
                    Notificar eventos de rastreio via WhatsApp
                </label>
                <span className="text-xs text-slate-400">
                    Ao ativar, o destinatário será notificado no WhatsApp sobre o andamento dos pedidos. Selecione os eventos desejados:
                </span>
            </div>
            <div className="flex flex-col gap-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value="CRIADO"
                                {...register('configuracoes.eventos_rastreio_habilitados_via_whatsapp')}
                                disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                                className="h-5 w-5 accent-purple-600 cursor-pointer"
                            />
                            Etiqueta Gerada
                        </label>
                        <span className="text-xs text-slate-400">Notifica o destinatário quando a etiqueta do pedido for gerada.</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value="POSTADO"
                                {...register('configuracoes.eventos_rastreio_habilitados_via_whatsapp')}
                                disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                                className="h-5 w-5 accent-purple-600 cursor-pointer"
                            />
                            Objeto Postado
                        </label>
                        <span className="text-xs text-slate-400">Notifica o destinatário quando o objeto foi postado.</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value="SAIU_PARA_ENTREGA"
                                {...register('configuracoes.eventos_rastreio_habilitados_via_whatsapp')}
                                disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                                className="h-5 w-5 accent-purple-600 cursor-pointer"
                            />
                            Objeto Saiu para entrega
                        </label>
                        <span className="text-xs text-slate-400">Notifica o destinatário quando o objeto sair para entrega.</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value="ALGUARDANDO_RETIRADA"
                                {...register('configuracoes.eventos_rastreio_habilitados_via_whatsapp')}
                                disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                                className="h-5 w-5 accent-purple-600 cursor-pointer"
                            />
                            Objeto Aguardando Retirada
                        </label>
                        <span className="text-xs text-slate-400">Notifica o destinatário quando o objeto estiver aguardando retirada.</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value="EM_ATRASO"
                                {...register('configuracoes.eventos_rastreio_habilitados_via_whatsapp')}
                                disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                                className="h-5 w-5 accent-purple-600 cursor-pointer"
                            />
                            Objeto em Atrasos
                        </label>
                        <span className="text-xs text-slate-400">Notifica o destinatário quando o objeto estiver em atraso.</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                value="ENTREGUE"
                                {...register('configuracoes.eventos_rastreio_habilitados_via_whatsapp')}
                                disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                                className="h-5 w-5 accent-purple-600 cursor-pointer"
                            />
                            Objeto Entregue
                        </label>
                        <span className="text-xs text-slate-400">Notifica o destinatário quando o objeto for entregue.</span>
                    </div>

                    {errors.configuracoes?.eventos_rastreio_habilitados_via_whatsapp && (
                        <span className="text-red-500 text-sm">{errors.configuracoes.eventos_rastreio_habilitados_via_whatsapp.message}</span>
                    )}
                </div>
                <div className="sm:col-span-3 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Valor do serviço de envio:"
                        placeholder="0,01"
                        {...register('configuracoes.valor_disparo_evento_rastreio_whatsapp', {
                            onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                const valor = formatCurrency(e.target.value);
                                setValue('configuracoes.valor_disparo_evento_rastreio_whatsapp', valor);
                            },
                        })}
                        isDisabled={!watch('configuracoes.rastreio_via_whatsapp')}
                        disabled={!watch('configuracoes.rastreio_via_whatsapp')}
                        fieldError={errors.configuracoes?.valor_disparo_evento_rastreio_whatsapp?.message}
                    />
                    <span className="text-xs text-slate-400">Valor do serviço de envio. Exemplo: 0,01</span>
                </div>
                <div className="sm:col-span-3 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Link WhatsApp:"
                        placeholder="https://wa.me/5511999999999"
                        {...register('configuracoes.link_whatsapp')}
                        {...register('configuracoes.link_whatsapp', {
                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                setValue('configuracoes.link_whatsapp', e.target.value);
                            },
                        })}
                    />
                    <span className="text-xs text-slate-400">Link do WhatsApp do cliente. Exemplo: https://wa.me/5511999999999</span>
                </div>
            </div>
        </div>
    );
};
