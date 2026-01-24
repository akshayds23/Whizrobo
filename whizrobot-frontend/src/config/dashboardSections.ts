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
    id: "users",
    title: "Users",
    permission: PERMISSIONS.CREATE_ORG,
    cards: [
      {
        title: "Manage Users",
        description: "Create users and assign access levels",
        href: "/users",
      },
      {
        title: "Access Levels",
        description: "Review access levels and role coverage",
        href: "/users",
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
