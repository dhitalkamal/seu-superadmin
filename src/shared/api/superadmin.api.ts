/** Superadmin API - wraps every backend service the platform console needs. */

import client from "./client";

// service prefixes matching nginx routing
const IAM = "/iam/api/v1";
const MGMT = "/org/api/v1";
const EVENT = "/event/api/v1";
const PAYMENT = "/payment/api/v1";
const NOTIFICATION = "/notification/api/v1";
const INTELLIGENCE = "/intelligence/api/v1";

type ApiOk<T> = { data: T; error: null | object; meta: object };
type PagedOk<T> = { data: { results: T[]; count: number } };

// ===== IAM types =====

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_email_verified: boolean;
  is_mfa_enabled?: boolean;
  date_joined: string;
  last_login?: string | null;
};

// ===== Management types =====

export type OrgStatus = "pending_review" | "approved" | "active" | "suspended";

export type OrgType = "company" | "ngo" | "community" | "educational" | "government" | "individual";

export type Org = {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  description?: string;
  website?: string;
  logo_url?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  org_type?: OrgType;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  status: OrgStatus;
  is_verified: boolean;
  created_by: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  plan: string;
  plan_expires_at: string | null;
};

export type OrgDocument = {
  id: string;
  organization_id: string;
  doc_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
};

export type OrgMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "member";
  is_active: boolean;
  joined_at: string;
};

// ===== Event types =====

export type PlatformEvent = {
  id: string;
  title: string;
  status: string;
  event_type: string;
  start_date: string;
  end_date: string;
  capacity: number;
  registered_count: number;
  organiser_id: string;
  organization_id?: string;
  is_free: boolean;
  ticket_price?: string;
  created_at: string;
};

// ===== Payment types =====

export type PaymentOrder = {
  id: string;
  user_id: string;
  event_id: string;
  registration_id: string;
  total_amount: string;
  currency: string;
  status: string;
  gateway: string;
  created_at: string;
  completed_at?: string | null;
};

// ===== Subscription types =====

export type Subscription = {
  id: string;
  org_id: string;
  plan: string;
  status: "active" | "cancelled" | "past_due" | "expired";
  gateway: string;
  amount: string;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  created_at: string;
};

export type SubscriptionPayment = {
  id: string;
  subscription_id: string;
  amount: string;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string;
};

// ===== Support ticket types =====

export type TicketPriority = "low" | "med" | "high" | "critical";
export type TicketStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  org_id: string | null;
  org_name: string;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
};

// ===== Analytics types =====

export type PlatformAnalytics = {
  orgs: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    verified: number;
    new_30d: number;
    prev_30d: number;
    plan_breakdown: Record<string, number>;
    monthly_series: number[];
  };
  tickets: {
    open: number;
    escalated: number;
  };
};

export type EventAnalytics = {
  new_events_30d: number;
  prev_events_30d: number;
  total_events: number;
  monthly_series: number[];
  top_events: {
    id: string;
    title: string;
    organization_id: string | null;
    registered_count: number;
    status: string;
    event_type: string;
  }[];
};

export type UserAnalytics = {
  new_users_30d: number;
  prev_users_30d: number;
  total_users: number;
  monthly_series: number[];
};

// ===== Audit log types =====

export type AuditEntry = {
  id: string;
  user_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// ===== Dispute types =====

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";
export type DisputeReason =
  | "duplicate"
  | "fraudulent"
  | "not_received"
  | "subscription_cancelled"
  | "other";

export type Dispute = {
  id: string;
  order_id: string;
  user_id: string;
  status: DisputeStatus;
  reason: DisputeReason;
  description: string;
  evidence: Record<string, unknown>;
  gateway_dispute_id: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

// ===== Feature flag types =====

export type FeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
  rollout_percentage: number;
};

// ===== Health types =====

export type ServiceHealth = {
  service: string;
  status: "healthy" | "unhealthy";
  checks?: { database?: string; redis?: string; rabbitmq?: string };
  version?: string;
};

// ===== Health ping history types =====

export type HealthPing = {
  id: string;
  service_name: string;
  service_type: "application" | "infrastructure";
  status: "healthy" | "unhealthy" | "unreachable";
  latency_ms: number;
  details: Record<string, unknown>;
  checked_at: string;
};

// ===== Moderation types =====

export type ModerationStatus =
  | "pending"
  | "under_review"
  | "dismissed"
  | "warned"
  | "taken_down";

export type ModerationCase = {
  id: string;
  content_type: string;
  content_id: string;
  content_title: string;
  reason: string;
  status: ModerationStatus;
  reviewer_notes?: string;
  organisation_id?: string;
  created_at: string;
  updated_at: string;
};

export type ModerationStats = {
  pending_count: number;
  decided_count: number;
  approval_rate: number;
  avg_resolution_hours: number;
};

// ===== Notification types =====

export type PlatformNotification = {
  id: string;
  user_id: string;
  notification_type: string;
  channel: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

// ===== Plan catalogue =====

export type PlanName = "Free" | "Starter" | "Pro" | "NGO" | "Enterprise";

export const PLAN_CATALOGUE = [
  {
    name: "Free" as PlanName,
    price: 0,
    currency: "NPR",
    platformFeeRate: 0.05,
    features: ["Up to 100 regs/event", "5% fee", "Basic analytics"],
  },
  {
    name: "Starter" as PlanName,
    price: 999,
    currency: "NPR",
    platformFeeRate: 0.03,
    features: ["Up to 1,000 regs/event", "3% fee", "Advanced analytics"],
  },
  {
    name: "Pro" as PlanName,
    price: 4999,
    currency: "NPR",
    platformFeeRate: 0.01,
    features: ["Unlimited regs", "1% fee", "Full analytics", "Custom domain"],
  },
  {
    name: "NGO" as PlanName,
    price: 0,
    currency: "NPR",
    platformFeeRate: 0,
    features: ["Unlimited regs", "0% fee", "Priority support", "NGO badge"],
  },
  {
    name: "Enterprise" as PlanName,
    price: 14999,
    currency: "NPR",
    platformFeeRate: 0,
    features: ["Unlimited everything", "0% fee", "White-label", "SLA"],
  },
];

// ===== API =====

const superadminApi = {
  // IAM: feature flags
  listFeatureFlags: async (): Promise<FeatureFlag[]> => {
    const r = await client.get(`${IAM}/admin/feature-flags/`);
    return r.data?.data ?? r.data ?? [];
  },

  createFeatureFlag: async (payload: {
    key: string;
    label: string;
    enabled: boolean;
    rollout_percentage?: number;
  }) => {
    const r = await client.post(`${IAM}/admin/feature-flags/`, payload);
    return r.data;
  },

  updateFeatureFlag: async (
    key: string,
    payload: { enabled?: boolean; rollout_percentage?: number }
  ) => {
    const r = await client.patch(`${IAM}/admin/feature-flags/${key}/`, payload);
    return r.data;
  },

  deleteFeatureFlag: async (key: string) => {
    const r = await client.delete(`${IAM}/admin/feature-flags/${key}/`);
    return r.data;
  },

  // IAM: users
  listUsers: () => client.get<ApiOk<User[]>>(`${IAM}/admin/users/`).then((r) => r.data.data ?? []),

  suspendUser: (id: string) =>
    client.post<ApiOk<User>>(`${IAM}/admin/users/${id}/suspend/`).then((r) => r.data.data),

  activateUser: (id: string) =>
    client.post<ApiOk<User>>(`${IAM}/admin/users/${id}/activate/`).then((r) => r.data.data),

  // Management: orgs
  listOrgs: () =>
    client.get(`${MGMT}/organizations/`).then((r) => {
      const body = r.data;
      if (body?.data?.results) return body.data.results as Org[];
      if (Array.isArray(body?.data)) return body.data as Org[];
      return [] as Org[];
    }),

  getOrg: (id: string) =>
    client.get<ApiOk<Org>>(`${MGMT}/organizations/${id}/`).then((r) => r.data.data),

  listOrgDocuments: (orgId: string) =>
    client
      .get<ApiOk<OrgDocument[]>>(`${MGMT}/organizations/${orgId}/documents/`)
      .then((r) => r.data.data ?? []),

  approveOrg: (id: string, reason?: string) =>
    client
      .post<ApiOk<Org>>(`${MGMT}/organizations/${id}/approve/`, reason ? { reason } : {})
      .then((r) => r.data.data),

  rejectOrg: (id: string, reason?: string) =>
    client
      .post<ApiOk<Org>>(`${MGMT}/organizations/${id}/reject/`, reason ? { reason } : {})
      .then((r) => r.data.data),

  suspendOrg: (id: string) =>
    client.post<ApiOk<Org>>(`${MGMT}/organizations/${id}/suspend/`).then((r) => r.data.data),

  reinstateOrg: (id: string) =>
    client.post<ApiOk<Org>>(`${MGMT}/organizations/${id}/reinstate/`).then((r) => r.data.data),

  deleteOrg: (id: string) =>
    client.post<ApiOk<Org>>(`${MGMT}/organizations/${id}/delete/`).then((r) => r.data.data),

  listOrgMembers: (orgId: string) =>
    client
      .get<ApiOk<OrgMember[]>>(`${MGMT}/organizations/${orgId}/members/`)
      .then((r) => r.data.data),

  // Events
  listEvents: (params?: { status?: string }) =>
    client.get<PagedOk<PlatformEvent>>(`${EVENT}/events/`, { params }).then((r) => r.data.data),

  // Health: service name maps to its nginx prefix (management uses "org").
  // 503 responses still carry a body with status + failing checks - read it
  // instead of treating it as "unreachable".
  fetchHealth: (service: string) => {
    const prefix = service === "management" ? "org" : service;
    return client
      .get<ApiOk<ServiceHealth>>(`/${prefix}/api/v1/health/`)
      .then((r) => r.data.data)
      .catch((err: { response?: { data?: ApiOk<ServiceHealth> } }) => {
        if (err?.response?.data?.data?.status) return err.response.data.data;
        throw err;
      });
  },

  // infra health: rabbitmq management api
  fetchRabbitMqHealth: () =>
    client
      .get<{ status: string }>("/infra/rabbitmq/api/health/checks/alarms")
      .then((r) => ({ status: r.data.status === "ok" ? "healthy" : "unhealthy" as const }))
      .catch(() => ({ status: "unreachable" as const })),

  // infra health: elasticsearch cluster health
  fetchElasticsearchHealth: () =>
    client
      .get<{ status: string; cluster_name: string; number_of_nodes: number; active_shards: number }>("/infra/elasticsearch/_cluster/health")
      .then((r) => ({
        status: (r.data.status === "green" || r.data.status === "yellow") ? "healthy" : "unhealthy" as const,
        cluster: r.data.status,
        nodes: r.data.number_of_nodes,
        shards: r.data.active_shards,
      }))
      .catch(() => ({ status: "unreachable" as const, cluster: null, nodes: 0, shards: 0 })),

  // infra health: minio liveness
  fetchMinioHealth: () =>
    client
      .get("/infra/minio/minio/health/live", { validateStatus: () => true })
      .then((r) => ({ status: r.status === 200 ? "healthy" : "unhealthy" as const }))
      .catch(() => ({ status: "unreachable" as const })),

  // health ping history: 30-day stored data from intelligence service
  fetchHealthHistory: (days = 30) =>
    client
      .get<ApiOk<HealthPing[]>>(`${INTELLIGENCE}/health-history/?days=${days}`)
      .then((r) => r.data.data ?? []),

  fetchLatestHealthRound: () =>
    client
      .get<ApiOk<HealthPing[]>>(`${INTELLIGENCE}/health-history/latest/`)
      .then((r) => r.data.data ?? []),

  // Notifications: broadcast to all users via batch endpoint
  sendAnnouncement: (payload: {
    user_ids: string[];
    notification_type: string;
    channel: string;
    title: string;
    message: string;
  }) => client.post(`${NOTIFICATION}/notifications/batch/`, payload).then((r) => r.data),

  // Notifications: send to a single user
  sendNotification: (payload: {
    user_id: string;
    notification_type: string;
    channel: string;
    title: string;
    message: string;
  }) => client.post(`${NOTIFICATION}/notifications/`, payload).then((r) => r.data),

  // Payments: orders - uses admin endpoint for full cross-org visibility
  listOrders: () =>
    client.get<PagedOk<PaymentOrder>>(`${PAYMENT}/admin/orders/`).then((r) => r.data.data),

  // Disputes
  listAllDisputes: () =>
    client.get<ApiOk<Dispute[]>>(`${PAYMENT}/disputes/`).then((r) => r.data.data ?? []),

  updateDisputeStatus: (id: string, status: DisputeStatus, resolutionNotes?: string) =>
    client
      .patch<
        ApiOk<Dispute>
      >(`${PAYMENT}/disputes/${id}/`, { status, resolution_notes: resolutionNotes ?? "" })
      .then((r) => r.data.data),

  // Audit log
  listAuditLog: () =>
    client.get<ApiOk<AuditEntry[]>>(`${IAM}/admin/audit-log/`).then((r) => r.data.data ?? []),

  // Support tickets
  listTickets: () =>
    client.get<ApiOk<SupportTicket[]>>(`${MGMT}/tickets/`).then((r) => r.data.data ?? []),

  createTicket: (payload: {
    subject: string;
    message: string;
    priority: TicketPriority;
    org_id?: string;
    org_name?: string;
  }) => client.post<ApiOk<SupportTicket>>(`${MGMT}/tickets/`, payload).then((r) => r.data.data),

  updateTicketStatus: (id: string, status: TicketStatus, priority?: TicketPriority) =>
    client
      .patch<ApiOk<SupportTicket>>(`${MGMT}/tickets/${id}/status/`, { status, priority })
      .then((r) => r.data.data),

  // Analytics aggregation
  getAnalytics: () =>
    client.get<ApiOk<PlatformAnalytics>>(`${MGMT}/admin/analytics/`).then((r) => r.data.data),

  getEventAnalytics: () =>
    client.get<ApiOk<EventAnalytics>>(`${EVENT}/admin/analytics/`).then((r) => r.data.data),

  getUserAnalytics: () =>
    client.get<ApiOk<UserAnalytics>>(`${IAM}/admin/analytics/`).then((r) => r.data.data),

  // Subscriptions - org_id passed as query param for filtering
  listSubscriptions: async (orgId?: string): Promise<Subscription[]> => {
    const params = orgId ? { org_id: orgId } : {};
    const r = await client.get(`${PAYMENT}/subscriptions/`, { params });
    return r.data?.data ?? r.data ?? [];
  },

  getSubscriptionPayments: (subscriptionId: string) =>
    client
      .get<ApiOk<SubscriptionPayment[]>>(`${PAYMENT}/subscriptions/${subscriptionId}/payments/`)
      .then((r) => r.data.data),

  // Moderation
  listModerationCases: async (status?: string): Promise<ModerationCase[]> => {
    const params = status ? { status } : {};
    const r = await client.get(`${MGMT}/moderation/cases/`, { params });
    return r.data?.data ?? r.data ?? [];
  },

  getModerationCase: async (id: string): Promise<ModerationCase> => {
    const r = await client.get(`${MGMT}/moderation/cases/${id}/`);
    return r.data?.data ?? r.data;
  },

  createModerationCase: async (payload: {
    content_type: string;
    content_id: string;
    content_title: string;
    reason: string;
    organisation_id?: string;
  }) => {
    const r = await client.post(`${MGMT}/moderation/cases/`, payload);
    return r.data;
  },

  updateModerationCase: async (
    id: string,
    payload: { status: string; reviewer_notes?: string }
  ) => {
    const r = await client.patch(`${MGMT}/moderation/cases/${id}/`, payload);
    return r.data;
  },

  getModerationStats: async (): Promise<ModerationStats> => {
    const r = await client.get(`${MGMT}/moderation/stats/`);
    return r.data?.data ?? r.data;
  },

  // Notifications: list recent
  listRecentNotifications: async (limit = 20): Promise<PlatformNotification[]> => {
    const r = await client.get(`${NOTIFICATION}/notifications/`, { params: { limit } });
    return r.data?.data ?? r.data ?? [];
  },
};

export default superadminApi;
