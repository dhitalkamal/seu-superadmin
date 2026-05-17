/** Superadmin API calls hitting the management, IAM, and health services. */

import client from "./client";

export type OrgStatus = "pending_review" | "active" | "suspended";
export type UserStatus = "active" | "inactive" | "suspended";

export interface Org {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  status: OrgStatus;
  is_verified: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  date_joined: string;
}

export interface ServiceHealth {
  service: string;
  status: "healthy" | "unhealthy";
  checks: { database: string; redis: string; rabbitmq: string };
}

const MGMT = "/management/api/v1";
const IAM = "/iam/api/v1";

const superadminApi = {
  /** Fetch all organisations. */
  listOrgs: () =>
    client.get<{ data: Org[] }>(`${MGMT}/organisations/`).then((r) => r.data.data),

  /** Approve a pending_review organisation. */
  approveOrg: (id: string) =>
    client.post<{ data: Org }>(`${MGMT}/organisations/${id}/approve/`).then((r) => r.data.data),

  /** Reject a pending_review organisation. */
  rejectOrg: (id: string) =>
    client.post<{ data: Org }>(`${MGMT}/organisations/${id}/reject/`).then((r) => r.data.data),

  /** Suspend an active organisation. */
  suspendOrg: (id: string) =>
    client.post<{ data: Org }>(`${MGMT}/organisations/${id}/suspend/`).then((r) => r.data.data),

  /** Reinstate a suspended organisation. */
  reinstateOrg: (id: string) =>
    client
      .post<{ data: Org }>(`${MGMT}/organisations/${id}/reinstate/`)
      .then((r) => r.data.data),

  /** Fetch all users (IAM admin endpoint). */
  listUsers: () =>
    client.get<{ data: User[] }>(`${IAM}/admin/users/`).then((r) => r.data.data),

  /** Fetch health from each service. */
  fetchHealth: (service: string) =>
    client.get<ServiceHealth>(`/${service}/api/v1/health/`).then((r) => r.data),
};

export default superadminApi;
