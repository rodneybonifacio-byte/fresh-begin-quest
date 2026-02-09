import { ComponentProps } from "react";
import { tv, VariantProps } from "tailwind-variants";
import logoBrhub from "@/assets/logo-brhub-new.png";

const logoAppVariants = tv({
    base: '',
    variants: {
        size: {
            default: 'w-auto h-[54px]',
            small: 'w-[44px] h-[40px]',
            medium: 'w-[250px] h-[45px]',
        },
        rotate: {
            "180": 'rotate-180'
        },
        display: {
            hidden: 'sm:block',  // Oculta em telas pequenas
            block: 'block'               // Exibe em todas as telas
        }
    },
    defaultVariants: {
        size: 'default',
        display: 'block'  // Exibido por padrão
    }
});

interface LogoAppProps extends ComponentProps<'img'>, VariantProps<typeof logoAppVariants> { 
    light?: boolean; // Adiciona a propriedade light
 }


export const LogoApp = ({ size, display, light, rotate, ...rest }: LogoAppProps) => {
    return (
        <img src={logoBrhub} alt="BRHUB Envios" className={logoAppVariants({ size, display, rotate })} {...rest} />
    );
};