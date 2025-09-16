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

variable "labels" {
  description = "Common labels applied to all managed resources."
  type        = map(string)
  default = {
    managed-by = "terraform"
    project    = "lakehouse"
  }
}
