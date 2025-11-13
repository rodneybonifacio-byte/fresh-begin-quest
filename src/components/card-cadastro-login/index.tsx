import { Link } from "react-router-dom"
import { LogoApp } from "../logo"
import type { ReactNode } from "react"

interface CardCadastroLoginCustomProps {
    children: ReactNode
    toBack?: string
}

export const CardCadastroLoginCustom = ({ children }: CardCadastroLoginCustomProps) => {
    return (
        <div className="w-full h-screen flex flex-col pt-8 pb-8 p-6 items-center justify-end gap-8 sm:h-full sm:px-6 sm:justify-center sm:bg-gray-50 bg-white">

            <div className="flex flex-col gap-6 sm:items-center">
                <LogoApp />
                <div className="justify-start items-start gap-2 sm:justify-center sm:items-center sm:text-center">
                    <span className="text-[#1d2838] text-[40px] sm:text-[36px] font-black leading-[50px] sm:text-center text-left">
                        Cadastro
                    </span>
                    <p className="text-[#475466] text-sm">Crie o seu acesso ao sistema e comece a receber ofertas</p>
                </div>
            </div>

            {children}

            <div className="self-stretch flex justify-center items-center gap-1">
                <div className="text-[#1d2838] text-sm font-normal leading-[21px]">Já possui uma conta?</div>
                <div className="justify-start items-start flex">
                    <Link to={'/login'} className="justify-center items-center gap-2 flex">
                        <span className="text-[#156fee] text-sm font-medium underline leading-[21px]">Faça login aqui</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}