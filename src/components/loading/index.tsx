
interface LoadSpinnerProps { 
    mensagem?: string
}
export const LoadSpinner = ({ mensagem = "Aguarde, Carregando suas informações..." }: LoadSpinnerProps) => {
    return (
        <div className="fixed top-0 left-0 w-full h-full flex flex-col gap-8 items-center justify-center bg-slate-300 bg-opacity-75 z-[9999]">
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-primary"></div>
            <span className="text-xl font-medium text-primary animate-bounce">{mensagem}</span>
        </div>
    );
};
