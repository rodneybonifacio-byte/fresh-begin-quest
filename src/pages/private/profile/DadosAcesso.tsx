import { useFormContext } from 'react-hook-form';
import { InputLabel } from '../../../components/input-label';
import type { ProfileFormData } from './Profile';

export const DadosAcesso = () => {
    const {
        register,
        formState: { errors },
    } = useFormContext<ProfileFormData>();

    return (
        <div className="space-y-8">
            {/* Dados de Login */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Dados de Login</h3>
                <div className="space-y-4">
                    <InputLabel labelTitulo="E-mail de acesso" type="email" {...register('email')} disabled={true} isDisabled />
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">Para alterar seu e-mail de acesso, entre em contato com o suporte.</p>
                    </div>
                </div>
            </div>

            {/* Alteração de Senha */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Alterar Senha</h3>
                <form className="space-y-4">
                    <InputLabel labelTitulo="Senha Atual" type="password" {...register('senhaAtual')} fieldError={errors.senhaAtual?.message} />
                    <InputLabel labelTitulo="Nova Senha" type="password" {...register('novaSenha')} fieldError={errors.novaSenha?.message} />
                    <InputLabel
                        labelTitulo="Confirmar Nova Senha"
                        type="password"
                        {...register('confirmarNovaSenha')}
                        fieldError={errors.confirmarNovaSenha?.message}
                    />
                </form>
            </div>
        </div>
    );
};
