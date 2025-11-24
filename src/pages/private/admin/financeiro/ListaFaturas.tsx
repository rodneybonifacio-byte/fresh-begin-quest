import type { IFatura } from '../../../../types/IFatura';
import { useLayout } from '../../../../providers/LayoutContext';
import { TabelaFaturasCliente } from './TabelaFaturasCliente';

interface IListaFaturasProps {
    data: IFatura[] | undefined;
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    notificaViaWhatsApp: (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA') => void;
    estaAtrasada: (fatura: IFatura) => boolean;
    imprimirFaturaPdf: (fatura: IFatura) => void;
    realizarFechamento: (fatura: IFatura) => void;
    emitirBoleto: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
}

export const ListaFaturas: React.FC<IListaFaturasProps> = ({ 
    data, 
    setIsModalConfirmaPagamento, 
    notificaViaWhatsApp, 
    estaAtrasada, 
    imprimirFaturaPdf, 
    realizarFechamento, 
    emitirBoleto,
    verificarFechamentoExistente,
    visualizarFechamento
}) => {
    const { layout } = useLayout();
    return (
        <TabelaFaturasCliente
            faturas={data || []}
            layout={layout}
            setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
            notificaViaWhatsApp={notificaViaWhatsApp}
            estaAtrasada={estaAtrasada}
            imprimirFaturaPdf={imprimirFaturaPdf}
            realizarFechamento={realizarFechamento}
            emitirBoleto={emitirBoleto}
            verificarFechamentoExistente={verificarFechamentoExistente}
            visualizarFechamento={visualizarFechamento}
        />
    );
};
