import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadSpinner } from '../../../../components/loading';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';
import { StatusBadge } from '../../../../components/StatusBadge';
import { TableCustom } from '../../../../components/table';
import { TableDropdown } from '../../../../components/table/dropdown';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useAuth } from '../../../../providers/AuthContext';
import { useGlobalConfig } from '../../../../providers/GlobalConfigContext';
import { useLayout } from '../../../../providers/LayoutContext';
import { FaturaService } from '../../../../services/FaturaService';
import type { IFatura } from '../../../../types/IFatura';
import type { IResponse } from '../../../../types/IResponse';
import { formatarDataVencimento } from '../../../../utils/date-utils';
import { formatCurrencyWithCents } from '../../../../utils/formatCurrency';
import { formatCpfCnpj } from '../../../../utils/lib.formats';
import { Content } from '../../Content';

const ListasFaturas = () => {
    const { user } = useAuth();
    const { layout } = useLayout();
    const config = useGlobalConfig();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<IFatura[]>([]);
    const [page, setPage] = useState<number>(1);
    const perPage = config.pagination.perPage;

    const service = new FaturaService();

    const {
        data: faturas,
        isLoading,
        isError,
    } = useFetchQuery<IResponse<IFatura[]>>(['faturas', page, user?.clienteId], async () => {
        const params: {
            limit: number;
            offset: number;
            dataIni?: string;
            dataFim?: string;
            destinatario?: string;
            status?: string;
            codigoObjeto?: string;
        } = {
            limit: perPage,
            offset: (page - 1) * perPage,
        };

        const dataIni = searchParams.get('dataIni') || undefined;
        const dataFim = searchParams.get('dataFim') || undefined;
        const status = searchParams.get('status') || undefined;

        if (dataIni) params.dataIni = dataIni;
        if (dataFim) params.dataFim = dataFim;
        if (status) params.status = status;

        return await service.getWithParams(params, '');
    });

    useEffect(() => {
        if (faturas?.data) setData(faturas.data);
    }, [faturas]);

    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };

    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderFaturaRow = (fatura: IFatura, layout: string, isExpanded: boolean, isSubFatura: boolean) => {
        const nomeExibir = fatura.nome ?? fatura.cliente.nome;
        const cpfCnpjExibir = fatura.cpfCnpj ?? fatura.cliente.cpfCnpj;

        return (
            <tr key={fatura.id} className={`hover:bg-gray-50 ${isSubFatura ? 'bg-gray-100' : ''}`}>
                <td className="px-4 py-3">{fatura?.codigo}</td>
                <td className="px-4 py-3 flex-col flex">
                    <span className="font-medium">{nomeExibir}</span>
                    <span className="font-medium text-xs text-slate-400">{formatCpfCnpj(cpfCnpjExibir)}</span>
                </td>
                <td className="px-4 py-3">{formatCurrencyWithCents(fatura.totalFaturado)}</td>
                <td className="px-4 py-3 flex-col flex">{formatarDataVencimento(fatura?.dataVencimento, fatura?.dataPagamento)}</td>
                <td className="px-4 py-3">
                    <StatusBadge status={fatura.status || ''} tipo="faturamento" />
                </td>
                <td className="px-4 py-3">{format(new Date(fatura?.criadoEm || ''), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2">
                        <TableDropdown
                            dropdownKey={fatura.id.toString()}
                            items={[
                                {
                                    id: 'ver-fatura',
                                    label: 'Ver Fatura',
                                    type: 'link',
                                    to: `/${layout}/financeiro/fatura/${fatura.id}`,
                                    isShow: true,
                                },
                            ]}
                        />
                        {!isSubFatura && fatura.faturas && fatura.faturas.length > 0 && (
                            <button type="button" onClick={() => toggleExpand(fatura.id)} className="text-gray-500 hover:text-gray-700">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <Content titulo="Faturas" subTitulo="Relatório de Faturas" data={faturas?.data && faturas.data.length > 0 ? faturas.data : []}>
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && faturas && faturas.data.length > 0 && (
                <div className=" rounded-lg">
                    <TableCustom thead={['Fatura', 'Cliente', 'Total Fatura R$', 'Data Vencimento', 'Status', 'Criado em', '']}>
                        <>
                            {data &&
                                data.map((fatura: IFatura) => {
                                    const hasSubFaturas = !!fatura.faturas && fatura.faturas.length > 0;
                                    const isExpanded = expanded[fatura.id];
                                    return (
                                        <React.Fragment key={fatura.id}>
                                            {renderFaturaRow(fatura, layout, isExpanded, false)}
                                            {isExpanded &&
                                                hasSubFaturas &&
                                                fatura.faturas &&
                                                fatura.faturas.length > 0 &&
                                                fatura.faturas.map((sub) => renderFaturaRow(sub, layout, false, true))}
                                        </React.Fragment>
                                    );
                                })}
                        </>
                    </TableCustom>
                    <div className="py-3">
                        <PaginacaoCustom meta={faturas?.meta} onPageChange={handlePageChange} />
                    </div>
                </div>
            )}
        </Content>
    );
};

export default ListasFaturas;
