import React, { useState } from "react";
import { Search, Package, MapPin, Clock, Loader2, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { IRastreioResponse, IRastreio } from "../../types/rastreio/IRastreio";

export const PublicTrackingWidget = () => {
    const [codigo, setCodigo] = useState("");
    const [loading, setLoading] = useState(false);
    const [rastreio, setRastreio] = useState<IRastreioResponse | null>(null);
    const [error, setError] = useState("");

    const handleRastrear = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!codigo.trim()) {
            toast.error("Digite o código de rastreamento");
            return;
        }

        setLoading(true);
        setError("");
        setRastreio(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke('testar-rastreio', {
                body: { codigo: codigo.trim().toUpperCase() }
            });

            if (fnError) throw fnError;

            // A API retorna os dados em data.dados.data
            const rastreioData = data?.dados?.data || data?.rastreio;
            
            if (rastreioData && rastreioData.eventos && rastreioData.eventos.length > 0) {
                setRastreio(rastreioData);
            } else if (data?.error) {
                setError(data.error);
                toast.error(data.error);
            } else {
                setError("Nenhum resultado encontrado para este código");
                toast.error("Nenhum resultado encontrado");
            }
        } catch (err: any) {
            console.error("Erro ao rastrear:", err);
            setError("Erro ao buscar rastreamento. Tente novamente.");
            toast.error("Erro ao buscar rastreamento");
        } finally {
            setLoading(false);
        }
    };

    const formatarEnderecoUnidade = (unidade: any) => {
        if (!unidade?.endereco) return null;
        const end = unidade.endereco;
        const partes = [
            end.logradouro,
            end.numero ? `nº ${end.numero}` : '',
            end.bairro,
            end.cidade || unidade.cidadeUf?.split('-')[0],
            end.uf || unidade.cidadeUf?.split('-')[1],
        ].filter(Boolean);
        return partes.join(', ');
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* Formulário de busca */}
            <form onSubmit={handleRastrear} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                        placeholder="Ex: AA123456789BR"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F2541B] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                        maxLength={20}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F2541B] text-white font-medium rounded-lg hover:bg-[#d94a17] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Search className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline">Rastrear</span>
                </button>
            </form>

            {/* Resultado do rastreamento */}
            {rastreio && rastreio.eventos && rastreio.eventos.length > 0 && (
                <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden max-h-[400px] overflow-y-auto">
                    {/* Header com info do objeto */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-[#F2541B]" />
                                <span className="font-semibold text-gray-900">{rastreio.codigoObjeto}</span>
                                {rastreio.servico && (
                                    <span className="text-xs bg-[#F2541B]/10 text-[#F2541B] px-2 py-1 rounded-full font-medium">
                                        {rastreio.servico}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setRastreio(null);
                                    setCodigo("");
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                                title="Fechar rastreamento"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>
                        {rastreio.dataPrevisaoEntrega && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Previsão: {rastreio.dataPrevisaoEntrega}
                            </p>
                        )}
                    </div>

                    {/* Timeline de eventos */}
                    <div className="p-4">
                        <div className="relative">
                            {rastreio.eventos.slice(0, 5).map((evento: IRastreio, index: number) => {
                                const isFirst = index === 0;
                                const enderecoCompleto = evento.codigo === 'LDI' ? formatarEnderecoUnidade(evento.unidade) : null;

                                return (
                                    <div key={index} className="flex gap-3 pb-4 last:pb-0">
                                        {/* Linha vertical e ponto */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full ${isFirst ? 'bg-[#F2541B]' : 'bg-gray-300'}`} />
                                            {index < Math.min(rastreio.eventos.length - 1, 4) && (
                                                <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                                            )}
                                        </div>

                                        {/* Conteúdo do evento */}
                                        <div className="flex-1 -mt-0.5">
                                            <p className={`text-sm font-medium ${isFirst ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {evento.descricao}
                                            </p>
                                            {evento.unidade && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3" />
                                                    {evento.unidade.cidadeUf}
                                                </p>
                                            )}
                                            {enderecoCompleto && (
                                                <p className="text-xs text-orange-600 mt-1 bg-orange-50 px-2 py-1 rounded">
                                                    📍 {enderecoCompleto}
                                                </p>
                                            )}
                                            <time className="text-xs text-gray-400 mt-1 block">
                                                {format(parseISO(evento.dataCompleta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </time>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {rastreio.eventos.length > 5 && (
                            <a 
                                href={`/rastreio?codigo=${rastreio.codigoObjeto}`}
                                className="block text-center text-sm text-[#F2541B] hover:underline mt-3 font-medium"
                            >
                                Ver histórico completo ({rastreio.eventos.length - 5} eventos)
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Mensagem de erro */}
            {error && !rastreio && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
};
