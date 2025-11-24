import React from 'react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import { ChevronDown, ChevronUp, Eye, CheckCircle, CreditCard, XCircle } from 'lucide-react';
import type { IFatura } from '../../types/IFatura';
import { calcularLucro, formatCurrencyWithCents } from '../../utils/formatCurrency';
import { formatCpfCnpj } from '../../utils/lib.formats';
import { formatarDataVencimento } from '../../utils/date-utils';
import { StatusBadge } from '../StatusBadge';
import { CopiadorDeId } from '../CopiadorDeId';

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