import type { IAddress } from "./IAddress";

export interface IDestinatario {
    id: string;
    nome: string;
    cpfCnpj: string;
    telefone?: string;
    celular: string;
    endereco?: IAddress
}