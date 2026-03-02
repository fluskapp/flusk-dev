#!/bin/bash
set -e

# 🚀 Flusk GCP Deployment Script
# This script sets up and deploys Flusk to Google Cloud Run

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-flusk-prod}"
SERVICE_NAME="flusk-backend"
REGION="${GCP_REGION:-us-central1}"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
    exit 1
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
fi

# Check if docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
fi

log "🔍 Checking project configuration..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    warn "Current gcloud project is '$CURRENT_PROJECT', but deploying to '$PROJECT_ID'"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    gcloud config set project $PROJECT_ID
fi

log "🔐 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

log "🔑 Setting up secrets..."
# Generate secrets if they don't exist
if ! gcloud secrets describe flusk-api-key >/dev/null 2>&1; then
    API_KEY=$(openssl rand -hex 32)
    echo -n "$API_KEY" | gcloud secrets create flusk-api-key --data-file=-
    success "Created flusk-api-key secret"
else
    warn "flusk-api-key secret already exists"
fi

if ! gcloud secrets describe flusk-hmac-secret >/dev/null 2>&1; then
    HMAC_SECRET=$(openssl rand -hex 32)
    echo -n "$HMAC_SECRET" | gcloud secrets create flusk-hmac-secret --data-file=-
    success "Created flusk-hmac-secret secret"
else
    warn "flusk-hmac-secret secret already exists"
fi

if ! gcloud secrets describe flusk-encryption-key >/dev/null 2>&1; then
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo -n "$ENCRYPTION_KEY" | gcloud secrets create flusk-encryption-key --data-file=-
    success "Created flusk-encryption-key secret"
else
    warn "flusk-encryption-key secret already exists"
fi

log "🏗️ Building dependencies..."
pnpm install --frozen-lockfile
pnpm build

log "🧪 Running tests..."
pnpm test

log "🐳 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

log "📤 Pushing to Container Registry..."
gcloud auth configure-docker --quiet
docker push $IMAGE_NAME:latest

log "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production,PORT=8080,HOST=0.0.0.0" \
    --set-secrets="FLUSK_API_KEY=flusk-api-key:latest" \
    --set-secrets="FLUSK_HMAC_SECRET=flusk-hmac-secret:latest" \
    --set-secrets="ENCRYPTION_KEY=flusk-encryption-key:latest" \
    --memory=512Mi \
    --cpu=1000m \
    --min-instances=0 \
    --max-instances=10 \
    --timeout=300 \
    --port=8080

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

success "🎉 Deployment completed successfully!"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  Project: $PROJECT_ID"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  URL: $SERVICE_URL"
echo ""
echo -e "${GREEN}🔗 Test your deployment:${NC}"
echo "  Health: curl $SERVICE_URL/health"
echo "  Ready: curl $SERVICE_URL/health/ready"
echo ""
echo -e "${YELLOW}🔑 To get API key for testing:${NC}"
echo "  gcloud secrets versions access latest --secret=flusk-api-key"
echo ""
echo -e "${BLUE}📊 Monitor your service:${NC}"
echo "  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"