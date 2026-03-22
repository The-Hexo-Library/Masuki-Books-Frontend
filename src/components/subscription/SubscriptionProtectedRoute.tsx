import { useEffect, useState, type ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { fetchMySubscriptionStatus } from "../../services/subscriptionService";

interface Props {
  children: ReactElement;
}

export default function SubscriptionProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      const status = await fetchMySubscriptionStatus();
      setAllowed(Boolean(status?.active));
      setLoading(false);
    };
    void check();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Checking subscription...</div>;
  }

  if (!allowed) {
    return <Navigate to="/subscription" />;
  }

  return children;
}
