import { LogoApp } from "../../components/logo";
import { NavBarPublico } from "./layout/NavBarPublico";
import { PromoBannerRecarga } from "../../components/PromoBannerRecarga";
import { PublicTrackingWidget } from "../../components/public/PublicTrackingWidget";

export const Home = () => {
    return (
        <div className="w-full bg-white">
            <PromoBannerRecarga variant="featured" />
            <NavBarPublico />

            {/* Hero Section */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
                    <div className="text-center animate-fade-in">
                        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                            Bem-vindo ao <span className="text-[#F2541B]">BrHub Envios</span>
                        </h1>
                        <p className="mt-3 max-w-md mx-auto text-xl text-gray-600 sm:text-2xl md:mt-5 md:max-w-3xl">
                            Sua solução completa para criação de etiquetas, gerenciamento de postagens e integração com os
                            Correios.
                        </p>
                        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                            <div className="rounded-md shadow">
                                <a href="/cadastro-cliente"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#F2541B] hover:bg-[#d94a17] md:py-4 md:text-lg md:px-10 transition duration-300">
                                    Criar Conta
                                </a>
                            </div>
                            <div className="mt-3 sm:mt-0 sm:ml-3">
                                <a href="/login"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition duration-300">
                                    Fazer Login
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Widget de Rastreamento */}
                    <div className="mt-12 md:mt-16">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Rastreie sua encomenda</h2>
                            <p className="text-gray-500 text-sm mt-1">Digite o código de rastreamento para acompanhar seu envio</p>
                        </div>
                        <PublicTrackingWidget />
                    </div>
                </div>
            </div>

            {/* Seção de Recursos Principais */}
            <div className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Recursos que fazem a diferença
                        </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                            Descubra tudo o que nossa plataforma pode fazer pelo seu negócio
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition duration-300 border border-gray-100">
                            <div className="w-12 h-12 bg-[#F2541B]/10 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">🏷️</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">Criação de Etiquetas</h3>
                            <p className="text-gray-600">Gere etiquetas postais de forma rápida e prática com nossa interface
                                intuitiva.</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition duration-300 border border-gray-100">
                            <div className="w-12 h-12 bg-[#F2541B]/10 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">📦</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">Gerenciamento de Postagens</h3>
                            <p className="text-gray-600">Controle todas as suas postagens em um único lugar com ferramentas
                                poderosas.</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition duration-300 border border-gray-100">
                            <div className="w-12 h-12 bg-[#F2541B]/10 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">🚚</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">Integração com Correios</h3>
                            <p className="text-gray-600">Envie e rastreie suas encomendas diretamente com os Correios de forma
                                integrada.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção Como Funciona */}
            <div className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Como funciona nossa plataforma
                        </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                            Em apenas 3 passos simples, você pode começar a usar nossa solução
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-[#F2541B]/10 rounded-full flex items-center justify-center mb-6">
                                <span className="text-2xl font-bold text-[#F2541B]">1</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">Cadastre-se</h3>
                            <p className="text-gray-600">
                                Crie sua conta gratuitamente e configure suas preferências de envio em minutos.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-[#F2541B]/10 rounded-full flex items-center justify-center mb-6">
                                <span className="text-2xl font-bold text-[#F2541B]">2</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">Configure</h3>
                            <p className="text-gray-600">
                                Integre com sua loja virtual ou adicione seus produtos manualmente na plataforma.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-[#F2541B]/10 rounded-full flex items-center justify-center mb-6">
                                <span className="text-2xl font-bold text-[#F2541B]">3</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">Envie</h3>
                            <p className="text-gray-600">
                                Gere etiquetas, acompanhe entregas e gerencie todo seu processo logístico.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção de Estatísticas */}
            <div className="py-16 bg-[#F2541B]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                            Números que impressionam
                        </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-white/80">
                            Confira alguns dados sobre nossa plataforma
                        </p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">10K+</div>
                            <p className="text-white/80">Usuários ativos</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">500K+</div>
                            <p className="text-white/80">Etiquetas geradas</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">99.9%</div>
                            <p className="text-white/80">Taxa de entrega</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">24/7</div>
                            <p className="text-white/80">Suporte técnico</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção de Planos */}
            {/* <div className="py-16 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
                            Planos para todos os tamanhos
                        </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
                            Escolha o plano ideal para seu negócio
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-8">
                            <div className="text-center">
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Básico</h3>
                                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">Grátis</div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">Para começar</p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Até 100 etiquetas/mês
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Rastreamento básico
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Suporte por email
                                    </li>
                                </ul>
                                <button className="w-full bg-orange-600 dark:bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300">
                                    Começar Grátis
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-orange-500 dark:border-orange-400 p-8 relative">
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <span className="bg-orange-500 dark:bg-orange-400 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                    Mais Popular
                                </span>
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Profissional</h3>
                                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">R$ 29</div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">por mês</p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Até 1.000 etiquetas/mês
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Rastreamento avançado
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Integração com e-commerce
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Suporte prioritário
                                    </li>
                                </ul>
                                <button className="w-full bg-orange-600 dark:bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300">
                                    Assinar Agora
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-8">
                            <div className="text-center">
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Empresarial</h3>
                                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">R$ 99</div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">por mês</p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Etiquetas ilimitadas
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        API completa
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Suporte 24/7
                                    </li>
                                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        Gerente dedicado
                                    </li>
                                </ul>
                                <button className="w-full bg-orange-600 dark:bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300">
                                    Falar com Vendas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Seção de Depoimentos */}
            <div className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            O que nossos clientes dizem
                        </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                            Veja alguns depoimentos de quem já usa nossa plataforma
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-[#F2541B]/10 rounded-full flex items-center justify-center">
                                        <span className="text-[#F2541B] font-semibold">MF</span>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Maria Fernanda</h4>
                                    <p className="text-gray-500">Loja Virtual Fashion</p>
                                </div>
                            </div>
                            <p className="text-gray-600 italic">
                                "A plataforma revolucionou nosso processo de envios. Economizamos 70% do tempo na criação de etiquetas!"
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-[#F2541B]/10 rounded-full flex items-center justify-center">
                                        <span className="text-[#F2541B] font-semibold">JS</span>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg font-semibold text-gray-900">João Silva</h4>
                                    <p className="text-gray-500">E-commerce Tech Store</p>
                                </div>
                            </div>
                            <p className="text-gray-600 italic">
                                "Integração perfeita com nossa loja. O suporte é excepcional e a plataforma é muito intuitiva."
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-[#F2541B]/10 rounded-full flex items-center justify-center">
                                        <span className="text-[#F2541B] font-semibold">AC</span>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Ana Costa</h4>
                                    <p className="text-gray-500">Artesanatos Online</p>
                                </div>
                            </div>
                            <p className="text-gray-600 italic">
                                "Como pequena empresária, essa ferramenta me deu profissionalismo nos envios que eu nunca tive antes."
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção FAQ */}
            <div className="py-16 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Perguntas Frequentes
                        </h2>
                        <p className="mt-4 text-xl text-gray-600">
                            Tire suas principais dúvidas sobre nossa plataforma
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Como funciona a integração com os Correios?
                            </h3>
                            <p className="text-gray-600">
                                Nossa plataforma se conecta diretamente com a API dos Correios, permitindo criação automática de etiquetas, 
                                cálculo de fretes em tempo real e rastreamento completo das encomendas.
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Posso integrar com minha loja virtual?
                            </h3>
                            <p className="text-gray-600">
                                Sim! Oferecemos integrações nativas com as principais plataformas de e-commerce como Shopify, WooCommerce, 
                                Magento e muitas outras. Também temos API própria para integrações customizadas.
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Qual o prazo para começar a usar?
                            </h3>
                            <p className="text-gray-600">
                                Você pode começar a usar imediatamente após o cadastro. A configuração básica leva apenas alguns minutos, 
                                e nossa equipe de suporte está disponível para ajudar na integração.
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Existe período de teste gratuito?
                            </h3>
                            <p className="text-gray-600">
                                Sim! Oferecemos um plano gratuito permanente com até 100 etiquetas por mês. 
                                Também disponibilizamos 30 dias de teste gratuito dos planos pagos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção de Blog/Artigos */}
            <div className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Últimas novidades
                        </h2>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                            Fique por dentro das atualizações e dicas sobre logística
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <article className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                            <div className="h-48 bg-gradient-to-r from-[#F2541B] to-orange-500"></div>
                            <div className="p-6">
                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                    <span>15 de Outubro, 2024</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    Nova integração com Rodonaves
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Agora você pode enviar suas encomendas com a Rodonaves diretamente pela nossa plataforma.
                                </p>
                                <a href="#" className="text-[#F2541B] hover:text-[#d94a17] font-medium">
                                    Leia mais →
                                </a>
                            </div>
                        </article>
                        <article className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                            <div className="h-48 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                            <div className="p-6">
                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                    <span>12 de Outubro, 2024</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    Dicas para reduzir custos de frete
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Aprenda estratégias comprovadas para otimizar seus custos de envio e aumentar a margem de lucro do seu negócio.
                                </p>
                                <a href="#" className="text-[#F2541B] hover:text-[#d94a17] font-medium">
                                    Leia mais →
                                </a>
                            </div>
                        </article>
                        <article className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                            <div className="h-48 bg-gradient-to-r from-green-400 to-green-600"></div>
                            <div className="p-6">
                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                    <span>08 de Outubro, 2024</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    API v2.0 disponível
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Nova versão da nossa API com mais funcionalidades, melhor performance e documentação completa para desenvolvedores.
                                </p>
                                <a href="#" className="text-[#F2541B] hover:text-[#d94a17] font-medium">
                                    Leia mais →
                                </a>
                            </div>
                        </article>
                    </div>
                </div>
            </div>

            {/* Seção CTA Final */}
            <div className="bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Pronto para começar?
                        </h2>
                        <p className="mt-4 text-lg leading-6 text-gray-600">
                            Junte-se a milhares de usuários que já simplificaram seu processo postal.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                            <div className="inline-flex rounded-md shadow">
                                <a href="/cadastro-cliente"
                                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#F2541B] hover:bg-[#d94a17] transition duration-300">
                                    Começar teste gratuito
                                </a>
                            </div>
                            <div className="inline-flex rounded-md shadow">
                                <a href="#"
                                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-300">
                                    Agendar demonstração
                                </a>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            ✓ Sem compromisso • ✓ Configuração gratuita • ✓ Suporte incluído
                        </p>
                    </div>
                </div>
            </div>

            <footer className="bg-gray-900 text-white pt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

                        <div className="mb-8">
                            <div className="flex items-center">
                                <LogoApp light />
                            </div>
                            <p className="mt-4 text-gray-400 text-sm">
                                Soluções postais integradas para seu negócio. Economize tempo e simplifique seus envios.
                            </p>
                            <div className="mt-6 flex space-x-4">
                                <a href="#" className="text-gray-400 hover:text-[#F2541B]">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill-rule="evenodd"
                                            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </a>
                                <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill-rule="evenodd"
                                            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 4.006-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-4.006-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </a>
                                <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                    </svg>
                                </a>
                                <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill-rule="evenodd"
                                            d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </div>


                        <div className="mb-8">
                            <h3 className="text-secondary dark:text-secondary-dark font-semibold mb-4">Links Úteis</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary-dark transition duration-300">Sobre Nós</a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary-dark transition duration-300">Planos e
                                        Preços
                                    </a>
                                </li>
                                <li><a href="#" className="text-gray-300 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary-dark transition duration-300">Blog</a></li>
                                <li><a href="#" className="text-gray-300 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary-dark transition duration-300">FAQ</a></li>
                                <li>
                                    <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary-dark transition duration-300">Política de
                                        Privacidade
                                    </a>
                                </li>
                                <li>
                                    <a href="/apidocs" className="text-gray-300 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary-dark transition duration-300">
                                     Documentação de API
                                    </a>
                                </li>
                            </ul>
                        </div>


                        <div className="mb-8">
                            <h3 className="text-secondary dark:text-secondary-dark font-semibold mb-4">Contato</h3>
                            <ul className="space-y-2 text-gray-300 dark:text-gray-400">
                                <li className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l-12-9.725v15.438h24v-15.438l-12 9.725z" />
                                    </svg>
                                    financeiro@brhubb.com.br
                                </li>
                                <li className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M20 22.621l-3.521-6.795c-.008.004-1.974.97-2.064 1.011-2.24 1.086-6.799-7.82-4.609-8.994l2.083-1.026-3.493-6.817-2.106 1.039c-7.202 3.755 4.233 25.982 11.6 22.615.121-.055 2.102-1.029 2.11-1.033z" />
                                    </svg>
                                    (11)94627-8338/91154-4095
                                </li>
                                <li className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z" />
                                    </svg>
                                    Rua Xavantes, 719
                                    Sétimo andar
                                    sala 718
                                </li>
                            </ul>
                        </div>
                        <div className="mb-8">
                            <h3 className="text-secondary dark:text-secondary-dark font-semibold mb-4">Newsletter</h3>
                            <p className="text-gray-300 dark:text-gray-400 mb-4">Receba atualizações e novidades:</p>
                            <form className="flex gap-2">
                                <input type="email" placeholder="Seu melhor e-mail"
                                    className="flex-1 px-4 py-2 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-secondary dark:focus:ring-secondary-dark" />
                                <button type="submit"
                                    className="bg-secondary dark:bg-secondary-dark text-white px-4 py-2 rounded-lg hover:bg-secondary/90 dark:hover:bg-secondary-dark/90 transition duration-300">
                                    Assinar
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 dark:border-slate-800 mt-8 pt-8 pb-6 text-center">
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                            © 2024 BrHub Envios. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};