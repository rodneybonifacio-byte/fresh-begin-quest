// components/ResponsiveTabMenu.tsx
import { useState } from "react"
import { TabItem } from "./TabItem"
import { Tabs, TabsList } from "@radix-ui/react-tabs";
import { ButtonComponent } from "./button";

type TabItemType = {
    value: string
    label: string
}

type ResponsiveTabMenuProps = {
    tab: string
    setTab: (value: string) => void
    children: React.ReactNode
}

const items: TabItemType[] = [
    { value: "PRE_POSTADO", label: "PRE POSTADOS" },
    { value: "POSTADO", label: "POSTADOS" },
    { value: "COLETADO", label: "COLETADOS" },
    { value: "EM_TRANSITO", label: "EM TRANSITO" },
    { value: "AGUARDANDO_RETIRADA", label: "AGUARD. RETIRADA" },
    { value: "EM_ATRASO", label: "EM ATRASO" },
    { value: "ENTREGUE", label: "ENTREGUES" },
    { value: "CANCELADO", label: "CANCELADOS" },
]

export function ResponsiveTabMenu({ tab, setTab, children }: ResponsiveTabMenuProps) {
     const [showMenu, setShowMenu] = useState(false)

    const handleTabChange = (value: string) => {
        // Obter a URL atual e seus parâmetros
        const currentUrl = new URL(window.location.href);
        const params = currentUrl.searchParams;

        // Se um valor foi fornecido, atualize ou adicione o parâmetro status
        if (value) {
            params.set('status', value);
        } else {
            // Se não houver valor, remova o parâmetro status
            params.delete('status');
        }

        // Atualizar a URL sem recarregar a página
        window.history.pushState({}, '', currentUrl);
        setTab(value);
    }

    return (
        <div className="w-full flex flex-col gap-4" >
            {/* Botão toggle só no mobile */}
            < div className="sm:hidden flex justify-end" >
                <ButtonComponent onClick={() => setShowMenu(prev => !prev)}>
                    {showMenu ? "Fechar Filtros" : "☰ Filtros"}
                </ButtonComponent>
            </div>

            {/* Tabs list responsivo */}
            <div
                className={`${showMenu ? "block" : "hidden"} sm:flex flex-col sm:flex-row bg-white dark:bg-slate-800 p-2 rounded-md border border-input dark:border-gray-600 w-full sm:w-auto`}
            >
                <Tabs value={tab} onValueChange={handleTabChange} className="w-full" >
                    <TabsList className="flex gap-4 w-full p-2 sm:flex-row flex-col justify-start items-start" >
                        {
                            items.map((item) => (
                                <TabItem key={item.value} value={item.value} label={item.label} />
                            ))
                        }
                    </TabsList>
                </Tabs>
            </div>

            {/* Conteúdo da tab */}
            <div className="flex-1" >
                {children}
            </div>
        </div>
    )
}
