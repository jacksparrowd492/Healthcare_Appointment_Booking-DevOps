pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "pikachu7"
        IMAGE_TAG = "v1.${BUILD_NUMBER}"
    }

    tools {
        // Make sure sonar-scanner is configured in Jenkins
        sonarScanner 'sonar-scanner'
    }

    stages {

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh """
                        sonar-scanner \
                          -Dsonar.projectKey=healthcare-app \
                          -Dsonar.sources=. \
                          -Dsonar.host.url=http://localhost:9000 \
                          -Dsonar.login=$SONAR_TOKEN
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
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
                    # Setup identity
                    git config user.name "jenkins"
                    git config user.email "jenkins@example.com"
                    
                    # 1. Pull the latest changes from GitHub to prevent "counter decrease" errors
                    # We use --rebase to keep the history clean
                    git pull https://\$GIT_USER:\$GIT_PASS@github.com/jacksparrowd492/Healthcare_Appointment_Booking-DevOps.git main --rebase

                    # 2. Add the changed manifest files
                    git add k8s/*.yaml
                    
                    # 3. Commit the changes (|| true prevents failure if there's nothing new to commit)
                    git commit -m "Update image tag to $IMAGE_TAG [skip ci]" || true
                    
                    # 4. Push back to the main branch
                    git push https://\$GIT_USER:\$GIT_PASS@github.com/jacksparrowd492/Healthcare_Appointment_Booking-DevOps.git HEAD:main
                    """
                }
            }
        }
    }
}