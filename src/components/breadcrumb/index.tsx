import { ChevronRight } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const friendlyNames: Record<string, string> = {
    "admin": "Admin",
    "financeiro": "Financeiro",
    "fatura": "Fatura",
    "faturas": "Faturas",
    "app": "Home",
    "cadastros": "Cadastros",
    "destinatarios": "Destinatários",
    "envios": "Envios",
    "pre-postagem": "Pré-Postagem",
    "emissao": "Pré-Postagem",
    "integracoes-pedidos": "Integrações",
    "ferramentas": "Ferramentas",
    "imprimir-etiquetas": "Imprimir Etiquetas",
    "manifestos": "Manifestos",
    "rastrear": "Rastrear Pacote",
    "simulador": "Simulador de Frete",
};

export const BreadCrumbCustom = () => {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse py-3">
                {pathnames.map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                    const isLast = index === pathnames.length - 1;
                    const isSecondLast = index === pathnames.length - 2;
                    const label = friendlyNames[value] || value.charAt(0).toUpperCase() + value.slice(1);

                    return (
                        <li key={to} aria-current={isLast ? "page" : undefined}>
                            <div className="flex items-center">
                                {index !== 0 && (
                                    <ChevronRight className="text-blue-500 w-4" />
                                )}

                                {(isLast || isSecondLast) ? (
                                    <span className="flex flex-row leading-tight gap-2 ms-1 text-xs font-medium text-gray-500 md:ms-2">
                                        {label}
                                    </span>
                                ) : (
                                    <Link
                                        to={"#"}
                                        className="flex flex-row underline text-[#156fee] leading-tight gap-2 ms-1 text-xs font-medium hover:text-blue-600 md:ms-2"
                                    >
                                        {label}
                                    </Link>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};