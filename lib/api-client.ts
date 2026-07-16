/**
 * EURO AI API Client
 * TypeScript client for assessment and team management endpoints
 * Usage: import { apiClient } from '@/lib/api-client'
 */

export interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
}

export interface Assessment {
  id: string;
  workspace_id: string;
  ai_system_id: string;
  risk_level: 'unacceptable' | 'high' | 'medium' | 'low';
  risk_score?: number;
  assessment_data?: Record<string, unknown>;
  status: 'draft' | 'in_review' | 'finalized';
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id?: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  joined_at?: string;
  invited_at?: string;
}

export interface InvitationResponse {
  ok: boolean;
  invitation?: WorkspaceMember;
  message?: string;
  error?: string;
}

export interface MemberListResponse {
  ok: boolean;
  members?: WorkspaceMember[];
  error?: string;
}

export interface AssessmentListResponse {
  ok: boolean;
  assessments?: Assessment[];
  error?: string;
}

export interface AssessmentResponse {
  ok: boolean;
  assessment?: Assessment;
  error?: string;
}

/**
 * Assessment API Client
 * Manage risk assessments for AI systems within a workspace
 */
export class AssessmentClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new assessment
   * @param aiSystemId - ID of the AI system being assessed
   * @param riskLevel - Risk level classification
   * @param riskScore - Optional numeric risk score (0-100)
   * @param assessmentData - Optional detailed assessment data
   * @param status - Optional status (default: draft)
   */
  async create(options: {
    ai_system_id: string;
    risk_level: 'unacceptable' | 'high' | 'medium' | 'low';
    risk_score?: number;
    assessment_data?: Record<string, unknown>;
    status?: 'draft' | 'in_review' | 'finalized';
  }): Promise<ApiResponse<Assessment>> {
    const res = await fetch(`${this.baseUrl}/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const data: AssessmentResponse = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.assessment,
    };
  }

  /**
   * List all assessments in the user's current workspace
   */
  async list(): Promise<ApiResponse<Assessment[]>> {
    const res = await fetch(`${this.baseUrl}/assessment`, {
      method: 'GET',
    });

    const data: AssessmentListResponse = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.assessments,
    };
  }

  /**
   * Get a single assessment by ID
   */
  async get(id: string): Promise<ApiResponse<Assessment>> {
    const res = await fetch(`${this.baseUrl}/assessment/${id}`, {
      method: 'GET',
    });

    const data: AssessmentResponse = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.assessment,
    };
  }

  /**
   * Update an assessment (partial update)
   * Only provide fields you want to update
   */
  async update(
    id: string,
    options: {
      risk_level?: 'unacceptable' | 'high' | 'medium' | 'low';
      risk_score?: number;
      assessment_data?: Record<string, unknown>;
      status?: 'draft' | 'in_review' | 'finalized';
    }
  ): Promise<ApiResponse<Assessment>> {
    const res = await fetch(`${this.baseUrl}/assessment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const data: AssessmentResponse = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.assessment,
    };
  }

  /**
   * Delete an assessment
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/assessment/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    return {
      ok: data.ok,
      error: data.error,
    };
  }
}

/**
 * Team Members API Client
 * Manage workspace members and invitations
 */
export class TeamClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * List all members in a workspace
   */
  async listMembers(workspaceId: string): Promise<ApiResponse<WorkspaceMember[]>> {
    const res = await fetch(`${this.baseUrl}/workspace/${workspaceId}/members`, {
      method: 'GET',
    });

    const data: MemberListResponse = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.members,
    };
  }

  /**
   * Invite a new member to the workspace
   * Requires owner or admin role
   */
  async invite(
    workspaceId: string,
    options: {
      email: string;
      role?: 'owner' | 'admin' | 'member' | 'viewer';
    }
  ): Promise<ApiResponse<WorkspaceMember>> {
    const res = await fetch(`${this.baseUrl}/workspace/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const data: InvitationResponse = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.invitation,
    };
  }

  /**
   * Accept an invitation to join a workspace
   * Must be the invited user
   */
  async acceptInvitation(workspaceId: string, memberId: string): Promise<ApiResponse<WorkspaceMember>> {
    const res = await fetch(`${this.baseUrl}/workspace/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });

    const data = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.member,
    };
  }

  /**
   * Reject an invitation or remove yourself from workspace
   * Can be done by invited user or owner/admin
   */
  async rejectInvitation(workspaceId: string, memberId: string): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/workspace/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });

    const data = await res.json();
    return {
      ok: data.ok,
      error: data.error,
    };
  }

  /**
   * Remove a member from the workspace
   * Requires owner or admin role
   * Cannot remove yourself
   */
  async removeMember(workspaceId: string, memberId: string): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/workspace/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    });

    const data = await res.json();
    return {
      ok: data.ok,
      error: data.error,
    };
  }

  /**
   * Change a member's role
   * Requires owner role
   * Cannot change owner role
   */
  async changeRole(
    workspaceId: string,
    memberId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<ApiResponse<WorkspaceMember>> {
    const res = await fetch(`${this.baseUrl}/workspace/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_role', role }),
    });

    const data = await res.json();
    return {
      ok: data.ok,
      error: data.error,
      data: data.member,
    };
  }
}

/**
 * Main API Client
 * Aggregates all API operations
 */
export class EuroAIClient {
  public assessments: AssessmentClient;
  public team: TeamClient;

  constructor(baseUrl: string = '/api') {
    this.assessments = new AssessmentClient(baseUrl);
    this.team = new TeamClient(baseUrl);
  }
}

/**
 * Default client instance for use throughout the application
 * Usage: import { apiClient } from '@/lib/api-client'
 */
export const apiClient = new EuroAIClient();

/**
 * Error handling helper
 * Converts API responses to proper Error objects
 */
export function handleApiError(response: ApiResponse<any>): Error | null {
  if (!response.ok && response.error) {
    return new Error(response.error);
  }
  return null;
}

/**
 * Loading state management helper
 * Usage:
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 *
 *   try {
 *     setLoading(true);
 *     const response = await apiClient.assessments.create({...});
 *     if (!response.ok) {
 *       setError(response.error || 'Unknown error');
 *     }
 *   } catch (err) {
 *     setError(err instanceof Error ? err.message : 'Network error');
 *   } finally {
 *     setLoading(false);
 *   }
 */
export const useApiState = () => {
  return {
    loading: false,
    error: null as string | null,
  };
};
