"""Flask entrypoint for the Stripe webhook Cloud Run service."""
from __future__ import annotations

import logging
import os

from flask import Flask, jsonify, request

from billing.firestore_repository import BillingRepository
from billing.webhook_processor import StripeWebhookError, StripeWebhookProcessor

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

app = Flask(__name__)
_processor = StripeWebhookProcessor(BillingRepository())


@app.post("/webhooks/stripe")
def handle_stripe_webhook() -> tuple:
    try:
        result = _processor.process_request(request)
        return jsonify(result), 200
    except StripeWebhookError as exc:
        LOGGER.exception("Failed to process Stripe webhook: %s", exc)
        return jsonify({"error": str(exc)}), 400
    except Exception:  # pragma: no cover - safety net for unexpected errors
        LOGGER.exception("Unexpected error while processing Stripe webhook")
        return jsonify({"error": "internal_error"}), 500


@app.get("/healthz")
def healthcheck() -> tuple:
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":  # pragma: no cover
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
