import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type LayoutType = "app" | "admin";

interface LayoutContextProps {
    layout: LayoutType;
    setLayout: (layout: LayoutType) => void;
}

const LayoutContext = createContext<LayoutContextProps>({} as LayoutContextProps);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const [layout, setLayout] = useState<LayoutType>("app");

    useEffect(() => {
        if (location.pathname.startsWith("/admin")) {
            setLayout("admin");
        } else {
            setLayout("app");
        }
    }, [location.pathname]);

    return (
        <LayoutContext.Provider value={{ layout, setLayout }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => useContext(LayoutContext);
