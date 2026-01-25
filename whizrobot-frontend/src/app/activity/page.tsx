"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/api";

type AuditLogItem = {
  action: string;
  actor_email: string | null;
  org_name: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};

const ACTION_LABELS: Record<string, string> = {
  ORG_CREATE: "Created Organization",
  COURSE_ASSIGN: "Assigned Course",
  COURSE_ACCESS_UPDATE: "Updated Course Access",
  LICENSE_ISSUE: "Issued License",
  LICENSE_REVOKE: "Revoked License",
  PERMISSION_CHANGE: "Updated User Permissions",
  CONTENT_UPLOAD: "Uploaded Content",
  COURSE_CREATE: "Created Course",
  LEVEL_CREATE: "Created Level",
  LESSON_CREATE: "Created Lesson",
  LESSON_UPDATE: "Updated Lesson",
};

export default function ActivityPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);

  const permissions = user?.permissions ?? [];
  const canViewAudit = permissions.includes("VIEW_AUDIT_LOGS");

  useEffect(() => {
    if (!canViewAudit) {
      return;
    }
    setLoadingLogs(true);
    apiFetch("/audit-logs")
      .then((res) => setItems(res.items || []))
      .catch(() => setError("Unable to load activity logs."))
      .finally(() => setLoadingLogs(false));
  }, [canViewAudit]);

  const rows = useMemo(() => items, [items]);

  if (loading) {
    return <div className="p-8">Loading activity...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  if (!canViewAudit) {
    return (
      <AppShell
        permissions={permissions}
        isSuperadmin={Boolean(user?.is_superadmin)}
      >
        <div className="text-sm text-gray-600">Access not available.</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      permissions={permissions}
      isSuperadmin={Boolean(user?.is_superadmin)}
    >
      <h2 className="text-2xl font-semibold mb-6">Activity</h2>

      <div className="rounded-lg border border-gray-200 bg-white">
        {loadingLogs ? (
          <div className="p-6 text-sm text-gray-600">Loading logs...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No activity yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Performed By</th>
                <th className="px-4 py-3 font-semibold">Organization</th>
                <th className="px-4 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const label = ACTION_LABELS[item.action] ?? item.action;
                const time = new Date(item.created_at).toLocaleString();
                return (
                  <tr key={`${item.action}-${index}`} className="border-b border-gray-100">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{label}</div>
                      {item.meta && (
                        <div className="mt-1 text-xs text-gray-500">
                          {Object.entries(item.meta)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" • ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.actor_email ?? "System"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.org_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
