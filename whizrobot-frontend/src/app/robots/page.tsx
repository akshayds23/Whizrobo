"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/api";

type RobotItem = {
  robot_id: number;
  robot_code: string;
  license_status: string;
  days_remaining: number | null;
  last_sync_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
  REVOKED: "Locked",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-green-600",
  EXPIRING_SOON: "text-orange-600",
  EXPIRED: "text-red-600",
  REVOKED: "text-red-600",
};

export default function RobotsPage() {
  const { user, loading } = useAuth();
  const [robots, setRobots] = useState<RobotItem[]>([]);
  const [loadingRobots, setLoadingRobots] = useState(false);
  const [error, setError] = useState("");

  const permissions = user?.permissions ?? [];
  const canManageRobots = permissions.includes("MANAGE_ROBOTS");

  useEffect(() => {
    if (!canManageRobots) {
      return;
    }
    setLoadingRobots(true);
    apiFetch("/robots")
      .then((res) => setRobots(res.items || []))
      .catch(() => setError("Unable to load robots."))
      .finally(() => setLoadingRobots(false));
  }, [canManageRobots]);

  if (loading) {
    return <div className="p-8">Loading robots...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  if (!canManageRobots) {
    return (
      <AppShell
        permissions={permissions}
        isSuperadmin={Boolean(user?.is_superadmin)}
      >
        <div className="text-sm text-gray-600">Access not available.</div>
      </AppShell>
    );
  }

  async function handleRefresh(robotId: number) {
    try {
      await apiFetch(`/robots/${robotId}/refresh`, { method: "POST" });
    } catch {
      setError("Unable to refresh robot. Please try again.");
    }
  }

  async function handleLock(robotId: number) {
    const ok = window.confirm("Lock this robot immediately?");
    if (!ok) {
      return;
    }
    try {
      await apiFetch(`/robots/${robotId}/lock`, { method: "POST" });
      setRobots((prev) =>
        prev.map((robot) =>
          robot.robot_id === robotId
            ? { ...robot, license_status: "REVOKED", days_remaining: 0 }
            : robot,
        ),
      );
    } catch {
      setError("Unable to lock robot. Please try again.");
    }
  }

  return (
    <AppShell
      permissions={permissions}
      isSuperadmin={Boolean(user?.is_superadmin)}
    >
      <h2 className="text-2xl font-semibold mb-6">Robots</h2>

      <div className="rounded-lg border border-gray-200 bg-white">
        {loadingRobots ? (
          <div className="p-6 text-sm text-gray-600">Loading robots...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : robots.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No robots found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold">Robot Code</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Days Remaining</th>
                <th className="px-4 py-3 font-semibold">Last Sync</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {robots.map((robot) => {
                const statusLabel =
                  STATUS_LABELS[robot.license_status] ?? robot.license_status;
                const statusColor =
                  STATUS_COLOR[robot.license_status] ?? "text-gray-600";
                const lastSync = robot.last_sync_at
                  ? new Date(robot.last_sync_at).toLocaleString()
                  : "—";
                return (
                  <tr key={robot.robot_id} className="border-b border-gray-100">
                    <td className="px-4 py-3">{robot.robot_code}</td>
                    <td className={`px-4 py-3 font-semibold ${statusColor}`}>
                      {statusLabel}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {robot.days_remaining ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{lastSync}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleRefresh(robot.robot_id)}
                          className="text-sm text-[#EC7B21]"
                        >
                          Refresh
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLock(robot.robot_id)}
                          className="text-sm text-red-600"
                        >
                          Lock
                        </button>
                      </div>
                    </td>
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
