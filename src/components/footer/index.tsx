import { Divider } from "../divider";
import config from "../../utils/config";
import { LogoApp } from "../logo";

export const FooterComponent = () => {

    const { siteName, email, phone, enderecoComercial } = config;

    return (
        <div className="flex flex-col justify-between items-center px-6 gap-8 sm:p-10 xl:px-72 py-8 bg-[#F9FAFB]">
            <div className="w-full flex flex-col gap-8 justify-between sm:justify-between sm:flex sm:flex-row">
                <div className="w-full flex flex-col gap-8 sm:gap-2">
                    <div className="w-full flex flex-col justify-start items-center gap-6 sm:items-start">
                        <div className="flex justify-center items-center gap-2 sm:justify-start">
                            <LogoApp size="small" />
                            <div className="text-center text-[#1d2838] text-2xl font-semibold">{siteName}</div>
                        </div>
                        <div className="text-center text-[#475466] text-base font-normal leading-normal sm:text-left">
                            Adoramos trabalhar com pessoas.<br />
                            Vamos construir algo grande juntos.
                        </div>
                    </div>
                    <div className="flex flex-row justify-center items-center gap-4 sm:justify-start">
                        <div className="w-8 h-8 relative sm:w-6 sm:h-6">
                            <img src="/images/instagram.svg" alt="instagram" className="w-8 h-8 left-[2px] top-[2px] absolute bg-[#98a1b2] rounded-md sm:w-6 sm:h-6" />
                        </div>
                        <div className="w-8 h-8 relative sm:w-6 sm:h-6">
                            <img src="/images/facebook.svg" alt="linkedin" className="w-8 h-8 left-[2px] top-[2px] absolute bg-[#98a1b2] rounded-full sm:w-6 sm:h-6" />
                        </div>
                        <div className="w-8 h-8 relative sm:w-6 sm:h-6">
                            <img src="/images/twitter.svg" alt="twitter" className="w-8 h-8 left-[2px] top-[2px] absolute sm:w-6 sm:h-6" />
                        </div>
                        <div className="w-8 h-8 relative sm:w-6 sm:h-6">
                            <img src="/images/linkedin.svg" alt="linkedin" className="w-8 h-8 left-[2px] top-[2px] absolute bg-[#98a1b2] rounded-full sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-8">
                    <div className="flex flex-col justify-start items-start gap-4 ">
                        <div className="text-center text-[#1d2838] text-lg font-semibold leading-7">Fale conosco</div>
                        <div className="flex flex-col justify-center items-start gap-4 ">
                            <div className="flex  justify-center items-center gap-2 rounded-lg border-[#ced2da]">
                                <img src="/images/email.svg" alt="email" className="w-5 h-5 relative" />
                                <div className="grow shrink basis-0 text-[#475466] text-base font-normal leading-normal">{email}</div>
                            </div>
                            <div className="flex justify-center items-center gap-2 rounded-lg border-[#ced2da]">
                                <img src="/images/phone.svg" alt="phone" className="w-5 h-5 relative" />
                                <div className="grow shrink basis-0 text-[#475466] text-base font-normal leading-normal">{phone}</div>
                            </div>
                            <div className="flex justify-start items-start gap-2 rounded-lg border-[#ced2da]">
                                <img src="/images/location.svg" alt="location" className="w-5 h-5 relative" />
                                <div className="grow shrink basis-0 text-[#475466] text-base font-normal leading-normal">{enderecoComercial}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Divider />
            <div className="w-full flex flex-col justify-start items-center gap-3 sm:flex-row sm:justify-between">
                <div className="text-[#1d2838] text-sm sm:text-base font-normal leading-normal">© {new Date().getFullYear()} {siteName} • Todos os direitos reservados</div>
                <div className="flex justify-start items-center gap-4">
                    <div className="text-right text-[#156fee] text-base font-normal underline leading-normal">Termos de uso</div>
                    <div className="h-5 border-l border-gray-400"></div> {/* Barra vertical */}
                    <div className="text-right text-[#156fee] text-base font-normal underline leading-normal">Política de privacidade</div>
                </div>
            </div>
        </div>
    )
}