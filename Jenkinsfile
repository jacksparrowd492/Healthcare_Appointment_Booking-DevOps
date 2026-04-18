pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "pikachu7"
        IMAGE_TAG = "v1.${BUILD_NUMBER}"
    }

    stages {
        stage('SonarQube Analysis') {
            steps {
                script {
                    // This pulls the installation path from Global Tool Configuration
                    def scannerHome = tool 'sonar-scanner' 
                    
                    withSonarQubeEnv('sonarqube') {
                        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                            sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=healthcare-app \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=http://localhost:9000 \
                            -Dsonar.login=\$SONAR_TOKEN
                            """
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
                    // This requires the SonarQube Webhook to be configured in SonarQube
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Auth Service') {
            steps {
                dir('auth-service') {
                    sh "docker build -t $DOCKERHUB_USER/auth-service:$IMAGE_TAG ."
                }
            }
        }

        stage('Build Appointment Service') {
            steps {
                dir('appointment-service') {
                    sh "docker build -t $DOCKERHUB_USER/appointment-service:$IMAGE_TAG ."
                }
            }
        }

        stage('Security Scan (Trivy)') {
            steps {
                sh """
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy image --severity HIGH,CRITICAL $DOCKERHUB_USER/auth-service:$IMAGE_TAG || true

                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy image --severity HIGH,CRITICAL $DOCKERHUB_USER/appointment-service:$IMAGE_TAG || true
                """
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                }
            }
        }

        stage('Push Images') {
            steps {
                sh """
                docker push $DOCKERHUB_USER/auth-service:$IMAGE_TAG
                docker push $DOCKERHUB_USER/appointment-service:$IMAGE_TAG
                """
            }
        }

        stage('Update Kubernetes Manifest') {
            steps {
                sh """
                sed -i 's|auth-service:.*|auth-service:$IMAGE_TAG|' k8s/*.yaml
                sed -i 's|appointment-service:.*|appointment-service:$IMAGE_TAG|' k8s/*.yaml
                """
            }
        }

        stage('Push Updated Manifest to Git') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-creds', 
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_PASS'
                )]) {
                    sh """
                    git config user.name "jenkins"
                    git config user.email "jenkins@example.com"
                    
                    # Prevent "counter cannot decrease" error
                    git pull https://\$GIT_USER:\$GIT_PASS@github.com/jacksparrowd492/Healthcare_Appointment_Booking-DevOps.git main --rebase

                    git add k8s/*.yaml
                    git commit -m "Update image tag to $IMAGE_TAG [skip ci]" || true
                    git push https://\$GIT_USER:\$GIT_PASS@github.com/jacksparrowd492/Healthcare_Appointment_Booking-DevOps.git HEAD:main
                    """
                }
            }
        }
    }
}