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

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
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
                sh """
                    trivy image --severity CRITICAL,HIGH --format table \
                    ${DOCKER_IMAGE}:${DOCKER_TAG} > trivy-report.txt
                """
            }
        }

        stage('Generate SBOM') {
            steps {
                sh """
                    trivy image --format spdx-json \
                    --output sbom-spdx.json \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}
                """
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