import type { ICarteiraCliente } from "./CarteiraCliente";
import type { IAddress } from "./IAddress";
import type { IConfiguracoes } from "./IConfiguracoes";
import type { IPlano } from "./IPlano";

export interface ICliente {
    id: string;
    nomeEmpresa: string;
    nomResponsavel: string;
    cpfCnpj: string;
    email: string;
    telefone: string;
    celular: string;
    endereco?: IAddress;
    status?: string;
    plano: IPlano
    carteira: ICarteiraCliente
    criadoEm: string;
    configuracoes: IConfiguracoes;
}