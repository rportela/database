# Terraform deployment

This configuration provisions the core infrastructure required for the analytics lakehouse stack on Google Cloud Platform. It creates storage buckets for Apache Iceberg data and metadata, a log bucket for Stripe webhooks, service accounts with the minimum roles for each workload, and an Artifact Registry repository that stores container images used by Cloud Run services.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) 1.4 or newer
- A Google Cloud project with billing enabled
- The `gcloud` CLI authenticated against the target project (to supply application default credentials)

## Usage

```bash
cd infra/terraform
terraform init -backend=false
terraform plan \
  -var="project_id=<your-gcp-project>" \
  -var="region=us-central1"
```

The `bucket_prefix` variable defaults to the project ID. Override it when you need globally unique bucket names across multiple environments/projects.

Provision the resources once you are satisfied with the plan:

```bash
terraform apply \
  -var="project_id=<your-gcp-project>" \
  -var="region=us-central1"
```

Outputs include the fully qualified bucket names and service account emails. Use the `cloud_run_service_account_email` when deploying Cloud Run services so the workloads inherit access to Firestore and the Iceberg buckets.
