import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasCliente } from './TabelaFaturasCliente';

interface IListaFaturasProps {
    data: IFatura[] | undefined;
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
    cancelarBoleto: (fatura: IFatura) => void;
}

export const ListaFaturas: React.FC<IListaFaturasProps> = ({ 
    data,
    setIsModalConfirmaPagamento,
    realizarFechamento, 
    verificarFechamentoExistente,
    visualizarFechamento,
    cancelarBoleto
}) => {
    return (
        <TabelaFaturasCliente
            faturas={data || []}
            setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
            realizarFechamento={realizarFechamento}
            verificarFechamentoExistente={verificarFechamentoExistente}
            visualizarFechamento={visualizarFechamento}
            cancelarBoleto={cancelarBoleto}
        />
    );
};
