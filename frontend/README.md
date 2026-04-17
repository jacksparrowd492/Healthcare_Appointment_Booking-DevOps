# Healthcare Appointment Frontend

A modern, responsive web interface for the Healthcare Appointment Booking System.

## Features

- **User Authentication**: Login and signup with JWT tokens
- **Appointment Booking**: Select department, doctor, date/time, and enter symptoms
- **Email Confirmations**: Automatic confirmation emails sent after booking
- **Appointment History**: View all your booked appointments
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Using Docker Compose (Recommended)

1. Start all services:
   ```bash
   docker-compose up --build
   ```

2. Open the application:
   - Frontend: http://localhost:8080
   - Auth API: http://localhost:5000
   - Appointment API: http://localhost:5001

### Development Mode

1. Start backend services:
   ```bash
   docker-compose up mongo auth appointment
   ```

2. Open `index.html` directly in your browser or use a local server:
   ```bash
   cd frontend
   npx serve .
   ```

## Email Configuration

To enable real email sending, update the `docker-compose.yml` with your SMTP credentials:

```yaml
appointment:
  environment:
    - SMTP_SERVER=smtp.gmail.com
    - SMTP_PORT=587
    - SMTP_USERNAME=your-email@gmail.com
    - SMTP_PASSWORD=your-app-password
    - FROM_EMAIL=healthcare@example.com
```

For Gmail, use an App Password (not your regular password).

## Project Structure

```
frontend/
├── index.html      # Main HTML page
├── styles.css      # Modern CSS styling
├── app.js          # JavaScript application logic
├── dockerfile      # Nginx container configuration
└── README.md       # This file
```

## API Endpoints

The frontend communicates with:

- **Auth Service** (port 5000)
  - `POST /register` - Create new account
  - `POST /login` - Authenticate user

- **Appointment Service** (port 5001)
  - `POST /book` - Book new appointment
  - `GET /appointments` - Get user's appointments
