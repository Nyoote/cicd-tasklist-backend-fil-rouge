pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        DOCKER_IMAGE = "nyoote/tasklist-backend"
        DOCKER_TAG = "${BUILD_NUMBER}"

        SONAR_HOST_URL = "https://sonarqube.cicd.kits.ext.educentre.fr"
        SONAR_PROJECT_KEY = "faustine-cicd-tasklist-backend"
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
                    docker build \
                        -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                        -t ${DOCKER_IMAGE}:latest .
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
                        ${DOCKER_IMAGE}:${DOCKER_TAG} || true

                    trivy image \
                        --severity HIGH,CRITICAL \
                        --format json \
                        --output reports/trivy-report.json \
                        ${DOCKER_IMAGE}:${DOCKER_TAG} || true

                    ls -lah reports
                '''
            }

            post {
                always {
                    archiveArtifacts artifacts: 'reports/', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''
                    docker run --rm \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v $PWD:/workspace \
                    aquasec/trivy image \
                    --format spdx-json \
                    --output /workspace/sbom.spdx.json \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}
                '''
            }

            post {
                always {
                    archiveArtifacts artifacts: 'sbom.spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Docker login & push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds-id',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

                        docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest

                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push ${DOCKER_IMAGE}:latest

                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts allowEmptyArchive: true,
                artifacts: 'coverage/*.lcov.info,reports/*.json,reports/*.txt,sbom.spdx.json'
            cleanWs()
        }
    }
}