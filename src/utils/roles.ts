/**
 * Rol ID-ləri
 * 1 - Admin
 * 2 - Moderator
 * 3 - Editor
 * 4 - User (Sadə istifadəçi)
 */
export enum RoleId {
  ADMIN = 1,
  MODERATOR = 2,
  EDITOR = 3,
  USER = 4,
}

export const ROLE_NAMES: Record<number, string> = {
  [RoleId.ADMIN]: "Admin",
  [RoleId.MODERATOR]: "Moderator",
  [RoleId.EDITOR]: "Redaktor",
  [RoleId.USER]: "İstifadəçi",
};

/**
 * İstifadəçinin admin olub-olmadığını yoxlayır
 */
export function isAdmin(roleId: number | null | undefined): boolean {
  return roleId === RoleId.ADMIN;
}

/**
 * İstifadəçinin moderator olub-olmadığını yoxlayır
 * Admin də moderator hüquqlarına malikdir
 */
export function isModerator(roleId: number | null | undefined): boolean {
  return roleId === RoleId.ADMIN || roleId === RoleId.MODERATOR;
}

/**
 * İstifadəçinin editor olub-olmadığını yoxlayır
 * Admin və Moderator da editor hüquqlarına malikdir
 */
export function isEditor(roleId: number | null | undefined): boolean {
  return (
    roleId === RoleId.ADMIN ||
    roleId === RoleId.MODERATOR ||
    roleId === RoleId.EDITOR
  );
}

/**
 * İstifadəçinin admin panelə girişi olub-olmadığını yoxlayır
 * Admin, Moderator və Editor admin panelə girə bilər
 */
export function canAccessAdminPanel(
  roleId: number | null | undefined
): boolean {
  return isEditor(roleId);
}

/**
 * Rol adını qaytarır
 */
export function getRoleName(roleId: number | null | undefined): string {
  if (roleId === null || roleId === undefined) return ROLE_NAMES[RoleId.USER];
  return ROLE_NAMES[roleId] || ROLE_NAMES[RoleId.USER];
}

/**
 * Rol badge rəngini qaytarır
 */
export function getRoleBadgeColor(roleId: number | null | undefined): string {
  switch (roleId) {
    case RoleId.ADMIN:
      return "bg-red-100 text-red-800";
    case RoleId.MODERATOR:
      return "bg-yellow-100 text-yellow-800";
    case RoleId.EDITOR:
      return "bg-green-100 text-green-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

/**
 * Rol dot rəngini qaytarır
 */
export function getRoleDotColor(roleId: number | null | undefined): string {
  switch (roleId) {
    case RoleId.ADMIN:
      return "bg-red-500";
    case RoleId.MODERATOR:
      return "bg-yellow-500";
    case RoleId.EDITOR:
      return "bg-green-500";
    default:
      return "bg-base-300";
  }
}

/**
 * Rol text rəngini qaytarır
 */
export function getRoleTextColor(roleId: number | null | undefined): string {
  switch (roleId) {
    case RoleId.ADMIN:
      return "text-red-700";
    case RoleId.MODERATOR:
      return "text-yellow-700";
    case RoleId.EDITOR:
      return "text-green-700";
    default:
      return "text-base-600";
  }
}

/**
 * Rol ikonunu qaytarır
 */
export function getRoleIcon(roleId: number | null | undefined): string {
  switch (roleId) {
    case RoleId.ADMIN:
      return "👑";
    case RoleId.MODERATOR:
      return "🛡️";
    case RoleId.EDITOR:
      return "✏️";
    default:
      return "👤";
  }
}
