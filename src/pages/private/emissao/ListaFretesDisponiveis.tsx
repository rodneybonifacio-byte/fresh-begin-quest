import type { ICotacaoMinimaResponse } from "../../../types/ICotacao";
import { CotacaoList } from "../../../components/CotacaoList";

interface ListaFretesDisponiveisProps {
    data: ICotacaoMinimaResponse[]
    onSelected: (frete: ICotacaoMinimaResponse) => void
    selected: ICotacaoMinimaResponse | null
    isLoading?: boolean
}

export const ListaFretesDisponiveis = ({
    onSelected,
    data,
    selected,
    isLoading = false
}: ListaFretesDisponiveisProps) => {
    return (
        <div className="flex flex-col w-full gap-4">
            <h1 className="font-semibold text-2xl flex flex-col">
                Lista de fretes disponíveis:
                <small className="text-xs text-slate-400">Selecione um frete para prosseguir.</small>
            </h1>
            <div className="w-full rounded-lg flex-col">
                <CotacaoList
                    cotacoes={data}
                    onSelectCotacao={onSelected}
                    selectedCotacao={selected || undefined}
                    showSelectButtons={true}
                    isLoading={isLoading}
                    emptyStateMessage="Nenhuma opção de frete disponível. Verifique os dados do pedido."
                />
            </div>
        </div>
    );
};
