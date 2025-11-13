import { action, makeObservable, observable } from "mobx";
import { jwtDecode } from "jwt-decode";

interface IUser {
    email: string;
    token: string;
    data?: TokenPayload;
}

// Defina o tipo do payload que você espera do token (no seu caso, as permissões estão na propriedade "permissions")
interface TokenPayload {
    id: string;
    name: string;
    email: string;
    sub: string;
    role: string;
    status: string;
    permissoes?: string[];
    iat: number;
    exp: number;
}

class AuthenticationStore {
    public isAuth = false;
    public user: IUser = { email: "", token: "", data: undefined };

    constructor() {
        makeObservable(this, {
            isAuth: observable,
            user: observable,
            login: action,
            logout: action,
            isLoggedIn: action
        });
    }

    login({ email, token }: IUser) {
        this.isAuth = this.isLoggedIn();
        this.user = { email, token, };
    }

    isLoggedIn(): boolean {
        const token = localStorage.getItem("token");
        if (!token) return false;
        return true;
    }

    getUser(): TokenPayload | null {
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            const decoded = jwtDecode<TokenPayload>(token);
            return decoded || null;
        } catch (error) {
            console.error("Erro ao decodificar token:", error);
            return null;
        }
    }

    getPermissions(): string[] {
        const token = localStorage.getItem("token");
        if (!token) return [];

        try {
            const decoded = jwtDecode<TokenPayload>(token);
            return decoded.permissoes || [];
        } catch (error) {
            console.error("Erro ao decodificar token:", error);
            return [];
        }
    }

    logout() {
        this.isAuth = false;
        this.user = { email: "", token: "" };
    }
}

const authStore = new AuthenticationStore();
export default authStore;
