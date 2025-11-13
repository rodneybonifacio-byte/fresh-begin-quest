export interface ItemDimensao {
    id: number;
    altura: number;
    largura: number;
    comprimento: number;
    peso: number;
    quantidade: number;
    pesoCubado: number;
}

export interface CaixaItemDimensao {
    label: string
    value: string
    dimensao: Omit<ItemDimensao, "id">
}

export const caixasPadrao: CaixaItemDimensao[] = [
    { label: "Caixa 1 | 14x18x14x0.300", value: "caixa1", dimensao: { altura: 14, largura: 18, comprimento: 14, peso: 300, quantidade: 1, pesoCubado: 0 } },
    { label: "Caixa 2 | 16x19x10x1.000", value: "caixa2", dimensao: { altura: 16, largura: 19, comprimento: 10, peso: 1000, quantidade: 1, pesoCubado: 0 } },
    { label: "Caixa 3 | 13x11x12x2.000", value: "caixa3", dimensao: { altura: 13, largura: 11, comprimento: 12, peso: 2000, quantidade: 1, pesoCubado: 0 } },
    { label: "Caixa 4 | 11x15x12x3.000", value: "caixa4", dimensao: { altura: 11, largura: 15, comprimento: 12, peso: 3000, quantidade: 1, pesoCubado: 0 } },
    { label: "Caixa 5 | 12x14x11x4.000", value: "caixa5", dimensao: { altura: 12, largura: 14, comprimento: 11, peso: 4000, quantidade: 1, pesoCubado: 0 } },
];