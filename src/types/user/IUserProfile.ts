import type { IAddress } from '../IAddress';

export interface IUserProfile {
    id: string;
    name: string;
    email: string;
    telefone: string;
    senhaAtual?: string;
    novaSenha?: string;
    confirmarNovaSenha?: string;
    dataNascimento: string;
    document: string;
    endereco: IAddress;
    preferenciasNotificacao: IUserPreferences;
    lastLogin: IUserLastLogin;
}

export interface IUserPreferences {
    email: boolean;
    sms: boolean;
    push: boolean;
}

export interface IUserLastLogin {
    lastLoginAt: string;
    ipAddress: string;
}
