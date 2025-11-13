import { createContext, useContext, useState, type FC, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Role, TokenPayload } from '../types/ITokenPayload';

interface AuthContextType {
    user: TokenPayload | null;
    userRole: Role | undefined;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }: { children: ReactNode }) => {

    const [userRole, setUserRole] = useState<Role | undefined>();
    const [user] = useState<TokenPayload | null>(() => {
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            const decoded = jwtDecode<TokenPayload>(token);
            return decoded || null;
        } catch (error) {
            console.error("Erro ao decodificar token:", error);
            return null;
        }
    });
    
    const navigate = useNavigate();

    const logout = () => {
        setUserRole(undefined);
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ userRole, logout, user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
