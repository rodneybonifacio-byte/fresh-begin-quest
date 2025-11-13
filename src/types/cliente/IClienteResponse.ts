import type { ICliente } from "../ICliente";

export interface IClienteResponse {
    clientes: ICliente[];
    resumo?: any;
}