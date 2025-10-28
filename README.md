# Video Converter Microservices Application Documentation

## Overview

This project is a Python-based microservices application deployed on AWS Elastic Kubernetes Service (EKS) that converts MP4 video files to MP3 audio files. The application follows a microservices architecture with five main services: Auth Service, Gateway Service, Converter Service, Notification Service, and Frontend Service. It utilizes PostgreSQL for authentication data, MongoDB for file storage, and RabbitMQ for message queuing. The frontend provides a user-friendly React interface for login, upload, status checking, and download operations.

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
   - **Functionality**: Consumes messages from 'video' queue, converts MP4 to MP3 using MoviePy, stores MP3 in MongoDB, publishes completion message to 'mp3' queue
   - **Process**:
     - Downloads video from MongoDB GridFS
     - Extracts audio using MoviePy
     - Saves MP3 to MongoDB GridFS
     - Publishes JSON message with video_fid, mp3_fid, username to 'mp3' queue

4. **Notification Service** (`notification-service`)
   - **Technology**: Pika, smtplib, EmailMessage
   - **Functionality**: Consumes messages from 'mp3' queue, sends email notification with MP3 file ID
   - **Email Configuration**: Uses Gmail SMTP with app-specific password for 2FA-enabled accounts

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
  - Queues: 'video' (for converter), 'mp3' (for notification)

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
5. Converter consumes message, downloads video, converts to MP3, stores MP3, publishes to 'mp3' queue
6. Notification consumes message, sends email with MP3 file ID
7. User downloads MP3 via `GET /download?fid=<mp3_fid>` with JWT

## Deployment

### Prerequisites

- AWS Account with EKS cluster
- Helm installed
- kubectl configured
- Python 3.x
- AWS CLI

### Steps

1. Deploy databases and RabbitMQ using Helm charts:
   ```
   helm install mongodb ./Helm_charts/MongoDB
   helm install postgres ./Helm_charts/Postgres
   helm install rabbitmq ./Helm_charts/RabbitMQ
   ```

2. Create queues in RabbitMQ (via web UI at nodeIP:30004):
   - 'video' queue
   - 'mp3' queue

3. Deploy microservices:
   ```
   kubectl apply -f auth-service/manifest/
   kubectl apply -f gateway-service/manifest/
   kubectl apply -f converter-service/manifest/
   kubectl apply -f notification-service/manifest/
   kubectl apply -f frontend-service/manifest/
   ```

4. Configure email in `notification-service/manifest/secret.yaml` with Gmail credentials

5. For ECR-based frontend image, create image pull secret:
   ```
   kubectl create secret docker-registry ecr-secret --docker-server=<account>.dkr.ecr.us-east-1.amazonaws.com --docker-username=AWS --docker-password=$(aws ecr get-login-password --region us-east-1) --docker-email=none
   kubectl patch deployment frontend --type='json' -p='[{"op": "add", "path": "/spec/template/spec/imagePullSecrets", "value": [{"name": "ecr-secret"}]}]'
   ```

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
  - MP3_QUEUE=mp3

- **Notification Service**:
  - MP3_QUEUE=mp3
  - GMAIL_ADDRESS
  - GMAIL_PASSWORD

## Frontend Usage

Access the application at `http://nodeIP:30001` (replace nodeIP with your EKS node external IP, e.g., 44.200.235.233:30001).

### User Workflow
1. **Login**: Enter email `rodrigorobert490@gmail.com` and password `123456`
2. **Upload**: Select an MP4 video file and click upload
3. **Status**: Monitor conversion progress (polls every 5 seconds)
4. **Download**: Once ready, download the MP3 file

## API Usage

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
- Check queues: Access RabbitMQ management UI at nodeIP:30004 (username: guest, password: guest)
- Database access: Use kubectl exec to connect to postgres/mongodb pods
- Frontend access: http://nodeIP:30001
- Gateway API: http://nodeIP:30002
- PostgreSQL: nodeIP:30003
- MongoDB: nodeIP:30005

## Security Considerations

- JWT tokens for authentication
- Secrets stored in Kubernetes Secrets
- Gmail app passwords for email notifications
- Persistent volumes for data storage

## Development

Each service is containerized with Docker. Source code is in `src/` directory with service-specific subdirectories. Requirements.txt files list Python dependencies.

## Cleanup

To destroy the infrastructure:
1. Delete node groups
2. Delete EKS cluster
