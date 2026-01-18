import type { ICotacaoMinimaResponse } from "../../../types/ICotacao";
import { CotacaoList } from "../../../components/CotacaoList";

interface ListaFretesDisponiveisProps {
    data: ICotacaoMinimaResponse[]
    onSelected: (frete: ICotacaoMinimaResponse) => void
    selected: ICotacaoMinimaResponse | null
    isLoading?: boolean
    disabledServices?: string[]
}

export const ListaFretesDisponiveis = ({
    onSelected,
    data,
    selected,
    isLoading = false,
    disabledServices = []
}: ListaFretesDisponiveisProps) => {
    return (
        <div className="flex flex-col w-full gap-6">
            <div className="text-center">
                <h2 className="font-bold text-2xl text-foreground mb-2">
                    Opções de Frete Disponíveis
                </h2>
                <p className="text-sm text-muted-foreground">
                    Valores promocionais com descontos já aplicados
                </p>
            </div>
            <div className="w-full">
                <CotacaoList
                    cotacoes={data}
                    onSelectCotacao={onSelected}
                    selectedCotacao={selected || undefined}
                    showSelectButtons={true}
                    isLoading={isLoading}
                    emptyStateMessage="Nenhuma opção de frete disponível. Verifique os dados do pedido."
                    disabledServices={disabledServices}
                />
            </div>
        </div>
    );
};
