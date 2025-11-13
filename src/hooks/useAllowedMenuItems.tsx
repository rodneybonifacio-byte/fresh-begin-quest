import { useMemo } from "react";
import type { PropsMenuItem } from "../components/menu/itemMenu";

// Se desejar permitir uma única permissão ou um array de permissões
export type RequiredPermission = string | string[];

export interface PropsMenuItemExtended extends PropsMenuItem {
    // Permissão(s) requerida(s) para exibir o item
    requiredPermission?: RequiredPermission;
    // Caso o item possua submenu, aplicamos o mesmo tipo aos itens internos
    submenu?: PropsMenuItemExtended[];
}

export function useAllowedMenuItems(
    menuItems: PropsMenuItemExtended[],
    userPermissions: string[]
): PropsMenuItemExtended[] {
    return useMemo(() => {
        // Função recursiva que filtra os itens com base nas permissões
        const filterItems = (items: PropsMenuItemExtended[]): PropsMenuItemExtended[] => {
            return items.reduce((acc: PropsMenuItemExtended[], item) => {
                // Se o item possui a propriedade requiredPermission, verificamos
                if (item.requiredPermission) {
                    let allowed = false;
                    if (typeof item.requiredPermission === "string") {
                        allowed = userPermissions.includes(item.requiredPermission);
                    } else if (Array.isArray(item.requiredPermission)) {
                        allowed = item.requiredPermission.some((perm) =>
                            userPermissions.includes(perm)
                        );
                    }
                    if (!allowed) {
                        // Item não permitido, pula para o próximo
                        return acc;
                    }
                }
                // Se o item possui submenu, filtramos recursivamente
                if (item.submenu && item.submenu.length > 0) {
                    const filteredSubmenu = filterItems(item.submenu);
                    // Se houver itens permitidos no submenu, atualizamos-o; senão, ignoramos o item
                    if (filteredSubmenu.length > 0) {
                        acc.push({ ...item, submenu: filteredSubmenu });
                    } else if (!item.requiredPermission) {
                        // Se o item não exige permissão e não há submenu permitido, ainda assim incluímos o item
                        acc.push({ ...item, submenu: [] });
                    }
                } else {
                    // Item sem submenu e sem restrição (ou com restrição satisfeita)
                    acc.push(item);
                }
                return acc;
            }, []);
        };

        return filterItems(menuItems);
    }, [menuItems, userPermissions]);
}
