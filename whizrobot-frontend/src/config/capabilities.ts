import { PERMISSIONS } from "./permissions";

export const CAPABILITIES = {
  MANAGE_ORG: {
    label: "Manage Organization",
    permissions: [PERMISSIONS.CREATE_ORG, PERMISSIONS.VIEW_ORG],
  },
  UPLOAD_CONTENT: {
    label: "Upload Content",
    permissions: [PERMISSIONS.UPLOAD_ORG_CONTENT],
  },
  ASSIGN_COURSES: {
    label: "Assign Courses",
    permissions: [PERMISSIONS.ASSIGN_COURSE],
  },
  MANAGE_ROBOTS: {
    label: "Manage Robots",
    permissions: [PERMISSIONS.ISSUE_LICENSE, PERMISSIONS.MANAGE_ROBOTS],
  },
  VIEW_ANALYTICS: {
    label: "View Analytics",
    permissions: [PERMISSIONS.VIEW_ANALYTICS],
  },
};
