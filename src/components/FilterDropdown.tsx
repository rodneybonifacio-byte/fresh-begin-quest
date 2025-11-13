import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import SelectCustom from "./SelectCustom";
import { InputLabel } from "./input-label";
import { ButtonComponent } from "./button";
import { ClienteService } from "../services/ClienteService";
import { useFetchQuery } from "../hooks/useFetchQuery";
import type { IClienteToFilter } from "../types/viewModel/IClienteToFilter";

interface FilterDropdownProps {
    formFiltro: any;
    setFormFiltro: (fn: (prev: any) => any) => void;
    onApply: () => void;
    onReset: () => void;
}
export const FilterDropdown = ({ formFiltro, setFormFiltro, onApply, onReset }: FilterDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [clienteFilter, setClienteFilter] = useState<{ label: string; value: string }[] | null>(null);

    const serviceCliente = new ClienteService();
    const { data: clientes, isLoading } = useFetchQuery<IClienteToFilter[]>(
        ['dashboard-geral-cliente-filter'],
        async () => {
            return await serviceCliente.obterAtivos();
        }
    )

    const handleApply = () => {
        onApply();
        setIsOpen(false);
    };

    // Atualiza o filtro de clientes com os dados obtidos
    useEffect(() => {
        if (clientes) {
            setClienteFilter(clientes.map(cliente => ({
                label: cliente.nome,
                value: cliente.id
            })));
        }
    }, [clientes]);

    const handleReset = () => {
        onReset();
        setIsOpen(false);
    };

    return (
        <div className="relative filter-dropdown-container w-full">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="p-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition"
            >
                <Filter className="text-gray-700 dark:text-gray-200" />
            </button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute  mt-2 w-full md:w-[460px] md:h-auto z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4"
                >
                    <div className="flex flex-col gap-4">
                        <SelectCustom
                            label="Cliente"
                            searchable
                            isLoading={isLoading}
                            data={clienteFilter || []}
                            valueSelected={formFiltro.clienteId}
                            onChange={(v: any) => setFormFiltro(prev => ({ ...prev, clienteId: v.toString() }))}
                        />

                        <SelectCustom
                            label="Período"
                            data={[
                                { value: 'hoje', label: 'Hoje' },
                                { value: 'ultimos_7_dias', label: 'Últimos 7 Dias' },
                                { value: 'ultimos_15_dias', label: 'Últimos 15 Dias' },
                                { value: 'ultimos_30_dias', label: 'Últimos 30 Dias' },
                                { value: 'ultimos_60_dias', label: 'Últimos 60 Dias' },
                                { value: 'periodoPersonalizado', label: 'Período Personalizado' },
                            ]}
                            valueSelected={formFiltro.periodo}
                            onChange={(v: any) => setFormFiltro(prev => ({ ...prev, periodo: v.toString() }))}
                        />

                        {formFiltro.periodo === 'periodoPersonalizado' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InputLabel
                                    labelTitulo="Data Inicial:"
                                    type="date"
                                    value={formFiltro.dataIni}
                                    onChange={(e: any) => setFormFiltro(prev => ({ ...prev, dataIni: e.target.value }))}
                                />
                                <InputLabel
                                    labelTitulo="Data Final:"
                                    type="date"
                                    value={formFiltro.dataFim}
                                    onChange={(e: any) => setFormFiltro(prev => ({ ...prev, dataFim: e.target.value }))}
                                />
                            </div>
                        )}

                        <ButtonComponent onClick={handleApply}>Aplicar</ButtonComponent>
                        <ButtonComponent variant="primary"  onClick={handleReset} border="outline">Resetar</ButtonComponent>
                    </div>
                </div>
            )}
        </div>
    );
};
