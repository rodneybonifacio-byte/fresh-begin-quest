import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { handleLogout } from '../components/menu/logout';
import { toastError } from './toastNotify';

export interface IHttpClient {
    get<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse>;
    post<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse>;
    put<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse>;
    delete<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse>;
    patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse>;
}

export class CustomHttpClient implements IHttpClient {
    private readonly instance: AxiosInstance;

    constructor() {
        let baseURL = import.meta.env.VITE_BASE_API_URL;

        this.instance = axios.create({
            baseURL,
            timeout: 120000,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        this.instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');

                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    private handleError(error: unknown): never {
        if (axios.isAxiosError(error)) {
            const { response } = error;

            // Sem response -> erro de rede / CORS / timeout
            if (!response) {
                console.error('🌐 Erro de rede/sem resposta:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    message: error.message,
                });
                throw new Error('Falha ao conectar ao servidor. Verifique sua conexão e tente novamente.');
            }

            const { status, data } = response;

            const extractMessage = (payload: any): string => {
                if (!payload) return '';
                if (typeof payload === 'string') return payload;

                // { message: "..." }
                if (typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
                    return payload.message;
                }

                // { error: "..." } or { error: { message: "..." } } or { error: [...] }
                if (typeof payload === 'object' && 'error' in payload) {
                    const err = (payload as any).error;
                    if (typeof err === 'string') return err;
                    if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message;
                    if (Array.isArray(err)) {
                        const first = err.find((e) => typeof e?.message === 'string')?.message;
                        if (first) return first;
                    }
                }

                return '';
            };

            // Log útil para depuração (sem expor tokens)
            console.error('🧾 Erro HTTP:', {
                status,
                url: error.config?.url,
                method: error.config?.method,
                data,
            });

            if (status === 401) {
                handleLogout();
                throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
            }

            if (status === 403) {
                // Não mostra toast automaticamente para permitir tratamento específico nos componentes
                console.warn('⚠️ Acesso negado (403) para:', error.config?.url);
                throw new Error('Acesso negado.');
            }

            if (status === 400) {
                const messages: string[] = [];

                const errPayload = (data as any)?.error;

                // error: [{ message: ... }, { message: ... }]
                if (Array.isArray(errPayload)) {
                    messages.push(...errPayload.map((e) => e?.message).filter((msg): msg is string => typeof msg === 'string'));
                }

                // error: { message: "..." }
                else if (typeof errPayload === 'object' && errPayload !== null && 'message' in errPayload) {
                    const msg = (errPayload as { message?: string }).message;
                    if (msg) messages.push(msg);
                }

                // error: "mensagem direta"
                else if (typeof errPayload === 'string') {
                    messages.push(errPayload);
                }

                // estrutura: { campo1: [...], campo2: [...] }
                if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                    const fallbackMessages = Object.values(data as any)
                        .flatMap((val) => (Array.isArray(val) ? val : []))
                        .filter((msg): msg is string => typeof msg === 'string');

                    messages.push(...fallbackMessages);
                }

                const finalMessage = messages.join('\n') || extractMessage(data) || 'Requisição inválida.';
                toastError(finalMessage);
                throw new Error(finalMessage);
            }

            if (status === 500) {
                throw new Error('Erro interno do servidor.');
            }

            // Qualquer outro status (404, 409, 422, etc.)
            const genericMessage = extractMessage(data) || `Erro na requisição.`;
            throw new Error(`[${status}] ${genericMessage}`);
        }

        throw new Error('Erro inesperado. Por favor, tente novamente mais tarde.');
    }
    async patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse> {
        try {
            const response = await this.instance.patch<TResponse>(url, data, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.instance.get<T>(url, config);
            if (response.status === 200) {
                // Check if status code is 200
                return response.data;
            }
            return [] as T;
        } catch (error) {
            this.handleError(error);
        }
    }

    async post<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse> {
        try {
            const response = await this.instance.post<TResponse>(url, data, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async put<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse> {
        try {
            const response = await this.instance.put<TResponse>(url, data, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<TResponse> {
        try {
            const response = await this.instance.delete<TResponse>(url, { data, ...config });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
}
