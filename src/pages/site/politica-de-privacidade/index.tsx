import { useNavigate } from "react-router-dom";
import { ButtonComponent } from "../../../components/button";
import { HeaderComponent } from "../../../components/header";
import { Sidebar } from "../../../components/sidebar";
import { useState } from "react";
import { FooterComponent } from "../../../components/footer";
import config from "../../../utils/config";
import { LogoApp } from "../../../components/logo";

export const PoliticaDePrivacidade = () => {
    const { siteName } = config;
    const navigate = useNavigate();

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
                        <img src="/images/menu.svg" alt="tem-proposta" className="w-6 h-6 relative block sm:hidden" />
                        <LogoApp display="hidden" rotate="180"/>
                    </button>
                    <span className="font-semibold text-xl sm:text-2xl text-[#1D2939]">{siteName}</span>
                </div>
                <div className="flex flex-row gap-4">
                    <ButtonComponent variant="secondary" onClick={handlerLogin} >
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
                        <div className="text-center text-[#0f1728] text-[40px] font-light leading-10">Política de Privacidade</div>
                    </div>
                    <div className="flex flex-col text-[#475467] text-base font-normal gap-6 text-center sm:text-left">
                        <p>Nós prezamos pela transparência e integridade em todas as nossas interações.</p>
                        <p>
                            Por essa razão, construímos essa Política de Privacidade para que você possa ter total conhecimento sobre como
                            coletamos, usamos, processamos e eventualmente partilhamos os seus dados em nosso site e aplicativo.
                        </p>
                        <p>
                            Contudo, para que você consiga entender totalmente sobre o que estamos falando, vamos esclarecer algumas
                            questões sobre o assunto.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full flex flex-col gap-8 bg-white sm:px-32 sm:p-10 xl:px-72">
                <div className="w-full flex flex-col px-6 py-8">

                    <div className="flex-col justify-start items-center gap-12 flex">
                        <div className="flex-col justify-start items-start gap-12 flex">
                            <div className="flex-col justify-start items-start gap-5 flex">
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Mi tincidunt elit, id quisque ligula ac diam, amet. Vel etiam suspendisse morbi eleifend faucibus eget vestibulum felis. Dictum quis montes, sit sit. Tellus aliquam enim urna, etiam. Mauris posuere vulputate arcu amet, vitae nisi, tellus tincidunt. At feugiat sapien varius id.<br />Eget quis mi enim, leo lacinia pharetra, semper. Eget in volutpat mollis at volutpat lectus velit, sed auctor. Porttitor fames arcu quis fusce augue enim. Quis at habitant diam at. Suscipit tristique risus, at donec. In turpis vel et quam imperdiet. Ipsum molestie aliquet sodales id est ac volutpat. </div>
                            </div>
                            <div className="flex-col justify-start items-start gap-5 flex">
                                <div className="text-gray-900 text-3xl font-semibold font-['Inter'] leading-9">Lorem ipsum dolor sit amet consectetur?</div>
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Dolor enim eu tortor urna sed duis nulla. Aliquam vestibulum, nulla odio nisl vitae. In aliquet pellentesque aenean hac vestibulum turpis mi bibendum diam. Tempor integer aliquam in vitae malesuada fringilla.<br />Elit nisi in eleifend sed nisi. Pulvinar at orci, proin imperdiet commodo consectetur convallis risus. Sed condimentum enim dignissim adipiscing faucibus consequat, urna. Viverra purus et erat auctor aliquam. Risus, volutpat vulputate posuere purus sit congue convallis aliquet. Arcu id augue ut feugiat donec porttitor neque. Mauris, neque ultricies eu vestibulum, bibendum quam lorem id. Dolor lacus, eget nunc lectus in tellus, pharetra, porttitor.<br />Ipsum sit mattis nulla quam nulla. Gravida id gravida ac enim mauris id. Non pellentesque congue eget consectetur turpis. Sapien, dictum molestie sem tempor. Diam elit, orci, tincidunt aenean tempus. Quis velit eget ut tortor tellus. Sed vel, congue felis elit erat nam nibh orci.</div>
                            </div>
                            <div className="flex-col justify-start items-start gap-5 flex">
                                <div className="text-gray-900 text-3xl font-semibold font-['Inter'] leading-9">Lorem ipsum dolor sit amet consectetur?</div>
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Dolor enim eu tortor urna sed duis nulla. Aliquam vestibulum, nulla odio nisl vitae. In aliquet pellentesque aenean hac vestibulum turpis mi bibendum diam. Tempor integer aliquam in vitae malesuada fringilla.<br />Elit nisi in eleifend sed nisi. Pulvinar at orci, proin imperdiet commodo consectetur convallis risus. Sed condimentum enim dignissim adipiscing faucibus consequat, urna. Viverra purus et erat auctor aliquam. Risus, volutpat vulputate posuere purus sit congue convallis aliquet. Arcu id augue ut feugiat donec porttitor neque. Mauris, neque ultricies eu vestibulum, bibendum quam lorem id. Dolor lacus, eget nunc lectus in tellus, pharetra, porttitor.<br />Ipsum sit mattis nulla quam nulla. Gravida id gravida ac enim mauris id. Non pellentesque congue eget consectetur turpis. Sapien, dictum molestie sem tempor. Diam elit, orci, tincidunt aenean tempus. Quis velit eget ut tortor tellus. Sed vel, congue felis elit erat nam nibh orci.</div>
                            </div>
                            <div className="flex-col justify-start items-start gap-3 flex">
                                <div className="text-gray-900 text-2xl font-semibold font-['Inter'] leading-loose">Lorem ipsum dolor sit amet consectetur. In vestibulum.</div>
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Pharetra morbi libero id aliquam elit massa integer tellus. Quis felis aliquam ullamcorper porttitor. Pulvinar ullamcorper sit dictumst ut eget a, elementum eu. Maecenas est morbi mattis id in ac pellentesque ac.</div>
                            </div>
                            <div className="flex-col justify-start items-start gap-3 flex">
                                <div className="text-gray-900 text-2xl font-semibold font-['Inter'] leading-loose">Lorem ipsum dolor sit amet consectetur?</div>
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Pharetra morbi libero id aliquam elit massa integer tellus. Quis felis aliquam ullamcorper porttitor. Pulvinar ullamcorper sit dictumst ut eget a, elementum eu. Maecenas est morbi mattis id in ac pellentesque ac.</div>
                            </div>
                            <div className="flex-col justify-start items-start gap-3 flex">
                                <div className="text-gray-900 text-2xl font-semibold font-['Inter'] leading-loose">Tempor fusce lorem ipsum dolor sit amet consectetur?</div>
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Pharetra morbi libero id aliquam elit massa integer tellus. Quis felis aliquam ullamcorper porttitor. Pulvinar ullamcorper sit dictumst ut eget a, elementum eu. Maecenas est morbi mattis id in ac pellentesque ac.</div>
                            </div>
                            <div className="flex-col justify-start items-start gap-5 flex">
                                <div className="text-gray-900 text-3xl font-semibold font-['Inter'] leading-9">Lorem ipsum dolor sit amet consectetur.</div>
                                <div className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Pharetra morbi libero id aliquam elit massa integer tellus. Quis felis aliquam ullamcorper porttitor. Pulvinar ullamcorper sit dictumst ut eget a, elementum eu. Maecenas est morbi mattis id in ac pellentesque ac.</div>
                            </div>
                            <div className="flex-col justify-start items-start gap-5 flex">
                                <div className="text-gray-900 text-2xl font-semibold font-['Inter'] leading-loose">Tempor fusce lorem ipsum dolor sit amet consectetur?</div>
                                <div className="self-stretch"><span className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Sagittis et eu at elementum, quis in. Proin praesent volutpat egestas sociis sit lorem nunc nunc sit. Eget diam curabitur mi ac. Auctor rutrum lacus malesuada massa ornare et. Vulputate consectetur ac ultrices at diam dui eget fringilla tincidunt. Arcu sit dignissim massa erat cursus vulputate gravida id. Sed quis auctor vulputate hac elementum gravida cursus dis.<br /></span><span className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">Lectus id duis vitae porttitor enim </span><span className="text-slate-600 text-lg font-normal font-['Inter'] underline leading-7">gravida morbi</span><span className="text-slate-600 text-lg font-normal font-['Inter'] leading-7">.<br />Eu turpis </span><span className="text-slate-600 text-lg font-normal font-['Inter'] underline leading-7">posuere semper feugiat</span><span className="text-slate-600 text-lg font-normal font-['Inter'] leading-7"> volutpat elit, ultrices suspendisse. Auctor vel in vitae placerat.<br />Suspendisse maecenas ac </span><span className="text-slate-600 text-lg font-normal font-['Inter'] underline leading-7">donec scelerisque</span><span className="text-slate-600 text-lg font-normal font-['Inter'] leading-7"> diam sed est duis purus.</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <FooterComponent />
        </div>
    );
};