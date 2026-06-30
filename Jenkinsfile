pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "nyoote/tasklist-backend"
        DOCKER_TAG = "local"

        SONAR_HOST_URL = "https://sonarqube.cicd.kits.ext.educentre.fr"
        SONAR_PROJECT_KEY = "faustine-cicd-tasklist-backend"

        DOCKERHUB_CREDENTIALS = "dockerhub-creds-id"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Prisma Generate') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Unit Tests (coverage)') {
            steps {
                sh 'npm run test:coverage'
            }
        }

        stage('E2E Tests (coverage)') {
            steps {
                sh 'npm run test:e2e:coverage'
            }
        }

        stage('SonarQube analysis and Quality Gate') {
            steps {
                withCredentials([string(credentialsId: 'faustine-sonar-token', variable: 'SONAR_TOKEN')]) {
                sh '''
                    docker compose -f docker-compose.ci.yml run --rm \
                    -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
                    -e SONAR_TOKEN="${SONAR_TOKEN}" \
                    -e SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY}" \
                    sonar-scanner
                '''
                }
            }
        }

    

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                """
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy:latest image \
                --severity CRITICAL,HIGH \
                --format table \
                nyoote/tasklist-backend:local
                '''
            }
        }

       stage('Generate SBOM') {
            steps {
                sh '''
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v $WORKSPACE:/workspace \
                aquasec/trivy:latest image \
                --format spdx-json \
                --output /workspace/sbom-spdx.json \
                nyoote/tasklist-backend:local
                '''
            }
        }

        stage('Publish Reports') {
            steps {
                archiveArtifacts artifacts: 'trivy-report.txt,sbom-spdx.json', fingerprint: true
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKERHUB_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}