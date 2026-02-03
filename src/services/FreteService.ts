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
        
        const { data, error, response } = await supabase.functions.invoke('emitir-etiqueta', {
            body: payload
        });

        if (error) {
            console.error('❌ Erro na edge function emitir-etiqueta:', error);

            // Tentar extrair o body real de erro da Response (FunctionsHttpError mantém o Response em error.context)
            const httpResponse: Response | undefined = (response as any) || (error?.context as any);
            const status = (httpResponse as any)?.status;
            const contentType = (httpResponse as any)?.headers?.get?.('Content-Type') as string | null | undefined;

            let responseText: string | undefined;
            let responseJson: any | undefined;

            if (httpResponse?.clone) {
                try {
                    responseText = await httpResponse.clone().text();
                    const isJson = (contentType || '').toLowerCase().includes('application/json');
                    if (isJson) {
                        try {
                            responseJson = JSON.parse(responseText);
                        } catch {
                            // mantém responseText
                        }
                    } else {
                        // Mesmo sem content-type JSON, alguns backends retornam JSON como texto
                        if (responseText?.trim().startsWith('{') || responseText?.trim().startsWith('[')) {
                            try {
                                responseJson = JSON.parse(responseText);
                            } catch {
                                // mantém responseText
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Não foi possível ler o body da resposta de erro:', e);
                }
            }

            // Heurística para pegar a melhor mensagem possível
            const bodyMsg =
                responseJson?.msg ??
                (Array.isArray(responseJson?.msgs) ? responseJson.msgs.join('\n') : undefined) ??
                responseJson?.error ??
                responseJson?.message ??
                (typeof responseJson === 'string' ? responseJson : undefined) ??
                responseText;

            // Tentar capturar mensagem de validação do Correios/transportadora que vem em formatos variados
            const candidate = `${bodyMsg ?? ''}`.trim();
            const friendlyMessage = candidate || error.message || 'Erro ao emitir etiqueta';

            const emissaoError = new Error(friendlyMessage) as any;
            emissaoError.code = 'EDGE_FUNCTION_ERROR';
            emissaoError.status = typeof status === 'number' ? status : 500;
            emissaoError.details = {
                name: error?.name,
                message: error?.message,
                status: typeof status === 'number' ? status : undefined,
                body: responseJson ?? responseText,
            };
            throw emissaoError;
        }

        // Verificar se a resposta contém erro estruturado
        if (data?.error) {
            console.error('❌ Erro retornado pela API:', data);
            const emissaoError = new Error(data.error) as any;
            emissaoError.code = data.code;
            emissaoError.status = data.status;
            emissaoError.details = data.details;
            throw emissaoError;
        }

        console.log('✅ Etiqueta emitida:', data);
        return data as TResponse;
    }
}
