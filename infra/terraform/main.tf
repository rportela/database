locals {
  bucket_prefix = coalesce(var.bucket_prefix, var.project_id)
  bucket_names = {
    iceberg_data        = "${local.bucket_prefix}-iceberg-data"
    iceberg_metadata    = "${local.bucket_prefix}-iceberg-metadata"
    stripe_webhook_logs = "${local.bucket_prefix}-stripe-webhook-logs"
  }
  required_services = [
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com"
  ]
}

resource "google_project_service" "services" {
  for_each = toset(local.required_services)

  service = each.value
}

resource "google_storage_bucket" "buckets" {
  for_each = local.bucket_names

  name                        = each.value
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  labels                      = var.labels

  versioning {
    enabled = true
  }

  dynamic "lifecycle_rule" {
    for_each = each.key == "stripe_webhook_logs" ? [1] : []

    content {
      condition {
        age = 30
      }
      action {
        type = "Delete"
      }
    }
  }
}

resource "google_service_account" "cloud_run" {
  account_id   = "cloud-run-runtime"
  display_name = "Cloud Run runtime service account"
}

resource "google_service_account" "firestore" {
  account_id   = "firestore-app"
  display_name = "Application Firestore service account"
}

resource "google_service_account" "stripe_webhook" {
  account_id   = "stripe-webhook"
  display_name = "Stripe webhook processor service account"
}

resource "google_identity_platform_config" "default" {
  project = var.project_id

  sign_in {
    allow_email_link_sign_in = false

    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [
    google_project_service.services["identitytoolkit.googleapis.com"]
  ]
}

resource "google_identity_platform_default_supported_idp_config" "google" {
  count = var.google_oauth_client_id != "" && var.google_oauth_client_secret != "" ? 1 : 0

  enabled       = true
  idp_id        = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret

  depends_on = [
    google_identity_platform_config.default
  ]
}

resource "google_project_iam_member" "cloud_run_roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/storage.objectAdmin"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = var.artifact_registry_repository_id
  description   = "Container images for analytics services"
  format        = "DOCKER"
  labels        = var.labels

  depends_on = [
    google_project_service.services["artifactregistry.googleapis.com"]
  ]
}

resource "google_artifact_registry_repository_iam_member" "cloud_run_reader" {
  repository = google_artifact_registry_repository.containers.name
  location   = google_artifact_registry_repository.containers.location
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "firestore_roles" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.firestore.email}"
}

resource "google_project_iam_member" "stripe_firestorereader" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.stripe_webhook.email}"
}

resource "google_storage_bucket_iam_member" "stripe_log_writer" {
  bucket = google_storage_bucket.buckets["stripe_webhook_logs"].name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.stripe_webhook.email}"
}
