# 🚀 Deploying Flusk to Google Cloud Platform

This guide walks you through deploying Flusk backend to Google Cloud Run.

## 📋 Prerequisites

1. **Google Cloud SDK** installed
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Docker** installed and running
   ```bash
   docker --version
   ```

3. **pnpm** installed
   ```bash
   npm install -g pnpm
   ```

4. **GCP Project** with billing enabled
   ```bash
   gcloud projects create YOUR_PROJECT_ID
   gcloud config set project YOUR_PROJECT_ID
   ```

## 🔧 Quick Setup

### Option 1: Automated Script

```bash
# Set your project ID
export GCP_PROJECT_ID=your-flusk-project

# Run deployment script
./scripts/deploy-gcp.sh
```

This script will:
- ✅ Enable required GCP APIs
- ✅ Generate and store secrets
- ✅ Build and test the application
- ✅ Deploy to Cloud Run
- ✅ Provide service URLs and testing commands

### Option 2: Manual Steps

1. **Authenticate with GCP**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable APIs**
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

3. **Create Secrets**
   ```bash
   # Generate API key
   API_KEY=$(openssl rand -hex 32)
   echo -n "$API_KEY" | gcloud secrets create flusk-api-key --data-file=-
   
   # Generate HMAC secret
   HMAC_SECRET=$(openssl rand -hex 32)
   echo -n "$HMAC_SECRET" | gcloud secrets create flusk-hmac-secret --data-file=-
   
   # Generate encryption key
   ENCRYPTION_KEY=$(openssl rand -hex 32)
   echo -n "$ENCRYPTION_KEY" | gcloud secrets create flusk-encryption-key --data-file=-
   ```

4. **Build and Deploy**
   ```bash
   # Install dependencies and build
   pnpm install
   pnpm build
   pnpm test
   
   # Build Docker image
   docker build -t gcr.io/YOUR_PROJECT_ID/flusk-backend .
   
   # Push to registry
   gcloud auth configure-docker
   docker push gcr.io/YOUR_PROJECT_ID/flusk-backend
   
   # Deploy to Cloud Run
   gcloud run deploy flusk-backend \
     --image gcr.io/YOUR_PROJECT_ID/flusk-backend \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars="NODE_ENV=production,PORT=8080" \
     --set-secrets="FLUSK_API_KEY=flusk-api-key:latest" \
     --set-secrets="FLUSK_HMAC_SECRET=flusk-hmac-secret:latest" \
     --set-secrets="ENCRYPTION_KEY=flusk-encryption-key:latest" \
     --memory=512Mi \
     --cpu=1000m
   ```

## 🧪 Testing Deployment

Once deployed, test your service:

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe flusk-backend --region us-central1 --format 'value(status.url)')

# Test health endpoint
curl $SERVICE_URL/health

# Test authenticated endpoint
API_KEY=$(gcloud secrets versions access latest --secret=flusk-api-key)
curl -H "Authorization: Bearer org_$API_KEY" $SERVICE_URL/api/v1/
```

## 🔄 CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow for automatic deployment:

1. **Set up repository secrets:**
   - `GCP_SA_KEY`: Service account JSON key
   - `FLUSK_API_KEY`: API key for authentication
   - `FLUSK_HMAC_SECRET`: HMAC secret
   - `ENCRYPTION_KEY`: Encryption key

2. **Set repository variable:**
   - `ENABLE_GCP_DEPLOY`: Set to `true` to enable auto-deployment

3. **Create service account:**
   ```bash
   gcloud iam service-accounts create flusk-deployer \
     --description="Service account for Flusk deployments" \
     --display-name="Flusk Deployer"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:flusk-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:flusk-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   
   gcloud iam service-accounts keys create key.json \
     --iam-account=flusk-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

## 📊 Monitoring & Logs

- **Cloud Run Console**: https://console.cloud.google.com/run
- **Logs**: `gcloud run services logs read flusk-backend --region us-central1`
- **Metrics**: Available in Cloud Monitoring

## 💰 Cost Optimization

Cloud Run pricing:
- **Free tier**: 180,000 vCPU-seconds, 360,000 GiB-seconds per month
- **Pay-per-use**: Only charged when handling requests
- **Auto-scaling**: Scales to zero when idle

Current configuration:
- Memory: 512Mi
- CPU: 1000m (1 vCPU)
- Min instances: 0 (scales to zero)
- Max instances: 10

## 🔧 Troubleshooting

### Common Issues

1. **Build fails**
   ```bash
   # Check Docker daemon
   docker info
   
   # Rebuild dependencies
   pnpm install --frozen-lockfile
   pnpm build
   ```

2. **Deployment timeout**
   ```bash
   # Check logs
   gcloud run services logs read flusk-backend --region us-central1 --limit=50
   ```

3. **Authentication errors**
   ```bash
   # Verify secrets
   gcloud secrets versions list flusk-api-key
   gcloud secrets versions list flusk-hmac-secret
   ```

4. **Health check fails**
   ```bash
   # Test locally first
   pnpm start
   curl http://localhost:3000/health
   ```

### Update Deployment

```bash
# Rebuild and redeploy
docker build -t gcr.io/YOUR_PROJECT_ID/flusk-backend .
docker push gcr.io/YOUR_PROJECT_ID/flusk-backend
gcloud run deploy flusk-backend --image gcr.io/YOUR_PROJECT_ID/flusk-backend --region us-central1
```

## 🔗 Next Steps

- Set up custom domain: [Cloud Run custom domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- Configure CDN: [Cloud CDN](https://cloud.google.com/cdn)
- Set up monitoring: [Cloud Monitoring](https://cloud.google.com/monitoring)
- Database scaling: Consider Cloud SQL for production workloads