"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { MembersList } from "@/components/team/members-list";
import { InviteMemberForm } from "@/components/team/invite-member-form";

export default function TeamMembersPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const response = await fetch("/api/workspace/list");
        if (response.ok) {
          const data = await response.json();
          if (data.workspaces && data.workspaces.length > 0) {
            setWorkspaceId(data.workspaces[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">
          No workspace found. Please set up your workspace first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Team Members</h1>
          <p className="mt-2 text-lg text-slate-400">
            Manage your workspace team and member access
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          {showForm ? "Hide Form" : "Invite Member"}
        </button>
      </div>

      {/* Invite Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Invite Team Member
          </h2>
          <InviteMemberForm
            workspaceId={workspaceId}
            onSuccess={() => {
              setShowForm(false);
              setRefreshTrigger((prev) => prev + 1);
            }}
          />
        </div>
      )}

      {/* Members List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          Current Members
        </h2>
        <MembersList key={refreshTrigger} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
