# Deploy to Google Cloud Run

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- Docker
- A GCP project with billing enabled

## Steps

### 1. Set up

```bash
export PROJECT_ID=your-project-id
export REGION=me-west1

gcloud auth login
gcloud config set project $PROJECT_ID
```

### 2. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### 3. Create Artifact Registry repo

```bash
gcloud artifacts repositories create flusk \
  --repository-format=docker \
  --location=$REGION
```

### 4. Build & deploy with Cloud Build

```bash
gcloud builds submit --config=deploy/gcp/cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_REPO=flusk
```

### 5. Or deploy manually

```bash
# Build
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/flusk/flusk-observability:latest .

# Push
docker push $REGION-docker.pkg.dev/$PROJECT_ID/flusk/flusk-observability:latest

# Deploy
gcloud run deploy flusk-observability \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/flusk/flusk-observability:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3042 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10
```

## SQLite Persistence

Cloud Run is stateless. For SQLite persistence, options:

1. **Cloud Storage FUSE** — Mount a GCS bucket as a filesystem (simple, some latency)
2. **Persistent Volume** — Use Cloud Run with GCE volumes (gen2 only)
3. **Migrate to Cloud SQL** — For production scale

For dev/staging, Cloud Storage FUSE works fine:

```bash
gcloud run deploy flusk-observability \
  --add-volume=name=data,type=cloud-storage,bucket=flusk-data-bucket \
  --add-volume-mount=volume=data,mount-path=/data
```
