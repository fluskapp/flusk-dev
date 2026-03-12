# Deploy to AWS ECS Fargate

## Prerequisites

- AWS CLI configured
- Docker
- An AWS account with ECR, ECS, and VPC set up

## Steps

### 1. Create ECR repository

```bash
aws ecr create-repository --repository-name flusk-observability --region eu-west-1
```

### 2. Build & push Docker image

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export REGION=eu-west-1

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build & push
docker build -t flusk-observability .
docker tag flusk-observability:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/flusk-observability:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/flusk-observability:latest
```

### 3. Create EFS for SQLite persistence

```bash
aws efs create-file-system --creation-token flusk-data --region $REGION
# Note the FileSystemId and update task-definition.json
```

### 4. Register task definition

```bash
# Update ACCOUNT_ID, REGION, and EFS_ID in task-definition.json first
aws ecs register-task-definition --cli-input-json file://deploy/aws/task-definition.json
```

### 5. Create ECS cluster & service

```bash
aws ecs create-cluster --cluster-name flusk

aws ecs create-service \
  --cluster flusk \
  --service-name flusk-api \
  --task-definition flusk-observability \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID],securityGroups=[SG_ID],assignPublicIp=ENABLED}"
```

### 6. Set up ALB (optional)

For production, add an Application Load Balancer with HTTPS termination in front of the ECS service.

## Costs

- Fargate: ~$9/month for 0.25 vCPU + 512MB running 24/7
- EFS: ~$0.30/GB/month
- ALB: ~$16/month + data transfer
