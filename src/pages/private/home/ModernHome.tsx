import { Package, Truck, DollarSign, Clock, Shield, BarChart, ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ModernHome = () => {
    const navigate = useNavigate();

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
            title: "Cadastre seu produto",
            description: "Informe peso, dimensões e endereços de origem e destino"
        },
        {
            number: "2",
            title: "Compare e escolha",
            description: "Veja todas as opções de frete e escolha a melhor para você"
        },
        {
            number: "3",
            title: "Emita e envie",
            description: "Imprima a etiqueta e despache seu produto"
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section with Video */}
            <section className="relative overflow-hidden">
                {/* Video Background */}
                <div className="absolute inset-0 z-0">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-20"
                    >
                        <source src="/assets/videos/hero-video.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background/80 to-background" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight animate-fade-in">
                            Calcule e emita fretes com{" "}
                            <span className="text-primary">desconto de até 80%</span>
                        </h1>
                        
                        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto animate-fade-in">
                            A plataforma completa para gerenciar todos os seus envios.
                            Sem mensalidades. Sem complicação.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-scale-in">
                            <button
                                onClick={() => navigate('/app/emissao/adicionar')}
                                className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                            >
                                Emitir frete agora
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            <button
                                onClick={() => navigate('/app/simulador')}
                                className="bg-card hover:bg-muted text-foreground px-8 py-4 rounded-full text-lg font-semibold border border-border shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                Simular frete grátis
                            </button>
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                <span>Sem mensalidade</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                <span>Sem taxa de adesão</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                <span>Suporte especializado</span>
                            </div>
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
                            Emita seus fretes em 3 passos simples
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
                        <button
                            onClick={() => navigate('/app/emissao/adicionar')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                        >
                            Começar agora
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center space-y-8 bg-card border border-border rounded-3xl p-12 shadow-2xl">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                            Pronto para economizar nos seus envios?
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            Junte-se a milhares de vendedores que já economizam com a BRHUB
                        </p>
                        <button
                            onClick={() => navigate('/app/emissao/adicionar')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-full text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                        >
                            Criar minha primeira etiqueta
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};
