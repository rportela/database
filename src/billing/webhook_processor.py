"""Processes Stripe webhook events and syncs Firestore state."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict

import stripe
from flask import Request

from .firestore_repository import BillingRepository
from .stripe_catalog import get_plan_by_price_id

LOGGER = logging.getLogger(__name__)


class StripeWebhookError(RuntimeError):
    """Raised when Stripe webhook processing fails."""


class StripeWebhookProcessor:
    """High-level handler for Stripe webhook events."""

    def __init__(self, repository: BillingRepository) -> None:
        self._repository = repository

    def verify_and_parse_event(self, payload: bytes, signature: str) -> stripe.Event:
        secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
        if not secret:
            raise StripeWebhookError("STRIPE_WEBHOOK_SECRET environment variable is not set")
        api_key = stripe.api_key or os.environ.get("STRIPE_API_KEY")
        if not api_key:
            raise StripeWebhookError("STRIPE_API_KEY environment variable is not configured")
        stripe.api_key = api_key
        try:
            return stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=secret)
        except stripe.error.SignatureVerificationError as exc:
            raise StripeWebhookError("Invalid Stripe webhook signature") from exc

    def process_request(self, request: Request) -> Dict[str, Any]:
        payload = request.data
        signature = request.headers.get("Stripe-Signature", "")
        event = self.verify_and_parse_event(payload, signature)
        return self.process_event(event)

    # Event Handlers -----------------------------------------------------

    def _handle_checkout_session_completed(self, event: stripe.Event) -> None:
        session = event["data"]["object"]
        metadata = session.get("metadata", {}) or {}
        client_id = metadata.get("client_id") or session.get("client_reference_id")
        price_id = metadata.get("price_id")
        subscription_id = session.get("subscription")
        customer_id = session.get("customer")
        if not client_id or not customer_id:
            raise StripeWebhookError("Checkout session missing client or customer identifiers")

        LOGGER.info("Checkout completed for client %s", client_id)
        plan = None
        if price_id:
            try:
                plan = get_plan_by_price_id(price_id)
            except ValueError:
                LOGGER.warning("Price %s does not map to a known plan", price_id)
        if plan:
            self._repository.update_client_plan(
                client_id=client_id,
                plan=plan,
                subscription_status=session.get("status", "complete"),
                subscription_id=subscription_id,
                current_period_end=None,
                price_id=price_id,
            )
        self._repository.link_customer_to_client(
            customer_id=customer_id,
            client_id=client_id,
            subscription_id=subscription_id,
            price_id=price_id,
        )
        self._repository.record_checkout_session(
            session_id=session["id"],
            client_id=client_id,
            plan_id=metadata.get("plan_id") or (plan.plan_id if plan else "unknown"),
        )

    def _handle_invoice_paid(self, event: stripe.Event) -> None:
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        if not customer_id:
            LOGGER.warning("Received invoice.paid without customer id")
            return
        client_id = self._repository.get_client_id_for_customer(customer_id=customer_id)
        if not client_id:
            LOGGER.warning("No client mapping for Stripe customer %s", customer_id)
            return
        price_id = None
        lines = invoice.get("lines", {}).get("data", [])
        if lines:
            price_id = lines[0].get("price", {}).get("id")
            period_end = lines[0].get("period", {}).get("end")
        else:
            period_end = None
        plan = None
        if price_id:
            try:
                plan = get_plan_by_price_id(price_id)
            except ValueError:
                LOGGER.warning("Invoice price %s is not mapped to a plan", price_id)
        if plan:
            self._repository.update_client_plan(
                client_id=client_id,
                plan=plan,
                subscription_status="active",
                subscription_id=invoice.get("subscription"),
                current_period_end=period_end,
                price_id=price_id,
            )
        else:
            self._repository.update_subscription_status(
                client_id=client_id,
                subscription_status="active",
                current_period_end=period_end,
            )

    def _handle_customer_subscription_updated(self, event: stripe.Event) -> None:
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        if not customer_id:
            LOGGER.warning("Subscription update without customer id")
            return
        client_id = self._repository.get_client_id_for_customer(customer_id=customer_id)
        if not client_id:
            LOGGER.warning("No client mapping for Stripe customer %s", customer_id)
            return
        price_id = None
        items = subscription.get("items", {}).get("data", [])
        if items:
            price_id = items[0].get("price", {}).get("id")
        plan = None
        if price_id:
            try:
                plan = get_plan_by_price_id(price_id)
            except ValueError:
                LOGGER.warning("Subscription price %s is not mapped to a plan", price_id)
        status = subscription.get("status", "unknown")
        current_period_end = subscription.get("current_period_end")
        if plan:
            self._repository.update_client_plan(
                client_id=client_id,
                plan=plan,
                subscription_status=status,
                subscription_id=subscription.get("id"),
                current_period_end=current_period_end,
                price_id=price_id,
            )
        else:
            self._repository.update_subscription_status(
                client_id=client_id,
                subscription_status=status,
                current_period_end=current_period_end,
            )

    # Utility entrypoints ------------------------------------------------

    def handle_test_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Allow unit tests or local invocations to bypass signature checking."""

        api_key = stripe.api_key or os.environ.get("STRIPE_API_KEY")
        if api_key:
            stripe.api_key = api_key
        event = stripe.Event.construct_from(payload, stripe.api_key or "sk_test_placeholder")
        return self.process_event(event)

    def process_event(self, event: stripe.Event) -> Dict[str, Any]:
        event_id = event.get("id")
        if not event_id:
            raise StripeWebhookError("Stripe event missing identifier")
        if self._repository.has_processed_event(event_id=event_id):
            LOGGER.info("Ignoring duplicate Stripe event %s", event_id)
            return {"status": "duplicate"}

        LOGGER.info("Processing Stripe event %s (%s)", event_id, event.get("type"))
        handler = getattr(self, f"_handle_{event['type'].replace('.', '_')}", None)
        if handler:
            handler(event)
        else:
            LOGGER.debug("No handler implemented for Stripe event %s", event["type"])
        self._repository.record_processed_webhook(event_id=event_id, event_type=event["type"])
        return {"status": "ok"}
