import type { IEmissaoViewModel } from "../types/emissao/IEmissaoViewModel";
import type { IDashboard } from "../types/IDashboard";
import type { IEmissao } from "../types/IEmissao";
import type { IResponse } from "../types/IResponse";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";
import axios from "axios";

export class EmissaoService extends BaseService<IEmissao> {

    protected endpoint = 'emissoes';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    // imprimir
    public async imprimirEtiquetaCorreios(emissao: IEmissao): Promise<IResponse<{ nome: string, dados: string }>> {
        return await this.httpClient.get<IResponse<{ nome: string, dados: string }>>(`${this.endpoint}/${emissao.id}/imprimir/etiqueta`);
    }
    public async imprimirDeclaracaoConteudoPDF(emissao: IEmissao): Promise<IResponse<{ nome: string, dados: string }>> {
        return await this.httpClient.get<IResponse<{ nome: string, dados: string }>>(`${this.endpoint}/${emissao.id}/imprimir/declaracao`);
    }
    public async reenviar(emissao: IEmissao): Promise<IResponse<{ nome: string, dados: string }>> {
        return await this.httpClient.get<IResponse<{ nome: string, dados: string }>>(`${this.endpoint}/reenviar-prepostagem/${emissao.id}`);
    }
    public async imprimirMergePDF(emissao: IEmissao): Promise<IResponse<{ nome: string, dados: string }>> {
        return await this.httpClient.get<IResponse<{ nome: string, dados: string }>>(`${this.endpoint}/${emissao.id}/imprimir/completa`);
    }

    public async getRemetenteEnderecoById(emissaoId: string): Promise<IResponse<any>> {
        return await this.httpClient.get<IResponse<any>>(`/clientes/endereco/${emissaoId}`);
    }

    public async findByIdWithParams(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<IEmissaoViewModel>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<IEmissaoViewModel>>(url);
    }

    public async dashboard(params?: Record<string, string | number>, subPath?: string): Promise<IDashboard> {
        const response = await this.httpClient.get<IResponse<IDashboard>>(this.buildUrl(params, subPath));
        return response.data;
    }

    async imprimirEmMassa(item: any): Promise<{ nome: string, dados: string }> {
        const response = await this.httpClient.post<IResponse<{ nome: string, dados: string }>>(`${this.endpoint}/imprimir/em-massa`, item);
        return response.data;
    }

    async processarPedidosImportados(item: any): Promise<any> {
        // Chamada direta para API externa de importação em lote
        try {
            console.log('📤 Enviando para API:', JSON.stringify(item, null, 2));
            
            const response = await axios.post(
                'https://envios.brhubb.com.br/api/importacao/multipla',
                item,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            
            console.log('✅ Resposta da API:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Erro na importação múltipla:', error);
            console.error('📋 Detalhes do erro:', error.response?.data);
            console.error('📋 Status:', error.response?.status);
            console.error('📋 Mensagem:', error.response?.data?.message || error.message);
            
            // Relança o erro com mais contexto
            throw new Error(error.response?.data?.message || error.message || 'Erro ao importar etiquetas');
        }
    }

    async cancelarEmissao(item: any): Promise<any> {
        const response = await this.httpClient.delete<any>(`${this.endpoint}/cancelar-emissao`, item);
        return response;
    }
    async atualizarPrecos(id: string, item: any): Promise<any> {
        const response = await this.httpClient.put<any>(`${this.endpoint}/${id}/atualizar-precos`, item);
        return response;
    }

    async reprocessarEmissao(id: string): Promise<any> {
        const response = await this.httpClient.patch<any>(`${this.endpoint}/${id}/reprocessar`, {});
        return response;
    }
}