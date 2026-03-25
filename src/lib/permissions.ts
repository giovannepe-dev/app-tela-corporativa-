// Role-based permission map
// super_admin: full access
// admin_empresa: full company management
// editor_conteudo: screens, playlists, media
// operador_fila: queue management
// viewer: dashboard + reports only

export type AppRole = "super_admin" | "admin_empresa" | "editor_conteudo" | "operador_fila" | "viewer";

const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  "/admin":            ["super_admin", "admin_empresa", "editor_conteudo", "operador_fila", "viewer"],
  "/admin/devices":    ["super_admin", "admin_empresa"],
  "/admin/screens":    ["super_admin", "admin_empresa", "editor_conteudo"],
  "/admin/playlists":  ["super_admin", "admin_empresa", "editor_conteudo"],
  "/admin/media":      ["super_admin", "admin_empresa", "editor_conteudo"],
  "/admin/units":      ["super_admin", "admin_empresa"],
  "/admin/queue":      ["super_admin", "admin_empresa", "operador_fila"],
  "/admin/reports":    ["super_admin", "admin_empresa", "viewer"],
  "/admin/users":      ["super_admin", "admin_empresa"],
  "/admin/companies":  ["super_admin"],
  "/admin/guide":      ["super_admin", "admin_empresa", "editor_conteudo", "operador_fila", "viewer"],
  "/admin/settings":   ["super_admin", "admin_empresa"],
  "/admin/access-requests": ["super_admin"],
};

export function canAccessRoute(route: string, roles: string[]): boolean {
  // Check exact match first, then prefix match
  const allowedRoles = ROUTE_PERMISSIONS[route];
  if (!allowedRoles) {
    // For sub-routes like /admin/screens/edit/:id, check parent
    const parentRoute = Object.keys(ROUTE_PERMISSIONS)
      .filter(r => route.startsWith(r) && r !== "/admin")
      .sort((a, b) => b.length - a.length)[0];
    if (parentRoute) {
      return ROUTE_PERMISSIONS[parentRoute].some(r => roles.includes(r));
    }
    return roles.length > 0; // fallback: any authenticated user
  }
  return allowedRoles.some(r => roles.includes(r));
}

export function getNavItemsForRoles(roles: string[]) {
  return (route: string) => canAccessRoute(route, roles);
}
