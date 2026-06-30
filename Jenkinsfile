pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('nyoote-dockerhub-password')
        SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
        SONAR_TOKEN            = credentials('faustine-sonar-token')
        SONAR_PROJECT_KEY      = 'faustine-cicd-tasklist-backend'
        IMAGE_NAME             = "nyoote/tasklist-backend"
        IMAGE_TAG              = "${env.BUILD_NUMBER}"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Generate Prisma client') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('End-to-end tests') {
            steps {
                sh 'npm run test:e2e:coverage'
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml', allowEmptyResults: true
                }
            }
        }

        stage('SonarQube analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    withCredentials([
                        string(credentialsId: 'faustine-sonar-token', variable: 'SONAR_TOKEN')
                    ]) {
                        sh '''
                            docker run --rm \
                            -v "$(pwd):/usr/src" \
                            -w /usr/src \
                            sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=src \
                            -Dsonar.tests=src/__tests__ \
                            -Dsonar.test.inclusions=src/__tests__/**/*.test.ts \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.sourceEncoding=UTF-8 \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.token=${SONAR_TOKEN}
                        '''
                    }
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

        stage('Build Docker image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Trivy security scan') {
            steps {
                sh """
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v \$(pwd):/report \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 1 \
                        --format json \
                        --output /report/trivy-report.json \
                        ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                sh """
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v \$(pwd):/report \
                        anchore/syft:latest \
                        ${IMAGE_NAME}:${IMAGE_TAG} \
                        -o spdx-json=/report/sbom-spdx.json
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom-spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Push Docker image') {
            steps {
                sh """
                    echo "\$DOCKERHUB_CREDENTIALS_PSW" | docker login -u "\$DOCKERHUB_CREDENTIALS_USR" --password-stdin
                    docker push ${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${IMAGE_NAME}:latest
                    docker logout
                """
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}