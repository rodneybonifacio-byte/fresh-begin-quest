import type { IEmissao } from "./IEmissao";

export interface IManifesto {
  id: string;
  codigoManifesto: string;
  totalObjetos: number;
  status: string;
  criadoEm: string;
  emissoes: IEmissao[];
}