import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasComSubtabela } from '../../../../components/TabelaFaturasComSubtabela';
import React from 'react';

interface TabelaFaturasClienteProps {
    faturas: IFatura[];
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    notificaViaWhatsApp: (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA') => void;
    estaAtrasada: (fatura: IFatura) => boolean;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
}

export const TabelaFaturasCliente: React.FC<TabelaFaturasClienteProps> = ({
    faturas,
    setIsModalConfirmaPagamento,
    notificaViaWhatsApp,
    estaAtrasada,
    realizarFechamento,
    verificarFechamentoExistente,
    visualizarFechamento,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
            <TabelaFaturasComSubtabela
                faturas={faturas}
                setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
                notificaViaWhatsApp={notificaViaWhatsApp}
                estaAtrasada={estaAtrasada}
                realizarFechamento={realizarFechamento}
                verificarFechamentoExistente={verificarFechamentoExistente}
                visualizarFechamento={visualizarFechamento}
            />
        </div>
    );
};
