import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export interface EmitirBoletoRequest {
    faturaId: string;
    valorCobrado: number;
    dataVencimento: string;
    pagadorNome: string;
    pagadorCpfCnpj: string;
    pagadorEndereco?: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        uf: string;
        cep: string;
    };
    mensagem?: string;
    desconto?: {
        tipo: 'PERCENTUAL' | 'VALOR_FIXO';
        valor: number;
        dataLimite?: string;
    };
    multa?: {
        tipo: 'PERCENTUAL' | 'VALOR_FIXO';
        valor: number;
    };
    juros?: {
        tipo: 'PERCENTUAL_DIA' | 'VALOR_DIA';
        valor: number;
    };
}

export interface BoletoResponse {
    nossoNumero: string;
    seuNumero: string;
    codigoBarras: string;
    linhaDigitavel: string;
    pdf: string; // base64
    dataVencimento: string;
    valor: number;
    status: string;
}

export class BoletoService extends BaseService<any> {
    protected endpoint = 'boletos';

    constructor() {
        super(new CustomHttpClient());
    }

    async emitir(dados: EmitirBoletoRequest): Promise<BoletoResponse> {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/banco-inter-create-boleto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(dados),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao emitir boleto');
        }
        
        return await response.json();
    }

    async consultar(nossoNumero: string): Promise<BoletoResponse> {
        const response = await this.httpClient.get<BoletoResponse>(
            `${this.endpoint}/consultar/${nossoNumero}`
        );
        return response;
    }

    async cancelar(nossoNumero: string, motivoCancelamento: string = 'OUTROS'): Promise<void> {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/banco-inter-cancel-boleto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ nossoNumero, motivoCancelamento }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao cancelar boleto');
        }
    }

    async configurarWebhook(url: string): Promise<void> {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/banco-inter-configure-webhook-boleto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ webhookUrl: url }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao configurar webhook');
        }
    }
}
