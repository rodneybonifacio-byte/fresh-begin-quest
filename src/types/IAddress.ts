export interface IAddress {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
}

export interface ITipoEndereco {
    descricao: string
}