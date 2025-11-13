
interface CardComponentProps {
    children?: React.ReactNode;
}

export const CardComponent = ({ children }: CardComponentProps) => {
    return (
        <div className="px-6 py-6 bg-[#fefefe] rounded-[10px] border border-[#e3e4e8] flex-col justify-start items-start gap-4 flex">
            {children}
        </div>
    )
}