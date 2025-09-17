"""Helpers for creating Stripe Checkout and Billing Portal sessions."""
from __future__ import annotations

import importlib.util
import logging
import os
from typing import Any, Optional

if importlib.util.find_spec("stripe") is not None:  # pragma: no cover - optional dependency
    import stripe  # type: ignore
else:  # pragma: no cover - fallback for environments without Stripe SDK
    stripe = None  # type: ignore

from .stripe_catalog import PLAN_CATALOG, get_plan_by_id

LOGGER = logging.getLogger(__name__)


def _require_stripe_api_key() -> str:
    if stripe is None:
        raise RuntimeError("The 'stripe' package is required for billing operations.")
    api_key = stripe.api_key or os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise RuntimeError("Stripe API key is not configured. Set STRIPE_API_KEY before calling billing helpers.")
    stripe.api_key = api_key
    return api_key


def create_checkout_session(
    *,
    client_id: str,
    plan_id: str,
    success_url: str,
    cancel_url: str,
    customer_id: Optional[str] = None,
    trial_period_days: Optional[int] = None,
) -> Any:
    """Create a Stripe Checkout session for the requested plan."""

    _require_stripe_api_key()
    plan = get_plan_by_id(plan_id)

    LOGGER.info("Creating Stripe Checkout session for client %s plan %s", client_id, plan.plan_id)

    subscription_data = {
        "metadata": {
            "client_id": client_id,
            "plan_id": plan.plan_id,
        }
    }
    if trial_period_days is not None:
        subscription_data["trial_period_days"] = trial_period_days

    success_target = success_url
    if "{CHECKOUT_SESSION_ID}" not in success_target:
        separator = "&" if "?" in success_target else "?"
        success_target = f"{success_target}{separator}session_id={{CHECKOUT_SESSION_ID}}"

    session = stripe.checkout.Session.create(
        mode="subscription",
        success_url=success_target,
        cancel_url=cancel_url,
        customer=customer_id,
        client_reference_id=client_id,
        metadata={
            "client_id": client_id,
            "plan_id": plan.plan_id,
            "price_id": plan.price_id,
        },
        subscription_data=subscription_data,
        line_items=[
            {
                "price": plan.price_id,
                "quantity": 1,
            }
        ],
        allow_promotion_codes=True,
        automatic_tax={"enabled": True},
    )
    return session


def create_billing_portal_session(*, customer_id: str, return_url: str) -> Any:
    """Create a session for the hosted Stripe Billing Portal."""

    _require_stripe_api_key()
    LOGGER.info("Creating Stripe billing portal session for customer %s", customer_id)
    return stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )


def plan_display_names() -> dict:
    """Expose the plan catalogue for API responses."""

    return {plan_id: plan.display_name for plan_id, plan in PLAN_CATALOG.items()}
