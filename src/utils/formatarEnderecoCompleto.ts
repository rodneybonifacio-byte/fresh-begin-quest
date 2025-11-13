import type { IAddress } from "../types/IAddress";
import { formatCep } from "./lib.formats";

export function formatarEnderecoCompleto(endereco?: IAddress): string {
    const end = endereco;
    if (!end) return "---";

    const {
        logradouro = '',
        numero = '',
        complemento = '',
        bairro = '',
        localidade = '',
        uf = '',
        cep = ''
    } = end;

    if (!logradouro || !numero || !localidade || !uf) return "---";

    const enderecoFormatado = `${logradouro}, ${numero}${complemento ? `, ${complemento}` : ''} - ${bairro}, ${localidade}-${uf}, ${formatCep(cep || '')}`;
    return enderecoFormatado.trim();
}