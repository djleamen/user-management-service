# Docker Deployment Guide

Complete guide for containerizing and deploying the User Management Service using Docker and Docker Compose.

## 📋 Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- 2GB+ available disk space
- 1GB+ available RAM

## 🗂️ Docker Files Overview

```
.
├── Dockerfile                    # Multi-stage build for Node.js app
├── docker-compose.yml            # Base orchestration config
├── docker-compose.dev.yml        # Development overrides
├── docker-compose.prod.yml       # Production overrides
├── .dockerignore                 # Excludes files from image
├── .env.example                  # Environment template
└── init-mongo.js                 # MongoDB initialization script
```

## 🚀 Quick Start

### 1. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred editor
nano .env  # or vim, code, etc.
```

**Important:** Update these values in `.env`:
- `JWT_SECRET` - Use a strong random string
- `MONGODB_ROOT_PASSWORD` - Set a secure password
- `CORS_ORIGIN` - Set your frontend URL

### 2. Development Environment

```bash
# Start both app and MongoDB containers
docker-compose up

# Or run in background (detached mode)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

**With development overrides (hot reload):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 3. Production Environment

```bash
# Set required environment variables
export JWT_SECRET="your-production-secret-here"
export MONGODB_ROOT_PASSWORD="secure-password-here"
export MONGODB_URI="mongodb://admin:${MONGODB_ROOT_PASSWORD}@mongodb:27017/learning-platform?authSource=admin"

# Start with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check health status
docker-compose ps
```

## 🔧 Common Commands

### Container Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ deletes data)
docker-compose down -v

# Restart services
docker-compose restart

# View running containers
docker-compose ps
```

### Logs and Monitoring

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f mongodb

# View last 100 lines
docker-compose logs --tail=100
```

### Building and Updating

```bash
# Rebuild images (after code changes)
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Accessing Services

```bash
# Execute commands in running container
docker-compose exec app sh
docker-compose exec mongodb mongosh

# Run one-off commands
docker-compose run --rm app npm run populate-db

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123
```

## 🏗️ Architecture

### Container Structure

```
┌─────────────────────────────────────────┐
│          Docker Host                     │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  user-management-network (bridge)  │ │
│  │                                    │ │
│  │  ┌──────────────┐  ┌────────────┐ │ │
│  │  │     app      │  │  mongodb   │ │ │
│  │  │  (Node.js)   ├─►│  (Mongo)   │ │ │
│  │  │  Port: 3000  │  │ Port: 27017│ │ │
│  │  └──────┬───────┘  └─────┬──────┘ │ │
│  │         │                  │       │ │
│  └─────────┼──────────────────┼───────┘ │
│            │                  │         │
│            ▼                  ▼         │
│     Host:3000       mongodb_data volume │
└─────────────────────────────────────────┘
```

### Multi-Stage Build

The Dockerfile uses a multi-stage build process:

1. **Builder Stage**: Installs dependencies
2. **Production Stage**: Creates minimal runtime image

**Benefits:**
- 60-70% smaller image size
- Improved security (fewer packages)
- Faster deployments

## 🔐 Security Best Practices

### 1. Environment Variables

**Never commit sensitive data!**

```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Use strong passwords
# Minimum 16 characters, mix of upper/lower/numbers/symbols
```

### 2. Network Isolation

- App and MongoDB communicate on isolated bridge network
- MongoDB port not exposed to host in production
- Only app port (3000) exposed externally

### 3. Non-Root User

The container runs as non-root user `nodejs` (UID 1001) for security.

### 4. Health Checks

Both services have health checks:
- **App**: HTTP GET `/health` endpoint
- **MongoDB**: `mongosh` ping command

Docker automatically restarts unhealthy containers.

## 📊 Resource Management

### Development Limits

```yaml
MongoDB: 1 CPU, 1GB RAM
App:     0.5 CPU, 512MB RAM
```

### Production Limits

```yaml
MongoDB: 2 CPUs, 2GB RAM
App:     1 CPU, 768MB RAM
```

Adjust in `docker-compose.*.yml` based on your needs.

## 🗄️ Data Persistence

### Volumes

Data persists across container restarts using named volumes:

```bash
# List volumes
docker volume ls | grep user-management

# Inspect volume
docker volume inspect user-management-mongodb-data

# Backup database
docker-compose exec mongodb mongodump --out /backup
docker cp user-management-mongo:/backup ./backup

# Restore database
docker cp ./backup user-management-mongo:/backup
docker-compose exec mongodb mongorestore /backup
```

### ⚠️ Removing Volumes

```bash
# Stop and remove containers + volumes
docker-compose down -v  # This deletes ALL data!

# Remove specific volume
docker volume rm user-management-mongodb-data
```

## 🧪 Testing

### Populate Test Data

```bash
# Run population script inside container
docker-compose exec app npm run populate-db

# Or as one-off command
docker-compose run --rm app npm run populate-db
```

### API Testing

```bash
# From host machine
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Run test script
bash tests/api-test.sh
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app
docker-compose logs mongodb

# Check if port is already in use
lsof -i :3000
lsof -i :27017

# Rebuild without cache
docker-compose build --no-cache
```

### Database Connection Issues

```bash
# Verify MongoDB is healthy
docker-compose ps

# Check network connectivity
docker-compose exec app ping mongodb

# Test MongoDB connection
docker-compose exec app node -e "
  const mongoose = require('mongoose');
  mongoose.connect('mongodb://admin:admin123@mongodb:27017/learning-platform?authSource=admin')
    .then(() => console.log('✓ Connected'))
    .catch(err => console.error('✗ Failed:', err.message));
"
```

### Reset Everything

```bash
# Nuclear option: remove everything and start fresh
docker-compose down -v
docker system prune -a --volumes
docker-compose up -d --build
```

### Memory Issues

```bash
# Check resource usage
docker stats

# Increase Docker Desktop memory (Preferences → Resources)
# Or adjust limits in docker-compose.*.yml
```

## 🚀 Production Deployment

### 1. Cloud Platforms

#### AWS ECS/Fargate
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag user-management-app:latest <account>.dkr.ecr.us-east-1.amazonaws.com/user-management:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/user-management:latest
```

#### Google Cloud Run
```bash
gcloud builds submit --tag gcr.io/<project-id>/user-management
gcloud run deploy user-management --image gcr.io/<project-id>/user-management --platform managed
```

#### Azure Container Instances
```bash
az acr build --registry <registry-name> --image user-management:latest .
az container create --resource-group <rg> --name user-management --image <registry-name>.azurecr.io/user-management:latest
```

### 2. Orchestration

#### Docker Swarm
```bash
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml user-management
```

#### Kubernetes
Convert using Kompose:
```bash
kompose convert -f docker-compose.yml -f docker-compose.prod.yml
kubectl apply -f .
```

## 📝 Environment Variables Reference

See [.env.example](.env.example) for complete list.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | App port | `3000` | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `JWT_EXPIRATION` | Access token lifetime | `24h` | No |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` | No |
| `CORS_ORIGIN` | Allowed CORS origins | `*` | No |
| `LOG_LEVEL` | Logging verbosity | `info` | No |

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: your-registry/user-management:latest
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

## 🆘 Support

- Review logs: `docker-compose logs -f`
- Check health: `docker-compose ps`
- Verify connectivity: `docker-compose exec app ping mongodb`
- MongoDB shell: `docker-compose exec mongodb mongosh -u admin -p admin123`

---

**Need help?** Open an issue or refer to the main [README.md](README.md)
