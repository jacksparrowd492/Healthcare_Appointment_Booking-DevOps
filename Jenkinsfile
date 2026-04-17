pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                git 'https://github.com/<your-username>/healthcare-devops.git'
            }
        }

        stage('Build Auth Service') {
            steps {
                dir('auth-service') {
                    sh 'docker build -t auth-service .'
                }
            }
        }

        stage('Build Appointment Service') {
            steps {
                dir('appointment-service') {
                    sh 'docker build -t appointment-service .'
                }
            }
        }

        stage('Security Scan (Trivy)') {
            steps {
                sh '''
                docker run --rm aquasec/trivy image auth-service
                docker run --rm aquasec/trivy image appointment-service
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh 'kubectl apply -f k8s/'
            }
        }
    }
}