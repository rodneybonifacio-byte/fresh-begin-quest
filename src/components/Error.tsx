import React from "react";

interface TipoErro {
    id: number;
    titulo: string | React.ReactNode;
    icon: string | React.ReactNode;
    descricao: string;
}

const tipoErro: TipoErro[] = [
    {
        id: 500,
        titulo: "Problemas no servidor",
        icon: "🚨",
        descricao: "Nosso servidor está um pouco tímido hoje. Espere um pouquinho e tente novamente!",
    },
    {
        id: 403,
        titulo: "Acesso negado",
        icon: <img src="/assets/images/403.svg" alt="403" className="w-16 h-16" />,
        descricao: "Parece que o seu acesso está fora do limite. Melhor chamar um administrador para destravar seu acesso!",
    },
    {
        id: 404,
        titulo: (
            <>
                Não conseguimos <br /> achar esta página :/
            </>
        ),
        icon: <img src="/assets/images/404.svg" alt="404" className="w-2/3 h-auto" />,
        descricao: "Desculpe, mas parece que esta página que está acessando não existe.",
    },
    {
        id: 444,
        titulo: "Erro de carregamento",
        icon: "😕",
        descricao: "Os dados se perderam :/ Verifique sua conexão e tente novamente!",
    },
    {
        id: 1001,
        titulo: "Em manutenção",
        icon: "🚧",
        descricao: "Esta página está em manutenção neste momento. Daqui a pouco estamos de volta. Fique atento. :)",
    },
];

interface ErrorPageProps {
    id: number;
}

export const ErrorPage = ({ id }: ErrorPageProps) => {
    const erro = tipoErro.find((e) => e.id === id) ?? {
        titulo: "Erro desconhecido",
        icon: "❌",
        descricao: "Algo inesperado aconteceu. Tente novamente mais tarde.",
    };

    return (
        <div className="container mx-auto px-4 h-screen flex flex-col items-center justify-center w-full gap-8 sm:w-1/2">
            <div className="text-6xl mb-4 w-full flex justify-center">
                {erro.icon}
            </div>

            <h2 className="text-4xl font-semibold text-gray-800 mb-4 text-center">{erro.titulo}</h2>
            <p className="text-xl text-gray-600 mb-6 max-w-xl text-center">{erro.descricao}</p>

            <a href="/app" className="inline-block bg-red-500 text-white px-8 py-3 rounded-lg hover:bg-red-600 transition-colors text-lg font-semibold">
                Voltar para o início
            </a>
        </div>

    );
};
