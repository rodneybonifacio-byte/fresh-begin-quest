import { ArrowDown01, ArrowUp01, CalendarDays, IdCard, Printer, ReceiptText, Tag, User, Users } from "lucide-react";
import type { IEmissao } from "../types/IEmissao";
import { StatusBadge } from "./StatusBadge";
import { StatusBadgeEmissao } from "./StatusBadgeEmissao";
import { formatCpfCnpj } from "../utils/lib.formats";
import { formatEnderecoShort } from "../utils/endereco.mapper";
import { truncateText } from "../utils/funcoes";
import { formatMoedaDecimal } from "../utils/formatCurrency";
import { formatDateTime } from "../utils/date-utils";
import { Link } from "react-router-dom";

interface EmissaoInfoProps {
    emissao: IEmissao;
    handleOnPDF: (emissao: IEmissao, mergePdf: boolean) => void;
    handleOnViewErroPostagem: (jsonContent: string) => void;
}

export const EmissaoInfo = ({ emissao, handleOnPDF, handleOnViewErroPostagem }: EmissaoInfoProps) => {
    return (
        <div key={emissao.id} className="card bg-white rounded-lg border border-gray-100 relative h-full flex flex-col overflow-visible">
            <div className="status-badge flex flex-row gap-2 absolute top-2 right-4 ">
                <StatusBadgeEmissao status={emissao.status} mensagensErrorPostagem={emissao.mensagensErrorPostagem} handleOnViewErroPostagem={handleOnViewErroPostagem} />
                <StatusBadge status={emissao.statusFaturamento || ''} tipo="faturamento" />
            </div>
            <div className="p-6 pt-12 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex items-center mb-5 gap-2">
                        {/* Ícone do usuário com tamanho fixo */}
                        <div className="bg-gray-200 border-2 border-dashed rounded w-14 h-14 flex items-center justify-center text-gray-500 text-2xl flex-shrink-0 min-w-[40px] min-h-[40px]">
                            <User size={28} />
                        </div>

                        {/* Informações ao lado */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-bold text-slate-800 truncate" title={emissao.destinatario?.nome}>
                                    {emissao.destinatario?.nome}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span className="font-semibold">CPF/CNPJ:</span>
                                <span>{formatCpfCnpj(emissao?.destinatario?.cpfCnpj ?? '') || '***********'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">

                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-800 font-semibold flex items-center">
                                <IdCard className="mr-2" size={18} /> Endereço de entrega:
                            </span>
                            <span className="text-gray-700 text-xs">
                                {formatEnderecoShort(emissao?.destinatario?.endereco) || '***********'}
                            </span>
                        </div>

                        <div className="flex flex-row gap-1">
                            <Users className="mr-2" size={18} />
                            <div className="text-xs flex flex-col">
                                <span className=" font-bold text-slate-800">{emissao.remetenteNome}</span>
                                <small className="text-slate-700">
                                    {emissao.cliente?.nome && truncateText(emissao.cliente?.nome, 20) || ''}
                                </small>
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-800 font-semibold flex items-center">
                                    <ArrowUp01 className="mr-1" size={18} /> Valor
                                </span>
                                <span className="text-gray-700 text-xs">
                                    {formatMoedaDecimal(emissao.valor || 0)}<br />
                                </span>
                            </div>

                            <div className="flex flex-col gap-1 justify-end items-end">
                                <span className="text-xs text-slate-800 font-semibold flex items-center">
                                    <ArrowDown01 className="mr-1" size={18} /> Custo
                                </span>
                                <span className="text-gray-700 text-xs">
                                    {emissao.valorPostagem && formatMoedaDecimal(emissao.valorPostagem || 0)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-800 font-semibold flex items-center">
                                    <CalendarDays className="mr-2" size={18} /> Criado em:
                                </span>
                                <span className="text-gray-700 text-xs">
                                    {formatDateTime(emissao?.criadoEm || '') || emissao.criadoEm}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1 justify-end items-end">
                                <span className="text-xs text-slate-800 font-semibold flex items-center">
                                    <Tag className="mr-2" size={18} /> {emissao.codigoObjeto || '***********'}
                                </span>
                                <span className="text-gray-700 text-xs">
                                    {emissao.servico || '***********'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Footer fixo na base do card */}
                <div className="flex justify-between mt-2 pt-4 border-t border-gray-100">
                    <Link to={`./detail/${emissao.id}`} className="text-slate-600 hover:text-slate-700 transition flex items-center py-2 px-3 rounded border border-slate-400 hover:bg-slate-100">
                        <ReceiptText size={16} />
                    </Link>

                    <button onClick={(e) => { e.preventDefault(); handleOnPDF(emissao, false); }} className="text-slate-600 hover:text-slate-700 transition flex items-center py-2 px-3 rounded border border-slate-400 hover:bg-slate-100">
                        <Printer size={16} />
                    </button>

                    <button onClick={(e) => { e.preventDefault(); handleOnPDF(emissao, true); }} className="text-slate-600 hover:text-slate-700 transition flex items-center py-2 px-3 rounded border border-slate-400 hover:bg-slate-100">
                        <Tag size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}