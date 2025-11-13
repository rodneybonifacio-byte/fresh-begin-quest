import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { IRastreioResponse } from "../../../types/rastreio/IRastreio"

interface ListaRastreioProps {
    historicoRastreios: IRastreioResponse | undefined
}


export const ListaHistoricoRastreio = ({ historicoRastreios }: ListaRastreioProps) => {
    return (
        <div className="flex flex-col w-full gap-6 justify-start items-start sm:justify-start sm:items-start bg-white dark:bg-slate-800 p-3 rounded-lg">
            {historicoRastreios?.eventos.map((rastreio, index) => (
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
                                <p className="text-xs font-normal text-slate-400 dark:text-slate-500 text-start mb-2 leading-4">
                                    {rastreio?.unidadeDestino ? 'de ' : ''}
                                    {rastreio?.unidade.tipo}:  {rastreio?.unidade.cidadeUf}
                                </p>
                            )}
                            {rastreio?.unidadeDestino && (
                                <p className="text-xs font-normal text-slate-400 dark:text-slate-500 text-start mb-2 leading-4">
                                    para {rastreio?.unidadeDestino.tipo}:  {rastreio?.unidadeDestino.cidadeUf}
                                </p>
                            )}
                            <span className="text-red-500 text-xs font-medium">
                                {rastreio?.detalhes ? rastreio?.detalhes : ''}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}