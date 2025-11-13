import { Link } from "react-router-dom";

interface MessageProps {
    titulo: string;
    subTitulo: string;
    toBack: string;
    labelButton: string;
    isModal?: boolean;
}

export const MessageComponent = ({ titulo, subTitulo, toBack, labelButton, isModal = false, ...props }: MessageProps) => {
    return (
        <div {...props}>
            <div className={`${!isModal ? 'w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 px-6 items-center justify-center gap-8 bg-white sm:bg-gray-50':''}`}>
                <div className={`${!isModal ? 'w-full max-w-xl p-4 md:p-10 bg-white rounded-lg sm:border sm:border-zinc-200':''}`}>
                    <div className={`flex flex-col justify-start items-center gap-8 ${isModal ? 'p-10':''}`}>
                        <img className="w-[128px] h-[128px]" alt="" src="assets/images/animation_success.gif" />
                        <div className="flex flex-col gap-6">
                            <span className="text-center text-slate-800 text-2xl font-light leading-[28.80px]">{titulo}</span>
                            <span className="text-center text-slate-600 text-sm font-normal leading-[21px]">{subTitulo}</span>
                        </div>
                        <div className="w-full">
                            <Link to={toBack} className="h-12 w-full bg-secondary text-white text-sm font-medium rounded-lg flex justify-center items-center">
                                {labelButton}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};