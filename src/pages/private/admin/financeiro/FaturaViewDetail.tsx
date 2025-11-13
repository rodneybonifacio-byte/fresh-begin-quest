import { Content } from "../../Content"
import { LoadSpinner } from "../../../../components/loading";
import { useParams } from "react-router-dom";
import type { IResponse } from "../../../../types/IResponse";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { NotFoundData } from "../../../../components/NotFoundData";
import { Divider } from "../../../../components/divider";
import { StatusBadge } from "../../../../components/StatusBadge";
import { TableCustom } from "../../../../components/table";
import { FaturaService } from "../../../../services/FaturaService";
import type { FaturaDto } from "../../../../types/fatura/FaturaDto";
import { useEffect, useState } from "react";
import { formatCpfCnpj, formatTelefone } from "../../../../utils/lib.formats";
import { formatCurrencyWithCents } from "../../../../utils/formatCurrency";
import { format } from "date-fns";
import { formatDate, formatDateTime } from "../../../../utils/date-utils";
import { InfoGroup } from "../../../../components/InfoGroup";
import { useAuth } from "../../../../providers/AuthContext";
import { ToggleSection } from "../../../../components/ToggleSection";

const FaturaViewDetail = () => {
    const { user } = useAuth();
    const [faturaId] = useParams().faturaId ? [useParams().faturaId] : [];
    const [subfatura] = useParams().subfatura ? [useParams().subfatura] : [];
    const [fatura, setFatura] = useState<FaturaDto>({} as FaturaDto);

    const service = new FaturaService()

    const { data, isLoading, isError, isFetching } = useFetchQuery<IResponse<FaturaDto>>(
        ['fatura', faturaId],
        async () => await service.findByIdWithParams(undefined, `${user?.role === "ADMIN" ? "admin/" : ""}${faturaId}${subfatura ? `/${subfatura}` : ''}`) ?? null,
        { enabled: !!faturaId, retry: false }
    );

    useEffect(() => {
        if (data?.data) {
            setFatura(data.data);
        }
    }, [data]);

    if (isError) return <NotFoundData />;
    if (isLoading || isFetching) return <LoadSpinner mensagem="Aguarde, carregando informações da fatura..." />;

    return (
        <Content
            titulo={`Fatura #${fatura?.codigo}`}
            subTitulo="Visualização mais detalhada da fatura"
        >
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                <div className="flex flex-col gap-4">

                    <ToggleSection title="Detalhes da Fatura" defaultOpen>
                        <div className="bg-white w-full p-6 rounded-sm flex flex-col gap-4">
                            <div className="flex flex-row justify-between items-center gap-1">
                                <InfoGroup label="Cliente" values={[fatura?.cliente?.nome, fatura?.cliente?.cpfCnpj && formatCpfCnpj(fatura?.cliente?.cpfCnpj) || '-']} />
                                <InfoGroup label="Telefone" values={[fatura.cliente?.telefone && formatTelefone(fatura.cliente.telefone) || '-']} />
                            </div>
                            <InfoGroup label="Endereço" values={[`${fatura.cliente?.logradouro || '-'}, ${fatura.cliente?.numero || '-'} - ${fatura.cliente?.complemento || '-'} ${fatura.cliente?.bairro || '-'}, ${fatura.cliente?.localidade || '-'}-${fatura.cliente?.uf || '-'} ${fatura.cliente?.cep || '-'}`]} />
                            <Divider />
                            <div className="flex flex-row justify-between items-center gap-1">
                                <InfoGroup label="Valor da Fatura" values={[formatCurrencyWithCents(fatura?.totalFaturado)]} />
                                <InfoGroup label="Data de Vencimento" values={[fatura.dataVencimento && formatDate(fatura.dataVencimento) || '-']} align="right" />
                            </div>
                            <div className="flex flex-row justify-between items-center gap-1">
                                <InfoGroup label="Total Objetos" values={[fatura.totalObjetos > "1" ? `${fatura.totalObjetos} objetos` : `${fatura.totalObjetos} objeto`]} />
                                <InfoGroup label="Data de Pagamento" values={[fatura.dataPagamento && formatDate(fatura.dataPagamento) || '-']} align="right" />
                            </div>
                            <div className="flex flex-row justify-between items-center gap-1">
                                <InfoGroup label="Periodo de Faturamento" values={[fatura.periodoInicial && fatura.periodoFinal && `${formatDate(fatura.periodoInicial)} até ${formatDate(fatura.periodoFinal)}`]} />
                                <InfoGroup label="Data do Lançamento" values={[fatura.criadoEm && formatDate(fatura.criadoEm) || '-']} align="right" />
                            </div>
                        </div>
                    </ToggleSection>

                    <ToggleSection title="Histórico de Pagamento">
                        <div className="bg-white w-full p-4 rounded-sm flex flex-col gap-4">
                            {fatura.faturaHistoricoPagamento?.length === 0 ? (
                                <div className="max-w-md mx-auto  md:max-w-2xl">
                                    <div className="p-8">
                                        <div className="flex flex-col items-center">
                                            <div className="mb-6 p-4 bg-secondary/25 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>

                                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum pagamento registrado</h3>

                                            <p className="text-gray-500 text-center mb-6">Parece que ainda não há registros de pagamentos em sua conta.</p>

                                            <button className="px-6 py-2 bg-secondary hover:bg-secondary/90 text-white font-medium rounded-lg transition duration-200 ease-in-out transform hover:scale-105">
                                                Registrar pagamento
                                            </button>

                                            <div className="w-24 h-1 bg-gradient-to-r from-blue-100 to-blue-300 mt-8 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-row justify-between items-center gap-1">
                                        <InfoGroup label="Forma de Pagamento" values={[fatura.formaPagamento || '-']} />
                                        <InfoGroup align="right" label="Status do Pagamento" values={[fatura.status && <StatusBadge status={fatura.status} tipo="faturamento" />]} />
                                    </div>
                                    <div className="flex flex-row justify-between items-center gap-1">
                                        <TableCustom thead={['Data de Pagamento', 'Valor']}>
                                            {fatura.faturaHistoricoPagamento?.map((historico, index) => (
                                                <tr key={index} className={`hover:bg-gray-50`}>
                                                    <td className="px-4 py-3">{format(new Date(historico?.dataPagamento || ''), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3">{formatCurrencyWithCents(historico?.valor)}</td>
                                                </tr>
                                            ))}
                                        </TableCustom>
                                    </div>
                                </>
                            )}
                        </div>
                    </ToggleSection>

                    <ToggleSection title="Itens da Fatura">
                        <TableCustom thead={['#', 'Objeto', 'Status', 'Valor', 'Data']}>
                            {fatura.detalhe?.map((detalhe, index) => (
                                <tr key={index} className={`hover:bg-gray-50`}>
                                    <td className="px-4 py-3">{index + 1}</td>
                                    <td className="px-4 py-3">{detalhe.codigoObjeto}</td>
                                    <td className="px-4 py-3"><StatusBadge status={detalhe.status} tipo="envio" /></td>
                                    <td className="px-4 py-3">{formatCurrencyWithCents(detalhe?.valor)}</td>
                                    <td className="px-4 py-3">{formatDateTime(detalhe?.criadoEm || '')}</td>
                                </tr>
                            ))}
                        </TableCustom>
                    </ToggleSection>

                </div>
            </div>
        </Content>
    )
}
export default FaturaViewDetail;
