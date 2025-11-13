import type { IFaturaDashboard } from "../fatura/IFatauraDashboard";
import type { IEnvioDashboard } from "./IEnvioDashboard";
import type { IEntregaAnaliticoDashboard } from "./IEntregaAnaliticoDashboard";

export interface IDashboardGeral {
    faturamento: IFaturaDashboard;
    envio: IEnvioDashboard;
    entregaAnalitico: IEntregaAnaliticoDashboard;
}