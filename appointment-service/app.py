from flask import Flask, request, jsonify
import jwt
from pymongo import MongoClient
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_cors import CORS
import os
import sys

app = Flask(__name__)
CORS(app)

# Use environment variables for secrets
SECRET = os.getenv("JWT_SECRET", "secret123")

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "healthcare@example.com")

# Improved MongoDB Connection Logic
MONGO_HOST = os.getenv("MONGO_HOST", "mongo")
MONGO_PORT = os.getenv("MONGO_PORT", "27017")
MONGO_USER = os.getenv("MONGO_USER", "")
MONGO_PASS = os.getenv("MONGO_PASS", "")
MONGO_DB = os.getenv("MONGO_DB", "healthcare")

# Constructing URI based on whether credentials are provided
if MONGO_USER and MONGO_PASS:
    # Use this if your Docker Compose/K8s has MONGO_INITDB_ROOT_USERNAME
    MONGO_URI = f"mongodb://{MONGO_USER}:{MONGO_PASS}@{MONGO_HOST}:{MONGO_PORT}/?authSource=admin"
else:
    MONGO_URI = f"mongodb://{MONGO_HOST}:{MONGO_PORT}/"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Trigger a connection to check if it's actually valid
    client.admin.command('ping')
    db = client[MONGO_DB]
    appointments = db["appointments"]
    print(f"Connected to MongoDB at {MONGO_HOST}")
except Exception as e:
    print(f"CRITICAL: Could not connect to MongoDB: {e}")
    # In a DevOps pipeline, we want the container to fail if DB is unreachable
    # sys.exit(1) 

def verify(req):
    token = req.headers.get("Authorization")
    if not token:
        return None
    # Handle 'Bearer <token>' format
    if token.startswith("Bearer "):
        token = token.split(" ")[1]
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception as e:
        print(f"JWT Verification Failed: {e}")
        return None

def send_confirmation_email(to_email, patient_name, doctor, date, appointment_id):
    """Send appointment confirmation email to patient"""
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Appointment Confirmation - Healthcare System"

        body = f"""
Dear {patient_name},

Your appointment has been successfully booked!

Appointment Details:
- Doctor: Dr. {doctor}
- Date & Time: {date}
- Appointment ID: {appointment_id}

Please arrive 15 minutes before your scheduled appointment.
Thank you for choosing our healthcare services.

Best regards,
Healthcare Team
        """
        msg.attach(MIMEText(body, 'plain'))

        if SMTP_USERNAME and SMTP_PASSWORD:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            return True
        else:
            print(f"DEBUG [EMAIL SIMULATION]: To: {to_email} | Sub: {msg['Subject']}")
            return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

@app.route('/book', methods=['POST'])
def book():
    user = verify(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    if not data or 'doctor' not in data or 'date' not in data:
        return jsonify({"error": "Missing doctor or date"}), 400

    appointment_doc = {
        "user": str(user.get("id") or user.get("_id")),
        "user_email": user.get("email", ""),
        "user_name": user.get("username", "Patient"),
        "doctor": data["doctor"],
        "date": data["date"],
        "department": data.get("department", "General"),
        "symptoms": data.get("symptoms", ""),
        "status": "confirmed"
    }

    try:
        result = appointments.insert_one(appointment_doc)
        appointment_id = str(result.inserted_id)

        email_sent = False
        if user.get("email"):
            email_sent = send_confirmation_email(
                user["email"],
                user.get("username", "Patient"),
                data["doctor"],
                data["date"],
                appointment_id
            )

        return jsonify({
            "message": "Appointment booked successfully",
            "appointment_id": appointment_id,
            "email_sent": email_sent
        }), 201
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/appointments', methods=['GET'])
def get_appointments():
    user = verify(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        user_id = str(user.get("id") or user.get("_id"))
        result = list(appointments.find({"user": user_id}, {"_id": 0}))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def home():
    return jsonify({"service": "Appointment Service", "status": "UP"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5006)