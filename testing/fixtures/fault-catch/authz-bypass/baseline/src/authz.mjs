// Role-based access control for an internal admin surface.
//
// Roles, least to most privileged: viewer < editor < admin.
// `manageUsers` is a privileged, admin-only action: creating/removing users and
// changing their roles. Editors may change content but MUST NOT manage users.
export const ROLES = ["viewer", "editor", "admin"];

export function canView(role) {
  return ROLES.includes(role);
}

export function canEdit(role) {
  return role === "editor" || role === "admin";
}

export function canManageUsers(role) {
  // Privileged: only an admin may manage users. Widening this to any other role
  // is privilege amplification.
  return role === "admin";
}
