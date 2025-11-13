interface HeaderComponentProps {
    children: React.ReactNode;
}

export const HeaderComponent = ({ children }: HeaderComponentProps) => {
    return (
        <header className="fixed flex flex-row top-0 left-0 w-full py-4 px-6 h-[100px] justify-start gap-6 items-center sm:border-b sm:border-[#E3E4E8] bg-white z-10  sm:px-12 md:px-8 lg:px-32 xl:px-92">
            {children}
        </header>
    )
}