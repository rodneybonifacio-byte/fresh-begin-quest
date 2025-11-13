import { useNavigate } from "react-router-dom";
import { ButtonComponent } from "../../../components/button";
import { HeaderComponent } from "../../../components/header";
import { Sidebar } from "../../../components/sidebar";
import { useState } from "react";
import { FooterComponent } from "../../../components/footer";
import { Termos } from "./termos";
import { Juridico } from "./juridico";
import config from "../../../utils/config";
import { LogoApp } from "../../../components/logo";

export const TermosDeUsos = () => {
    const { siteName } = config;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(1);

    // Estado para controlar a visibilidade do drawer
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);

    // Função para abrir e fechar o drawer
    const toggleDrawer = () => {
        setDrawerOpen((prevState) => !prevState);
    };

    const handlerLogin = () => {
        navigate('/login');
    }
    return (
        <div className="h-full w-full bg-[#f8f9fb]">

            <HeaderComponent>
                <div className="flex gap-4 justify-center items-center sm:gap-2">
                    <button
                        data-drawer-target="drawer-navigation"
                        data-drawer-toggle="drawer-navigation"
                        aria-controls="drawer-navigation"
                        onClick={toggleDrawer}>
                        <img src="/images/menu.svg" alt="tem-proposta-menu" className="w-6 h-6 relative block sm:hidden" />
                        <LogoApp display="hidden" rotate="180"/>
                    </button>
                    <span className="font-semibold text-xl sm:text-2xl text-[#1D2939]">{siteName}</span>
                </div>
                <div className="flex flex-row gap-4">
                    <ButtonComponent variant="secondary"  onClick={handlerLogin} >
                        Acessar Plataforma
                    </ButtonComponent>
                    <ButtonComponent>
                        Quero vender
                    </ButtonComponent>
                </div>
                <Sidebar id="side-menu" isOpen={isDrawerOpen} closeSidebar={toggleDrawer} />
            </HeaderComponent >

            <div className="h-full flex flex-col justify-start items-center gap-8 mt-[70px] py-8 p-4 sm:px-32 bg-gray-50 sm:p-10 xl:px-72">
                
                <div className="flex flex-col justify-start items-center gap-4">
                    <div className="flex-col justify-start items-center gap-4 flex sm:gap-4">
                        <div className="flex justify-center items-center gap-2.5 px-2.5 py-0.5 bg-[#eff5ff] rounded-[150px]">
                            <div className="text-center text-[#156fee] text-sm font-semibold leading-tight">Disponível des de Jan 2024</div>
                        </div>
                        <div className="text-center text-[#0f1728] text-[40px] font-light leading-10">Termos de Uso</div>
                    </div>
                    <div className="flex flex-col  text-center text-[#475467] text-lg font-normal">
                        <span>
                            Sua privacidade é muito importante para nós da {siteName}.
                        </span>
                        <span>
                            Nós respeitamos sua privacidade nos preocupando com cada informação fornecida em nosso site e sistema.
                        </span>
                    </div>
                </div>

                <div className="w-full flex justify-center items-center gap-2 p-1.5 rounded-xl border border-zinc-200 bg-gray-100">
                    <button
                        className={`h-11 flex justify-center items-center gap-2 grow shrink basis-0 px-3.5 py-2.5 text-base font-semibold leading-normal ${activeTab === 1
                            ? "bg-white rounded-md shadow font-semibold text-slate-800"
                            : "text-slate-500 border-b-2 border-transparent"
                            }`}
                        onClick={() => setActiveTab(1)}
                    >
                        Termos de Uso
                    </button>

                    <button
                        className={`h-11 flex justify-center items-center gap-2 grow shrink basis-0 px-3.5 py-2.5 text-base font-semibold leading-normal ${activeTab === 2
                            ? "bg-white rounded-md shadow font-semibold text-slate-800"
                            : "text-slate-500 border-b-2 border-transparent"
                            }`}
                        onClick={() => setActiveTab(2)}
                    >
                        Jurídico
                    </button>
                </div>
            </div>

            <div className="w-full flex flex-col gap-8 bg-white sm:px-32 sm:p-10 xl:px-72">

                <div className="w-full flex flex-col px-6 py-8">
                    {activeTab === 1 && (
                        <Termos />
                    )}
                    {activeTab === 2 && (
                        <Juridico />
                    )}
                </div>
            </div>

            <FooterComponent />
        </div>

    );
}