pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "pikachu7"
        IMAGE_TAG = "v1.${BUILD_NUMBER}"
    }

    stages {

        stage('Clone Repo') {
            steps {
                git 'https://github.com/jacksparrowd492/Healthcare_Appointment_Booking-DevOps.git'
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
                aquasec/trivy image --severity HIGH,CRITICAL auth-service || true

                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy image --severity HIGH,CRITICAL appointment-service || true
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
                    sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
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
                sed -i 's|auth-service:.*|auth-service:$IMAGE_TAG|' k8s/auth-deployment.yaml
                sed -i 's|appointment-service:.*|appointment-service:$IMAGE_TAG|' k8s/appointment-deployment.yaml
                """
            }
        }

        stage('Push Updated Manifest to Git') {
            steps {
                sh """
                git config user.name "jenkins"
                git config user.email "jenkins@example.com"
                git add .
                git commit -m "Update image tag to $IMAGE_TAG"
                git push origin main
                """
            }
        }
    }
}