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

    private isTokenExpired(token: string): boolean {
        try {
            const decoded = jwtDecode<TokenPayload>(token);
            if (!decoded?.exp) return true;

            const nowInSeconds = Math.floor(Date.now() / 1000);
            return decoded.exp <= nowInSeconds;
        } catch (error) {
            console.error("Erro ao validar expiração do token:", error);
            return true;
        }
    }

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

        if (this.isTokenExpired(token)) {
            localStorage.removeItem("token");
            this.isAuth = false;
            this.user = { email: "", token: "", data: undefined };
            return false;
        }

        return true;
    }

    getUser(): TokenPayload | null {
        const token = localStorage.getItem("token");
        if (!token) return null;

        if (this.isTokenExpired(token)) {
            localStorage.removeItem("token");
            return null;
        }

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

        if (this.isTokenExpired(token)) {
            localStorage.removeItem("token");
            return [];
        }

        try {
            const decoded = jwtDecode<TokenPayload>(token);
            return decoded.permissoes || [];
        } catch (error) {
            console.error("Erro ao decodificar token:", error);
            return [];
        }
    }

    logout() {
        localStorage.removeItem("token");
        this.isAuth = false;
        this.user = { email: "", token: "" };
    }
}

const authStore = new AuthenticationStore();
export default authStore;
