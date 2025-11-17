import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasComSubtabela } from '../../../../components/TabelaFaturasComSubtabela';
import React from 'react';

interface TabelaFaturasClienteProps {
    faturas: IFatura[];
    layout: string;
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    notificaViaWhatsApp: (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA') => void;
    estaAtrasada: (fatura: IFatura) => boolean;
    faturaAgrupada?: boolean;
    imprimirFaturaPdf: (fatura: IFatura) => void;
    realizarFechamento: (fatura: IFatura) => void;
    emitirBoleto: (fatura: IFatura) => void;
}

export const TabelaFaturasCliente: React.FC<TabelaFaturasClienteProps> = ({
    faturas,
    layout,
    setIsModalConfirmaPagamento,
    notificaViaWhatsApp,
    estaAtrasada,
    imprimirFaturaPdf,
    realizarFechamento,
    emitirBoleto,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
            <TabelaFaturasComSubtabela
                faturas={faturas}
                layout={layout}
                setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
                notificaViaWhatsApp={notificaViaWhatsApp}
                estaAtrasada={estaAtrasada}
                imprimirFaturaPdf={imprimirFaturaPdf}
                realizarFechamento={realizarFechamento}
                emitirBoleto={emitirBoleto}
            />
        </div>
    );
};
