import { truncateText } from "./funcoes";
import { formatCep } from "./lib.formats";

export const formatEndereco = (endereco: any): string => {
    return `${endereco.logradouro}, ${endereco.numero} ${endereco.complemento ? `- ${endereco.complemento}` : ''}, ${endereco.bairro}, ${endereco.cidade} - ${endereco.estado}, CEP: ${endereco.cep}`;
};

export const formatEnderecoShort = (endereco: any): string => {
    return `${endereco.logradouro} - ${endereco.bairro}, ${truncateText(endereco.localidade, 5)}-${endereco.uf}, ${formatCep(endereco.cep)}`;
};