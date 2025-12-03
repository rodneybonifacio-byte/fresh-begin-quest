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

    // Método para criar uma nova cotação de frete
    public override create<TResponse, TRequest>(data: TRequest) {
        return this.httpClient.post<TResponse, TRequest>(`${this.endpoint}/emitir-etiqueta`, data);
    }
}
