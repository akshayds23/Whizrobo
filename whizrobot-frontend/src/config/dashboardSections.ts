import { PERMISSIONS } from "./permissions";

export const DASHBOARD_SECTIONS = [
  {
    id: "organizations",
    title: "Organizations",
    permission: PERMISSIONS.CREATE_ORG,
    cards: [
      {
        title: "Create Organization",
        description: "Add and configure a new organization",
        href: "/organizations/new",
      },
      {
        title: "Organization Setup",
        description: "Review and update onboarding details",
        href: "/organizations/new",
      },
    ],
  },
  {
    id: "courses",
    title: "Courses",
    permission: PERMISSIONS.ASSIGN_COURSE,
    cards: [
      {
        title: "Course Library",
        description: "Browse and organize course content",
        href: "/courses",
      },
    ],
  },
  {
    id: "roles",
    title: "Roles & Permissions",
    permission: PERMISSIONS.CREATE_ORG,
    cards: [
      {
        title: "Manage Users",
        description: "Create users and assign access levels",
        href: "/users",
      },
      {
        title: "Roles & Permissions",
        description: "Set what each access level can do",
        href: "/roles",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    permission: PERMISSIONS.VIEW_ANALYTICS,
    cards: [
      {
        title: "Performance Overview",
        description: "Track usage and engagement",
        href: "/analytics",
      },
    ],
  },
  {
    id: "robots",
    title: "Robots",
    permission: PERMISSIONS.MANAGE_ROBOTS,
    cards: [
      {
        title: "Robot Fleet",
        description: "Monitor and control robots",
        href: "/robots",
      },
      {
        title: "License Health",
        description: "Check expiring and locked robots",
        href: "/robots",
      },
    ],
  },
  {
    id: "activity",
    title: "Activity",
    permission: PERMISSIONS.VIEW_AUDIT_LOGS,
    cards: [
      {
        title: "Audit Logs",
        description: "View system activity",
        href: "/activity",
      },
      {
        title: "Recent Changes",
        description: "Track updates across the platform",
        href: "/activity",
      },
    ],
  },
];
