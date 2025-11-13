import { Link} from "react-router-dom";

export const MessageRedefinirSenha = () => {
    return (
        <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 px-6 items-center justify-center gap-8 bg-white sm:bg-gray-50">
            <div className="w-full max-w-xl p-4 md:p-10 bg-white rounded-lg sm:border sm:border-zinc-200">
                <div className="flex flex-col justify-start items-center gap-8">

                    <div className="flex flex-col gap-6">
                        <span className="text-center text-slate-800 text-2xl font-light leading-[28.80px]">Verifique seu e-mail!</span>
                        <span className="text-center text-slate-600 text-sm font-normal leading-[21px]">Em breve, você receberá um e-mail<br />com as instruções para redefinir sua senha.</span>
                    </div>
                    <div className="w-full">
                        <Link to={'/pin-code'} className="h-12 w-full bg-secondary text-white text-sm font-medium rounded-lg flex justify-center items-center">
                            Digita Codigo
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
};