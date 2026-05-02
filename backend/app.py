import os
import base64
import uuid
import re
import bcrypt
from datetime import datetime, timedelta
from io import BytesIO

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from PIL import Image, ImageDraw
import numpy as np
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
jwt = JWTManager(app)

# CORS setup
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
CORS(app, origins=cors_origins)

# Database setup - imports database manager which auto-initializes MySQL
from database import db_manager, Scan, User
SessionLocal = db_manager.SessionLocal

# Load YOLO model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'best.pt')
model = None

def get_model():
    global model
    if model is None:
        print(f"Loading YOLO model from {MODEL_PATH}")
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        print(f"Model file exists, size: {os.path.getsize(MODEL_PATH)} bytes")
        model = YOLO(MODEL_PATH)
        print(f"Model loaded successfully")
    return model

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def draw_boxes(image, detections):
    """Draw bounding boxes on image"""
    draw = ImageDraw.Draw(image)
    for det in detections:
        bbox = det['bbox']  # [x1, y1, x2, y2]
        label = det['label']
        confidence = det['confidence']
        
        # Draw rectangle
        draw.rectangle(bbox, outline='#013220', width=3)
        
        # Draw label
        text = f"{label} {confidence:.2f}"
        draw.text((bbox[0], bbox[1] - 20), text, fill='#013220')
    
    return image

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": model is not None})

@app.route('/api/detect', methods=['POST'])
def detect():
    db = None
    try:
        # Get user ID from session or generate temporary
        user_id = request.headers.get('X-User-ID', str(uuid.uuid4()))
        
        # Check if image is provided
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Read image
        image_bytes = file.read()
        image = Image.open(BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run YOLO detection
        print(f"Running detection for user {user_id}, file: {file.filename}")
        yolo_model = get_model()
        results = yolo_model(np.array(image))
        
        # Parse detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                label = yolo_model.names[class_id]
                
                detections.append({
                    "label": label,
                    "confidence": round(confidence, 4),
                    "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                    "class_id": class_id
                })
        
        print(f"Detected {len(detections)} objects")
        
        # Draw boxes on image
        annotated_image = draw_boxes(image.copy(), detections)
        
        # Resize images to reduce base64 size (max 800px dimension)
        max_size = (800, 800)
        
        # Convert original image to base64 (resized)
        original_resized = image.copy()
        original_resized.thumbnail(max_size, Image.Resampling.LANCZOS)
        original_buffered = BytesIO()
        original_resized.save(original_buffered, format="JPEG", quality=85)
        original_image_base64 = base64.b64encode(original_buffered.getvalue()).decode('utf-8')
        
        # Convert annotated image to base64 (resized)
        annotated_resized = annotated_image.copy()
        annotated_resized.thumbnail(max_size, Image.Resampling.LANCZOS)
        annotated_buffered = BytesIO()
        annotated_resized.save(annotated_buffered, format="JPEG", quality=85)
        annotated_image_base64 = base64.b64encode(annotated_buffered.getvalue()).decode('utf-8')
        
        # Save to database
        print("Saving to database...")
        db = SessionLocal()
        scan = Scan(
            user_id=user_id,
            filename=file.filename,
            result_json=detections,
            original_image_base64=original_image_base64,
            annotated_image_base64=annotated_image_base64
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        print(f"Scan saved with ID: {scan.id}")
        
        return jsonify({
            "id": scan.id,
            "timestamp": scan.timestamp.isoformat(),
            "filename": file.filename,
            "detections": detections,
            "original_image_base64": original_image_base64,
            "annotated_image_base64": annotated_image_base64,
            "total_detections": len(detections)
        })
        
    except Exception as e:
        import traceback
        print(f"Error during detection: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    finally:
        if db:
            db.close()

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        db = SessionLocal()
        scans = db.query(Scan).filter(Scan.user_id == user_id).order_by(Scan.timestamp.desc()).all()
        db.close()
        
        history = []
        for scan in scans:
            detection_count = len(scan.result_json) if scan.result_json else 0
            history.append({
                "id": scan.id,
                "timestamp": scan.timestamp.isoformat(),
                "filename": scan.filename,
                "detection_count": detection_count,
                "original_image": scan.original_image_base64,
                "annotated_image": scan.annotated_image_base64,
                "detections": scan.result_json
            })
        
        return jsonify({"scans": history})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/<scan_id>', methods=['GET'])
def get_scan_detail(scan_id):
    try:
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        db = SessionLocal()
        scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
        db.close()
        
        if not scan:
            return jsonify({"error": "Scan not found"}), 404
        
        return jsonify({
            "id": scan.id,
            "timestamp": scan.timestamp.isoformat(),
            "filename": scan.filename,
            "detections": scan.result_json,
            "original_image_base64": scan.original_image_base64,
            "annotated_image_base64": scan.annotated_image_base64,
            "total_detections": len(scan.result_json) if scan.result_json else 0
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/<scan_id>', methods=['DELETE'])
def delete_scan(scan_id):
    try:
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        db = SessionLocal()
        scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
        
        if not scan:
            db.close()
            return jsonify({"error": "Scan not found"}), 404
        
        db.delete(scan)
        db.commit()
        db.close()
        
        return jsonify({"message": "Scan deleted successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== AUTH ENDPOINTS ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def is_valid_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validation
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400
        
        if len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters"}), 400
        
        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        db = SessionLocal()
        
        # Check if email exists
        if db.query(User).filter(User.email == email).first():
            db.close()
            return jsonify({"error": "Email already registered"}), 409
        
        # Check if username exists
        if db.query(User).filter(User.username == username).first():
            db.close()
            return jsonify({"error": "Username already taken"}), 409
        
        # Create user
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Generate token
        access_token = create_access_token(identity=user.id)
        
        db.close()
        
        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            },
            "access_token": access_token
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        db = SessionLocal()
        user = db.query(User).filter(User.email == email).first()
        
        if not user or not verify_password(password, user.password_hash):
            db.close()
            return jsonify({"error": "Invalid email or password"}), 401
        
        access_token = create_access_token(identity=user.id)
        
        db.close()
        
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            },
            "access_token": access_token
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        db = SessionLocal()
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Don't reveal if email exists
            db.close()
            return jsonify({"message": "If the email exists, a reset link will be sent"}), 200
        
        # Generate reset token
        reset_token = str(uuid.uuid4())
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        
        db.commit()
        db.close()
        
        # In production, send email here
        # For now, return token in response (for testing)
        return jsonify({
            "message": "Password reset token generated",
            "reset_token": reset_token,  # Remove in production - send via email
            "expires_in": "1 hour"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        
        if not token or not new_password:
            return jsonify({"error": "Token and new password are required"}), 400
        
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        db = SessionLocal()
        user = db.query(User).filter(User.reset_token == token).first()
        
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            db.close()
            return jsonify({"error": "Invalid or expired token"}), 400
        
        # Update password and clear token
        user.password_hash = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        
        db.commit()
        db.close()
        
        return jsonify({"message": "Password reset successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    try:
        user_id = get_jwt_identity()
        
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            db.close()
            return jsonify({"error": "User not found"}), 404
        
        result = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        
        db.close()
        
        return jsonify({"user": result})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true')
