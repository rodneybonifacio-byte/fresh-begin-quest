import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasCliente } from './TabelaFaturasCliente';

interface IListaFaturasProps {
    data: IFatura[] | undefined;
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    notificaViaWhatsApp: (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA') => void;
    estaAtrasada: (fatura: IFatura) => boolean;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
    cancelarBoleto: (fatura: IFatura) => void;
}

export const ListaFaturas: React.FC<IListaFaturasProps> = ({ 
    data,
    setIsModalConfirmaPagamento,
    notificaViaWhatsApp,
    estaAtrasada,
    realizarFechamento, 
    verificarFechamentoExistente,
    visualizarFechamento,
    cancelarBoleto
}) => {
    return (
        <TabelaFaturasCliente
            faturas={data || []}
            setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
            notificaViaWhatsApp={notificaViaWhatsApp}
            estaAtrasada={estaAtrasada}
            realizarFechamento={realizarFechamento}
            verificarFechamentoExistente={verificarFechamentoExistente}
            visualizarFechamento={visualizarFechamento}
            cancelarBoleto={cancelarBoleto}
        />
    );
};
