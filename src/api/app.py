"""Minimal Flask application exposing billing endpoints for the frontend."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict

from flask import Flask, jsonify, request

from billing.checkout import create_billing_portal_session, create_checkout_session, plan_display_names
from billing.firestore_repository import BillingRepository
from billing.stripe_catalog import get_plan_by_id

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))


def create_app() -> Flask:
    app = Flask(__name__)
    repository = BillingRepository()

    @app.get("/api/billing/plans")
    def list_plans() -> Any:
        return jsonify(plan_display_names())

    @app.post("/api/billing/checkout-session")
    def checkout_session() -> Any:
        payload: Dict[str, Any] = request.get_json(force=True)  # type: ignore[assignment]
        client_id = payload.get("clientId")
        plan_id = payload.get("planId")
        success_url = payload.get("successUrl")
        cancel_url = payload.get("cancelUrl")
        customer_id = payload.get("customerId")
        if not all([client_id, plan_id, success_url, cancel_url]):
            return jsonify({"error": "missing_parameters"}), 400
        try:
            get_plan_by_id(plan_id)
        except ValueError:
            return jsonify({"error": "invalid_plan"}), 400

        session = create_checkout_session(
            client_id=client_id,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_id=customer_id,
        )
        repository.record_checkout_session(session_id=session["id"], client_id=client_id, plan_id=plan_id)
        return jsonify({"id": session["id"]}), 201

    @app.post("/api/billing/portal-session")
    def billing_portal() -> Any:
        payload: Dict[str, Any] = request.get_json(force=True)  # type: ignore[assignment]
        customer_id = payload.get("customerId")
        return_url = payload.get("returnUrl")
        if not customer_id or not return_url:
            return jsonify({"error": "missing_parameters"}), 400
        session = create_billing_portal_session(customer_id=customer_id, return_url=return_url)
        return jsonify({"url": session["url"]}), 201

    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
