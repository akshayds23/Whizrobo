"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/api";

type Role = {
  id: number;
  name: string;
};

export default function UsersPage() {
  const { user, loading } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const permissions = user?.permissions ?? [];
  const canManageOrg =
    permissions.includes("CREATE_ORG") || permissions.includes("VIEW_ORG");

  useEffect(() => {
    if (!user?.org_id || !canManageOrg) {
      return;
    }
    apiFetch(`/organizations/${user.org_id}/roles`)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [user?.org_id, canManageOrg]);

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
      <AppShell permissions={permissions}>
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
      await apiFetch(`/organizations/${user.org_id}/users`, {
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
    } catch {
      setError("Unable to create user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell permissions={permissions}>
      <h2 className="text-2xl font-semibold mb-6">Users</h2>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6">
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
          >
            <option value="">Select Access Level</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#EC7B21] text-white py-2 rounded disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
