"use client";

import { useEffect, useMemo, useState } from "react";
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

const FEATURES = [
  {
    key: "organizations",
    label: "Organizations",
    permissions: {
      read: ["VIEW_ORG"],
      manage: ["CREATE_ORG", "VIEW_ORG"],
    },
  },
  {
    key: "users",
    label: "Users",
    permissions: {
      manage: ["CREATE_ORG"],
    },
  },
  {
    key: "courses",
    label: "Courses",
    permissions: {
      read: ["VIEW_ASSIGNED_COURSE"],
      manage: ["ASSIGN_COURSE", "VIEW_ASSIGNED_COURSE"],
    },
  },
  {
    key: "content",
    label: "Content Upload",
    permissions: {
      manage: ["UPLOAD_ORG_CONTENT", "UPLOAD_PLATFORM_CONTENT"],
    },
  },
  {
    key: "robots",
    label: "Robots",
    permissions: {
      manage: ["MANAGE_ROBOTS"],
    },
  },
  {
    key: "licenses",
    label: "Licenses",
    permissions: {
      read: ["VIEW_LICENSE_STATUS"],
      manage: ["ISSUE_LICENSE", "REVOKE_LICENSE", "VIEW_LICENSE_STATUS"],
    },
  },
  {
    key: "analytics",
    label: "Analytics",
    permissions: {
      read: ["VIEW_ANALYTICS"],
    },
  },
  {
    key: "activity",
    label: "Audit Logs",
    permissions: {
      read: ["VIEW_AUDIT_LOGS"],
    },
  },
];

const ACCESS_LEVELS = [
  { value: "none", label: "No Access" },
  { value: "read", label: "Read Only" },
  { value: "manage", label: "Create / Edit / Delete" },
];

export default function RolesPage() {
  const { user, loading } = useAuth();
  const permissions = user?.permissions ?? [];
  const isSuperadmin = Boolean(user?.is_superadmin);

  const [orgId, setOrgId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }
    setLoadingRoles(true);
    apiFetch("/organizations")
      .then((orgs: Organization[]) => {
        const internal =
          orgs.find((org) => org.name === "Whizrobo Internal") ?? orgs[0];
        setOrgId(internal?.id ?? null);
      })
      .catch(() => setOrgId(null))
      .finally(() => setLoadingRoles(false));
  }, [isSuperadmin]);

  useEffect(() => {
    if (!orgId) {
      return;
    }
    apiFetch(`/organizations/${orgId}/roles`)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !selectedRoleId) {
      return;
    }
    apiFetch(`/organizations/${orgId}/roles/${selectedRoleId}/permissions`)
      .then((res) => setSelectedPermissions(res.permissions || []))
      .catch(() => setSelectedPermissions([]));
  }, [orgId, selectedRoleId]);

  const accessByFeature = useMemo(() => {
    const selection = new Map<string, string>();

    FEATURES.forEach((feature) => {
      const readPerms = feature.permissions.read ?? [];
      const managePerms = feature.permissions.manage ?? [];
      const hasManage = managePerms.every((perm) =>
        selectedPermissions.includes(perm),
      );
      const hasRead = readPerms.every((perm) =>
        selectedPermissions.includes(perm),
      );

      if (hasManage) {
        selection.set(feature.key, "manage");
      } else if (hasRead) {
        selection.set(feature.key, "read");
      } else {
        selection.set(feature.key, "none");
      }
    });

    return selection;
  }, [selectedPermissions]);

  const handleAccessChange = (featureKey: string, level: string) => {
    const feature = FEATURES.find((item) => item.key === featureKey);
    if (!feature) {
      return;
    }
    const readPerms = feature.permissions.read ?? [];
    const managePerms = feature.permissions.manage ?? [];
    const updated = new Set(selectedPermissions);
    [...readPerms, ...managePerms].forEach((perm) => updated.delete(perm));

    if (level === "read") {
      readPerms.forEach((perm) => updated.add(perm));
    }
    if (level === "manage") {
      managePerms.forEach((perm) => updated.add(perm));
    }

    setSelectedPermissions(Array.from(updated));
  };

  const handleSave = async () => {
    if (!orgId || !selectedRoleId) {
      return;
    }
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiFetch(`/organizations/${orgId}/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      setSuccess("Access levels saved.");
    } catch {
      setError("Unable to update access levels. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading access levels...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  if (!isSuperadmin) {
    return (
      <AppShell permissions={permissions} isSuperadmin={isSuperadmin}>
        <div className="text-sm text-gray-600">Access not available.</div>
      </AppShell>
    );
  }

  return (
    <AppShell permissions={permissions} isSuperadmin={isSuperadmin}>
      <div className="max-w-5xl">
        <h2 className="text-2xl font-semibold mb-6">Roles and Permission</h2>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-600 mb-4">
            Select an access level and set what it can do.
          </div>

          {loadingRoles ? (
            <div className="text-sm text-gray-600">Loading roles...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Access Level
                </label>
                <select
                  className="mt-2 w-full border px-4 py-2 rounded bg-white"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  <option value="">Select an access level</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoleId && (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-4 py-3 font-semibold">Section</th>
                        <th className="px-4 py-3 font-semibold">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURES.map((feature) => (
                        <tr key={feature.key} className="border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-800">
                            {feature.label}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full border px-4 py-2 rounded bg-white text-sm"
                              value={accessByFeature.get(feature.key) ?? "none"}
                              onChange={(e) =>
                                handleAccessChange(feature.key, e.target.value)
                              }
                            >
                              {ACCESS_LEVELS.map((level) => (
                                <option key={level.value} value={level.value}>
                                  {level.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {error && <div className="text-sm text-red-600">{error}</div>}
              {success && (
                <div className="text-sm text-green-600">{success}</div>
              )}

              <button
                type="button"
                className="mt-2 rounded bg-[#EC7B21] px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={handleSave}
                disabled={saving || !selectedRoleId}
              >
                {saving ? "Saving..." : "Save Access Levels"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
