// Permission names
export const Permissions = {
  // Users
  USERS_VIEW: "users.view",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Posts
  POSTS_VIEW: "posts.view",
  POSTS_CREATE: "posts.create",
  POSTS_EDIT: "posts.edit",
  POSTS_DELETE: "posts.delete",
  POSTS_PUBLISH: "posts.publish",

  // Comments
  COMMENTS_VIEW: "comments.view",
  COMMENTS_CREATE: "comments.create",
  COMMENTS_EDIT: "comments.edit",
  COMMENTS_DELETE: "comments.delete",

  // Roles
  ROLES_VIEW: "roles.view",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

// Permission categories
export const PermissionCategories = {
  users: "İstifadəçilər",
  posts: "Postlar",
  comments: "Şərhlər",
  roles: "Rollar",
  settings: "Nizamlamalar",
} as const;

export type PermissionCategory = keyof typeof PermissionCategories;

// Permission interface
export interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
}

// Role with permissions
export interface RoleWithPermissions {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

// Default permissions for each role (fallback if DB is not available)
export const DefaultRolePermissions: Record<number, string[]> = {
  // Admin - all permissions
  1: Object.values(Permissions),

  // Moderator
  2: [
    Permissions.USERS_VIEW,
    Permissions.POSTS_VIEW,
    Permissions.POSTS_EDIT,
    Permissions.POSTS_DELETE,
    Permissions.POSTS_PUBLISH,
    Permissions.COMMENTS_VIEW,
    Permissions.COMMENTS_DELETE,
  ],

  // Editor
  3: [
    Permissions.POSTS_VIEW,
    Permissions.POSTS_CREATE,
    Permissions.POSTS_EDIT,
    Permissions.COMMENTS_VIEW,
    Permissions.COMMENTS_CREATE,
  ],

  // User
  4: [
    Permissions.POSTS_VIEW,
    Permissions.COMMENTS_VIEW,
    Permissions.COMMENTS_CREATE,
  ],
};

// Check if role has permission
export function hasPermission(
  roleId: number | null | undefined,
  permission: PermissionName,
  userPermissions?: string[]
): boolean {
  if (!roleId) return false;

  // If user permissions are provided, use them
  if (userPermissions && userPermissions.length > 0) {
    return userPermissions.includes(permission);
  }

  // Fallback to default role permissions
  const rolePermissions = DefaultRolePermissions[roleId];
  if (!rolePermissions) return false;

  return rolePermissions.includes(permission);
}

// Check if role has any of the permissions
export function hasAnyPermission(
  roleId: number | null | undefined,
  permissions: PermissionName[],
  userPermissions?: string[]
): boolean {
  return permissions.some((p) => hasPermission(roleId, p, userPermissions));
}

// Check if role has all of the permissions
export function hasAllPermissions(
  roleId: number | null | undefined,
  permissions: PermissionName[],
  userPermissions?: string[]
): boolean {
  return permissions.every((p) => hasPermission(roleId, p, userPermissions));
}

// Get permission display name
export function getPermissionDisplayName(permissionName: string): string {
  const displayNames: Record<string, string> = {
    "users.view": "İstifadəçiləri görmək",
    "users.edit": "İstifadəçiləri redaktə etmək",
    "users.delete": "İstifadəçiləri silmək",
    "posts.view": "Postları görmək",
    "posts.create": "Post yaratmaq",
    "posts.edit": "Postları redaktə etmək",
    "posts.delete": "Postları silmək",
    "posts.publish": "Postları dərc etmək",
    "comments.view": "Şərhləri görmək",
    "comments.create": "Şərh yazmaq",
    "comments.edit": "Şərhləri redaktə etmək",
    "comments.delete": "Şərhləri silmək",
    "roles.view": "Rolları görmək",
    "roles.edit": "Rolları redaktə etmək",
    "roles.delete": "Rolları silmək",
    "settings.view": "Nizamlamaları görmək",
    "settings.edit": "Nizamlamaları redaktə etmək",
  };

  return displayNames[permissionName] || permissionName;
}

// Get category display name
export function getCategoryDisplayName(category: string): string {
  return PermissionCategories[category as PermissionCategory] || category;
}

// Group permissions by category
export function groupPermissionsByCategory(
  permissions: Permission[]
): Record<string, Permission[]> {
  return permissions.reduce(
    (acc, permission) => {
      const category = permission.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );
}
