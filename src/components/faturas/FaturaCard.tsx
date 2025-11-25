import React from 'react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import { ChevronDown, ChevronUp, Eye, CheckCircle, CreditCard, XCircle, Send } from 'lucide-react';
import type { IFatura } from '../../types/IFatura';
import { calcularLucro, formatCurrencyWithCents } from '../../utils/formatCurrency';
import { formatCpfCnpj } from '../../utils/lib.formats';
import { formatarDataVencimento } from '../../utils/date-utils';
import { StatusBadge } from '../StatusBadge';
import { CopiadorDeId } from '../CopiadorDeId';
import { toast } from 'sonner';
import { supabase } from '../../integrations/supabase/client';

interface FaturaCardProps {
    fatura: IFatura;
    onConfirmarPagamento: (fatura: IFatura) => void;
    onRealizarFechamento: (fatura: IFatura) => void;
    onVisualizarFechamento: (fatura: IFatura) => void;
    onCancelarBoleto: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export const FaturaCard: React.FC<FaturaCardProps> = ({
    fatura,
    onConfirmarPagamento,
    onRealizarFechamento,
    onVisualizarFechamento,
    onCancelarBoleto,
    verificarFechamentoExistente,
    isExpanded = false,
    onToggleExpand,
}) => {
    const nomeExibir = fatura.nome ?? fatura.cliente?.nome;
    const cpfCnpjExibir = fatura.cpfCnpj ?? fatura.cliente?.cpfCnpj;
    const temFechamento = verificarFechamentoExistente(fatura.id);
    const temSubfaturas = fatura.faturas && fatura.faturas.length > 0;
    const isPendente = fatura.status === 'PENDENTE' || fatura.status === 'PAGO_PARCIAL';

    const lucro = Decimal(fatura.totalFaturado).minus(Decimal(fatura.totalCusto));

    const enviarFaturaWebhook = async (faturaItem: IFatura) => {
        try {
            const fechamentoData = verificarFechamentoExistente(faturaItem.id);
            
            if (!fechamentoData || (!fechamentoData.faturaPdf && !fechamentoData.boletoPdf)) {
                toast.error('PDF da fatura não encontrado. Realize o fechamento primeiro.');
                return;
            }

            const pdfBase64 = fechamentoData.boletoPdf || fechamentoData.faturaPdf;

            // Buscar celular do remetente
            let celularRemetente = '';
            try {
                const remetenteResponse = await fetch(`https://envios.brhubb.com.br/api/remetente/${faturaItem.cpfCnpj ?? faturaItem.cliente?.cpfCnpj}`);
                if (remetenteResponse.ok) {
                    const remetentes = await remetenteResponse.json();
                    if (remetentes && remetentes.length > 0) {
                        celularRemetente = remetentes[0].celular || '';
                    }
                }
            } catch (error) {
                console.warn('Não foi possível buscar celular do remetente:', error);
            }

            // Converter base64 para Blob e fazer upload para Storage
            const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            // Upload para Supabase Storage
            const fileName = `faturas/fatura_${faturaItem.id}_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('faturas')
                .upload(fileName, blob, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                throw new Error('Erro ao fazer upload do PDF: ' + uploadError.message);
            }

            // Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('faturas')
                .getPublicUrl(fileName);

            const payload = {
                celular_cliente: celularRemetente,
                nome_cliente: fechamentoData.nomeCliente || faturaItem.cliente?.nome || faturaItem.nome || '',
                pdf_url: publicUrl
            };

            console.log('📤 Enviando fatura para webhook:', { 
                celular: payload.celular_cliente,
                nome: payload.nome_cliente,
                pdf_url: payload.pdf_url 
            });

            const response = await fetch(
                'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/d965a334-7b87-4241-b3f2-d1026752f3e7',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (response.ok) {
                toast.success('Fatura enviada com sucesso!');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erro do webhook:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData
                });
                throw new Error(`Erro ${response.status}: ${errorData.message || response.statusText || 'Webhook não encontrado'}`);
            }
        } catch (error: any) {
            console.error('Erro ao enviar fatura:', error);
            toast.error(error.message || 'Erro ao enviar fatura para o webhook');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Header do Card */}
            <div className="p-4 space-y-3">
                {/* Cliente */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                            {nomeExibir}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatCpfCnpj(cpfCnpjExibir)}
                        </p>
                        <div className="mt-1">
                            <CopiadorDeId id={fatura.id.toString()} />
                        </div>
                    </div>
                    <StatusBadge status={fatura.status || ''} tipo="faturamento" />
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Fatura</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrencyWithCents(fatura.totalFaturado)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vencimento</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatarDataVencimento(fatura.dataVencimento, fatura.dataPagamento)}
                        </p>
                    </div>
                </div>

                {/* Custo e Lucro */}
                {fatura.totalCusto && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <p className="text-xs text-red-600 dark:text-red-400">
                                Custo: {formatCurrencyWithCents(fatura.totalCusto)}
                            </p>
                        </div>
                        {lucro.greaterThan(0) && (
                            <div>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    Lucro: {calcularLucro(Number(fatura.totalFaturado), Number(fatura.totalCusto))}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Data de Criação */}
                <div className="pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Criado em {format(new Date(fatura.criadoEm || ''), 'dd/MM/yyyy')}
                    </p>
                </div>
            </div>

            {/* Ações - Faturas Principais */}
            {!temSubfaturas && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                    {temFechamento && isPendente && (
                        <button
                            onClick={() => onVisualizarFechamento(fatura)}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Eye size={16} />
                            Visualizar Boleto
                        </button>
                    )}
                    
                    {!temFechamento && isPendente && (
                        <button
                            onClick={() => onRealizarFechamento(fatura)}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <CheckCircle size={16} />
                            Realizar Fechamento
                        </button>
                    )}
                    
                    {isPendente && (
                        <button
                            onClick={() => onConfirmarPagamento(fatura)}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <CreditCard size={16} />
                            Confirmar Pagamento
                        </button>
                    )}
                    
                    {temFechamento && isPendente && (
                        <button
                            onClick={() => onCancelarBoleto(fatura)}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <XCircle size={16} />
                            Cancelar Boleto
                        </button>
                    )}
                    
                    {temFechamento && (
                        <button
                            onClick={() => enviarFaturaWebhook(fatura)}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Send size={16} />
                            Enviar Fatura
                        </button>
                    )}
                </div>
            )}

            {/* Expandir Subfaturas */}
            {temSubfaturas && (
                <>
                    <button
                        onClick={onToggleExpand}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border-t border-gray-200 dark:border-slate-700"
                    >
                        <span>Ver {fatura.faturas?.length} subfatura(s)</span>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {/* Subfaturas Expandidas */}
                    {isExpanded && (
                        <div className="p-4 bg-gray-50 dark:bg-slate-900/50 space-y-3 border-t border-gray-200 dark:border-slate-700">
                            {fatura.faturas?.map((subfatura) => (
                                <div
                                    key={subfatura.id}
                                    className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {subfatura.nome ?? subfatura.cliente?.nome}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {formatCpfCnpj(subfatura.cpfCnpj ?? subfatura.cliente?.cpfCnpj)}
                                            </p>
                                        </div>
                                        <StatusBadge status={subfatura.status || ''} tipo="faturamento" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Total: </span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrencyWithCents(subfatura.totalFaturado)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Venc: </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {formatarDataVencimento(subfatura.dataVencimento, subfatura.dataPagamento)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ações da Subfatura */}
                                    <div className="mt-3 flex flex-col gap-2">
                                        {/* Visualizar Boleto - Aparece se já tem fechamento */}
                                        {verificarFechamentoExistente(subfatura.id) && (subfatura.status === 'PENDENTE' || subfatura.status === 'PAGO_PARCIAL') && (
                                            <button
                                                onClick={() => onVisualizarFechamento(subfatura)}
                                                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Eye size={16} />
                                                Visualizar Boleto
                                            </button>
                                        )}
                                        
                                        {/* Realizar Fechamento - Aparece se NÃO tem fechamento */}
                                        {!verificarFechamentoExistente(subfatura.id) && (subfatura.status === 'PENDENTE' || subfatura.status === 'PAGO_PARCIAL') && (
                                            <button
                                                onClick={() => onRealizarFechamento(subfatura)}
                                                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <CheckCircle size={16} />
                                                Realizar Fechamento
                                            </button>
                                        )}
                                        
                                        {/* Confirmar Pagamento - Sempre aparece para pendentes */}
                                        {(subfatura.status === 'PENDENTE' || subfatura.status === 'PAGO_PARCIAL') && (
                                            <button
                                                onClick={() => onConfirmarPagamento(subfatura)}
                                                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <CreditCard size={16} />
                                                Confirmar Pagamento
                                            </button>
                                        )}
                                        
                                        {/* Cancelar Boleto - Aparece se já tem fechamento */}
                                        {verificarFechamentoExistente(subfatura.id) && (subfatura.status === 'PENDENTE' || subfatura.status === 'PAGO_PARCIAL') && (
                                            <button
                                                onClick={() => onCancelarBoleto(subfatura)}
                                                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <XCircle size={16} />
                                                Cancelar Boleto
                                            </button>
                                        )}
                                        
                                        {/* Enviar Fatura - Aparece se já tem fechamento */}
                                        {verificarFechamentoExistente(subfatura.id) && (
                                            <button
                                                onClick={() => enviarFaturaWebhook(subfatura)}
                                                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Send size={16} />
                                                Enviar Fatura
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};