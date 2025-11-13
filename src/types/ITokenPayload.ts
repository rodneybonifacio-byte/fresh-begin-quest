export interface TokenPayload {
    id: string;
    name: string;
    email: string;
    sub: string;
    plano: string;
    role: Role;
    status: string;
    clienteId: string;
    remetente: {
        nomeRemetente: string;
        enderecoRemetente: {
            cep: string;
            logradouro: string;
            numero: string;
            complemento: string;
            bairro: string;
            localidade: string;
            uf: string;
        }
    }
    permissions?: string[];
    iat: number;
    exp: number;
}

export type Role = 'ADMIN' | 'CLIENTE';