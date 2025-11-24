import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasComSubtabela } from '../../../../components/TabelaFaturasComSubtabela';
import React from 'react';

interface TabelaFaturasClienteProps {
    faturas: IFatura[];
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
    cancelarBoleto: (fatura: IFatura) => void;
}

export const TabelaFaturasCliente: React.FC<TabelaFaturasClienteProps> = ({
    faturas,
    setIsModalConfirmaPagamento,
    realizarFechamento,
    verificarFechamentoExistente,
    visualizarFechamento,
    cancelarBoleto,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
            <TabelaFaturasComSubtabela
                faturas={faturas}
                setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
                realizarFechamento={realizarFechamento}
                verificarFechamentoExistente={verificarFechamentoExistente}
                visualizarFechamento={visualizarFechamento}
                cancelarBoleto={cancelarBoleto}
            />
        </div>
    );
};
