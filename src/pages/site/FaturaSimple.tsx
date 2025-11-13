import { useFetchQuery } from '../../hooks/useFetchQuery';
import { useParams } from 'react-router-dom';
import type { IFaturaSimpleView } from '../../types/fatura/FaturaSimpleView';
import axios from 'axios';
import { LogoApp } from '../../components/logo';
import { formatDateTime } from '../../utils/date-utils';
import { formatCpfCnpj } from '../../utils/lib.formats';
import { LoadSpinner } from '../../components/loading';

export default function FaturaSimple() {
    const { faturaId, subFaturaId } = useParams<{ faturaId: string, subFaturaId: string }>();
    const { data: fatura, isLoading } = useFetchQuery<IFaturaSimpleView>(
        ['fatura', faturaId, subFaturaId],
        async () => {
            if (!faturaId) throw new Error('Fatura ID is required');
            const result = await axios.get<IFaturaSimpleView>(`${import.meta.env.VITE_BASE_API_URL}/faturas/viewInHtml/${faturaId}${subFaturaId ? `/${subFaturaId}` : ''}`);
            return result.data;
        }
    )

    if (!fatura || isLoading) return <LoadSpinner />;

    const remetente = fatura.remetente || fatura.cliente;

    return (
        <div>
            <div className="max-w-4xl mx-auto bg-white shadow-md sm:p-6 text-gray-800">
                
                <div className="flex-col gap-3 sm:items-start items-center bg-gradient-to-r from-purple-900 to-orange-500 text-white p-6 rounded-md flex  mb-6">
                    <LogoApp light size="medium" />

                    <div className='flex justify-between items-center mb-4 w-full'>
                        <div>
                            <h1 className="text-2xl font-bold">Fatura</h1>
                            <span className="text-sm opacity-90">Nº: {fatura.codigo}</span>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur px-4 py-2 rounded-md text-center">
                            <strong className="block text-xs opacity-90">Status</strong>
                            <span className="text-sm font-semibold uppercase">{fatura.status}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200 pb-6 mb-6">
                    <div>
                        <h2 className="text-sm text-purple-800 font-semibold uppercase mb-2">Informações da Fatura</h2>
                        <p className="text-sm mb-1"><strong>Data de Emissão:</strong> {formatDateTime(fatura.criadoEm, "dd/MM/yyyy")}</p>
                        <p className="text-sm mb-1"><strong>Vencimento:</strong> {formatDateTime(fatura.dataVencimento, "dd/MM/yyyy")}</p>
                        <p className="text-sm mb-1"><strong>Período:</strong> {formatDateTime(fatura.periodoInicial, "dd/MM/yyyy")} - {formatDateTime(fatura.periodoFinal, "dd/MM/yyyy")}</p>
                    </div>
                    <div>
                        <h2 className="text-sm text-purple-800 font-semibold uppercase mb-2">Cliente</h2>
                        <p className="text-sm font-semibold">{remetente.nome}</p>
                        <p className="text-sm">{formatCpfCnpj(remetente.cpfCnpj)}</p>
                        <p className="text-sm">
                            {remetente.logradouro}, {remetente.numero} {remetente.complemento} - {remetente.bairro} <br />
                            {remetente.localidade}-{remetente.uf} {remetente.cep}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full text-sm border border-gray-200">
                        <thead>
                            <tr className="bg-purple-50 text-purple-800 uppercase text-xs">
                                <th className="px-4 py-2 text-left">Código Objeto</th>
                                <th className="px-4 py-2 text-left">Nome</th>
                                <th className="px-4 py-2 text-left">Data</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fatura.detalhe.map((item: any, i: number) => (
                                <tr key={i} className="border-t border-gray-100">
                                    <td className="px-4 py-2">{item.codigoObjeto}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{item.nome}</td>
                                    <td className="px-4 py-2">{formatDateTime(item.criadoEm, "dd/MM/yyyy")}</td>
                                    <td className="px-4 py-2">{item.status}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">R$ {item.valor}</td>
                                </tr>
                            ))}
                            <tr className="font-semibold border-t">
                                <td colSpan={4} className="px-4 py-2 text-right">Subtotal ({fatura.totalObjetos} objetos)</td>
                                <td className="px-4 py-2 text-right">R$ {fatura.totalFaturado}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-purple-50 rounded-md p-4 text-sm max-w-sm ml-auto">
                    <div className="flex justify-between mb-1">
                        <span>Total Faturado:</span>
                        <span>R$ {fatura.totalFaturado}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-purple-800 border-t pt-2 mt-2">
                        <span>Total a Pagar:</span>
                        <span>R$ {fatura.totalFaturado}</span>
                    </div>

                    <div className="mt-3 border-t border-dashed pt-2 text-gray-600">
                        <p><strong>Vencimento:</strong> {formatDateTime(fatura.dataVencimento)}</p>
                        <p><strong>Forma de Pagamento:</strong> {fatura.formaPagamento}</p>
                        <p><strong>Status:</strong> {fatura.status}</p>
                    </div>
                </div>

                <footer className="text-center text-xs text-gray-400 mt-10 pt-6 border-t">
                    <div className="font-bold text-purple-800 mb-1">BRHUB ENVIOS</div>
                    <p>Esta é uma fatura gerada automaticamente. Em caso de dúvidas, entre em contato com nosso suporte.</p>
                    <p>Telefone: (11) 94627-8338 / 91154-4095 | Email: financeiro@brhubb.com.br</p>
                    <p>&copy; 2025 BRHUB Envios. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
}