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
        console.error('🔴 HTTP Error completo:', error);
        
        if (axios.isAxiosError(error)) {
            const { response } = error;
            console.error('🔴 Axios Error - Response:', response);

            if (response) {
                const { status, data } = response;
                console.error(`🔴 Status: ${status}, Data:`, data);

                if (status === 401) {
                    handleLogout();
                    throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
                }

                if (status === 403) {
                    toastError('Você não tem permissão para acessar este recurso.');
                    throw new Error('Acesso negado.');
                }

                if (status === 400) {
                    const messages: string[] = [];

                    const errPayload = data?.error;

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
                        const fallbackMessages = Object.values(data)
                            .flatMap((val) => (Array.isArray(val) ? val : []))
                            .filter((msg): msg is string => typeof msg === 'string');

                        messages.push(...fallbackMessages);
                    }

                    const finalMessage = messages.join('\n') || 'Requisição inválida.';
                    toastError(finalMessage);
                    throw new Error(finalMessage);
                }

                if (status === 500) {
                    throw new Error('Erro interno do servidor.');
                }
            }
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
