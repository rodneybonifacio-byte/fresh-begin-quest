import { useFormContext } from "react-hook-form";
import { InputLabel } from "../../../../../components/input-label";
import { Divider } from "../../../../../components/divider";
import type { FormDataCliente } from "../../../../../utils/schames/clientes";

export const DadosAcesso = () => {
    const { register, watch, formState: { errors } } = useFormContext<FormDataCliente>();
    const isEdit = !!watch("id");

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-semibold">Dados de Acesso</h2>
            <Divider />
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8 col-span-12 w-full">
                    <InputLabel
                        labelTitulo="Email"
                        type="email"
                        placeholder="Digite o email do cliente"
                        {...register("email")}
                        fieldError={errors.email?.message}
                    />
                </div>
                <div className="sm:col-span-4 col-span-12 w-full">
                    <InputLabel
                        labelTitulo={isEdit ? "Senha (deixe em branco para manter)" : "Senha"}
                        type="password"
                        placeholder={isEdit ? "Deixe em branco para não alterar" : "Digite a senha"}
                        autoComplete="new-password"
                        {...register("senha")}
                        isPassword
                        fieldError={errors.senha?.message}
                    />
                </div>
            </div>
            {isEdit && (
                <p className="text-xs text-muted-foreground">
                    Por segurança, a senha atual nunca é exibida. Só preencha este campo se quiser realmente trocar a senha do cliente.
                </p>
            )}
        </div>
    );
};
