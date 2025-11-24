import type { FaturaDto } from "../types/fatura/FaturaDto";
import type { IFatura } from "../types/IFatura";
import type { IResponse } from "../types/IResponse";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class FaturaService extends BaseService<IFatura> {

    protected endpoint = 'faturas';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    //obter saldo do cliente
    public async getWithParams<T = IFatura[]>(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<T>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<T>>(url);
    }


    public async findByIdWithParams(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<FaturaDto>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<FaturaDto>>(url);
    }

    async confirmaPagamento(id: string, data: FormData): Promise<IFatura> {
        const response = await this.httpClient.post<IFatura>(`${this.endpoint}/${id}/confirma-pagamento`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    }

    async notificaViaWhatsApp(id: string, tipoNotificacao: "PADRAO" | "ATRASADA" = "PADRAO"): Promise<void> {
        await this.httpClient.patch(`${this.endpoint}/${id}/notifica-via-whatsapp?tipoNotificacao=${tipoNotificacao}`);
    }

    async gerarFaturaPdf(id: string, faturaId: string): Promise<{ dados: string; faturaId: string }> {
        const response = await this.httpClient.get<{ dados: string; faturaId: string }>(`${this.endpoint}/imprimir/${id}${faturaId ? `/${faturaId}` : '' }`);
        return response;
    }

    async realizarFechamento(codigoFatura: string, nomeCliente: string, telefoneCliente: string): Promise<any> {
        // Buscar dados completos da fatura
        const faturaResponse = await this.findByIdWithParams({ codigoFatura }, 'buscar-fatura-completa');
        const fatura = faturaResponse.data;
        
        if (!fatura) {
            throw new Error('Fatura não encontrada');
        }
        
        // 1. Gerar PDF da fatura via API
        const pdfFaturaResponse = await this.gerarFaturaPdf(fatura.id, '');
        const faturaPdfBase64 = pdfFaturaResponse.dados;
        
        // 2. Emitir boleto usando BoletoService existente
        const boletoService = new (await import('./BoletoService')).BoletoService();
        
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + 1);
        
        const boletoResult = await boletoService.emitir({
            faturaId: fatura.id,
            valorCobrado: parseFloat(fatura.totalFaturado),
            dataVencimento: dataVencimento.toISOString().split('T')[0],
            pagadorNome: fatura.cliente.nome,
            pagadorCpfCnpj: fatura.cliente.cpfCnpj,
            pagadorEndereco: {
                logradouro: fatura.cliente.logradouro || 'Rua Principal',
                numero: fatura.cliente.numero || '1',
                complemento: fatura.cliente.complemento || '',
                bairro: fatura.cliente.bairro || 'Centro',
                cidade: fatura.cliente.localidade || 'São Paulo',
                uf: fatura.cliente.uf || 'SP',
                cep: fatura.cliente.cep || '00000000',
            },
            mensagem: `Fatura ${codigoFatura} - BRHUB Envios`,
            multa: {
                tipo: 'PERCENTUAL',
                valor: 10,
            },
            juros: {
                tipo: 'PERCENTUAL_DIA',
                valor: 0.033,
            },
        });
        
        const boletoPdfBase64 = boletoResult.pdf;
        
        // 3. Concatenar PDFs usando pdf-lib
        const { PDFDocument } = await import('pdf-lib');
        
        const boletoBytes = Uint8Array.from(atob(boletoPdfBase64), c => c.charCodeAt(0));
        const faturaBytes = Uint8Array.from(atob(faturaPdfBase64), c => c.charCodeAt(0));
        
        const boletoPdf = await PDFDocument.load(boletoBytes);
        const faturaPdf = await PDFDocument.load(faturaBytes);
        
        const pdfFinal = await PDFDocument.create();
        
        const boletoPages = await pdfFinal.copyPages(boletoPdf, boletoPdf.getPageIndices());
        boletoPages.forEach((page) => pdfFinal.addPage(page));
        
        const faturaPages = await pdfFinal.copyPages(faturaPdf, faturaPdf.getPageIndices());
        faturaPages.forEach((page) => pdfFinal.addPage(page));
        
        const pdfFinalBytes = await pdfFinal.save();
        const pdfFinalBase64 = btoa(String.fromCharCode(...pdfFinalBytes));
        
        return {
            status: 'ok',
            mensagem: 'Fechamento realizado com sucesso.',
            nome_cliente: nomeCliente,
            codigo_fatura: codigoFatura,
            telefone_cliente: telefoneCliente || '11999999999',
            fatura_pdf: faturaPdfBase64,
            boleto_pdf: boletoPdfBase64,
            arquivo_final_pdf: pdfFinalBase64,
            boleto_info: {
                nosso_numero: boletoResult.nossoNumero,
                linha_digitavel: boletoResult.linhaDigitavel,
                codigo_barras: boletoResult.codigoBarras,
            },
            detalhes: {
                valor_total: fatura.totalFaturado,
                periodo: `${fatura.periodoInicial} a ${fatura.periodoFinal}`,
                vencimento_boleto: dataVencimento.toISOString().split('T')[0],
                multa_percentual: '10%',
                juros_mensal: '1%',
            }
        };
    }
}