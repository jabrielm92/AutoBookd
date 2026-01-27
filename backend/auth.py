"""
Authentication & Multi-tenancy Module for AutoBookd SaaS
- JWT-based authentication
- Email verification with Resend
- Stripe subscription management
- Tenant isolation
"""
import os
import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# JWT Config
JWT_SECRET = os.environ.get("JWT_SECRET", "autobookd_secret_key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "jabriel@arisolutionsinc.com")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=None):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)


async def send_verification_email(email: str, token: str, resend_api_key: str):
    """Send verification email via Resend"""
    if not resend_api_key:
        print(f"[DEV] Verification link: /verify-email?token={token}")
        return True
    
    base_url = os.environ.get("FRONTEND_URL")
    if not base_url:
        print(f"[DEV] FRONTEND_URL not set. Verification link: /verify-email?token={token}")
        return True
    verify_url = f"{base_url}/verify-email?token={token}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_api_key}"},
            json={
                "from": "AutoBookd <autobookd@arisolutionsinc.com>",
                "to": [email],
                "subject": "Verify your AutoBookd account",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #dc2626; margin: 0;">AutoBookd</h1>
                        <p style="color: #666; margin: 5px 0 0 0;">by ARI Solutions Inc.</p>
                    </div>
                    <h2 style="color: #333;">Welcome to AutoBookd!</h2>
                    <p style="color: #555; line-height: 1.6;">
                        Thank you for signing up. Please verify your email address to get started.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verify_url}" style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    <p style="color: #888; font-size: 14px;">
                        If the button doesn't work, copy and paste this link:<br>
                        <a href="{verify_url}" style="color: #dc2626;">{verify_url}</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        © 2025 ARI Solutions Inc. All rights reserved.
                    </p>
                </div>
                """
            }
        )
        return response.status_code in [200, 201]


async def send_contact_email(name: str, email: str, message: str, resend_api_key: str):
    """Send contact form submission via Resend"""
    if not resend_api_key:
        print(f"[DEV] Contact from {name} ({email}): {message}")
        return True
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_api_key}"},
            json={
                "from": "AutoBookd <autobookd@arisolutionsinc.com>",
                "to": ["autobookd@arisolutionsinc.com"],
                "subject": f"New Contact Form Submission from {name}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">New Contact Form Submission</h2>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                        {message}
                    </div>
                </div>
                """
            }
        )
        return response.status_code in [200, 201]


def is_admin(user: dict) -> bool:
    return user.get("email") == ADMIN_EMAIL or user.get("role") == "admin"


# User schema for creation
def create_user_dict(email: str, password: str, name: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "email": email.lower(),
        "password_hash": hash_password(password),
        "name": name,
        "role": "admin" if email.lower() == ADMIN_EMAIL.lower() else "user",
        "email_verified": False,
        "verification_token": generate_verification_token(),
        "subscription_status": "none",  # none, trial, active, cancelled, expired
        "subscription_id": None,
        "stripe_customer_id": None,
        "trial_ends_at": None,
        "subscription_ends_at": None,
        "onboarding_completed": False,
        "api_keys": {
            "serpapi": None,
            "hunter": None,
            "apollo": None,
            "openai": None,
            "calendly": None,
            "resend": None
        },
        "settings": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_login_at": None
    }
