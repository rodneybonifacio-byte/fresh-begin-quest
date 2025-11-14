export interface IRecargaPix {
  id: string;
  cliente_id: string;
  valor: number;
  status: 'pendente_pagamento' | 'pago' | 'expirado' | 'cancelado';
  txid: string;
  qr_code?: string;
  qr_code_image?: string;
  pix_copia_cola?: string;
  data_criacao: string;
  data_pagamento?: string;
  data_expiracao?: string;
}

export interface ICreatePixChargeRequest {
  cliente_id: string;
  valor: number;
  expiracao?: number; // em segundos, padrão 3600 (1 hora)
}

export interface ICreatePixChargeResponse {
  success: boolean;
  data?: {
    txid: string;
    qr_code: string;
    qr_code_image?: string;
    pix_copia_cola: string;
    expiracao: string;
  };
  error?: string;
}

export interface IBancoInterPixWebhook {
  txid: string;
  valor: number;
  horario: string;
  pagador?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
  };
}
