pipeline {
    agent any

    environment {
        AWS_DEFAULT_REGION = "us-east-1"
        AWS_ACCOUNT_ID     = "814992167159"
        ECR_REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
        IMAGE_TAG          = "${env.GIT_COMMIT ?: 'latest'}"
        CLUSTER_NAME       = "Microservices"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Configure kubeconfig') {
            steps {
                sh '''
                  aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_DEFAULT_REGION"
                '''
            }
        }

        stage('Deploy infra (Helm)') {
            steps {
                sh '''
                  helm upgrade --install mongodb  ./Helm_charts/MongoDB
                  helm upgrade --install postgres ./Helm_charts/Postgres
                  helm upgrade --install rabbitmq ./Helm_charts/RabbitMQ

                  kubectl create secret docker-registry ecr-secret \
                    --docker-server="$ECR_REGISTRY" \
                    --docker-username=AWS \
                    --docker-password="$(aws ecr get-login-password --region "$AWS_DEFAULT_REGION")" \
                    --docker-email=none \
                    --dry-run=client -o yaml | kubectl apply -f -
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                  aws ecr get-login-password --region "$AWS_DEFAULT_REGION" | \
                  docker login --username AWS --password-stdin "$ECR_REGISTRY"
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                  docker build -t "$ECR_REGISTRY/auth:$IMAGE_TAG"       src/auth-service
                  docker build -t "$ECR_REGISTRY/gateway:$IMAGE_TAG"    src/gateway-service
                  docker build -t "$ECR_REGISTRY/converter:$IMAGE_TAG"  src/converter-service
                  docker build -t "$ECR_REGISTRY/frontend:$IMAGE_TAG"   frontend-service
                '''
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                  docker push "$ECR_REGISTRY/auth:$IMAGE_TAG"
                  docker push "$ECR_REGISTRY/gateway:$IMAGE_TAG"
                  docker push "$ECR_REGISTRY/converter:$IMAGE_TAG"
                  docker push "$ECR_REGISTRY/frontend:$IMAGE_TAG"
                '''
            }
        }

        stage('Update deployment images') {
            steps {
                sh '''
                  kubectl set image deployment/auth \
                    auth="$ECR_REGISTRY/auth:$IMAGE_TAG"
                  kubectl set image deployment/gateway \
                    gateway="$ECR_REGISTRY/gateway:$IMAGE_TAG"
                  kubectl set image deployment/converter \
                    converter="$ECR_REGISTRY/converter:$IMAGE_TAG"
                  kubectl set image deployment/frontend \
                    frontend="$ECR_REGISTRY/frontend:$IMAGE_TAG"

                  kubectl rollout status deployment/auth
                  kubectl rollout status deployment/gateway
                  kubectl rollout status deployment/converter
                  kubectl rollout status deployment/frontend
                '''
            }
        }

        stage('Cleanup old ReplicaSets') {
            steps {
                sh '''
                  OLD_RS=$(kubectl get rs --no-headers | awk '$2==0 && $3==0 && $4==0 {print $1}')
                  if [ -n "$OLD_RS" ]; then
                    echo "Deleting old ReplicaSets with 0 desired/current/ready:"
                    echo "$OLD_RS"
                    kubectl delete rs $OLD_RS
                  else
                    echo "No old ReplicaSets to clean up."
                  fi
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                sh '''
                  # Make sure kubeconfig is set; uncomment if you want Jenkins to set it:
                  # aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_DEFAULT_REGION"

                  kubectl apply -f src/auth-service/manifest
                  kubectl apply -f src/gateway-service/manifest
                  kubectl apply -f src/converter-service/manifest
                  kubectl apply -f frontend-service/manifest || true  # if you add manifests here later
                '''
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
    }
}
