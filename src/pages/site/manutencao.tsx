import { LogoApp } from "../../components/logo";

export const Manutencao = () => {
    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">

                <div className="bg-primary p-6 text-center justify-center flex">
                    <LogoApp light/>
                </div>

                <div className="p-8">
                    <div className="text-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-xl font-bold text-primary mt-4">Cadastro Temporariamente Indisponível</h2>
                    </div>

                    <div className="space-y-4 text-gray-700">
                        <p>No momento, o cadastro público ainda não está disponível em nossa plataforma.</p>
                        <p>Estamos trabalhando para oferecer o melhor serviço possível e em breve disponibilizaremos o acesso para todos.</p>

                        <div className="bg-gray-50 border-l-4 border-accent p-4 mt-6">
                            <h3 className="font-bold text-primary mb-2">Para solicitar acesso, entre em contato:</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>(11)94627-8338/91154-4095</span>
                                </div>
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>financeiro@brhubb.com.br</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <a href="/" className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors font-medium">
                            Voltar à Página Inicial
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};