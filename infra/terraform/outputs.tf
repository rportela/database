output "iceberg_data_bucket" {
  description = "Bucket hosting Apache Iceberg table data."
  value       = google_storage_bucket.buckets["iceberg_data"].name
}

output "iceberg_metadata_bucket" {
  description = "Bucket storing Apache Iceberg table metadata."
  value       = google_storage_bucket.buckets["iceberg_metadata"].name
}

output "stripe_webhook_logs_bucket" {
  description = "Bucket capturing Stripe webhook request logs."
  value       = google_storage_bucket.buckets["stripe_webhook_logs"].name
}

output "cloud_run_service_account_email" {
  description = "Email for the Cloud Run runtime service account."
  value       = google_service_account.cloud_run.email
}

output "firestore_service_account_email" {
  description = "Email for the service account accessing Firestore."
  value       = google_service_account.firestore.email
}

output "stripe_webhook_service_account_email" {
  description = "Email for the Stripe webhook handler service account."
  value       = google_service_account.stripe_webhook.email
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URI."
  value       = google_artifact_registry_repository.containers.id
}
