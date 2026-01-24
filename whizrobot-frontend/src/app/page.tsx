"use client";

import AppShell from "@/components/layout/AppShell";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { useAuth } from "@/hooks/useAuth";
import { DASHBOARD_SECTIONS } from "@/config/dashboardSections";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const hasAccess = (permission?: string) =>
    user.is_superadmin || user.permissions.includes(permission);

  const visibleSections = DASHBOARD_SECTIONS.filter((section) =>
    hasAccess(section.permission),
  );

  return (
    <AppShell permissions={user.permissions || []}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>

        {visibleSections.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            No dashboard sections are available for your access level yet.
          </div>
        ) : (
          visibleSections.map((section) => (
            <div key={section.id} className="mb-10">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 tracking-tight">
                {section.title}
              </h3>

              <DashboardGrid cards={section.cards} />
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
