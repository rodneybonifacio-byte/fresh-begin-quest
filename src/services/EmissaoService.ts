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
            
            // Dados de teste para validar a API
            const dadosTeste = {
                cpfCnpj: "15808095000303", // ÓPERA KIDS VAREJO
                data: [
                    {
                        servico_frete: "PAC",
                        cep: "01310100",
                        altura: 10,
                        largura: 20,
                        comprimento: 20,
                        peso: 500,
                        logradouro: "Avenida Paulista",
                        numero: 1000,
                        complemento: "Teste de Conexão",
                        nomeDestinatario: "TESTE CONEXAO API",
                        cpfCnpj: 11132440700,
                        valor_frete: 15.00,
                        bairro: "Bela Vista",
                        cidade: "São Paulo",
                        estado: "SP"
                    }
                ]
            };

            console.log('🔍 Testando conexão com dados:', dadosTeste);

            const response = await axios.post(
                'https://envios.brhubb.com.br/api/importacao/multipla',
                dadosTeste,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    timeout: 15000 // 15 segundos
                }
            );

            console.log('✅ Resposta do teste:', response.data);

            if (response.status === 200 || response.status === 201) {
                return { 
                    sucesso: true, 
                    mensagem: '✓ Conexão OK! API respondeu com sucesso. Sistema operacional.' 
                };
            }
            
            return { 
                sucesso: true, 
                mensagem: `✓ API acessível (status ${response.status}).` 
            };
        } catch (error: any) {
            console.error('❌ Erro no teste de conexão:', error);
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                return { 
                    sucesso: false, 
                    mensagem: '⏱️ Timeout: API não respondeu em 15 segundos. Tente novamente.' 
                };
            }
            
            if (error.response?.status === 400) {
                const mensagemErro = error.response?.data?.message || error.response?.data?.error || 'Erro de validação';
                return { 
                    sucesso: false, 
                    mensagem: `❌ Erro 400: ${mensagemErro}` 
                };
            }
            
            if (error.response?.status === 401) {
                return { 
                    sucesso: false, 
                    mensagem: '🔒 Token inválido ou expirado. Faça login novamente.' 
                };
            }
            
            if (error.response?.status === 500) {
                return { 
                    sucesso: false, 
                    mensagem: '⚠️ Erro no servidor da API. Tente novamente mais tarde.' 
                };
            }
            
            if (!error.response) {
                return { 
                    sucesso: false, 
                    mensagem: '🌐 Não foi possível conectar à API. Verifique sua conexão com a internet.' 
                };
            }
            
            const mensagemDetalhada = error.response?.data?.message || error.response?.data?.error || error.message;
            return { 
                sucesso: false, 
                mensagem: `❌ Erro ${error.response?.status || 'desconhecido'}: ${mensagemDetalhada}` 
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