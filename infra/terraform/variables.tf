variable "project_id" {
  description = "GCP project ID where resources will be created."
  type        = string
}

variable "region" {
  description = "Default region for regional resources such as Artifact Registry."
  type        = string
  default     = "us-central1"
}

variable "bucket_location" {
  description = "Location/region for GCS buckets."
  type        = string
  default     = "US"
}

variable "bucket_prefix" {
  description = "Prefix applied to storage buckets to guarantee uniqueness across environments. Defaults to the project ID."
  type        = string
  default     = null
}

variable "artifact_registry_repository_id" {
  description = "Name of the Artifact Registry repository used for container images."
  type        = string
  default     = "analytics-services"
}

variable "google_oauth_client_id" {
  description = "OAuth client ID used for enabling Google sign-in with Firebase Authentication. Leave blank to skip configuration."
  type        = string
  default     = ""
}

variable "google_oauth_client_secret" {
  description = "OAuth client secret paired with google_oauth_client_id. Required when enabling Google sign-in."
  type        = string
  default     = ""
  sensitive   = true
}

variable "labels" {
  description = "Common labels applied to all managed resources."
  type        = map(string)
  default = {
    managed-by = "terraform"
    project    = "lakehouse"
  }
}
