import type { StatusEnum } from "./StatusEnum";
import type { IGsDominio } from "./IGsDominio";

export interface IGsDominioBase {
    nome: string;
    baseUrl: string;
    tipo: string;
    pastaInstalacao: string;
    status: StatusEnum;
    gsDominios: IGsDominio[];
    id: number;
}