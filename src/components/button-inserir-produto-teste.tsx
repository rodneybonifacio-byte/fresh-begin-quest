import { ButtonComponent } from "./button"

export const ButtonInserirProdutoTeste = ({ processarEntrada }: { processarEntrada: (ean: string) => void }) => {
    const adicionarCodigoEanAleatorioTeste = () => {
        const codEan = [
            "7891000200202",
            "7622210592750",
            "7894900010014",
            "7891000700707",
            "7891000900909",
            "999",
            "7891000800808",
            "7891000100101",
            "7891000300303",
            "0000000000026",
            "7891000600606",
            "7891001001010",
            "7891000500505",
            "7891000400404",
        ]

        //pega um ean aleatorio
        const ean = codEan[Math.floor(Math.random() * codEan.length)];

        processarEntrada(ean);
    }
    return (
        <ButtonComponent onClick={adicionarCodigoEanAleatorioTeste} variant="primary">Adicionar Produto Aleatorio</ButtonComponent>
    )
}