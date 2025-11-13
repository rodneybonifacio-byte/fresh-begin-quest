export interface IEmbalagem {
    id: string;
    descricao: string;
    altura: number;
    largura: number;
    comprimento: number;
    peso: number;
    diametro: number;
    formatoObjeto: FormatoObjeto;
}

export const formatoObjeto: { label: string; value: FormatoObjeto }[] = [
    { label: "Envelope", value: "ENVELOPE" },
    { label: "Caixa/Pacote", value: "CAIXA_PACOTE" },
    { label: "Cilindro/Rolo", value: "CILINDRO_ROLO" },
];

export type FormatoObjeto = "ENVELOPE" | "CAIXA_PACOTE" | "CILINDRO_ROLO";
