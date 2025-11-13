export interface IConfiguracoes {
    aplicar_valor_declarado: boolean;
    fatura_via_whatsapp: boolean;
    link_whatsapp: string;
    periodo_faturamento: string;
    rastreio_via_whatsapp: boolean;
    eventos_rastreio_habilitados_via_whatsapp: string[];
    valor_disparo_evento_rastreio_whatsapp: string;
}