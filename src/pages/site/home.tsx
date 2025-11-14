import { Package, Truck, DollarSign, Clock, Shield, BarChart, ArrowRight, CheckCircle, Play, Pause } from "lucide-react";
import { NavBarPublico } from "./layout/NavBarPublico";
import { useState } from "react";
import brhubLogo from "@/assets/brhub-logo.png";

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

            {/* Hero Section - Video First */}
            <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background pt-24 pb-12">
                <div className="container mx-auto px-4">
                    {/* Logo centered */}
                    <div className="flex justify-center mb-8 animate-fade-in">
                        <img src={brhubLogo} alt="BRHUB Envios" className="h-32 w-auto" />
                    </div>

                    {/* Video Container - Destaque principal */}
                    <div className="max-w-5xl mx-auto mb-12 animate-scale-in">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-2">
                            <div className="relative rounded-2xl overflow-hidden group cursor-pointer" onClick={handleVideoClick}>
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
                                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-2xl transform hover:scale-110 transition-all">
                                            {isVideoPlaying ? (
                                                <Pause className="w-8 h-8" fill="currentColor" />
                                            ) : (
                                                <Play className="w-8 h-8" fill="currentColor" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Play overlay quando parado */}
                                {!isVideoPlaying && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="bg-primary/95 hover:bg-primary text-primary-foreground rounded-full p-8 shadow-2xl transform hover:scale-110 transition-all">
                                            <Play className="w-16 h-16" fill="currentColor" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Decorative blur elements */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
                    </div>

                    {/* Headline e CTAs */}
                    <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                            Economize até{" "}
                            <span className="text-primary">80% em fretes</span>
                            {" "}para todo o Brasil
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                            A plataforma completa para gerenciar todos os seus envios. 
                            Sem mensalidades. Sem complicação.
                        </p>

                        {/* Trust Indicators */}
                        <div className="flex flex-wrap justify-center gap-6 pt-4">
                            <div className="flex items-center gap-2 text-base">
                                <CheckCircle className="w-6 h-6 text-primary" />
                                <span className="font-semibold">Sem mensalidade</span>
                            </div>
                            <div className="flex items-center gap-2 text-base">
                                <CheckCircle className="w-6 h-6 text-primary" />
                                <span className="font-semibold">Sem taxa de adesão</span>
                            </div>
                            <div className="flex items-center gap-2 text-base">
                                <CheckCircle className="w-6 h-6 text-primary" />
                                <span className="font-semibold">Suporte especializado</span>
                            </div>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                            <a
                                href="/cadastro"
                                className="group bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
                            >
                                Começar agora grátis
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </a>
                            
                            <a
                                href="/login"
                                className="bg-card hover:bg-primary/10 text-foreground px-10 py-5 rounded-full text-xl font-semibold border-2 border-primary/20 hover:border-primary/40 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
                            >
                                Já tenho conta
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Por que escolher a BRHUB?
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Tudo que você precisa para gerenciar seus envios em um só lugar
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {benefits.map((benefit, index) => (
                            <div
                                key={index}
                                className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                    <benefit.icon className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {benefit.description}
                                </p>
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
            <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">10k+</div>
                            <div className="text-muted-foreground">Envios realizados</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">98%</div>
                            <div className="text-muted-foreground">Satisfação</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">500+</div>
                            <div className="text-muted-foreground">Clientes ativos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">24/7</div>
                            <div className="text-muted-foreground">Suporte disponível</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center space-y-8 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl p-12 shadow-2xl">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                            Pronto para economizar nos seus envios?
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            Junte-se a milhares de vendedores que já economizam com a BRHUB
                        </p>
                        <a
                            href="/cadastro"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-full text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                        >
                            Começar agora grátis
                            <ArrowRight className="w-6 h-6" />
                        </a>
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
