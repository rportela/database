"""Stripe product and price catalogue management."""
from __future__ import annotations

import logging
import os
from typing import Dict

import stripe
from stripe.error import InvalidRequestError

from .models import PlanDefinition, PlanEntitlements

LOGGER = logging.getLogger(__name__)


def _require_stripe_api_key() -> str:
    api_key = stripe.api_key or os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise RuntimeError("Stripe API key is not configured. Set STRIPE_API_KEY before calling billing helpers.")
    stripe.api_key = api_key
    return api_key


PLAN_CATALOG: Dict[str, PlanDefinition] = {
    "starter": PlanDefinition(
        plan_id="starter",
        display_name="Starter",
        product_id="prod_saas_starter",
        price_id="price_saas_starter_monthly",
        unit_amount=9900,
        currency="usd",
        interval="month",
        entitlements=PlanEntitlements(
            max_queries_per_day=100,
            max_scan_mb_per_day=5_000,
            max_concurrent_queries=2,
            max_result_rows=100_000,
        ),
    ),
    "pro": PlanDefinition(
        plan_id="pro",
        display_name="Pro",
        product_id="prod_saas_pro",
        price_id="price_saas_pro_monthly",
        unit_amount=29900,
        currency="usd",
        interval="month",
        entitlements=PlanEntitlements(
            max_queries_per_day=1_000,
            max_scan_mb_per_day=50_000,
            max_concurrent_queries=5,
            max_result_rows=1_000_000,
        ),
    ),
    "enterprise": PlanDefinition(
        plan_id="enterprise",
        display_name="Enterprise",
        product_id="prod_saas_enterprise",
        price_id="price_saas_enterprise_monthly",
        unit_amount=0,
        currency="usd",
        interval="month",
        entitlements=PlanEntitlements(
            max_queries_per_day=None,
            max_scan_mb_per_day=None,
            max_concurrent_queries=None,
            max_result_rows=None,
        ),
    ),
}

PLAN_BY_PRICE_ID: Dict[str, PlanDefinition] = {plan.price_id: plan for plan in PLAN_CATALOG.values()}


def get_plan_by_id(plan_id: str) -> PlanDefinition:
    try:
        return PLAN_CATALOG[plan_id]
    except KeyError as exc:
        raise ValueError(f"Unknown plan_id '{plan_id}'") from exc


def get_plan_by_price_id(price_id: str) -> PlanDefinition:
    try:
        return PLAN_BY_PRICE_ID[price_id]
    except KeyError as exc:
        raise ValueError(f"Unknown price_id '{price_id}'") from exc


def ensure_stripe_catalog() -> None:
    """Ensure all Stripe products and prices exist with the expected identifiers."""

    _require_stripe_api_key()

    for plan in PLAN_CATALOG.values():
        _ensure_product(plan)
        _ensure_price(plan)


def _ensure_product(plan: PlanDefinition) -> None:
    try:
        product = stripe.Product.retrieve(plan.product_id)
        metadata = plan.product_metadata()
        needs_update = any(product.metadata.get(key) != value for key, value in metadata.items())
        if needs_update:
            LOGGER.info("Updating metadata for Stripe product %s", plan.product_id)
            stripe.Product.modify(plan.product_id, metadata=metadata)
    except InvalidRequestError:
        LOGGER.info("Creating Stripe product %s", plan.product_id)
        stripe.Product.create(
            id=plan.product_id,
            name=plan.display_name,
            metadata=plan.product_metadata(),
        )


def _ensure_price(plan: PlanDefinition) -> None:
    try:
        price = stripe.Price.retrieve(plan.price_id)
        if (price.get("product") != plan.product_id or price.get("unit_amount") != plan.unit_amount or price.get("currency") != plan.currency):
            LOGGER.warning(
                "Stripe price %s exists but does not match expected configuration; consider rotating identifiers.",
                plan.price_id,
            )
        metadata = plan.price_metadata()
        needs_update = any(price.metadata.get(key) != value for key, value in metadata.items())
        if needs_update:
            LOGGER.info("Updating metadata for Stripe price %s", plan.price_id)
            stripe.Price.modify(plan.price_id, metadata=metadata)
    except InvalidRequestError:
        LOGGER.info("Creating Stripe price %s", plan.price_id)
        stripe.Price.create(
            id=plan.price_id,
            product=plan.product_id,
            unit_amount=plan.unit_amount,
            currency=plan.currency,
            recurring={"interval": plan.interval},
            metadata=plan.price_metadata(),
        )
