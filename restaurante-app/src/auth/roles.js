// Role-Based Access Control (RBAC)
// Centraliza papéis e permissões de telas e ações

export const Roles = Object.freeze({
  ADMIN: 'admin',
  GERENTE: 'gerente',
  GARCOM: 'garcom',
  COZINHEIRO: 'cozinheiro',
  MONTAGEM: 'montagem',
});

// Permissões de ações
export const Permissions = Object.freeze({
  CREATE_ORDER: 'create_order',
  UPDATE_STATUS: 'update_status',
  MANAGE_USERS: 'manage_users',
  VIEW_REPORTS: 'view_reports',
  CONFIGURE_PRODUCTS: 'configure_products',
  SECURITY_SETTINGS: 'security_settings',
});

// Mapa de permissões por papel
export const RolePermissions = {
  [Roles.ADMIN]: new Set([
    Permissions.CREATE_ORDER,
    Permissions.UPDATE_STATUS,
    Permissions.MANAGE_USERS,
    Permissions.VIEW_REPORTS,
    Permissions.CONFIGURE_PRODUCTS,
    Permissions.SECURITY_SETTINGS,
  ]),
  [Roles.GERENTE]: new Set([
    Permissions.CREATE_ORDER,
    Permissions.UPDATE_STATUS,
    Permissions.MANAGE_USERS,
    Permissions.VIEW_REPORTS,
    Permissions.CONFIGURE_PRODUCTS,
  ]),
  [Roles.GARCOM]: new Set([
    Permissions.CREATE_ORDER,
  ]),
  [Roles.COZINHEIRO]: new Set([
    Permissions.UPDATE_STATUS,
  ]),
  [Roles.MONTAGEM]: new Set([
    Permissions.UPDATE_STATUS,
  ]),
};

// Telas permitidas por papel
export const RoleScreens = {
  [Roles.ADMIN]: ['Novo Pedido', 'Cozinha', 'Montagem', 'Prontos', 'Comandas', 'Mapa', 'Admin'],
  [Roles.GERENTE]: ['Novo Pedido', 'Cozinha', 'Montagem', 'Prontos', 'Comandas', 'Mapa', 'Admin'],
  [Roles.GARCOM]: ['Novo Pedido', 'Comandas', 'Mapa', 'Prontos'],
  [Roles.COZINHEIRO]: ['Cozinha'],
  [Roles.MONTAGEM]: ['Montagem', 'Prontos'],
};

export function hasPermission(role, permission) {
  const set = RolePermissions[role] || new Set();
  return set.has(permission);
}

export function canAccessScreen(role, screenName) {
  const list = RoleScreens[role] || [];
  return list.includes(screenName);
}

// Helper para normalizar o papel obtido do Firestore
export function normalizeRole(roleValue) {
  const v = String(roleValue || '').toLowerCase();

  // Legacy aliases
  if (v === 'churrasqueiro') return Roles.COZINHEIRO;
  if (v === 'manager') return Roles.GERENTE;

  if (Object.values(Roles).includes(v)) return v;
  return Roles.GARCOM; // padrão seguro
}
