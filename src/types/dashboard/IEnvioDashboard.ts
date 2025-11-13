export interface IEnvioDashboard {
    analyticsCidade: IAnalyticsCidade[];
    analyticsUf: IAnalyticsUf[];
}

export interface IAnalyticsCidade extends IAnalyticsUf {
    destinatarioLocalidade: string
}

export interface IAnalyticsUf {
    destinatarioUf: string
    totalEnviado: number
    valorFrete: number
    mediaFrete: number
}