import { useState } from "react";
import SubscriptionPlans from "../../components/subscription/SubscriptionPlans";
import { fetchMySubscriptionStatus } from "../../services/subscriptionService";
import type { SubscriptionStatus } from "../../types/subscription";

export default function SubscriptionPage() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  const refreshStatus = async () => {
    const next = await fetchMySubscriptionStatus();
    setStatus(next);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="rounded-2xl bg-gradient-to-r from-masuki-900 to-masuki-700 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Subscription-based Private Library</h1>
        <p className="mt-2 text-sm text-masuki-100">
          Choose a yearly plan to unlock your private library access.
        </p>

        {status?.active && (
          <div className="mt-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            {`${status.planName} (${status.accessPercentage}%)`}
          </div>
        )}
      </div>

      <SubscriptionPlans onSubscribed={() => { void refreshStatus(); }} />
    </div>
  );
}
