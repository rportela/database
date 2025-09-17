import { useCallback, useState } from "react";

import { createBillingPortalSession } from "../lib/billingClient";

interface BillingPortalButtonProps {
  customerId: string;
  returnUrl: string;
  className?: string;
  label?: string;
}

export function BillingPortalButton({
  customerId,
  returnUrl,
  className,
  label = "Open billing portal",
}: BillingPortalButtonProps): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { url } = await createBillingPortalSession({ customerId, returnUrl });
      window.location.href = url;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to open the billing portal");
      }
    } finally {
      setLoading(false);
    }
  }, [customerId, returnUrl]);

  return (
    <div className={className}>
      <button type="button" className="btn btn-secondary" onClick={handleClick} disabled={loading}>
        {loading ? "Redirecting…" : label}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
