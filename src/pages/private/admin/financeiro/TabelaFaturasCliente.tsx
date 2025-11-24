import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasComSubtabela } from '../../../../components/TabelaFaturasComSubtabela';
import React from 'react';

interface TabelaFaturasClienteProps {
    faturas: IFatura[];
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
}

export const TabelaFaturasCliente: React.FC<TabelaFaturasClienteProps> = ({
    faturas,
    realizarFechamento,
    verificarFechamentoExistente,
    visualizarFechamento,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
            <TabelaFaturasComSubtabela
                faturas={faturas}
                realizarFechamento={realizarFechamento}
                verificarFechamentoExistente={verificarFechamentoExistente}
                visualizarFechamento={visualizarFechamento}
            />
        </div>
    );
};
