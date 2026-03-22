import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import type { SubscriptionPlan } from "../../types/subscription";
import { fetchSubscriptionPlans, subscribeToPlan } from "../../services/subscriptionService";
import SubscriptionCard from "./SubscriptionCard";

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    subscriptionId: "",
    planName: "Starter (10%)",
    accessPercentage: 10,
    description: "Access up to 10% of private library titles",
    price: 199,
    durationDays: 365,
    isPlan: true,
    status: "ACTIVE",
    autoRenew: false
  },
  {
    subscriptionId: "",
    planName: "Basic (25%)",
    accessPercentage: 25,
    description: "Access up to 25% of private library titles",
    price: 399,
    durationDays: 365,
    isPlan: true,
    status: "ACTIVE",
    autoRenew: false
  },
  {
    subscriptionId: "",
    planName: "Pro (50%)",
    accessPercentage: 50,
    description: "Access up to 50% of private library titles",
    price: 699,
    durationDays: 365,
    isPlan: true,
    status: "ACTIVE",
    autoRenew: false
  },
  {
    subscriptionId: "",
    planName: "Premium (100%)",
    accessPercentage: 100,
    description: "Full access to all private library titles",
    price: 999,
    durationDays: 365,
    isPlan: true,
    status: "ACTIVE",
    autoRenew: false
  }
];

interface Props {
  onSubscribed?: () => void;
}

export default function SubscriptionPlans({ onSubscribed }: Props) {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadPlans = async () => {
      const data = await fetchSubscriptionPlans();
      setPlans(data);
    };
    void loadPlans();
  }, []);

  const displayPlans = useMemo(() => {
    if (plans.length === 0) {
      return FALLBACK_PLANS;
    }
    return [...plans].sort((a, b) => a.accessPercentage - b.accessPercentage);
  }, [plans]);

  const handleSubscribe = async (planId: string) => {
    setError("");
    if (!user) {
      navigate("/login");
      return;
    }
    if (!planId) {
      setError("This plan is not configured in backend yet. Please create plans from admin.");
      return;
    }

    setLoading(true);
    try {
      await subscribeToPlan(planId);
      onSubscribed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-masuki-900">Subscription Plans</h2>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">1-year validity</span>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {displayPlans.map((plan) => (
          <SubscriptionCard key={`${plan.planName}-${plan.accessPercentage}`} plan={plan} loading={loading} onSubscribe={handleSubscribe} />
        ))}
      </div>
    </section>
  );
}
