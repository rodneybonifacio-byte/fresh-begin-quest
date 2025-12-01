import React, { useState } from 'react';
import type { IFatura } from '../../types/IFatura';
import { FaturaCard } from './FaturaCard';
import { ModalEnviarFaturaWhatsApp } from '../ModalEnviarFaturaWhatsApp';

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
    const [modalEnviarFatura, setModalEnviarFatura] = useState<{
        isOpen: boolean;
        fatura: IFatura | null;
        fechamentoData: any;
    }>({ isOpen: false, fatura: null, fechamentoData: null });

    const toggleExpand = (faturaId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [faturaId]: !prev[faturaId],
        }));
    };

    const abrirModalEnviarFatura = (fatura: IFatura) => {
        const fechamentoData = verificarFechamentoExistente(fatura.id);
        if (!fechamentoData || (!fechamentoData.faturaPdf && !fechamentoData.boletoPdf)) {
            return;
        }
        setModalEnviarFatura({
            isOpen: true,
            fatura,
            fechamentoData,
        });
    };

    return (
        <>
            <div className="space-y-3">
                {faturas.map((fatura) => (
                    <FaturaCard
                        key={fatura.id}
                        fatura={fatura}
                        onConfirmarPagamento={onConfirmarPagamento}
                        onRealizarFechamento={onRealizarFechamento}
                        onVisualizarFechamento={onVisualizarFechamento}
                        onCancelarBoleto={onCancelarBoleto}
                        onEnviarFatura={abrirModalEnviarFatura}
                        verificarFechamentoExistente={verificarFechamentoExistente}
                        isExpanded={expandedRows[fatura.id]}
                        onToggleExpand={() => toggleExpand(fatura.id)}
                    />
                ))}
            </div>

            <ModalEnviarFaturaWhatsApp
                isOpen={modalEnviarFatura.isOpen}
                onClose={() => setModalEnviarFatura({ isOpen: false, fatura: null, fechamentoData: null })}
                fatura={modalEnviarFatura.fatura}
                fechamentoData={modalEnviarFatura.fechamentoData}
            />
        </>
    );
};