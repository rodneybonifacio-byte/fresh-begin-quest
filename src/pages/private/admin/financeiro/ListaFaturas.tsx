import type { IFatura } from '../../../../types/IFatura';
import { TabelaFaturasCliente } from './TabelaFaturasCliente';

interface IListaFaturasProps {
    data: IFatura[] | undefined;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
}

export const ListaFaturas: React.FC<IListaFaturasProps> = ({ 
    data, 
    realizarFechamento, 
    verificarFechamentoExistente,
    visualizarFechamento
}) => {
    return (
        <TabelaFaturasCliente
            faturas={data || []}
            realizarFechamento={realizarFechamento}
            verificarFechamentoExistente={verificarFechamentoExistente}
            visualizarFechamento={visualizarFechamento}
        />
    );
};
