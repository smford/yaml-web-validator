// Default samples for YAML Web Validator
export interface SampleFile {
  id: string;
  name: string;
  category: string;
  description: string;
  yaml: string;
}

export const DOCKER_COMPOSE_SAMPLE = `version: '3.8'

# Reusable Anchor Definitions & Logging Presets
x-logging: &default-logging
  driver: 'json-file'
  options:
    max-size: '50m'
    max-file: '5'

x-environment: &common-env
  ENVIRONMENT: production
  LOG_LEVEL: info
  REGION: eu-west-1
  METRICS_ENABLED: 'true'

x-resources: &standard-limits
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1024M
      reservations:
        cpus: '0.2'
        memory: 256M

services:
  # API Gateway using merge keys for logging and resource limits
  api-gateway:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    logging: *default-logging
    <<: *standard-limits
    environment:
      <<: *common-env
      SERVICE_NAME: api-gateway

  # Authentication Service with merged env and limits
  auth-service:
    image: company/auth:v2.4
    logging: *default-logging
    <<: *standard-limits
    environment:
      <<: *common-env
      SERVICE_NAME: auth-service
      PORT: 4000
    depends_on:
      - redis

  # Background Worker using shared logging
  worker:
    image: company/worker:v1.9
    logging: *default-logging
    environment:
      <<: *common-env
      QUEUE_CONCURRENCY: 10

  redis:
    image: redis:7-alpine
    logging: *default-logging
    ports:
      - '6379:6379'
`;

export const KUBERNETES_SAMPLE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-processor
  namespace: finance
  labels:
    app: payment-processor
    tier: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-processor
  template:
    metadata:
      labels:
        app: payment-processor
    spec:
      # Common Security Context Anchor
      securityContext: &podSecurity
        runAsNonRoot: true
        runAsUser: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: app
          image: internal.registry/payments:v3.1.2
          securityContext: *podSecurity
          resources: &standardResources
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          env:
            - name: DB_HOST
              value: db-primary.internal
            - name: DB_PORT
              value: "5432"

        - name: sidecar-metrics
          image: prometheus/statsd-exporter:v0.22.8
          securityContext: *podSecurity
          resources: *standardResources
`;

export const BROKEN_SAMPLE = `# Intentional errors to test diagnostics:
# 1. Dangling alias (*db_credentials anchor does not exist)
# 2. Unused anchor (&unused_secret_key)
# 3. Bad indentation on line 14

server:
  host: 0.0.0.0
  port: 8080
  database:
    driver: postgresql
    credentials: *db_credentials

secrets:
  api_key: &unused_secret_key "sk-proj-99887766"

monitoring:
  enabled: true
    bad_indentation_here: true
`;
