import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { tv, VariantProps } from 'tailwind-variants'

const buttonVariants = tv({
    base: 'p-6 py-[14px] flex justify-center items-center gap-2 rounded-lg text-base font-medium disabled:bg-disabled disabled:text-disabledSecondary disabled:cursor-pointer',
    variants: {
        variant: {
            primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
            secondary: 'bg-secondary text-neutral-50 hover:bg-secondary/80',
            ghost: 'bg-ghost text-primary hover:text-secondary'
        },
        border: {
            default: 'border-none',
            secondary: 'border-primary border-[1.5px]',
            outline: 'bg-transparent border text-secondary'
        },
        size: {
            regular: 'px-6 leading-5',
            lg: 'sm:px-44 px-28',
            small: 'py-2 px-4 w-full'
        }
    },
    defaultVariants: {
        variant: 'secondary',
        border: 'default',
        size: 'regular'
    },
    compoundVariants: [
        {
            variant: "primary",
            border: "outline",
            class: "border-primary text-primary hover:bg-primary/10"
        },
        {
            variant: "secondary",
            border: "outline",
            class: "border-secondary text-secondary hover:bg-secondary/10"
        },
        {
            variant: "ghost",
            border: "outline",
            class: "border-primary text-primary hover:bg-primary/10"
        }
    ]
})

interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
    children: ReactNode;
    className?: string;
}


export const ButtonComponent = ({ children, variant, size, border, className, ...props }: ButtonProps) => {
    return (
        <button
            {...props}
            className={clsx(buttonVariants({ variant, size, border }), className)}
        >
            {children}
        </button>
    );
};