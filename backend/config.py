import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'newsapp_secret_key_change_in_prod')
JWT_ALGORITHM = 'HS256'

# Super Admin
SUPER_ADMIN_EMAIL = "matrixguinea@gmail.com"

# Categories
CATEGORIES = ["Actualité", "Politique", "Sport", "Technologie", "Économie"]

# Procedures subcategories
PROCEDURE_SUBCATEGORIES = {
    "guinee": "Guinée", "canada": "Canada", "france": "France",
    "usa": "États-Unis", "turquie": "Turquie", "japon": "Japon",
    "allemagne": "Allemagne", "chine": "Chine"
}

# Upload
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_IMAGES_DIR = UPLOAD_DIR / "images"
UPLOAD_VIDEOS_DIR = UPLOAD_DIR / "videos"
UPLOAD_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 20 * 1024 * 1024
