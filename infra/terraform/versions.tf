terraform {
  required_version = ">= 1.4.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.84"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
