import os

JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "newsapp_secret_key_change_in_prod"
)

JWT_ALGORITHM = "HS256"