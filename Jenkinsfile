pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "nyoote/tasklist-backend"
        DOCKER_CREDENTIALS_ID = "nyoote-dockerhub-password"
        DOCKER_TAG = "local"

        SONAR_HOST_URL = "https://sonarqube.cicd.kits.ext.educentre.fr"
        SONAR_PROJECT_KEY = "faustine-cicd-tasklist-backend"
        SONAR_TOKEN = credentials("faustine-sonar-token")

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

        stage('Trivy scan') {
            steps {
                sh '''
                    mkdir -p reports

                    trivy image \
                    --severity HIGH,CRITICAL \
                    --format table \
                    --output reports/trivy-report.txt \
                    $DOCKER_IMAGE:$IMAGE_TAG || true

                    trivy image \
                    --severity HIGH,CRITICAL \
                    --format json \
                    --output reports/trivy-report.json \
                    $DOCKER_IMAGE:$IMAGE_TAG || true

                    ls -lah reports
                '''
            }

            post {
                always {
                    archiveArtifacts artifacts: 'reports/', fingerprint: true, allowEmptyArchive: false
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: DOCKER_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        trivy image \
                          --format spdx-json \
                          --output sbom.spdx.json \
                          ${DOCKER_USERNAME}/tasklist-backend:${BUILD_NUMBER}
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom.spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Docker push') {
            steps {
                sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
                sh 'docker push $DOCKER_IMAGE:$IMAGE_TAG'
                sh 'docker push $DOCKER_IMAGE:latest'
            }
        }
    }

    post {
    always {
      archiveArtifacts allowEmptyArchive: true, artifacts: 'coverage/*.lcov.info,reports/*.json,reports/*.xml'
      cleanWs()
    }
  }
}