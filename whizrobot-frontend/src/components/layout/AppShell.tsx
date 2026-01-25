"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
  permissions?: string[];
  isSuperadmin?: boolean;
};

export default function AppShell({
  children,
  permissions = [],
  isSuperadmin = false,
}: AppShellProps) {
  const router = useRouter();
  const canManageOrg =
    permissions.includes("CREATE_ORG") || permissions.includes("VIEW_ORG");
  const canViewAudit = permissions.includes("VIEW_AUDIT_LOGS");
  const canManageRobots = permissions.includes("MANAGE_ROBOTS");

  const navItems = isSuperadmin
    ? [
        {
          title: "Dashboard",
          titleHref: "/",
          items: [],
        },
        {
          title: "Courses",
          titleHref: "/courses",
          items: [],
        },
        {
          title: "Roles & Permissions",
          titleHref: "/roles",
          items: [
            {
              label: "Users",
              href: "/users",
            },
          ],
        },
        {
          title: "Analytics",
          titleHref: "/analytics",
          items: [],
        },
        {
          title: "Organizations",
          titleHref: "/organizations",
          items: [
            { label: "Activity", href: "/activity" },
            { label: "Robots", href: "/robots" },
          ].filter((item) => {
            if (item.href === "/robots") {
              return canManageRobots;
            }
            if (item.href === "/activity") {
              return canViewAudit;
            }
            return true;
          }),
        },
      ]
    : [
        {
          title: "Dashboard",
          titleHref: "/",
          items: [{ label: "Dashboard", href: "/" }],
        },
        {
          title: "Manage",
          items: [
            { label: "Users", href: "/users", show: canManageOrg },
            { label: "Activity", href: "/activity", show: canViewAudit },
            { label: "Robots", href: "/robots", show: canManageRobots },
          ].filter((item) => item.show),
        },
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

        <nav className="mt-8 flex flex-col gap-4 text-sm">
          {navItems.map((section) => (
            <div key={section.title}>
              {section.titleHref ? (
                <Link
                  className="text-xs uppercase tracking-wide text-gray-400 hover:text-gray-600"
                  href={section.titleHref}
                >
                  {section.title}
                </Link>
              ) : (
                <div className="text-xs uppercase tracking-wide text-gray-400">
                  {section.title}
                </div>
              )}
              {section.items.length > 0 && (
                <div className="mt-2 ml-2 flex flex-col gap-1 border-l border-gray-100 pl-3">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
