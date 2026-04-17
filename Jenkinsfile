pipeline {
    agent any

    stages {

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
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy image auth-service

                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy image appointment-service
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo "Deployment step"
            }
        }
    }
}