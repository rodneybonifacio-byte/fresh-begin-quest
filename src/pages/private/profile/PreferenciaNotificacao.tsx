import { useFormContext } from 'react-hook-form';
import type { ProfileFormData } from './Profile';

export const PreferenciaNotificacao = () => {
    const { register } = useFormContext<ProfileFormData>();
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Preferências de Notificação</h3>
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('preferenciasNotificacao.email')} className="h-5 w-5 accent-purple-600 cursor-pointer" />
                        Notificações por e-mail
                    </label>
                    <p className="text-xs text-slate-400">Relatórios e comunicados importantes via e-mail corporativo.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('preferenciasNotificacao.push')} className="h-5 w-5 accent-purple-600 cursor-pointer" />
                        Notificações por push
                    </label>
                    <p className="text-xs text-slate-400">Alertas instantâneos de status no navegador.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('preferenciasNotificacao.sms')} className="h-5 w-5 accent-purple-600 cursor-pointer" />
                        Notificações por SMS
                    </label>
                    <p className="text-xs text-slate-400">Confirmações rápidas de postagem e entrega via SMS.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('preferenciasNotificacao.whatsapp')} className="h-5 w-5 accent-purple-600 cursor-pointer" />
                        Notificações por WhatsApp
                    </label>
                    <p className="text-xs text-slate-400">Atualizações e comprovantes via WhatsApp.</p>
                </div>
            </div>
        </div>
    );
};
