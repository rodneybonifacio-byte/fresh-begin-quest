import type { IFatura } from '../../../../types/IFatura';
import { useLayout } from '../../../../providers/LayoutContext';
import { TabelaFaturasCliente } from './TabelaFaturasCliente';

interface IListaFaturasProps {
    data: IFatura[] | undefined;
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    notificaViaWhatsApp: (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA') => void;
    estaAtrasada: (fatura: IFatura) => boolean;
    imprimirFaturaPdf: (fatura: IFatura) => void;
}

export const ListaFaturas: React.FC<IListaFaturasProps> = ({ data, setIsModalConfirmaPagamento, notificaViaWhatsApp, estaAtrasada, imprimirFaturaPdf }) => {
    const { layout } = useLayout();
    return (
        <TabelaFaturasCliente
            faturas={data || []}
            layout={layout}
            setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
            notificaViaWhatsApp={notificaViaWhatsApp}
            estaAtrasada={estaAtrasada}
            imprimirFaturaPdf={imprimirFaturaPdf}
        />
    );
};
