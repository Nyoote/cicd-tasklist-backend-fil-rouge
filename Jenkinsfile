pipeline {
    agent any

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
        SONAR_PROJECT_KEY = 'faustine-cicd-tasklist-backend'

        LOCAL_IMAGE = 'jenkins-with-docker'
        DOCKERHUB_IMAGE = 'nyoote/tasklist-backend'

        DOCKER_BUILDKIT = '1'
    }

    stages {

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Generate Prisma client') {
            steps {
                sh 'npm run prisma:generate'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm run test:coverage'
                sh 'mkdir -p reports coverage'
                sh 'cp reports/junit.xml reports/junit-unit.xml'
                sh 'cp coverage/lcov.info coverage/unit.lcov.info'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit-unit.xml'
                }
            }
        }

        stage('E2E tests') {
            steps {
                sh 'npm run test:e2e:coverage'
                sh 'cp reports/junit.xml reports/junit-e2e.xml'
                sh 'cp coverage/lcov.info coverage/e2e.lcov.info'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit-e2e.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([
                    string(credentialsId: 'faustine-sonar-token', variable: 'SONAR_TOKEN')
                ]) {
                    sh '''
                        docker run --rm \
                          -e SONAR_HOST_URL="$SONAR_HOST_URL" \
                          -e SONAR_TOKEN="$SONAR_TOKEN" \
                          -e SONAR_PROJECT_KEY="$SONAR_PROJECT_KEY" \
                          -v "$PWD:/usr/src" \
                          sonarsource/sonar-scanner-cli
                    '''
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t ${LOCAL_IMAGE} .'
            }
        }

        stage('Trivy Scan') {
            steps {
                sh '''
                    mkdir -p reports
                    trivy image \
                      --format json \
                      -o reports/trivy-vulnerabilities.json \
                      ${LOCAL_IMAGE}
                '''
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'reports/trivy-vulnerabilities.json'
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''
                    trivy image \
                      --format cyclonedx \
                      -o reports/sbom.cdx.json \
                      ${LOCAL_IMAGE}
                '''
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'reports/sbom.cdx.json'
                }
            }
        }

        stage('Push Docker image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'nyoote-dockerhub-password',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

                        docker tag ${LOCAL_IMAGE} ${DOCKERHUB_IMAGE}:${BUILD_NUMBER}
                        docker tag ${LOCAL_IMAGE} ${DOCKERHUB_IMAGE}:latest

                        docker push ${DOCKERHUB_IMAGE}:${BUILD_NUMBER}
                        docker push ${DOCKERHUB_IMAGE}:latest

                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts allowEmptyArchive: true,
                artifacts: 'coverage/*.lcov.info,reports/*.json,reports/*.xml'

            cleanWs()
        }
    }
}