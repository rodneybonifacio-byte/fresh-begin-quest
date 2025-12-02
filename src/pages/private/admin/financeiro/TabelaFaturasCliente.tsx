import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasComSubtabela } from '../../../../components/TabelaFaturasComSubtabela';
import { FaturaMobileList } from '../../../../components/faturas/FaturaMobileList';
import { useBreakpoint } from '../../../../hooks/useBreakpoint';
import React from 'react';

export interface TabelaFaturasClienteProps {
    faturas: IFatura[];
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
    cancelarBoleto: (fatura: IFatura) => void;
    testarPDF?: (fatura: IFatura) => void;
}

export const TabelaFaturasCliente: React.FC<TabelaFaturasClienteProps> = ({
    faturas,
    setIsModalConfirmaPagamento,
    realizarFechamento,
    verificarFechamentoExistente,
    visualizarFechamento,
    cancelarBoleto,
    testarPDF,
}) => {
    const isMobile = useBreakpoint(undefined, 'md');

    return (
        <div className={isMobile ? 'space-y-3' : 'bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible'}>
            {isMobile ? (
                <FaturaMobileList
                    faturas={faturas}
                    onConfirmarPagamento={(fatura) => setIsModalConfirmaPagamento({ isOpen: true, fatura })}
                    onRealizarFechamento={realizarFechamento}
                    onVisualizarFechamento={visualizarFechamento}
                    onCancelarBoleto={cancelarBoleto}
                    verificarFechamentoExistente={verificarFechamentoExistente}
                />
            ) : (
                <TabelaFaturasComSubtabela
                    faturas={faturas}
                    setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
                    realizarFechamento={realizarFechamento}
                    verificarFechamentoExistente={verificarFechamentoExistente}
                    visualizarFechamento={visualizarFechamento}
                    cancelarBoleto={cancelarBoleto}
                    testarPDF={testarPDF}
                />
            )}
        </div>
    );
};
