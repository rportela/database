"""Domain models for subscription plans and entitlements."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class PlanEntitlements:
    """Represents the limits enforced for a subscription plan."""

    max_queries_per_day: Optional[int]
    max_scan_mb_per_day: Optional[int]
    max_concurrent_queries: Optional[int]
    max_result_rows: Optional[int] = None

    def to_dict(self) -> Dict[str, Optional[int]]:
        """Serialise the entitlement limits for storage in Firestore."""

        return asdict(self)


@dataclass(frozen=True)
class PlanDefinition:
    """Definition for a Stripe-backed subscription plan."""

    plan_id: str
    display_name: str
    product_id: str
    price_id: str
    unit_amount: int
    currency: str
    interval: str
    entitlements: PlanEntitlements

    def product_metadata(self) -> Dict[str, str]:
        """Metadata written to the Stripe Product for traceability."""

        return {
            "plan_id": self.plan_id,
            "display_name": self.display_name,
        }

    def price_metadata(self) -> Dict[str, str]:
        """Metadata written to the Stripe Price for traceability."""

        return {
            "plan_id": self.plan_id,
            "product_id": self.product_id,
        }

    def entitlements_dict(self) -> Dict[str, Optional[int]]:
        """Expose the plan entitlements as a serialisable dictionary."""

        return self.entitlements.to_dict()
