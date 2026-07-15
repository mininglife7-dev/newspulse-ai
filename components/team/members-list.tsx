"use client";

import { useEffect, useState } from "react";
import { Loader, Shield, Users, Eye, Edit2, Trash2 } from "lucide-react";

interface WorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: string;
  created_at: string;
}

interface MembersListProps {
  workspaceId: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Shield className="w-4 h-4 text-yellow-400" />,
  admin: <Shield className="w-4 h-4 text-orange-400" />,
  member: <Users className="w-4 h-4 text-blue-400" />,
  viewer: <Eye className="w-4 h-4 text-slate-400" />,
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-900/30 border-yellow-800 text-yellow-300",
  admin: "bg-orange-900/30 border-orange-800 text-orange-300",
  member: "bg-blue-900/30 border-blue-800 text-blue-300",
  viewer: "bg-slate-900/30 border-slate-800 text-slate-300",
};

export function MembersList({ workspaceId }: MembersListProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(
          `/api/workspace/members?workspace_id=${workspaceId}`
        );
        if (!response.ok) throw new Error("Failed to fetch members");
        const data = await response.json();
        setMembers(data.members || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId) {
      fetchMembers();
    }
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
        <p className="text-slate-400">No team members found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <div
          key={member.id}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-300">
                  {member.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">{member.email}</h4>
                <p className="text-xs text-slate-500">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border ${
                  ROLE_COLORS[member.role]
                }`}
              >
                {ROLE_ICONS[member.role]}
                <span className="capitalize">
                  {member.role}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition text-slate-400 hover:text-blue-400 disabled:opacity-50"
                  title="Edit role"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  className="p-2 hover:bg-slate-800 rounded transition text-slate-400 hover:text-red-400 disabled:opacity-50"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
