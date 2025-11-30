# Video Converter Microservices Application Documentation

## Overview

This project is a Python-based microservices application deployed on AWS Elastic Kubernetes Service (EKS) that converts MP4 video files to MP3 audio files. It uses a Jenkins CI/CD pipeline to build images, push to ECR, install/update dependencies via Helm, and apply Kubernetes manifests automatically. Services: Auth, Gateway, Converter, Frontend. Data layer: PostgreSQL (users), MongoDB (files), RabbitMQ (jobs). The React frontend lets users register, log in, upload, check status, and download.

## 🎬 Demo Video

https://github.com/user-attachments/assets/7cb1adc2-380a-4060-b04b-9560a73d4e69

[▶️ Watch demo video](Demo_Video.mp4)

## Architecture

<p align="center">
  <img src="Project Architecture.png" width="1083" title="Architecture" alt="Architecture">
  </p>

The application consists of the following components:

### Services

1. **Auth Service** (`auth-service`)
   - **Technology**: Flask, PostgreSQL, JWT
   - **Port**: 5000
   - **Functionality**: Handles user authentication and JWT token generation/validation
   - **Database**: PostgreSQL (authdb table: auth_user with email/password)
   - **Endpoints**:
     - `POST /login`: Authenticates user and returns JWT token

2. **Gateway Service** (`gateway-service`)
   - **Technology**: Flask, PyMongo, GridFS, Pika, JWT
   - **Port**: 8080 (NodePort: 30002)
   - **Functionality**: API gateway for file upload/download, auth validation, and storage operations
   - **Endpoints**:
     - `POST /login`: Proxies to auth service
     - `POST /upload`: Accepts MP4 file upload, stores in MongoDB, publishes to RabbitMQ 'video' queue
     - `GET /download?fid=<file_id>`: Downloads converted MP3 file from MongoDB

3. **Converter Service** (`converter-service`)
   - **Technology**: Pika, PyMongo, GridFS, MoviePy
   - **Functionality**: Consumes messages from 'video' queue, converts MP4 to MP3 using MoviePy, stores MP3 in MongoDB
   - **Process**:
     - Downloads video from MongoDB GridFS
     - Extracts audio using MoviePy
     - Saves MP3 to MongoDB GridFS (with metadata linking the original video_fid)

4. Removed: Notification Service (email)
   - Email notifications have been removed. Conversion progress is tracked via the gateway `/status` endpoint using the original `video_fid`.

5. **Frontend Service** (`frontend-service`)
   - **Technology**: React, Vite, Tailwind CSS, Nginx
   - **Port**: 80 (NodePort: 30001)
   - **Functionality**: User interface for login, video upload, conversion status checking, and MP3 download
   - **Components**:
     - Login: Authenticates user and obtains JWT token
     - Upload: Allows MP4 file selection and upload to gateway
     - Status: Polls conversion status using file ID
     - Download: Downloads converted MP3 file
   - **Proxy Configuration**: Nginx proxies /api requests to gateway service

### Databases and Message Queue

- **PostgreSQL**: Deployed via Helm chart, stores user credentials
- **MongoDB**: Deployed via Helm chart, stores video and MP3 files using GridFS
- **RabbitMQ**: Deployed via Helm chart, handles async message passing between services
  - Queue: 'video' (for converter)

### Infrastructure

- **Kubernetes**: All services deployed as Deployments with ConfigMaps and Secrets
- **Helm Charts**: Used for deploying databases and RabbitMQ
- **AWS EKS**: Kubernetes cluster on AWS
- **Storage**: Persistent Volumes for databases

## Application Flow

1. User authenticates via `POST /login` with email/password
2. Receives JWT token
3. Uploads MP4 file via `POST /upload` with Authorization header containing JWT
4. Gateway validates JWT, stores file in MongoDB, publishes message to 'video' queue
5. Converter consumes message, downloads video, converts to MP3, stores MP3
6. User checks `/status?fid=<video_fid>`; once completed, the status returns `mp3_fid`
7. User downloads MP3 via `GET /download?fid=<mp3_fid>` with JWT

## Deployment

### CI/CD (Jenkins) — current flow
- Pipeline stages: configure kubeconfig for EKS, Helm install/upgrade MongoDB, PostgreSQL (runs init.sql to create `auth_user`), and RabbitMQ (auto-loads `definitions.json` to create the durable `video` queue), ensure `ecr-secret` exists, login to ECR, build/push images (auth/gateway/converter/frontend), then `kubectl apply` manifests.
- Configure env in `Jenkinsfile`: `AWS_DEFAULT_REGION`, `AWS_ACCOUNT_ID`, `CLUSTER_NAME`.
- Jenkins host needs Docker, Helm, kubectl, AWS CLI, and an IAM role with ECR push and EKS access.
- GitHub webhook or SCM polling triggers builds on push.

### Manual steps (if not using Jenkins)
1. Deploy databases and RabbitMQ via Helm:
   ```
   helm upgrade --install mongodb  ./Helm_charts/MongoDB
   helm upgrade --install postgres ./Helm_charts/Postgres
   helm upgrade --install rabbitmq ./Helm_charts/RabbitMQ
   ```
2. Queue creation: automatic. RabbitMQ StatefulSet loads `definitions.json` and creates the `video` queue at startup (no UI step needed).
3. Deploy microservices:
   ```
   kubectl apply -f src/auth-service/manifest/
   kubectl apply -f src/gateway-service/manifest/
   kubectl apply -f src/converter-service/manifest/
   kubectl apply -f frontend-service/manifest/   # if provided
   ```
4. Create image pull secret (for private ECR):
   ```
   kubectl create secret docker-registry ecr-secret \
     --docker-server=<account>.dkr.ecr.<region>.amazonaws.com \
     --docker-username=AWS \
     --docker-password=$(aws ecr get-login-password --region <region>) \
     --docker-email=none
   kubectl patch deployment frontend --type='json' -p='[{"op": "add", "path": "/spec/template/spec/imagePullSecrets", "value": [{"name": "ecr-secret"}]}]'
   ```

### Important
PostgreSQL table creation is automated on first start (init.sql mounted into `/docker-entrypoint-initdb.d/`). If needed manually:
kubectl exec -it deployment/postgres-deploy -- psql -U mohamed -d authdb -c "CREATE TABLE IF NOT EXISTS auth_user (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL);"


### Environment Variables

- **Auth Service**:
  - DATABASE_PASSWORD
  - JWT_SECRET

- **Gateway Service**:
  - MONGODB_URI
  - JWT_SECRET

- **Converter Service**:
  - MONGODB_URI
  - VIDEO_QUEUE=video

## Frontend Usage

Access the application at `http://nodeIP:30001` (replace nodeIP with your EKS node external IP, e.g., 44.200.235.233:30001).

### Commands cheat sheet and quick user Workflow:
1. **Register**: Create a user with your email and password (or use the seeded account)
2. **Login**: Enter your email and password
3. **Convert**: Select an MP4 and click Convert. The UI polls status in the background.
4. **Download**: When conversion finishes, the page shows “Status: completed — Ready! Click Download MP3”. Click to download immediately.

## API Usage

### Register
```bash
curl -X POST http://nodeIP:30002/register -u email:password
```

### Login
```bash
curl -X POST http://nodeIP:30002/login -u email:password
```

### Upload
```bash
curl -X POST -F 'file=@video.mp4' -H 'Authorization: Bearer <JWT>' http://nodeIP:30002/upload
```

### Status Check
```bash
curl -X GET -H 'Authorization: Bearer <JWT>' "http://nodeIP:30002/status?fid=<video_fid>"
```

### Download
```bash
curl -X GET -H 'Authorization: Bearer <JWT>' "http://nodeIP:30002/download?fid=<mp3_fid>" -o output.mp3
```

## Monitoring and Troubleshooting

- Check pod status: `kubectl get pods`
- View logs: `kubectl logs deployment/<service-name>`
- Check queue: Access RabbitMQ management UI at nodeIP:30004 (username: guest, password: guest)
- Database access: Use kubectl exec to connect to postgres/mongodb pods
- Frontend access: http://nodeIP:30001
- Gateway API: http://nodeIP:30002
- PostgreSQL: nodeIP:30003
- MongoDB: nodeIP:30005

## Security Considerations

- JWT tokens for authentication
- Secrets stored in Kubernetes Secrets
  (Email notifications removed)
- Persistent volumes for data storage

## Development

Each service is containerized with Docker. Source code is in `src/` directory with service-specific subdirectories. Requirements.txt files list Python dependencies.


## Future Improvements

- Implement Redis for caching
- Add more comprehensive logging and monitoring with Prometheus/Grafana
- Enhance security with TLS/SSL encryption
- Improve frontend with real-time status updates using WebSockets
