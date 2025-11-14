import { Package, Truck, DollarSign, Clock, Shield, BarChart, ArrowRight, Play, Pause, Calculator, Bell, TrendingUp } from "lucide-react";
import { NavBarPublico } from "./layout/NavBarPublico";
import { useState } from "react";

export const Home = () => {
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const benefits = [
        {
            icon: DollarSign,
            title: "Economia de até 80%",
            description: "Fretes com desconto sem mensalidades ou taxas escondidas"
        },
        {
            icon: Truck,
            title: "Cobertura nacional",
            description: "Envie para todo o Brasil com as melhores transportadoras"
        },
        {
            icon: Clock,
            title: "Emissão em segundos",
            description: "Processo rápido e descomplicado para emitir suas etiquetas"
        },
        {
            icon: Package,
            title: "Rastreamento completo",
            description: "Acompanhe seus envios em tempo real e mantenha seus clientes informados"
        },
        {
            icon: Shield,
            title: "Seguro e confiável",
            description: "Suas encomendas protegidas do início ao fim"
        },
        {
            icon: BarChart,
            title: "Relatórios detalhados",
            description: "Analise seus envios e otimize sua logística"
        }
    ];

    const steps = [
        {
            number: "1",
            title: "Cadastre-se gratuitamente",
            description: "Crie sua conta em poucos minutos sem complicação"
        },
        {
            number: "2",
            title: "Adicione seus produtos",
            description: "Informe peso, dimensões e endereços de origem e destino"
        },
        {
            number: "3",
            title: "Escolha e emita",
            description: "Compare opções e imprima suas etiquetas com desconto"
        }
    ];

    const handleVideoClick = () => {
        const video = document.getElementById("hero-video") as HTMLVideoElement;
        if (video) {
            if (video.paused) {
                video.play();
                setIsVideoPlaying(true);
            } else {
                video.pause();
                setIsVideoPlaying(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <NavBarPublico />

            {/* Hero Section - Premium Dark Background */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-28 pb-16 min-h-[85vh] flex items-center">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
                        {/* Left Column - Content */}
                        <div className="space-y-8 animate-fade-in">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                                <TrendingUp className="w-4 h-4" />
                                Até 80% de desconto
                            </div>

                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                                Fretes a partir de{" "}
                                <span className="text-primary bg-gray-100 px-3 py-1 rounded-lg inline-block my-2">R$ 4,99</span>
                                <br />
                                para você vender ainda mais!
                            </h1>
                            
                            <p className="text-xl text-slate-300 leading-relaxed">
                                Aproveite fretes até 80% mais baratos nas transportadoras selecionadas. 
                                Calcule, emita e envie seus pedidos de forma simples e rápida.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <a
                                    href="/cadastro"
                                    className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
                                >
                                    Cadastre-se grátis
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </a>
                                
                                <a
                                    href="/login"
                                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold border-2 border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-300 flex items-center justify-center"
                                >
                                    Fazer login
                                </a>
                            </div>
                        </div>

                        {/* Right Column - Video */}
                        <div className="relative animate-scale-in">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-1">
                                <div className="relative rounded-xl overflow-hidden group cursor-pointer bg-slate-900" onClick={handleVideoClick}>
                                    <video
                                        id="hero-video"
                                        className="w-full h-auto"
                                        loop
                                        muted
                                        playsInline
                                    >
                                        <source src="/assets/videos/hero-video.mp4" type="video/mp4" />
                                    </video>
                                    
                                    {/* Video Controls Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                                            <button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-2xl transform hover:scale-110 transition-all">
                                                {isVideoPlaying ? (
                                                    <Pause className="w-6 h-6" fill="currentColor" />
                                                ) : (
                                                    <Play className="w-6 h-6" fill="currentColor" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Play overlay quando parado */}
                                    {!isVideoPlaying && (
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <div className="bg-primary/95 hover:bg-primary text-primary-foreground rounded-full p-6 shadow-2xl transform hover:scale-110 transition-all">
                                                <Play className="w-12 h-12" fill="currentColor" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Decorative elements */}
                            <div className="absolute -top-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
                            <div className="absolute -bottom-4 -left-4 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
                        </div>
                    </div>
                </div>

                {/* Bottom wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg className="w-full h-12 fill-background" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                        <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
                        <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
                    </svg>
                </div>
            </section>

            {/* Calculator CTA Bar */}
            <section className="bg-primary py-5 shadow-lg">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
                        <div className="flex items-center gap-3">
                            <Calculator className="w-6 h-6 text-white" />
                            <span className="text-lg font-bold text-white">
                                Calcule seu frete agora mesmo
                            </span>
                        </div>
                        <a 
                            href="/simulador"
                            className="bg-white hover:bg-white/95 text-primary px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 shadow-xl flex items-center gap-2"
                        >
                            Calcular frete
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </section>

            {/* Main Value Proposition */}
            <section className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                            Quanto mais você envia,{" "}
                            <span className="text-primary">mais barato fica</span>
                        </h2>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Somos uma plataforma gratuita de gestão e intermediação de fretes. 
                            A BRHUB não tem taxas nem mensalidades, basta se cadastrar e aproveitar 
                            os benefícios do melhor facilitador de logística do mercado.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Feature 1 */}
                        <div className="group text-center space-y-6">
                            <div className="relative mx-auto w-full aspect-square max-w-sm rounded-2xl overflow-hidden shadow-lg">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Calculator className="w-24 h-24 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                                    <Calculator className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold">Calcule seu frete</h3>
                                <p className="text-muted-foreground">
                                    Preencha os dados do seu envio para cotar a entrega e criar suas etiquetas de frete.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="group text-center space-y-6">
                            <div className="relative mx-auto w-full aspect-square max-w-sm rounded-2xl overflow-hidden shadow-lg">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Package className="w-24 h-24 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                                    <Package className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold">Realize integrações</h3>
                                <p className="text-muted-foreground">
                                    Integre com sua plataforma de e-commerce, ERP e Marketplaces.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="group text-center space-y-6">
                            <div className="relative mx-auto w-full aspect-square max-w-sm rounded-2xl overflow-hidden shadow-lg">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Bell className="w-24 h-24 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold">Acompanhe e metrif ique</h3>
                                <p className="text-muted-foreground">
                                    Acompanhe o status de entrega dos pedidos de envio em tempo real.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {benefits.map((benefit, index) => (
                            <div
                                key={index}
                                className="group bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <benefit.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {benefit.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Como funciona?
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Comece a emitir fretes em 3 passos simples
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {steps.map((step, index) => (
                            <div key={index} className="relative">
                                <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
                                    <div className="bg-primary text-primary-foreground w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">
                                        {step.number}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                                
                                {/* Connector Arrow */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                        <ArrowRight className="w-8 h-8 text-primary/30" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <a
                            href="/cadastro"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                        >
                            Criar conta grátis
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-slate-900 text-white">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">10k+</div>
                            <div className="text-slate-300 text-sm">Envios realizados</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">98%</div>
                            <div className="text-slate-300 text-sm">Satisfação</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">500+</div>
                            <div className="text-slate-300 text-sm">Clientes ativos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">24/7</div>
                            <div className="text-slate-300 text-sm">Suporte disponível</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-br from-primary/5 to-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center space-y-8 bg-card border border-border rounded-3xl p-12 md:p-16 shadow-xl">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                            Pronto para economizar nos seus envios?
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Junte-se a milhares de vendedores que já economizam com a BRHUB. 
                            Cadastre-se grátis e comece a enviar hoje mesmo!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <a
                                href="/cadastro"
                                className="group bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 inline-flex items-center justify-center gap-3"
                            >
                                Começar agora grátis
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </a>
                            <a
                                href="/login"
                                className="bg-background hover:bg-muted text-foreground px-10 py-5 rounded-full text-xl font-semibold border-2 border-border hover:border-primary/40 shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center justify-center"
                            >
                                Fazer login
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-muted/30 border-t border-border py-12">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="font-bold text-lg mb-4">BRHUB Envios</h3>
                            <p className="text-muted-foreground text-sm">
                                Sua solução completa para envios com economia e praticidade.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#" className="hover:text-primary transition-colors">Recursos</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Empresa</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#" className="hover:text-primary transition-colors">Sobre nós</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="/termo-de-uso" className="hover:text-primary transition-colors">Termos de uso</a></li>
                                <li><a href="/politica-de-privacidade" className="hover:text-primary transition-colors">Privacidade</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} BRHUB Envios. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
};
