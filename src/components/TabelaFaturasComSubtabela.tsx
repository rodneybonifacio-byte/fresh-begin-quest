import React, { useState } from 'react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import { DataTable } from './DataTable';
import type { IFatura } from '../types/IFatura';
import { calcularLucro, formatCurrencyWithCents } from '../utils/formatCurrency';
import { formatCpfCnpj } from '../utils/lib.formats';
import { formatarDataVencimento } from '../utils/date-utils';
import { StatusBadge } from './StatusBadge';
import { CopiadorDeId } from './CopiadorDeId';
import { Eye, CheckCircle, CreditCard, MessageCircle, XCircle } from 'lucide-react';

interface TabelaFaturasComSubtabelaProps {
    faturas: IFatura[];
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    notificaViaWhatsApp: (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA') => void;
    estaAtrasada: (fatura: IFatura) => boolean;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
    cancelarBoleto: (fatura: IFatura) => void;
}

export const TabelaFaturasComSubtabela: React.FC<TabelaFaturasComSubtabelaProps> = ({
    faturas,
    setIsModalConfirmaPagamento,
    notificaViaWhatsApp,
    estaAtrasada,
    realizarFechamento,
    verificarFechamentoExistente,
    visualizarFechamento,
    cancelarBoleto,
}) => {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleExpand = (rowId: string) => {
        setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    const renderSubTable = (subData: IFatura[]) => {
        return (
            <DataTable<IFatura>
                data={subData}
                columns={[
                    {
                        header: 'Subfatura - Cliente',
                        accessor: (row) => (
                            <div className="flex-col flex">
                                <span className="font-medium">{row.nome ?? row.cliente.nome}</span>
                                <span className="font-medium text-xs text-slate-400">{formatCpfCnpj(row.cpfCnpj ?? row.cliente.cpfCnpj)}</span>
                                <CopiadorDeId id={row.id.toString()} />
                            </div>
                        ),
                    },
                    {
                        header: 'Total R$',
                        accessor: (row) => (
                            <div>
                                {formatCurrencyWithCents(row.totalFaturado)}
                                <br />
                                <small className="text-red-700">{row.totalCusto && `Custo: ${formatCurrencyWithCents(row.totalCusto)}`}</small>
                                <br />
                                <small className="text-green-700">
                                    {Decimal(row.totalFaturado).minus(Decimal(row.totalCusto)).greaterThan(0) &&
                                        `Lucro: ${calcularLucro(Number(row.totalFaturado), Number(row.totalCusto))}`}
                                </small>
                            </div>
                        ),
                    },
                    {
                        header: 'Vencimento',
                        accessor: (row) => <div className="px-4 py-3 flex-col flex">{formatarDataVencimento(row.dataVencimento, row.dataPagamento)}</div>,
                    },
                    {
                        header: 'Status',
                        accessor: (row) => <StatusBadge status={row.status || ''} tipo="faturamento" />,
                    },
                ]}
                actionTitle={(row) => `${row.nome} - ${row.cpfCnpj}`}
                actions={[
                    {
                        label: 'Visualizar Boleto',
                        icon: <Eye size={16} />,
                        onClick: (row) => visualizarFechamento(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                    {
                        label: 'Realizar Fechamento',
                        icon: <CheckCircle size={16} />,
                        onClick: (row) => realizarFechamento(row),
                        show: (row) => !verificarFechamentoExistente(row.id) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                    {
                        label: 'Confirmar Pagamento',
                        icon: <CreditCard size={16} />,
                        onClick: (row) => setIsModalConfirmaPagamento({ isOpen: true, fatura: row }),
                        show: (row) => ['PENDENTE', 'PAGO_PARCIAL'].includes(row.status),
                    },
                    {
                        label: 'Notificar via WhatsApp',
                        icon: <MessageCircle size={16} />,
                        onClick: (row) => notificaViaWhatsApp(row, 'PADRAO'),
                        show: (row) => row.status === 'PENDENTE',
                    },
                    {
                        label: 'Notificar Fatura Atrasada',
                        icon: <MessageCircle size={16} />,
                        onClick: (row) => notificaViaWhatsApp(row, 'ATRASADA'),
                        show: (row) => estaAtrasada(row),
                    },
                    {
                        label: 'Cancelar Boleto',
                        icon: <XCircle size={16} />,
                        onClick: (row) => cancelarBoleto(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                ]}
                rowKey={(row) => row.id}
                className=""
            />
        );
    };

    return (
        <DataTable<IFatura>
            data={faturas}
            columns={[
                {
                    header: 'Cliente',
                    accessor: (row) => {
                        const nomeExibir = row.nome ?? row.cliente.nome;
                        const cpfCnpjExibir = row.cpfCnpj ?? row.cliente.cpfCnpj;

                        return (
                            <div className="flex-col flex">
                                <span className="font-medium">{nomeExibir}</span>
                                <span className="font-medium text-xs text-slate-400">{formatCpfCnpj(cpfCnpjExibir)}</span>
                                <CopiadorDeId id={row.id.toString()} />
                            </div>
                        );
                    },
                },
                {
                    header: 'Total Fatura R$',
                    accessor: (row) => (
                        <div className="px-4 py-3">
                            {formatCurrencyWithCents(row.totalFaturado)}
                            <br />
                            <small className="text-red-700">{row.totalCusto && `Custo: ${formatCurrencyWithCents(row.totalCusto)}`}</small>
                            <br />
                            <small className="text-green-700">
                                {Decimal(row.totalFaturado).minus(Decimal(row.totalCusto)).greaterThan(0) &&
                                    `Lucro: ${calcularLucro(Number(row.totalFaturado), Number(row.totalCusto))}`}
                            </small>
                        </div>
                    ),
                },
                {
                    header: 'Data Vencimento',
                    accessor: (row) => <div className="px-4 py-3 flex-col flex">{formatarDataVencimento(row.dataVencimento, row.dataPagamento)}</div>,
                },
                {
                    header: 'Status',
                    accessor: (row) => <StatusBadge status={row.status || ''} tipo="faturamento" />,
                },
                {
                    header: 'Criado em',
                    accessor: (row) => <div className="px-4 py-3">{format(new Date(row.criadoEm || ''), 'dd/MM/yyyy')}</div>,
                },
            ]}
            actionTitle={(row) => `${row.nome ?? row.cliente.nome} - ${row.cpfCnpj ?? row.cliente.cpfCnpj}`}
            actions={[
                {
                    label: 'Visualizar Boleto',
                    icon: <Eye size={16} />,
                    onClick: (row) => visualizarFechamento(row),
                    show: (row) => !!(verificarFechamentoExistente(row.id)) && (!row.faturas || row.faturas.length === 0) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                },
                {
                    label: 'Realizar Fechamento',
                    icon: <CheckCircle size={16} />,
                    onClick: (row) => realizarFechamento(row),
                    show: (row) => !verificarFechamentoExistente(row.id) && (!row.faturas || row.faturas.length === 0) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                },
                {
                    label: 'Confirmar Pagamento',
                    icon: <CreditCard size={16} />,
                    onClick: (row) => setIsModalConfirmaPagamento({ isOpen: true, fatura: row }),
                    show: (row) => !(row.faturas && row.faturas.length > 0) && ['PENDENTE', 'PAGO_PARCIAL'].includes(row.status),
                },
                {
                    label: 'Notificar via WhatsApp',
                    icon: <MessageCircle size={16} />,
                    onClick: (row) => notificaViaWhatsApp(row, 'PADRAO'),
                    show: (row) => !(row.faturas && row.faturas.length > 0) && row.status === 'PENDENTE',
                },
                {
                    label: 'Notificar Fatura Atrasada',
                    icon: <MessageCircle size={16} />,
                    onClick: (row) => notificaViaWhatsApp(row, 'ATRASADA'),
                    show: (row) => !(row.faturas && row.faturas.length > 0) && estaAtrasada(row),
                },
                {
                    label: 'Cancelar Boleto',
                    icon: <XCircle size={16} />,
                    onClick: (row) => cancelarBoleto(row),
                    show: (row) => !!(verificarFechamentoExistente(row.id)) && (!row.faturas || row.faturas.length === 0) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                },
            ]}
            subTable={{
                hasSubData: (row) => !!(row.faturas && row.faturas.length > 0),
                getSubData: (row) => row.faturas || [],
                renderSubTable,
                expandedRows,
                onToggleExpand: toggleExpand,
            }}
            rowKey={(row) => row.id}
        />
    );
};
