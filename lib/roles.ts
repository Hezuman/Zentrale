export type UserRole = "admin" | "family" | "close_friends" | "friends";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  family: "Familie",
  close_friends: "Enge Freunde",
  friends: "Freunde",
};

export const ROLE_ICONS: Record<string, string> = {
  admin: "🛡️",
  family: "🏠",
  close_friends: "💜",
  friends: "👋",
};

export const ACCOUNT_ROLES: UserRole[] = [
  "admin",
  "family",
  "close_friends",
  "friends",
];

export function isAccountRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return ACCOUNT_ROLES.includes(role as UserRole);
}

export function canAccessSpiele(role: string | null | undefined): boolean {
  return isAccountRole(role);
}

export function canAccessSettings(role: string | null | undefined): boolean {
  return isAccountRole(role);
}

export function canAccessAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

export function canEditContent(role: string | null | undefined): boolean {
  return isAccountRole(role);
}

export function canCreateGameSession(role: string | null | undefined): boolean {
  return isAccountRole(role);
}

export function canManageGameSession(role: string | null | undefined): boolean {
  return isAccountRole(role);
}
