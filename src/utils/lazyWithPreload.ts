// src/utils/lazyWithPreload.ts
import { lazy } from "react";

export const isLazyComponent = (element: any): element is { type: { preload?: () => Promise<void> } } => {
    return element && typeof element === 'object' && 'type' in element;
};

export function lazyWithPreload(factory: () => Promise<{ default: React.ComponentType<any> }>) {
    const Component = lazy(factory);
    (Component as any).preload = factory;
    return Component as typeof Component & { preload: () => Promise<void> };
}
