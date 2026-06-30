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

        stage('Trivy scan') {
            steps {
                sh 'npm run trivy:scan'
            }
        }

        stage('Generate SBOM') {
            when { expression { shouldRunStage('Generate SBOM', ['Jenkinsfile', 'package.json', 'package-lock.json', 'src/**', 'prisma/**', 'Dockerfile', 'docker-compose.yml', 'docker-compose.ci.yml']) } }
            steps { sh 'npm run trivy:sbom' }
            post {
                success { markStageSuccess('Generate SBOM') }
                always { archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/sbom.cdx.json' }
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
      archiveArtifacts allowEmptyArchive: true, artifacts: 'coverage/*.lcov.info,reports/*.json,reports/*.xml'
      cleanWs()
    }
  }
}