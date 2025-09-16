"""Firestore helpers for persisting Stripe billing state."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from google.cloud import firestore

from .models import PlanDefinition

LOGGER = logging.getLogger(__name__)


class BillingRepository:
    """Encapsulates all Firestore reads and writes for billing metadata."""

    def __init__(self, client: Optional[firestore.Client] = None) -> None:
        self._db = client or firestore.Client()

    @property
    def db(self) -> firestore.Client:
        return self._db

    def link_customer_to_client(
        self,
        *,
        customer_id: str,
        client_id: str,
        subscription_id: Optional[str],
        price_id: Optional[str],
    ) -> None:
        """Persist the mapping between a Stripe customer and internal client identifier."""

        LOGGER.info("Linking Stripe customer %s to client %s", customer_id, client_id)
        batch = self._db.batch()

        customer_ref = self._db.collection("stripe_customers").document(customer_id)
        batch.set(
            customer_ref,
            {
                "client_id": client_id,
                "subscription_id": subscription_id,
                "price_id": price_id,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

        client_ref = self._db.collection("clients").document(client_id)
        batch.set(
            client_ref,
            {
                "stripe_customer_id": customer_id,
                "subscription_id": subscription_id,
                "price_id": price_id,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

        batch.commit()

    def record_checkout_session(self, *, session_id: str, client_id: str, plan_id: str) -> None:
        LOGGER.debug("Recording checkout session %s for client %s", session_id, client_id)
        self._db.collection("stripe_checkout_sessions").document(session_id).set(
            {
                "client_id": client_id,
                "plan_id": plan_id,
                "created_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

    def update_client_plan(
        self,
        *,
        client_id: str,
        plan: PlanDefinition,
        subscription_status: str,
        subscription_id: Optional[str],
        current_period_end: Optional[int],
        price_id: Optional[str],
    ) -> None:
        LOGGER.info("Updating client %s plan to %s", client_id, plan.plan_id)
        doc = {
            "plan_id": plan.plan_id,
            "plan_name": plan.display_name,
            "entitlements": plan.entitlements_dict(),
            "subscription_status": subscription_status,
            "subscription_id": subscription_id,
            "price_id": price_id,
            "current_period_end": current_period_end,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        self._db.collection("clients").document(client_id).set(doc, merge=True)

    def update_subscription_status(
        self,
        *,
        client_id: str,
        subscription_status: str,
        current_period_end: Optional[int],
    ) -> None:
        LOGGER.debug("Updating subscription status for client %s to %s", client_id, subscription_status)
        self._db.collection("clients").document(client_id).set(
            {
                "subscription_status": subscription_status,
                "current_period_end": current_period_end,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

    def get_client_id_for_customer(self, *, customer_id: str) -> Optional[str]:
        doc = self._db.collection("stripe_customers").document(customer_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict() or {}
        return data.get("client_id")

    def get_plan_document(self, *, client_id: str) -> Optional[Dict[str, Any]]:
        doc = self._db.collection("clients").document(client_id).get()
        if not doc.exists:
            return None
        return doc.to_dict()

    def record_processed_webhook(self, *, event_id: str, event_type: str) -> None:
        self._db.collection("stripe_webhook_events").document(event_id).set(
            {
                "event_type": event_type,
                "processed_at": firestore.SERVER_TIMESTAMP,
            }
        )

    def has_processed_event(self, *, event_id: str) -> bool:
        doc = self._db.collection("stripe_webhook_events").document(event_id).get()
        return doc.exists
