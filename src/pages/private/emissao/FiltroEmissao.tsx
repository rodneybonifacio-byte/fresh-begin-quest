import { useSearchParams } from 'react-router-dom';
import { InputLabel } from '../../../components/input-label';
import SelectCustom from '../../../components/SelectCustom';
import { useEffect, useState } from 'react';
import { getStartOfMonth, getYesterday } from '../../../utils/date-utils';
import { ClienteService } from '../../../services/ClienteService';
import { useFetchQuery } from '../../../hooks/useFetchQuery';
import type { IClienteToFilter } from '../../../types/viewModel/IClienteToFilter';
import { useGlobalConfig } from '../../../providers/GlobalConfigContext';
import { RemetenteService } from '../../../services/RemetenteService';
import { useRemetentes } from '../../../hooks/useRemetente';
import { useTransportadora } from '../../../hooks/useTransportadora';

interface FiltroEmissaoProps {
    isDestinatario?: boolean;
    isCodigoObjeto?: boolean;
    onFiltrar?: (params: Record<string, string>) => void;
    onCancel?: () => void;
}

export const FiltroEmissao = ({ onFiltrar, isDestinatario, isCodigoObjeto, onCancel }: FiltroEmissaoProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const config = useGlobalConfig();
    const service = new RemetenteService();
    const perPage = config.pagination.perPage;
    const [page] = useState<number>(1);

    const [clienteFilter, setClienteFilter] = useState<{ label: string; value: string }[] | null>(null);
    const [transportadoraFilter, setTransportadoraFilter] = useState<{ label: string; value: string }[] | null>(null);
    const [remetenteFilter, setRemetenteFilter] = useState<{ label: string; value: string }[] | null>(null);
    // Busca todas as transportadoras disponíveis
    const { data: transportadorasData } = useTransportadora();

    const [form, setForm] = useState({
        status:
            searchParams
                .get('status')
                ?.split(',')
                .map((s) => s.trim())
                .filter(Boolean) || [],
        ...(!isDestinatario ? { destinatario: searchParams.get('destinatario') || '' } : {}),
        ...(!isCodigoObjeto ? { codigoObjeto: searchParams.get('codigoObjeto') || '' } : {}),
        dataIni: searchParams.get('dataIni') || getStartOfMonth(),
        dataFim: searchParams.get('dataFim') || getYesterday(),
        clienteId: searchParams.get('clienteId') || '',
        remetenteId: searchParams.get('remetenteId') || '',
        transportadora: searchParams.get('transportadora') || '',
    });

    const handleChange = (key: string, value: string | string[]) => {
        // updated to accept array
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleFiltrar = () => {
        const params = new URLSearchParams();
        Object.entries(form).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                params.set(key, value.join(',')); // join array values for URLSearchParams
            } else if (value) {
                params.set(key, value);
            }
        });

        setSearchParams(params);
        onFiltrar?.(Object.fromEntries(params.entries()));
        onCancel?.();
    };

    const serviceCliente = new ClienteService();
    const { data: clientes, isLoading } = useFetchQuery<IClienteToFilter[]>(['dashboard-geral-cliente-filter'], async () => {
        return await serviceCliente.obterAtivos();
    });

    const { data: remetentes, isLoading: remIsLoading, isError: _remIsError } = useRemetentes({ clienteId: form.clienteId, page, perPage, service });

    useEffect(() => {
        setClienteFilter(null);
        if (clientes) {
            setClienteFilter(
                clientes.map((cliente) => ({
                    label: cliente.nome,
                    value: cliente.id,
                }))
            );
        }

        setTransportadoraFilter(null);
        if (transportadorasData) {
            setTransportadoraFilter(
                transportadorasData.map((transportadora) => ({
                    label: transportadora.nome,
                    value: transportadora.nome.toLocaleUpperCase(),
                }))
            );
        }

        setRemetenteFilter(null);

        if (remetentes && form.clienteId && clientes) {
            const clienteSelecionado = clientes.find((c) => c.id === form.clienteId);

            const filteredRemetentes = remetentes?.data.filter((remetente) => {
                return remetente.cpfCnpj !== clienteSelecionado?.cpfCnpj;
            });

            setRemetenteFilter(
                filteredRemetentes.map((remetente) => ({
                    label: remetente.nome,
                    value: remetente.id,
                }))
            );
        }
    }, [clientes, remetentes, form.clienteId]);

    return (
        <div className="bg-white p-4 dark:bg-slate-800 w-full flex flex-col rounded-xl gap-6 text-gray-900 dark:text-gray-100">
            <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className={`grid grid-cols-2 w-full  xl:grid-cols-2 gap-4`}>
                        <InputLabel labelTitulo="Data Inicial:" type="date" value={form.dataIni} onChange={(e) => handleChange('dataIni', e.target.value)} />
                        <InputLabel labelTitulo="Data Final:" type="date" value={form.dataFim} onChange={(e) => handleChange('dataFim', e.target.value)} />
                    </div>
                    {!isCodigoObjeto && (
                        <div className="flex w-full">
                            <InputLabel
                                labelTitulo="Objeto:"
                                type="text"
                                value={form.codigoObjeto}
                                onChange={(e) => handleChange('codigoObjeto', e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <SelectCustom
                    label="Cliente"
                    searchable
                    isLoading={isLoading}
                    data={clienteFilter || []}
                    valueSelected={form.clienteId}
                    onChange={(v: any) => setForm((prev) => ({ ...prev, clienteId: v.toString() }))}
                />
                <div className="flex flex-col sm:flex-row gap-3">
                    <SelectCustom
                        label="Transportadoras"
                        searchable
                        isLoading={isLoading}
                        data={transportadoraFilter || []}
                        valueSelected={form.transportadora}
                        onChange={(v: any) => setForm((prev) => ({ ...prev, transportadora: v.toString() }))}
                    />
                    <SelectCustom
                        label="Remetentes"
                        searchable
                        isLoading={remIsLoading}
                        data={remetenteFilter || []}
                        valueSelected={form.remetenteId}
                        onChange={(v: any) => setForm((prev) => ({ ...prev, remetenteId: v.toString() }))}
                    />
                    <div className="grid grid-cols-1 gap-4 w-full z-10">
                        <SelectCustom
                            label="Status:"
                            data={[
                                { label: 'PRE POSTADO', value: 'PRE_POSTADO' },
                                { label: 'POSTADO', value: 'POSTADO' },
                                { label: 'EM TRANSITO', value: 'EM_TRANSITO' },
                                { label: 'COLETADO', value: 'COLETADO' },
                                { label: 'ENTREGUE', value: 'ENTREGUE' },
                            ]}
                            valueSelected={form.status}
                            searchable
                            multiple
                            onChange={(values) => handleChange('status', values)}
                        />
                    </div>
                </div>
                {!isDestinatario && (
                    <div className="grid grid-cols-1 gap-4">
                        {!isDestinatario && (
                            <InputLabel
                                labelTitulo="Destinatário:"
                                type="text"
                                value={form.destinatario}
                                onChange={(e) => handleChange('destinatario', e.target.value)}
                            />
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-start">
                <button
                    onClick={handleFiltrar}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition duration-300 shadow-sm hover:shadow-md"
                >
                    Aplicar Filtros
                </button>
            </div>
        </div>
    );
};
