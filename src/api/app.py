"""Minimal Flask application exposing billing endpoints for the frontend."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request

from billing.checkout import create_billing_portal_session, create_checkout_session, plan_display_names
from billing.stripe_catalog import get_plan_by_id
from api.entitlements import EntitlementError
from query import QueryError, QueryHistoryFilter, QueryService, serialize_history_entry, summarise_history
from query.history import QueryHistoryStore
from query.models import QueryRequest
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - used for type checking only
    from billing.firestore_repository import BillingRepository

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))


def _parse_datetime(value: str | None) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        raise ValueError(f"Invalid ISO-8601 timestamp: {value}")


def create_app(
    *,
    billing_repository: "BillingRepository" | None = None,
    query_service: QueryService | None = None,
    query_history_store: QueryHistoryStore | None = None,
) -> Flask:
    app = Flask(__name__)
    if billing_repository is not None:
        repository = billing_repository
    else:
        from billing.firestore_repository import BillingRepository  # imported lazily to avoid optional dependency at import time

        repository = BillingRepository()
    history_store = query_history_store

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

    @app.post("/query")
    def run_query() -> Any:
        if query_service is None:
            return jsonify({"error": "query_engine_unavailable"}), 503

        payload: Dict[str, Any] = request.get_json(force=True)  # type: ignore[assignment]
        client_id = payload.get("client_id") or payload.get("clientId")
        sql = payload.get("sql") or payload.get("query")
        limit = payload.get("limit")
        snapshot_id = payload.get("snapshot_id") or payload.get("snapshotId")
        as_of_raw = payload.get("as_of_timestamp") or payload.get("asOfTimestamp")
        estimated_scan = payload.get("estimated_scan_mb") or payload.get("estimatedScanMb")

        if not client_id or not isinstance(client_id, str):
            return jsonify({"error": "missing_client_id"}), 400
        if not sql or not isinstance(sql, str):
            return jsonify({"error": "missing_query"}), 400

        try:
            as_of_timestamp = _parse_datetime(as_of_raw if isinstance(as_of_raw, str) else None)
        except ValueError as exc:
            return jsonify({"error": "invalid_time_travel", "message": str(exc)}), 400

        parsed_limit: Optional[int] = None
        if isinstance(limit, int):
            parsed_limit = limit
        elif isinstance(limit, str) and limit.strip():
            try:
                parsed_limit = int(limit)
            except ValueError:
                return jsonify({"error": "invalid_limit"}), 400

        estimated_scan_value: Optional[float] = None
        if isinstance(estimated_scan, (int, float)):
            estimated_scan_value = float(estimated_scan)
        elif isinstance(estimated_scan, str) and estimated_scan.strip():
            try:
                estimated_scan_value = float(estimated_scan)
            except ValueError:
                return jsonify({"error": "invalid_estimated_scan"}), 400

        request_model = QueryRequest(
            client_id=client_id,
            sql=sql,
            limit=parsed_limit,
            snapshot_id=snapshot_id if isinstance(snapshot_id, str) else None,
            as_of_timestamp=as_of_timestamp,
            estimated_scan_mb=estimated_scan_value,
        )

        try:
            result = query_service.execute(request_model)
        except EntitlementError as exc:
            LOGGER.info("Query rejected by entitlement checks: %s", exc)
            return jsonify({"error": "entitlement_denied", "message": str(exc)}), 429
        except QueryError as exc:
            status_code = 500 if exc.code == "internal_error" else 400
            LOGGER.info("Query execution failed: %s", exc)
            return jsonify({"error": exc.code, "message": str(exc)}), status_code
        except Exception as exc:  # pragma: no cover - defensive
            LOGGER.exception("Unhandled exception during query execution")
            return jsonify({"error": "query_failed", "message": str(exc)}), 500

        response = {
            "statement": result.statement,
            "columns": [column.__dict__ for column in result.columns],
            "rows": list(result.rows),
        }
        if result.stats:
            stats = {
                "elapsed_ms": result.stats.elapsed_ms,
                "data_scanned_mb": result.stats.data_scanned_mb,
                "row_count": result.stats.row_count,
                "snapshot_id": result.stats.snapshot_id,
                "snapshot_timestamp": result.stats.snapshot_timestamp.isoformat()
                if result.stats.snapshot_timestamp
                else None,
            }
            response["stats"] = stats
            response["stats"]["elapsedMs"] = stats["elapsed_ms"]
            response["stats"]["dataScannedMb"] = stats["data_scanned_mb"]
            response["stats"]["rowCount"] = stats["row_count"]
            response["stats"]["snapshotId"] = stats["snapshot_id"]
            response["stats"]["snapshotTimestamp"] = stats["snapshot_timestamp"]

        return jsonify(response)

    @app.get("/api/clients/<client_id>/query-history")
    def query_history(client_id: str) -> Any:
        store = history_store or getattr(query_service, "history_store", None)
        if store is None:
            return jsonify({"entries": [], "summary": {"totalQueries": 0, "failedQueries": 0, "totalCostUsd": 0.0}})

        params = request.args
        start = params.get("start")
        end = params.get("end")
        table = params.get("table")
        limit_param = params.get("limit")
        try:
            start_dt = _parse_datetime(start)
            end_dt = _parse_datetime(end)
        except ValueError as exc:
            return jsonify({"error": "invalid_range", "message": str(exc)}), 400

        limit = None
        if limit_param:
            try:
                limit = int(limit_param)
            except ValueError:
                return jsonify({"error": "invalid_limit"}), 400

        entries = store.search(
            QueryHistoryFilter(
                client_id=client_id,
                start=start_dt,
                end=end_dt,
                table=table,
                limit=limit,
            )
        )
        summary = summarise_history(entries)
        response = {
            "entries": [serialize_history_entry(entry) for entry in entries],
            "summary": {
                "totalQueries": summary.total_queries,
                "failedQueries": summary.failed_queries,
                "totalCostUsd": summary.total_cost_usd,
                "range": {
                    "start": summary.range_start.isoformat() if summary.range_start else None,
                    "end": summary.range_end.isoformat() if summary.range_end else None,
                },
            },
        }
        return jsonify(response)

    return app


try:  # pragma: no cover - allow module import without optional dependencies
    app = create_app()
except (RuntimeError, ModuleNotFoundError, ImportError):  # pragma: no cover - fallback when dependencies missing
    app = Flask(__name__)


if __name__ == "__main__":  # pragma: no cover
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
