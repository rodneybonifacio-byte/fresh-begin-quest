// Componente: Integracoes.tsx
import { useState } from "react";
import { FormularioDinamico, type FormSchema } from "./FormularioDinamico";
import { Content } from "../../Content";
import { SwitchToggle } from "../../../../components/SwitchToggle";
import { ModalCustom } from "../../../../components/modal";

const mockFormSchemas: FormSchema[] = [
    {
        image: "/shopify.png",
        conected: true,
        descricao: "Integre sua conta com as plataformas de e-commerce mais populares do Brasil.",
        plataforma: "shopify",
        formulario: [
            { label: "Access Token", name: "accessToken", type: "input", required: true },
            { label: "Shop URL", name: "shopUrl", type: "input", required: true },
        ]
    },
    // {
    //     image: "/Nuvemshop-logo.png",
    //     conected: true,
    //     descricao: "Integre sua conta com as plataformas de e-commerce mais populares do Brasil.",
    //     plataforma: "shopify",
    //     formulario: [
    //         { label: "Access Token", name: "accessToken", type: "input", required: true },
    //         { label: "Shop URL", name: "shopUrl", type: "input", required: true },
    //     ]
    // }
];

const Integracoes = () => {
    const [showModal, setShowModal] = useState(false);
    const [plataformaSelecionada, setPlataformaSelecionada] = useState<FormSchema | null>(null);

    const handleConectar = (plataforma: FormSchema) => {
        setPlataformaSelecionada(plataforma);
        setShowModal(true);
    };

    return (
        <Content
            titulo="Integrações"
            subTitulo="Integre sua conta com as plataformas de e-commerce mais populares do Brasil."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockFormSchemas.map((schema) => (
                    <div key={schema.plataforma} className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between">
                        <div className="flex flex-row justify-between mb-4">
                            <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                                <img src={schema.image} alt={schema.plataforma} className="w-[68px]" />
                            </div>
                            <div className="flex items-center gap-2">
                                <SwitchToggle defaultValue={schema.conected} />
                            </div>
                        </div>
                        <p className="text-base mb-6 text-slate-500">{schema.descricao}</p>
                        <button
                            onClick={() => handleConectar(schema)}
                            className="w-full bg-white border border-secondary text-secondary hover:bg-secondary hover:text-white py-3 px-4 rounded-lg font-bold hover:bg-opacity-90 transition"
                        >
                            Conectar Agora
                        </button>
                    </div>
                ))}
            </div>

            {showModal && plataformaSelecionada && (
                <ModalCustom
                    title={`Integração com ${plataformaSelecionada.plataforma}`}
                    description={plataformaSelecionada.descricao}
                    onCancel={() => setShowModal(false)}
                >
                    <FormularioDinamico schema={plataformaSelecionada} />
                </ModalCustom>
            )}
        </Content>
    );
};

export default Integracoes;