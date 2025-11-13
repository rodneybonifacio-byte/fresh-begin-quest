import type { ActionItem } from "../components/DropdownActions";
import type { IEmissao } from "../types/IEmissao";

type EmissaoDropdownItemId =
    | "editar"
    | "vermais"
    | "imprimir-etiqueta-declaracao"
    | "imprimir-etiqueta"
    | "rastrear"
    | "imprimir-declaracao-conteudo"
    | "pre-postagem-reenviar";

interface EmissaoDropdownCallbacks {
    onEditar?: () => void;
    onVerMais?: () => void;
    onImprimir?: () => void;
    onImprimirCompleto?: () => void;
    onDeclaracao?: () => void;
    onRastrear?: () => void;
    onReenviar?: () => void;
}

export const getDropdownActionsEmissao = (
    emissao: IEmissao,
    actions: EmissaoDropdownCallbacks,
    permitidos?: EmissaoDropdownItemId[]
): ActionItem[] => {
    const statusBloqueados = ["ENTREGUE", "EM_TRANSITO", "POSTADO"];
    const podeImprimir = !emissao.mensagensErrorPostagem && !statusBloqueados.includes(emissao.status as string);
    const podeReenviar = !!emissao.mensagensErrorPostagem;
    const podeRastrear = !!emissao.codigoObjeto;

    const items: (ActionItem & { id: EmissaoDropdownItemId })[] = [
        {
            id: "imprimir-etiqueta",
            label: "Imprimir Etiqueta",
            onClick: actions.onImprimir,
            show: podeImprimir
        },
        {
            id: "rastrear",
            label: "Rastrear",
            onClick: actions.onRastrear,
            show: podeRastrear
        },
        {
            id: "pre-postagem-reenviar",
            label: "Reenviar novamente",
            onClick: actions.onReenviar,
            show: podeReenviar
        }
    ];

    return items
        .filter(item => (!permitidos || permitidos.includes(item.id)) && item.show !== false)
        .map(({ id, ...rest }) => rest); // Remove `id` se não quiser expor no componente
};
