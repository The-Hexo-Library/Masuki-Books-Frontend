import type { SubscriptionPlan } from "../../types/subscription";

interface Props {
  plan: SubscriptionPlan;
  loading: boolean;
  onSubscribe: (planId: string) => void;
}

export default function SubscriptionCard({ plan, loading, onSubscribe }: Props) {
  const canSubscribe = Boolean(plan.subscriptionId);

  return (
    <article className="rounded-2xl border border-masuki-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-masuki-700">{plan.planName}</h3>
        <span className="rounded-full bg-masuki-100 px-3 py-1 text-xs font-semibold text-masuki-700">
          {plan.accessPercentage}% access
        </span>
      </div>

      <p className="mb-4 min-h-12 text-sm text-slate-600">{plan.description || "Private library access plan"}</p>

      <div className="mb-4">
        <p className="text-2xl font-bold text-slate-900">Rs. {Number(plan.price).toFixed(2)}</p>
        <p className="text-xs text-slate-500">Valid for {plan.durationDays} days</p>
      </div>

      <button
        type="button"
        disabled={loading || !canSubscribe}
        onClick={() => onSubscribe(plan.subscriptionId)}
        className="w-full rounded-lg bg-masuki-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Processing..." : canSubscribe ? "Subscribe" : "Unavailable"}
      </button>
    </article>
  );
}
