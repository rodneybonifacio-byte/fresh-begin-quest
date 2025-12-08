import { supabase } from "../integrations/supabase/client";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class FreteService extends BaseService<any> {

    protected endpoint = 'frete';

    constructor() {
        super(new CustomHttpClient());
    }

    async calculadoraFrete(item: any): Promise<any> {
        console.log('🚚 Chamando edge function cotacao-frete...');
        
        // Obter token do usuário para aplicar regras de negócio do cliente
        const userToken = localStorage.getItem('token');
        
        console.log('🔑 Token do usuário encontrado:', userToken ? 'SIM' : 'NÃO');
        
        if (!userToken) {
            throw new Error('Usuário não autenticado');
        }
        
        const payload = {
            ...item,
            userToken, // Enviar token do usuário para a edge function
        };
        
        const { data, error } = await supabase.functions.invoke('cotacao-frete', {
            body: payload
        });

        if (error) {
            console.error('❌ Erro na edge function:', error);
            throw new Error(error.message || 'Erro ao calcular frete');
        }

        console.log('✅ Cotação recebida:', data);
        return data;
    }

    // Método para criar uma nova emissão de etiqueta usando edge function
    public override async create<TResponse, TRequest>(emissaoData: TRequest): Promise<TResponse> {
        console.log('🏷️ Chamando edge function emitir-etiqueta...');
        
        // Obter token do usuário para aplicar regras de negócio do cliente
        const userToken = localStorage.getItem('token');
        
        console.log('🔑 Token do usuário encontrado:', userToken ? 'SIM' : 'NÃO');
        
        if (!userToken) {
            throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }
        
        // VALIDAÇÃO CRÍTICA: Decodificar token e verificar clienteId
        let tokenPayload: any;
        try {
            tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
            console.log('🔍 Token decodificado - clienteId:', tokenPayload.clienteId);
            console.log('🔍 Token decodificado - email:', tokenPayload.email);
            console.log('🔍 Token decodificado - nome:', tokenPayload.name);
            
            // BLOQUEIO: Se for o cliente FINANCEIRO BRHUB, forçar relogin
            const blockedEmails = ['financeiro@brhub.com.br', 'admin@brhub.com.br'];
            if (blockedEmails.includes(tokenPayload.email?.toLowerCase())) {
                console.error('❌ ERRO CRÍTICO: Token incorreto detectado! Email:', tokenPayload.email);
                localStorage.removeItem('token');
                throw new Error('Sessão inválida detectada. Por favor, faça login novamente com suas credenciais.');
            }
        } catch (e: any) {
            if (e.message?.includes('Sessão inválida')) {
                throw e;
            }
            console.error('❌ Erro ao decodificar token:', e);
            localStorage.removeItem('token');
            throw new Error('Token de autenticação inválido. Por favor, faça login novamente.');
        }
        
        const payload = {
            emissaoData, // Dados da emissão
            userToken, // Token do usuário para a edge function
        };
        
        const { data, error } = await supabase.functions.invoke('emitir-etiqueta', {
            body: payload
        });

        if (error) {
            console.error('❌ Erro na edge function emitir-etiqueta:', error);
            throw new Error(error.message || 'Erro ao emitir etiqueta');
        }

        // Verificar se a resposta contém erro
        if (data?.error) {
            console.error('❌ Erro retornado pela API:', data.error);
            throw new Error(data.error);
        }

        console.log('✅ Etiqueta emitida:', data);
        return data as TResponse;
    }
}
