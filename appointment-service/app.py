from flask import Flask, request, jsonify
import jwt
from pymongo import MongoClient
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)
SECRET = "secret123"

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "healthcare@example.com")

# Support both Docker (mongo) and localhost MongoDB
MONGO_HOST = os.getenv("MONGO_HOST", "mongo")
MONGO_PORT = os.getenv("MONGO_PORT", "27017")
client = MongoClient(f"mongodb://{MONGO_HOST}:{MONGO_PORT}/")
db = client["healthcare"]
appointments = db["appointments"]

def verify(req):
    token = req.headers.get("Authorization")
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except:
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
If you need to reschedule or cancel, please contact us at least 24 hours in advance.

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
            # Log email content for demo purposes when no SMTP configured
            print(f"[EMAIL TO: {to_email}]")
            print(body)
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
    appointment_doc = {
        "user": str(user["id"]),
        "user_email": user.get("email", ""),
        "user_name": user.get("username", ""),
        "doctor": data["doctor"],
        "date": data["date"],
        "department": data.get("department", "General"),
        "symptoms": data.get("symptoms", ""),
        "status": "confirmed"
    }

    result = appointments.insert_one(appointment_doc)
    appointment_id = str(result.inserted_id)

    # Send confirmation email
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
    })

@app.route('/appointments', methods=['GET'])
def get_appointments():
    user = verify(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    result = list(appointments.find({"user": str(user["id"])}, {"_id": 0}))
    return jsonify(result)

@app.route('/')
def home():
    return "Appointment Service Running"

app.run(host="0.0.0.0", port=5001)