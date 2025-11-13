import type { IAddress } from "../IAddress";

export interface IRemetenteResponse {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    cpfCnpj: string;
    criadoEm?: string;
    endereco: IAddress;
}
