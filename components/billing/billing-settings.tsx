'use client';

import { useState } from 'react';
import type { BillingContext } from '@/lib/billing/types';

interface BillingSettingsProps {
  billing: BillingContext;
}

export function BillingSettings({ billing }: BillingSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement upgrade flow
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const { sessionId } = await response.json();
      // TODO: Redirect to Stripe checkout
    } catch (error) {
      console.error('Error upgrading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing Settings</h2>
        <p className="text-gray-600">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan Section */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Plan</p>
            <p className="text-xl font-bold">{billing.plan.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-xl font-bold capitalize">
              {billing.subscription.status}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Usage</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>API Calls</span>
              <span>
                {billing.usage.currentPeriodApiCalls.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(100, billing.usage.percentageUsed)}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Workspaces</p>
              <p className="text-lg font-semibold">
                {billing.usage.currentPeriodWorkspaces}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Team Members</p>
              <p className="text-lg font-semibold">
                {billing.usage.currentPeriodTeamMembers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {billing.plan.tier === 'free' && (
        <div className="border rounded-lg p-6 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">Upgrade to Pro</h3>
          <p className="text-gray-600 mb-4">
            Get access to more features and higher limits
          </p>
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Upgrade Now'}
          </button>
        </div>
      )}
    </div>
  );
}
