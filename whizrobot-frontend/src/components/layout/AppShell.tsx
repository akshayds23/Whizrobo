"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
  permissions?: string[];
};

export default function AppShell({ children, permissions = [] }: AppShellProps) {
  const router = useRouter();
  const canManageOrg =
    permissions.includes("CREATE_ORG") || permissions.includes("VIEW_ORG");
  const canViewAudit = permissions.includes("VIEW_AUDIT_LOGS");
  const canManageRobots = permissions.includes("MANAGE_ROBOTS");

  const navItems = [
    { label: "Dashboard", href: "/", show: true },
    { label: "Users", href: "/users", show: canManageOrg },
    { label: "Activity", href: "/activity", show: canViewAudit },
    { label: "Robots", href: "/robots", show: canManageRobots },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 p-6 flex flex-col">
        <h1 className="text-xl font-semibold text-[#EC7B21]">Whizrobo</h1>

        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <Link
                key={item.href}
                className="text-gray-700 hover:text-gray-900"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto text-left text-sm text-gray-600 hover:text-gray-900"
        >
          Log out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
