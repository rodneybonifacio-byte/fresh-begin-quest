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

    async testarConexaoAPI(): Promise<{ sucesso: boolean; mensagem: string }> {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return { sucesso: false, mensagem: 'Token de autenticação não encontrado. Faça login novamente.' };
            }

            // Faz uma chamada de teste simples para validar autenticação
            const response = await axios.get(
                'https://envios.brhubb.com.br/api/auth/validate',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    timeout: 10000 // 10 segundos
                }
            );

            if (response.status === 200) {
                return { sucesso: true, mensagem: 'Conexão estabelecida! API acessível e token válido.' };
            }
            
            return { sucesso: false, mensagem: 'Resposta inesperada da API.' };
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                return { sucesso: false, mensagem: 'Timeout: API não respondeu em 10 segundos.' };
            }
            if (error.response?.status === 401) {
                return { sucesso: false, mensagem: 'Token inválido ou expirado. Faça login novamente.' };
            }
            if (error.response?.status === 404) {
                return { sucesso: false, mensagem: 'Endpoint de validação não encontrado. API pode estar offline.' };
            }
            if (!error.response) {
                return { sucesso: false, mensagem: 'Não foi possível conectar à API. Verifique sua conexão.' };
            }
            
            return { 
                sucesso: false, 
                mensagem: `Erro ao conectar: ${error.response?.data?.message || error.message}` 
            };
        }
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
            console.error('📋 Status:', error.response?.status);
            console.error('📋 Dados do erro:', error.response?.data);
            console.error('📋 Mensagem:', error.response?.data?.message || error.response?.data?.error || error.message);
            
            // Propaga o erro com mais detalhes
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
            throw new Error(errorMessage);
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