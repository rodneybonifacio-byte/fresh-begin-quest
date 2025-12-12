import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { IRastreioResponse } from "../../../types/rastreio/IRastreio"
import { MapPinned, Navigation, ArrowRight } from "lucide-react"

interface ListaRastreioProps {
    historicoRastreios: IRastreioResponse | undefined
}

// Formata endereço completo da unidade de retirada
const formatarEnderecoUnidade = (unidade: any) => {
    if (!unidade?.endereco) return null;
    const end = unidade.endereco;
    const partes = [
        end.logradouro,
        end.numero ? `nº ${end.numero}` : '',
        end.bairro,
        end.cidade || unidade.cidadeUf?.split('-')[0],
        end.uf || unidade.cidadeUf?.split('-')[1],
        end.cep ? `CEP: ${end.cep}` : ''
    ].filter(Boolean);
    return partes.join(', ');
}

export const ListaHistoricoRastreio = ({ historicoRastreios }: ListaRastreioProps) => {
    return (
        <div className="flex flex-col w-full gap-6 justify-start items-start sm:justify-start sm:items-start bg-white dark:bg-slate-800 p-3 rounded-lg">
            {historicoRastreios?.eventos.map((rastreio, index) => {
                const enderecoCompleto = rastreio.codigo === 'LDI' ? formatarEnderecoUnidade(rastreio.unidade) : null;
                
                return (
                    <div
                        key={index}
                        className={`flex flex-row justify-start items-start gap-4 ${index < historicoRastreios?.eventos.length - 1 ? 'border-b' : ''} border-[#e3e4e8] dark:border-slate-600 w-full p-2`}
                    >
                        <img src={rastreio.image} alt={rastreio.descricao} className="w-20 h-12 object-contain" />
                        <div className="flex flex-col gap-1">
                            <time dateTime={rastreio.dataCompleta} className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                {format(parseISO(rastreio.dataCompleta), 'dd MMM HH:mm', { locale: ptBR })}
                            </time>
                            <div className="flex flex-col gap-1">
                                <p className="text-base text-slate-800 dark:text-slate-100 font-medium text-start mb-2 leading-6">
                                    {rastreio.descricao}
                                </p>
                                {rastreio?.unidade && (
                                    <div className="flex items-center gap-1.5 text-xs font-normal text-slate-400 dark:text-slate-500 text-start mb-2 leading-4">
                                        <Navigation className="w-3 h-3" />
                                        <span>
                                            {rastreio?.unidadeDestino ? 'de ' : ''}
                                            {rastreio?.unidade.tipo}: {rastreio?.unidade.cidadeUf}
                                        </span>
                                    </div>
                                )}
                                {/* Endereço completo de retirada para eventos LDI */}
                                {enderecoCompleto && (
                                    <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-md mt-1">
                                        <MapPinned className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                                                Local de retirada:
                                            </span>
                                            <span className="text-xs text-orange-600 dark:text-orange-300">
                                                {enderecoCompleto}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {rastreio?.unidadeDestino && (
                                    <div className="flex items-center gap-1.5 text-xs font-normal text-slate-400 dark:text-slate-500 text-start mb-2 leading-4">
                                        <ArrowRight className="w-3 h-3" />
                                        <span>
                                            para {rastreio?.unidadeDestino.tipo}: {rastreio?.unidadeDestino.cidadeUf}
                                        </span>
                                    </div>
                                )}
                                <span className="text-red-500 text-xs font-medium">
                                    {rastreio?.detalhes ? rastreio?.detalhes : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}
