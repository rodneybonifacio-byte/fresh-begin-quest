import React, { useState } from 'react';
import type { IFatura } from '../../types/IFatura';
import { FaturaCard } from './FaturaCard';

interface FaturaMobileListProps {
    faturas: IFatura[];
    onConfirmarPagamento: (fatura: IFatura) => void;
    onRealizarFechamento: (fatura: IFatura) => void;
    onVisualizarFechamento: (fatura: IFatura) => void;
    onCancelarBoleto: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
}

export const FaturaMobileList: React.FC<FaturaMobileListProps> = ({
    faturas,
    onConfirmarPagamento,
    onRealizarFechamento,
    onVisualizarFechamento,
    onCancelarBoleto,
    verificarFechamentoExistente,
}) => {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleExpand = (faturaId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [faturaId]: !prev[faturaId],
        }));
    };

    return (
        <div className="space-y-3">
            {faturas.map((fatura) => (
                <FaturaCard
                    key={fatura.id}
                    fatura={fatura}
                    onConfirmarPagamento={onConfirmarPagamento}
                    onRealizarFechamento={onRealizarFechamento}
                    onVisualizarFechamento={onVisualizarFechamento}
                    onCancelarBoleto={onCancelarBoleto}
                    verificarFechamentoExistente={verificarFechamentoExistente}
                    isExpanded={expandedRows[fatura.id]}
                    onToggleExpand={() => toggleExpand(fatura.id)}
                />
            ))}
        </div>
    );
};