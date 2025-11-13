import authStore from "../authentica/authentication.store";

export function getRedirectPathByRole(): string {
    const user = authStore.getUser();

    if (!user) return "/login";

    switch (user.role) {
        case "CLIENTE":
            return "/app";
        case "ADMIN":
            return "/admin";
        default:
            return "/login";
    }
}
