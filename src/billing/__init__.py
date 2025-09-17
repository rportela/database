"""Billing and Stripe integration helpers."""

import importlib.util

from .models import PlanDefinition, PlanEntitlements
if importlib.util.find_spec("google.cloud.firestore") is not None:  # pragma: no cover - optional dependency
    from .firestore_repository import BillingRepository
else:  # pragma: no cover - fallback when Firestore SDK is unavailable
    class BillingRepository:  # type: ignore
        def __init__(self, *args, **kwargs) -> None:  # noqa: ANN001
            raise RuntimeError("The 'google-cloud-firestore' package is required for BillingRepository.")

if importlib.util.find_spec("stripe") is not None:  # pragma: no cover - optional dependency
    from .stripe_catalog import PLAN_CATALOG, PLAN_BY_PRICE_ID, ensure_stripe_catalog, get_plan_by_id, get_plan_by_price_id
    from .checkout import create_billing_portal_session, create_checkout_session
    from .webhook_processor import StripeWebhookError, StripeWebhookProcessor
else:  # pragma: no cover - fallback for environments without Stripe SDK
    PLAN_CATALOG = {}
    PLAN_BY_PRICE_ID = {}

    def ensure_stripe_catalog() -> None:  # type: ignore
        raise RuntimeError("The 'stripe' package is required for billing operations.")

    def get_plan_by_id(plan_id: str):  # type: ignore  # noqa: ANN001
        raise RuntimeError("The 'stripe' package is required for billing operations.")

    def get_plan_by_price_id(price_id: str):  # type: ignore  # noqa: ANN001
        raise RuntimeError("The 'stripe' package is required for billing operations.")

    def create_checkout_session(*args, **kwargs):  # type: ignore
        raise RuntimeError("The 'stripe' package is required for billing operations.")

    def create_billing_portal_session(*args, **kwargs):  # type: ignore
        raise RuntimeError("The 'stripe' package is required for billing operations.")

    class StripeWebhookError(RuntimeError):
        pass

    class StripeWebhookProcessor:  # type: ignore
        def __init__(self, *args, **kwargs) -> None:  # noqa: ANN001
            raise RuntimeError("The 'stripe' package is required for billing operations.")

__all__ = [
    "PlanDefinition",
    "PlanEntitlements",
    "PLAN_CATALOG",
    "PLAN_BY_PRICE_ID",
    "ensure_stripe_catalog",
    "get_plan_by_id",
    "get_plan_by_price_id",
    "create_checkout_session",
    "create_billing_portal_session",
    "BillingRepository",
    "StripeWebhookProcessor",
    "StripeWebhookError",
]
