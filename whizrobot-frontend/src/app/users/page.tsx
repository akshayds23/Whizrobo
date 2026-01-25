"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/api";

type Role = {
  id: number;
  name: string;
};

type Organization = {
  id: number;
  name: string;
};

type UserRow = {
  id: number;
  email: string;
  role_id: number | null;
  permissions: string[];
};

const PERMISSION_TOGGLES = [
  { label: "Create", key: "CREATE_ORG" },
  { label: "Read", key: "VIEW_ORG" },
  { label: "Edit", key: "ASSIGN_COURSE" },
  { label: "Delete", key: "REVOKE_LICENSE" },
];

export default function UsersPage() {
  const { user, loading } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orgId, setOrgId] = useState<number | null>(null);

  const permissions = user?.permissions ?? [];
  const isSuperadmin = Boolean(user?.is_superadmin);
  const canManageOrg =
    isSuperadmin ||
    permissions.includes("CREATE_ORG") ||
    permissions.includes("VIEW_ORG");

  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.org_id) {
      setOrgId(user.org_id);
      return;
    }
    if (!isSuperadmin) {
      setOrgId(null);
      return;
    }
    apiFetch("/organizations")
      .then((orgs: Organization[]) => {
        const internal =
          orgs.find((org) => org.name === "Whizrobo Internal") ?? orgs[0];
        setOrgId(internal?.id ?? null);
      })
      .catch(() => setOrgId(null));
  }, [user, isSuperadmin]);

  useEffect(() => {
    if (!orgId || !canManageOrg) {
      return;
    }
    apiFetch(`/organizations/${orgId}/roles`)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [orgId, canManageOrg]);

  useEffect(() => {
    if (!orgId || !canManageOrg) {
      return;
    }
    apiFetch(`/organizations/${orgId}/users`)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [orgId, canManageOrg]);

  const usersReady = orgId !== null;
  const roleOptions = roles;

  if (loading) {
    return <div className="p-8">Loading users...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  if (!canManageOrg) {
    return (
      <AppShell permissions={permissions} isSuperadmin={isSuperadmin}>
        <div className="text-sm text-gray-600">Access not available.</div>
      </AppShell>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (!orgId) {
        throw new Error("Org not resolved");
      }
      await apiFetch(`/organizations/${orgId}/users`, {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role_id: Number(roleId),
        }),
      });
      setEmail("");
      setPassword("");
      setRoleId("");
      setSuccess("User created successfully.");
      const updatedUsers = await apiFetch(`/organizations/${orgId}/users`);
      setUsers(updatedUsers);
    } catch {
      setError("Unable to create user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const updateUserRole = async (userId: number, newRoleId: number) => {
    if (!orgId) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/organizations/${orgId}/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role_id: newRoleId }),
      });
      setUsers((prev) =>
        prev.map((row) =>
          row.id === userId ? { ...row, role_id: newRoleId } : row,
        ),
      );
      setSuccess("Access level updated.");
    } catch {
      setError("Unable to update access level.");
    }
  };

  const togglePermission = async (
    userId: number,
    permissionKey: string,
    enabled: boolean,
  ) => {
    if (!orgId) {
      return;
    }
    setError("");
    setSuccess("");
    const row = users.find((item) => item.id === userId);
    if (!row) {
      return;
    }
    const updatedPermissions = enabled
      ? [...row.permissions, permissionKey]
      : row.permissions.filter((perm) => perm !== permissionKey);
    try {
      await apiFetch(`/organizations/${orgId}/users/${userId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: updatedPermissions }),
      });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === userId ? { ...item, permissions: updatedPermissions } : item,
        ),
      );
      setSuccess("Permissions updated.");
    } catch {
      setError("Unable to update permissions.");
    }
  };

  return (
    <AppShell permissions={permissions} isSuperadmin={isSuperadmin}>
      <h2 className="text-2xl font-semibold mb-6">Users</h2>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-80">
            <h3 className="text-lg font-semibold mb-4">Create User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full border px-4 py-2 rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Temporary Password"
                className="w-full border px-4 py-2 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <select
                className="w-full border px-4 py-2 rounded bg-white"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                disabled={!usersReady}
              >
                <option value="">Select Access Level</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={submitting || !usersReady}
                className="w-full bg-[#EC7B21] text-white py-2 rounded disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Current Users</h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

            {!usersReady ? (
              <div className="text-sm text-gray-600">
                Organization context not available yet.
              </div>
            ) : users.length === 0 ? (
              <div className="text-sm text-gray-600">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2 font-semibold">User</th>
                      <th className="px-3 py-2 font-semibold">Access Level</th>
                      <th className="px-3 py-2 font-semibold">Create</th>
                      <th className="px-3 py-2 font-semibold">Read</th>
                      <th className="px-3 py-2 font-semibold">Edit</th>
                      <th className="px-3 py-2 font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-gray-800">{row.email}</td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full border px-2 py-1 rounded bg-white text-sm"
                            value={row.role_id ?? ""}
                            onChange={(e) =>
                              updateUserRole(row.id, Number(e.target.value))
                            }
                          >
                            <option value="">Select</option>
                            {roleOptions.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        {PERMISSION_TOGGLES.map((toggle) => {
                          const enabled = row.permissions.includes(toggle.key);
                          return (
                            <td key={toggle.key} className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  togglePermission(
                                    row.id,
                                    toggle.key,
                                    !enabled,
                                  )
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                  enabled ? "bg-[#EC7B21]" : "bg-gray-200"
                                }`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                                    enabled ? "translate-x-5" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
