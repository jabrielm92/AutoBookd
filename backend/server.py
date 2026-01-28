from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Query, UploadFile, File, Depends, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import json
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with SSL fix for Atlas
mongo_url = os.environ['MONGO_URL']
# Add TLS settings for MongoDB Atlas compatibility
if 'mongodb+srv' in mongo_url or 'mongodb.net' in mongo_url:
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsAllowInvalidCertificates=False,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000
    )
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'autobookd')]

# Import auth and stripe modules
from auth import (
    hash_password, verify_password, create_access_token, decode_token,
    generate_verification_token, send_verification_email, send_contact_email,
    create_user_dict, is_admin, security, ADMIN_EMAIL
)
from fastapi.security import HTTPAuthorizationCredentials

app = FastAPI(title="AutoBookd AI", version="2.0.0")
api_router = APIRouter(prefix="/api")

# ============== ENUMS ==============
class LeadStatus(str, Enum):
    SCRAPED = "scraped"
    UNCONTACTED = "uncontacted"
    OUTREACH_SENT = "outreach_sent"
    ENGAGED = "engaged"
    DISCOVERY = "discovery"
    QUALIFIED = "qualified"
    CALENDAR_OFFERED = "calendar_offered"
    BOOKED = "booked"
    STALLED = "stalled"
    DISQUALIFIED = "disqualified"

class NicheStatus(str, Enum):
    ACTIVE = "active"
    EXPANDING = "expanding"
    HOLDING = "holding"
    ABANDONED = "abandoned"

class OutreachChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    LINKEDIN = "linkedin"

# ============== MODELS ==============
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_name: str
    category: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = 0
    maps_url: Optional[str] = None
    lead_score: int = 0
    score_breakdown: Dict[str, int] = Field(default_factory=dict)
    status: LeadStatus = LeadStatus.UNCONTACTED
    pipeline_stage: Optional[str] = None
    niche_id: Optional[str] = None
    competitor_detected: Optional[str] = None
    pain_points: List[str] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    last_contacted_at: Optional[datetime] = None
    follow_up_count: int = 0
    email_opens: int = 0
    email_clicks: int = 0
    last_email_opened_at: Optional[str] = None
    last_email_clicked_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    business_name: str
    category: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = 0
    maps_url: Optional[str] = None
    niche_id: Optional[str] = None

class LeadBulkCreate(BaseModel):
    leads: List[LeadCreate]

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    channel: OutreachChannel = OutreachChannel.EMAIL
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    sentiment_trajectory: List[float] = Field(default_factory=list)
    current_sentiment: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    lead_id: str
    channel: OutreachChannel = OutreachChannel.EMAIL
    content: str
    direction: str = "outbound"  # outbound or inbound

class Niche(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    keywords: List[str]
    cities: List[str]
    status: NicheStatus = NicheStatus.ACTIVE
    leads_scraped: int = 0
    leads_contacted: int = 0
    replies: int = 0
    bookings: int = 0
    reply_rate: float = 0.0
    booking_rate: float = 0.0
    avg_deal_size: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NicheCreate(BaseModel):
    name: str
    keywords: List[str]
    cities: List[str]
    avg_deal_size: float = 0.0

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    meeting_date: datetime
    meeting_time: str
    timezone: str = "America/New_York"
    duration_minutes: int = 30
    notes: Optional[str] = None
    calendly_event_id: Optional[str] = None
    google_event_id: Optional[str] = None
    status: str = "scheduled"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    lead_id: str
    meeting_date: str
    meeting_time: str
    timezone: str = "America/New_York"
    duration_minutes: int = 30
    notes: Optional[str] = None

class EmailDomain(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    domain: str
    daily_sent_count: int = 0
    bounce_rate: float = 0.0
    warmup_complete: bool = False
    reputation_score: int = 100
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageVariant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    style_tags: List[str]
    template: str
    sends: int = 0
    replies: int = 0
    positive_replies: int = 0
    bookings: int = 0
    performance_score: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmailGuidelines(BaseModel):
    forbidden_words: List[str] = Field(default_factory=lambda: ["AI", "artificial intelligence", "machine learning", "automation", "bot", "automated"])
    preferred_words: List[str] = Field(default_factory=lambda: ["solutions", "streamline", "efficiency", "results", "growth"])
    tone: str = "professional"  # professional, friendly, conversational, direct
    max_words: int = 150
    rules: Dict[str, bool] = Field(default_factory=lambda: {
        "no_exclamation_marks": False,
        "always_include_question": True,
        "first_name_only": True,
        "no_competitor_mentions": True,
        "no_roi_promises": True
    })

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    features: Optional[List[str]] = Field(default_factory=list)
    email_guidelines: Optional[str] = None  # Custom AI prompt guidelines per product
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscoverySet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    keywords: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    min_reviews: int = 5
    max_per_search: int = 20
    daily_limit: int = 50
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "system_config"
    tenant_id: Optional[str] = None
    is_running: bool = False
    test_mode: bool = True  # Internal: True = DON'T send emails (draft only)
    auto_send_emails: bool = False  # UI toggle: True = send, False = draft only
    active_product_id: Optional[str] = None
    active_discovery_set_id: Optional[str] = None
    daily_outreach_limit: int = 50
    max_follow_ups: int = 2
    follow_up_days: int = 2  # Days to wait before follow-up if no reply
    auto_reply_enabled: bool = False  # Toggle AI auto-replies
    reply_domain: Optional[str] = None  # Domain for inbound replies (e.g., replies.domain.com)
    outreach_score_threshold: int = 70
    priority_score_threshold: int = 80
    serpapi_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    from_email: Optional[str] = None
    sender_name: Optional[str] = None
    sender_company: Optional[str] = None
    calendly_api_key: Optional[str] = None
    calendly_link: Optional[str] = None
    hunter_api_key: Optional[str] = None
    apollo_api_key: Optional[str] = None
    enrichment_provider: str = "hunter"  # "hunter" or "apollo"
    linkedin_cookie: Optional[str] = None
    google_calendar_credentials: Optional[str] = None
    email_guidelines: EmailGuidelines = Field(default_factory=EmailGuidelines)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemConfigUpdate(BaseModel):
    is_running: Optional[bool] = None
    test_mode: Optional[bool] = None
    active_product_id: Optional[str] = None
    active_discovery_set_id: Optional[str] = None
    daily_outreach_limit: Optional[int] = None
    max_follow_ups: Optional[int] = None
    follow_up_days: Optional[int] = None
    auto_reply_enabled: Optional[bool] = None
    auto_send_emails: Optional[bool] = None
    reply_domain: Optional[str] = None
    outreach_score_threshold: Optional[int] = None
    priority_score_threshold: Optional[int] = None
    serpapi_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    from_email: Optional[str] = None
    sender_name: Optional[str] = None
    sender_company: Optional[str] = None
    calendly_api_key: Optional[str] = None
    calendly_link: Optional[str] = None
    hunter_api_key: Optional[str] = None
    apollo_api_key: Optional[str] = None
    enrichment_provider: Optional[str] = None
    linkedin_cookie: Optional[str] = None
    google_calendar_credentials: Optional[str] = None
    email_guidelines: Optional[Dict[str, Any]] = None

class DiscoveryConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "discovery_config"
    enabled_sources: List[str] = Field(default_factory=lambda: ['reddit', 'jobs', 'web_search'])
    industries: List[str] = Field(default_factory=lambda: ['professional_services', 'home_services', 'field_services'])
    locations: List[str] = Field(default_factory=list)
    scope: str = "any"  # 'local' or 'any'
    cycle_interval_seconds: int = 300
    max_leads_per_cycle: int = 50
    min_intent_score: int = 30
    custom_keywords: List[str] = Field(default_factory=list)

class DiscoveryConfigUpdate(BaseModel):
    enabled_sources: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    scope: Optional[str] = None
    cycle_interval_seconds: Optional[int] = None
    max_leads_per_cycle: Optional[int] = None
    min_intent_score: Optional[int] = None
    custom_keywords: Optional[List[str]] = None

class Analytics(BaseModel):
    total_leads: int = 0
    leads_by_status: Dict[str, int] = Field(default_factory=dict)
    total_conversations: int = 0
    total_bookings: int = 0
    reply_rate: float = 0.0
    booking_rate: float = 0.0
    avg_score: float = 0.0
    niches_performance: List[Dict[str, Any]] = Field(default_factory=list)

# ============== HELPER FUNCTIONS ==============
def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert datetime to ISO string"""
    if doc is None:
        return None
    doc.pop('_id', None)
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

def calculate_lead_score(lead: dict) -> tuple[int, dict]:
    """Calculate lead score based on rubric v2.0"""
    score = 0
    breakdown = {}
    
    # Business Viability (30 pts)
    high_ticket_categories = ['roofing', 'hvac', 'plumbing', 'legal', 'medical', 'dental', 'solar', 'landscaping', 'remodeling', 'construction']
    category_lower = lead.get('category', '').lower()
    if any(cat in category_lower for cat in high_ticket_categories):
        breakdown['high_ticket_category'] = 15
        score += 15
    
    # Independent business detection
    franchise_keywords = ['franchise', 'chain', 'corp', 'inc.', 'llc']
    business_name = lead.get('business_name', '').lower()
    if not any(kw in business_name for kw in franchise_keywords):
        breakdown['independent_business'] = 10
        score += 10
    
    # Active business
    if lead.get('rating') and lead.get('review_count', 0) > 0:
        breakdown['active_business'] = 5
        score += 5
    
    # Digital Weakness (30 pts)
    website = lead.get('website', '')
    if not website or website == '':
        breakdown['no_website'] = 10
        score += 10
    else:
        # Assume no online booking for MVP
        breakdown['no_online_booking'] = 10
        score += 10
    
    breakdown['no_crm_detected'] = 10
    score += 10
    
    # Pain Signals (25 pts)
    review_count = lead.get('review_count', 0)
    if review_count < 50:
        breakdown['low_review_count'] = 10
        score += 10
    
    rating = lead.get('rating', 5.0)
    if rating and rating < 4.5:
        breakdown['negative_reviews'] = 10
        score += 10
    
    if review_count > 0:
        breakdown['recent_activity'] = 5
        score += 5
    
    # Reachability (15 pts)
    if lead.get('email'):
        breakdown['email_found'] = 10
        score += 10
    
    owner_keywords = ['family', 'owner', 'local', 'call me', 'personal']
    if any(kw in business_name for kw in owner_keywords):
        breakdown['owner_language'] = 5
        score += 5
    
    # Competitive Landscape (±20 pts)
    competitor = lead.get('competitor_detected')
    if competitor:
        breakdown['competitor_detected'] = -30
        score -= 30
    else:
        breakdown['no_competitor'] = 20
        score += 20
    
    return max(0, min(100, score)), breakdown

# ============== AUTH MODELS ==============
class UserSignup(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class ContactForm(BaseModel):
    name: str
    email: str
    message: str

# ============== AUTH HELPER ==============
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None

def get_user_tenant_filter(user: dict) -> dict:
    """Get MongoDB filter for user's data (tenant isolation)"""
    if is_admin(user):
        return {}  # Admin sees all
    return {"tenant_id": user["id"]}

# ============== API ROUTES ==============

# ----- Auth Routes -----
@api_router.post("/auth/signup")
async def signup(data: UserSignup, background_tasks: BackgroundTasks):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = create_user_dict(data.email, data.password, data.name)
    await db.users.insert_one(user)
    
    # Get resend API key from env var (global setting for signup emails)
    resend_key = os.environ.get("RESEND_API_KEY")
    
    # Send verification email
    background_tasks.add_task(
        send_verification_email, 
        data.email, 
        user["verification_token"],
        resend_key
    )
    
    return {"message": "Account created. Please check your email to verify.", "user_id": user["id"]}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Please verify your email first")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "user"),
            "subscription_status": user.get("subscription_status", "none"),
            "onboarding_completed": user.get("onboarding_completed", False)
        }
    }

@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    user = await db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True, "verification_token": None}}
    )
    
    return {"message": "Email verified successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user"),
        "subscription_status": user.get("subscription_status", "none"),
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription_ends_at": user.get("subscription_ends_at"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "api_keys": {k: bool(v) for k, v in user.get("api_keys", {}).items()}  # Return which keys are set, not values
    }

@api_router.post("/auth/resend-verification")
async def resend_verification(email: str, background_tasks: BackgroundTasks):
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        return {"message": "If email exists, verification link sent"}
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    new_token = generate_verification_token()
    await db.users.update_one({"id": user["id"]}, {"$set": {"verification_token": new_token}})
    
    resend_key = os.environ.get("RESEND_API_KEY")
    
    background_tasks.add_task(send_verification_email, email, new_token, resend_key)
    
    return {"message": "If email exists, verification link sent"}

# ----- Contact Form -----
@api_router.post("/contact")
async def submit_contact(data: ContactForm, background_tasks: BackgroundTasks):
    resend_key = os.environ.get("RESEND_API_KEY")
    
    background_tasks.add_task(send_contact_email, data.name, data.email, data.message, resend_key)
    
    # Store in DB for admin
    await db.contact_submissions.insert_one({
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Message sent successfully"}

# ----- Stripe Routes -----
@api_router.post("/stripe/create-checkout")
async def create_checkout(user: dict = Depends(get_current_user)):
    import stripe_service
    
    # Create Stripe customer if not exists
    if not user.get("stripe_customer_id"):
        customer_id = await stripe_service.create_stripe_customer(user["email"], user["name"])
        await db.users.update_one({"id": user["id"]}, {"$set": {"stripe_customer_id": customer_id}})
    else:
        customer_id = user["stripe_customer_id"]
    
    base_url = os.environ.get("FRONTEND_URL")
    if not base_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL environment variable not configured")
    
    checkout_url = await stripe_service.create_checkout_session(
        customer_id=customer_id,
        user_id=user["id"],
        success_url=f"{base_url}/onboarding?payment=success",
        cancel_url=f"{base_url}/pricing?payment=cancelled"
    )
    
    return {"checkout_url": checkout_url}

@api_router.post("/stripe/portal")
async def create_portal(user: dict = Depends(get_current_user)):
    import stripe_service
    
    if not user.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No subscription found")
    
    base_url = os.environ.get("FRONTEND_URL")
    if not base_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL environment variable not configured")
    portal_url = await stripe_service.create_portal_session(
        user["stripe_customer_id"],
        f"{base_url}/settings"
    )
    
    return {"portal_url": portal_url}

@api_router.get("/stripe/my-subscription")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """Get current user's subscription info"""
    import stripe_service
    
    result = {
        "subscription_status": user.get("subscription_status", "none"),
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription_ends_at": user.get("subscription_ends_at"),
        "stripe_customer_id": user.get("stripe_customer_id"),
        "subscription_id": user.get("subscription_id"),
        "next_payment_date": None,
        "plan_name": "AutoBookd Pro",
        "plan_price": "$29.99/month"
    }
    
    # Get live subscription data from Stripe if available
    if user.get("subscription_id"):
        try:
            sub_details = await stripe_service.get_subscription_status(user["subscription_id"])
            if sub_details:
                result["next_payment_date"] = sub_details.get("current_period_end")
                result["cancel_at_period_end"] = sub_details.get("cancel_at_period_end", False)
                result["trial_end"] = sub_details.get("trial_end")
        except Exception as e:
            print(f"Error fetching subscription: {e}")
    
    return result

@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    import stripe_service
    
    payload = await request.body()
    
    try:
        event = stripe_service.handle_webhook_event(payload, stripe_signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "subscription_status": "trial",
                    "subscription_id": session.get("subscription"),
                    "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
                }}
            )
    
    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        user = await db.users.find_one({"stripe_customer_id": sub["customer"]})
        if user:
            status = "active" if sub["status"] == "active" else sub["status"]
            if sub.get("cancel_at_period_end"):
                status = "cancelled"
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "subscription_status": status,
                    "subscription_ends_at": datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc).isoformat()
                }}
            )
    
    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user = await db.users.find_one({"stripe_customer_id": sub["customer"]})
        if user:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"subscription_status": "expired"}}
            )
    
    return {"received": True}

# ----- Onboarding Routes -----
@api_router.put("/user/api-keys")
async def update_api_keys(keys: Dict[str, Optional[str]], user: dict = Depends(get_current_user)):
    update_dict = {}
    for key, value in keys.items():
        if key in ["serpapi", "hunter", "apollo", "openai", "calendly", "resend"]:
            update_dict[f"api_keys.{key}"] = value
    
    if update_dict:
        await db.users.update_one({"id": user["id"]}, {"$set": update_dict})
    
    return {"message": "API keys updated"}

@api_router.post("/user/complete-onboarding")
async def complete_onboarding(user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"onboarding_completed": True}}
    )
    return {"message": "Onboarding completed"}

# ----- Admin Routes -----
@api_router.get("/admin/users")
async def admin_get_users(user: dict = Depends(get_current_user)):
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    
    # Add data usage stats for each user
    for u in users:
        lead_count = await db.leads.count_documents({"tenant_id": u["id"]})
        u["lead_count"] = lead_count
    
    return users

@api_router.get("/admin/analytics")
async def admin_get_analytics(user: dict = Depends(get_current_user)):
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    verified_users = await db.users.count_documents({"email_verified": True})
    subscribed_users = await db.users.count_documents({"subscription_status": {"$in": ["trial", "active"]}})
    total_leads = await db.leads.count_documents({})
    total_emails = await db.sequences.count_documents({})
    
    # Recent signups
    recent_signups = await db.users.find(
        {}, 
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "subscribed_users": subscribed_users,
        "total_leads": total_leads,
        "total_email_sequences": total_emails,
        "recent_signups": recent_signups
    }

@api_router.get("/admin/subscriptions")
async def admin_get_subscriptions(user: dict = Depends(get_current_user)):
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    import stripe_service
    subscriptions = await stripe_service.get_all_subscriptions()
    return subscriptions

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(get_current_user)):
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Delete user's data
    await db.leads.delete_many({"tenant_id": user_id})
    await db.sequences.delete_many({"tenant_id": user_id})
    await db.conversations.delete_many({"tenant_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    return {"message": "User and all data deleted"}

@api_router.get("/admin/contact-submissions")
async def admin_get_contacts(user: dict = Depends(get_current_user)):
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submissions = await db.contact_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return submissions

# ----- System Config -----
@api_router.get("/config", response_model=SystemConfig)
async def get_config(user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    config = await db.system_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        config = SystemConfig().model_dump()
        config['updated_at'] = config['updated_at'].isoformat()
        config['tenant_id'] = tenant_id
        config['id'] = f"config_{tenant_id}"
        await db.system_config.insert_one(config)
    return config

@api_router.put("/config", response_model=SystemConfig)
async def update_config(update: SystemConfigUpdate, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.system_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": update_data},
        upsert=True
    )
    config = await db.system_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return config

@api_router.post("/system/start")
async def start_system(
    background_tasks: BackgroundTasks, 
    auto_send_emails: bool = False,
    product_id: Optional[str] = None,
    discovery_set_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    if pipeline.is_running:
        return {"status": "already_running", "message": "Pipeline is already running"}
    
    tenant_id = user["id"]
    
    # Validate product and discovery set if provided
    if product_id:
        product = await db.products.find_one({"id": product_id, "tenant_id": tenant_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    
    if discovery_set_id:
        discovery_set = await db.discovery_sets.find_one({"id": discovery_set_id, "tenant_id": tenant_id}, {"_id": 0})
        if not discovery_set:
            raise HTTPException(status_code=404, detail="Discovery set not found")
        # Also update scrape config with discovery set settings
        await db.scrape_config.update_one(
            {"tenant_id": tenant_id},
            {"$set": {
                "keywords": discovery_set.get("keywords", []),
                "locations": discovery_set.get("locations", []),
                "min_reviews": discovery_set.get("min_reviews", 5),
                "max_per_search": discovery_set.get("max_per_search", 20),
                "daily_limit": discovery_set.get("daily_limit", 50)
            }},
            upsert=True
        )
    
    # Convert auto_send_emails to test_mode (inverted logic)
    test_mode = not auto_send_emails
    
    # Update config with selections
    await db.system_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "test_mode": test_mode,
            "auto_send_emails": auto_send_emails,
            "active_product_id": product_id,
            "active_discovery_set_id": discovery_set_id
        }},
        upsert=True
    )
    
    # Start pipeline in background
    background_tasks.add_task(pipeline.start)
    
    await db.system_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"is_running": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    mode_msg = " (Drafts Only - Emails Not Sent)" if not auto_send_emails else ""
    return {
        "status": "running", 
        "auto_send_emails": auto_send_emails,
        "product_id": product_id,
        "discovery_set_id": discovery_set_id,
        "message": f"Pipeline started{mode_msg}"
    }

@api_router.post("/system/stop")
async def stop_system(user: dict = Depends(get_current_user)):
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    await pipeline.stop()
    
    tenant_id = user["id"]
    await db.system_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"is_running": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "stopped", "message": "Pipeline stopped"}

@api_router.get("/pipeline/activity")
async def get_pipeline_activity(limit: int = 20, user: dict = Depends(get_current_user)):
    """Get real-time pipeline activity log"""
    tenant_id = user["id"]
    activities = await db.pipeline_activity.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Get current counts for this tenant
    tenant_filter = {"tenant_id": tenant_id}
    counts = {
        "scraped": await db.leads.count_documents(tenant_filter),
        "enriched": await db.leads.count_documents({**tenant_filter, "email": {"$exists": True, "$ne": None}}),
        "researched": await db.leads.count_documents({**tenant_filter, "research": {"$exists": True}}),
        "in_sequence": await db.leads.count_documents({**tenant_filter, "pipeline_stage": "in_sequence"}),
        "emails_sent": await db.sequences.count_documents({**tenant_filter, "current_step": {"$gt": 0}})
    }
    
    return {
        "activities": list(reversed(activities)),
        "counts": counts
    }

@api_router.post("/pipeline/activity")
async def log_pipeline_activity(data: Dict[str, Any], user: dict = Depends(get_current_user)):
    """Log a pipeline activity event"""
    tenant_id = user["id"]
    activity = {
        "id": str(uuid.uuid4()),
        "type": data.get("type", "info"),
        "stage": data.get("stage", "unknown"),
        "message": data.get("message", ""),
        "lead_name": data.get("lead_name"),
        "tenant_id": tenant_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.pipeline_activity.insert_one(activity)
    
    return {"status": "logged"}

@api_router.get("/system/status")
async def get_system_status():
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    # Get running config (tenant-aware)
    config = await db.system_config.find_one({"is_running": True}, {"_id": 0})
    if not config:
        config = await db.system_config.find_one({}, {"_id": 0})
    
    tenant_id = config.get("tenant_id") if config else None
    
    pipeline_analytics = await db.pipeline_analytics.find_one({"tenant_id": tenant_id}, {"_id": 0}) if tenant_id else None
    deliverability = await db.deliverability_stats.find_one({"tenant_id": tenant_id}, {"_id": 0}) if tenant_id else None
    
    return {
        "is_running": pipeline.is_running,
        "auto_send_emails": config.get("auto_send_emails", False) if config else False,
        "active_product_id": config.get("active_product_id") if config else None,
        "active_discovery_set_id": config.get("active_discovery_set_id") if config else None,
        "config": config,
        "pipeline_analytics": pipeline_analytics,
        "deliverability": deliverability
    }

# ----- Products -----
@api_router.get("/products")
async def get_products(user: dict = Depends(get_current_user)):
    """Get all saved products/services for current tenant"""
    products = await db.products.find({"tenant_id": user["id"]}, {"_id": 0}).to_list(100)
    return products

@api_router.post("/products")
async def create_product(data: Dict[str, Any], user: dict = Depends(get_current_user)):
    """Create a new product/service"""
    product = Product(
        name=data.get("name", ""),
        description=data.get("description", ""),
        features=data.get("features", [])
    )
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['tenant_id'] = user["id"]
    await db.products.insert_one(doc)
    return {"id": product.id, "status": "created"}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, data: Dict[str, Any], user: dict = Depends(get_current_user)):
    """Update a product/service"""
    update_data = {k: v for k, v in data.items() if k in ['name', 'description', 'features', 'email_guidelines']}
    await db.products.update_one({"id": product_id, "tenant_id": user["id"]}, {"$set": update_data})
    product = await db.products.find_one({"id": product_id, "tenant_id": user["id"]}, {"_id": 0})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    """Delete a product/service"""
    await db.products.delete_one({"id": product_id, "tenant_id": user["id"]})
    return {"status": "deleted"}

# ----- Discovery Sets -----
@api_router.get("/discovery-sets")
async def get_discovery_sets(user: dict = Depends(get_current_user)):
    """Get all saved discovery sets for current tenant"""
    sets = await db.discovery_sets.find({"tenant_id": user["id"]}, {"_id": 0}).to_list(100)
    return sets

@api_router.post("/discovery-sets")
async def create_discovery_set(data: Dict[str, Any], user: dict = Depends(get_current_user)):
    """Create a new discovery set"""
    discovery_set = DiscoverySet(
        name=data.get("name", ""),
        keywords=data.get("keywords", []),
        locations=data.get("locations", []),
        min_reviews=data.get("min_reviews", 5),
        max_per_search=data.get("max_per_search", 20),
        daily_limit=data.get("daily_limit", 50)
    )
    doc = discovery_set.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['tenant_id'] = user["id"]
    await db.discovery_sets.insert_one(doc)
    return {"id": discovery_set.id, "status": "created"}

@api_router.put("/discovery-sets/{set_id}")
async def update_discovery_set(set_id: str, data: Dict[str, Any], user: dict = Depends(get_current_user)):
    """Update a discovery set"""
    update_data = {k: v for k, v in data.items() if k in ['name', 'keywords', 'locations', 'min_reviews', 'max_per_search', 'daily_limit']}
    await db.discovery_sets.update_one({"id": set_id, "tenant_id": user["id"]}, {"$set": update_data})
    ds = await db.discovery_sets.find_one({"id": set_id, "tenant_id": user["id"]}, {"_id": 0})
    return ds

@api_router.delete("/discovery-sets/{set_id}")
async def delete_discovery_set(set_id: str, user: dict = Depends(get_current_user)):
    """Delete a discovery set"""
    await db.discovery_sets.delete_one({"id": set_id, "tenant_id": user["id"]})
    return {"status": "deleted"}

# ----- Reset Daily Limits -----
@api_router.post("/reset-daily-limits")
async def reset_daily_limits(user: dict = Depends(get_current_user)):
    """Reset daily scrape counter for the current tenant"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Delete today's stats for this tenant
    await db.daily_scrape_stats.delete_one({"date": today, "tenant_id": user.get("tenant_id")})
    
    # Also delete stats without tenant_id (legacy)
    await db.daily_scrape_stats.delete_one({"date": today, "tenant_id": {"$exists": False}})
    
    return {"status": "success", "message": "Daily limits reset successfully"}

# ----- Calendly Webhook -----
@api_router.post("/webhooks/calendly")
async def calendly_webhook(payload: Dict[str, Any]):
    """Handle Calendly booking events"""
    event_type = payload.get("event")
    event_data = payload.get("payload", {})
    
    if event_type == "invitee.created":
        # New booking created
        invitee = event_data.get("invitee", {})
        email = invitee.get("email", "").lower()
        name = invitee.get("name", "")
        event_start = event_data.get("event", {}).get("start_time")
        
        # Find lead by email
        lead = await db.leads.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0})
        
        if lead:
            # Update lead status
            await db.leads.update_one(
                {"id": lead["id"]},
                {"$set": {
                    "status": "booked",
                    "pipeline_stage": "booked",
                    "booked_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Stop any active sequences
            await db.sequences.update_many(
                {"lead_id": lead["id"], "status": "active"},
                {"$set": {"status": "completed", "stop_reason": "booked"}}
            )
            
            # Create booking record
            booking = {
                "id": str(uuid.uuid4()),
                "lead_id": lead["id"],
                "calendly_event_id": event_data.get("event", {}).get("uuid"),
                "invitee_email": email,
                "invitee_name": name,
                "meeting_date": event_start,
                "status": "scheduled",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.bookings.insert_one(booking)
            
            logger.info(f"Calendly booking received for lead: {lead['business_name']}")
            return {"status": "processed", "lead_id": lead["id"]}
        
        return {"status": "no_matching_lead", "email": email}
    
    elif event_type == "invitee.canceled":
        # Booking canceled
        invitee = event_data.get("invitee", {})
        email = invitee.get("email", "").lower()
        
        lead = await db.leads.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0})
        if lead:
            await db.leads.update_one(
                {"id": lead["id"]},
                {"$set": {
                    "status": "calendar_offered",
                    "pipeline_stage": "booking_canceled",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"status": "canceled", "lead_id": lead["id"]}
    
    return {"status": "ignored", "event": event_type}

# ----- Reply Processing -----
@api_router.post("/webhooks/email/reply")
async def process_email_reply(payload: Dict[str, Any]):
    """Process incoming email replies and classify intent"""
    from ai_engine import AIResearchEngine
    
    sender_email = payload.get("from", "").lower()
    subject = payload.get("subject", "")
    body = payload.get("body", "")
    
    # Find lead by email
    lead = await db.leads.find_one({"email": {"$regex": f"^{sender_email}$", "$options": "i"}}, {"_id": 0})
    if not lead:
        return {"status": "no_matching_lead", "email": sender_email}
    
    # Get tenant's config for AI processing
    tenant_id = lead.get("tenant_id")
    config = await db.system_config.find_one({"tenant_id": tenant_id}, {"_id": 0}) if tenant_id else None
    
    # Classify reply with AI
    openai_key = config.get("openai_api_key") if config else os.environ.get("OPENAI_API_KEY")
    ai_engine = AIResearchEngine(openai_key)
    classification = await ai_engine.classify_reply(body)
    await ai_engine.close()
    
    intent = classification.get("intent", "neutral")
    action = classification.get("action", "human_review")
    
    # Update lead status based on intent
    new_status = "engaged"
    if intent == "positive":
        new_status = "qualified"
    elif intent == "negative":
        new_status = "disqualified"
    
    await db.leads.update_one(
        {"id": lead["id"]},
        {"$set": {
            "status": new_status,
            "reply_intent": intent,
            "reply_action": action,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Stop sequences if negative
    if intent == "negative":
        await db.sequences.update_many(
            {"lead_id": lead["id"], "status": "active"},
            {"$set": {"status": "stopped", "stop_reason": "negative_reply"}}
        )
    
    # Record reply in conversation
    tenant_id = lead.get("tenant_id")
    conversation = await db.conversations.find_one({"lead_id": lead["id"], "tenant_id": tenant_id}, {"_id": 0})
    reply_msg = {
        "id": str(uuid.uuid4()),
        "content": f"Subject: {subject}\n\n{body}",
        "direction": "inbound",
        "channel": "email",
        "intent": intent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if conversation:
        await db.conversations.update_one(
            {"lead_id": lead["id"], "tenant_id": tenant_id},
            {
                "$push": {"messages": reply_msg},
                "$set": {"current_sentiment": 1.0 if intent == "positive" else (-1.0 if intent == "negative" else 0.0)}
            }
        )
    else:
        # Create new conversation if it doesn't exist
        new_conv = {
            "id": str(uuid.uuid4()),
            "lead_id": lead["id"],
            "tenant_id": tenant_id,
            "channel": "email",
            "messages": [reply_msg],
            "sentiment_trajectory": [],
            "current_sentiment": 1.0 if intent == "positive" else (-1.0 if intent == "negative" else 0.0),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(new_conv)
    
    # If positive and action is send_calendar, trigger auto-booking
    response = {
        "status": "processed",
        "lead_id": lead["id"],
        "intent": intent,
        "action": action
    }
    
    if action == "send_calendar" and config.get("calendly_link"):
        response["calendar_link_sent"] = True
        response["calendly_link"] = config["calendly_link"]
    
    return response

# ----- LinkedIn Manual Import -----
@api_router.post("/leads/import/linkedin")
async def import_linkedin_lead(data: Dict[str, Any]):
    """Import a lead from LinkedIn profile data (manual entry)"""
    lead = Lead(
        business_name=data.get("company_name", data.get("name", "Unknown")),
        category=data.get("industry", "Professional Services"),
        city=data.get("location", "").split(",")[0].strip() if data.get("location") else None,
        state=data.get("location", "").split(",")[1].strip() if data.get("location") and "," in data.get("location", "") else None,
        website=data.get("website"),
        email=data.get("email"),
        phone=data.get("phone"),
        context={
            "source": "linkedin",
            "linkedin_url": data.get("linkedin_url"),
            "headline": data.get("headline"),
            "about": data.get("about"),
            "connection_degree": data.get("connection_degree"),
            "imported_at": datetime.now(timezone.utc).isoformat()
        }
    )
    
    score, breakdown = calculate_lead_score(lead.model_dump())
    lead.lead_score = score
    lead.score_breakdown = breakdown
    lead.status = LeadStatus.SCRAPED
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['pipeline_stage'] = 'needs_enrichment' if not lead.email else 'needs_research'
    
    await db.leads.insert_one(doc)
    return {"status": "imported", "lead_id": lead.id, "score": score}

# ----- Scraping Endpoints -----
@api_router.get("/scrape/config")
async def get_scrape_config(user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    config = await db.scrape_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        config = {
            "id": f"scrape_config_{tenant_id}",
            "tenant_id": tenant_id,
            "keywords": ["accounting firm", "law firm", "plumber", "electrician", "HVAC", "roofing"],
            "locations": ["Philadelphia, PA"],
            "min_reviews": 5,
            "max_per_search": 20,
            "daily_limit": 50
        }
        await db.scrape_config.insert_one(config)
    return config

@api_router.put("/scrape/config")
async def update_scrape_config(update: Dict[str, Any], user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    # Remove any tenant_id from update to prevent tampering
    update.pop("tenant_id", None)
    update.pop("id", None)
    
    await db.scrape_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": update, "$setOnInsert": {"id": f"scrape_config_{tenant_id}", "tenant_id": tenant_id}},
        upsert=True
    )
    return await db.scrape_config.find_one({"tenant_id": tenant_id}, {"_id": 0})

@api_router.post("/scrape/now")
async def scrape_now(keyword: str, location: str, limit: int = 20):
    """Manually trigger a Google Maps scrape"""
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    result = await pipeline.scrape_now(keyword, location, limit)
    return result

@api_router.post("/leads/{lead_id}/enrich")
async def enrich_lead(lead_id: str):
    """Manually enrich a lead with email"""
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    result = await pipeline.enrich_lead(lead_id)
    return result

@api_router.post("/leads/{lead_id}/research")
async def research_lead(lead_id: str, user: dict = Depends(get_current_user)):
    """Manually trigger AI research on a lead"""
    from lead_scraper import WebsiteScraper
    from ai_engine import AIResearchEngine
    
    tenant_id = user["id"]
    
    lead = await db.leads.find_one({"id": lead_id, "tenant_id": tenant_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get tenant's config for API keys
    config = await db.system_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    
    # Scrape website
    scraper = WebsiteScraper()
    website_data = await scraper.scrape_website(lead.get("website", ""))
    await scraper.close()
    
    # AI research
    openai_key = config.get("openai_api_key") if config else None
    ai_engine = AIResearchEngine(openai_key)
    research = await ai_engine.research_lead(lead, website_data)
    await ai_engine.close()
    
    # Update lead
    await db.leads.update_one(
        {"id": lead_id, "tenant_id": tenant_id},
        {"$set": {
            "research": research,
            "website_data": {
                "title": website_data.get("title"),
                "meta_description": website_data.get("meta_description"),
                "scraped": website_data.get("success", False)
            },
            "pipeline_stage": "ready_for_outreach",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "research": research}

@api_router.get("/pipeline/analytics")
async def get_pipeline_analytics(user: dict = Depends(get_current_user)):
    """Get full pipeline analytics for current tenant"""
    tenant_id = user["id"]
    analytics = await db.pipeline_analytics.find_one({"tenant_id": tenant_id}, {"_id": 0})
    deliverability = await db.deliverability_stats.find_one({"tenant_id": tenant_id}, {"_id": 0})
    
    return {
        "funnel": analytics.get("funnel", {}) if analytics else {},
        "metrics": analytics.get("metrics", {}) if analytics else {},
        "deliverability": deliverability or {},
        "updated_at": analytics.get("updated_at") if analytics else None
    }

@api_router.get("/sequences")
async def get_sequences(status: Optional[str] = None, limit: int = 50, user: dict = Depends(get_current_user)):
    """Get email sequences for current tenant"""
    query = {"tenant_id": user["id"]}
    if status:
        query["status"] = status
    
    sequences = await db.sequences.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return sequences

@api_router.post("/sequences/{sequence_id}/pause")
async def pause_sequence(sequence_id: str, user: dict = Depends(get_current_user)):
    # Verify sequence belongs to tenant
    sequence = await db.sequences.find_one({"id": sequence_id, "tenant_id": user["id"]}, {"_id": 0})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    await pipeline.sequence_manager.pause_sequence(sequence_id)
    return {"status": "paused"}

@api_router.post("/sequences/{sequence_id}/resume")
async def resume_sequence(sequence_id: str, user: dict = Depends(get_current_user)):
    # Verify sequence belongs to tenant
    sequence = await db.sequences.find_one({"id": sequence_id, "tenant_id": user["id"]}, {"_id": 0})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    await pipeline.sequence_manager.resume_sequence(sequence_id)
    return {"status": "resumed"}

# ----- Leads -----
@api_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    lead = Lead(**lead_data.model_dump())
    score, breakdown = calculate_lead_score(lead.model_dump())
    lead.lead_score = score
    lead.score_breakdown = breakdown
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['tenant_id'] = tenant_id
    if doc.get('last_contacted_at'):
        doc['last_contacted_at'] = doc['last_contacted_at'].isoformat()
    
    await db.leads.insert_one(doc)
    return lead

@api_router.post("/leads/bulk", response_model=Dict[str, Any])
async def bulk_create_leads(data: LeadBulkCreate, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    created = 0
    skipped = 0
    
    for lead_data in data.leads:
        # Check for duplicates within tenant
        existing = await db.leads.find_one({
            "business_name": lead_data.business_name,
            "city": lead_data.city,
            "tenant_id": tenant_id
        })
        if existing:
            skipped += 1
            continue
        
        lead = Lead(**lead_data.model_dump())
        score, breakdown = calculate_lead_score(lead.model_dump())
        lead.lead_score = score
        lead.score_breakdown = breakdown
        
        doc = lead.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        doc['tenant_id'] = tenant_id
        
        await db.leads.insert_one(doc)
        created += 1
        
        # Update niche stats
        if lead_data.niche_id:
            await db.niches.update_one(
                {"id": lead_data.niche_id, "tenant_id": tenant_id},
                {"$inc": {"leads_scraped": 1}}
            )
    
    return {"created": created, "skipped": skipped, "total": len(data.leads)}

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(
    status: Optional[LeadStatus] = None,
    pipeline_stage: Optional[str] = None,
    min_score: Optional[int] = None,
    niche_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(100, le=500),
    skip: int = 0,
    user: dict = Depends(get_current_user_optional)
):
    query = {}
    # Apply tenant filter if authenticated
    if user and not is_admin(user):
        query['tenant_id'] = user["id"]
    
    if status:
        query['status'] = status.value
    if pipeline_stage:
        query['pipeline_stage'] = pipeline_stage
    if min_score:
        query['lead_score'] = {"$gte": min_score}
    if niche_id:
        query['niche_id'] = niche_id
    
    # Date filtering
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to + "T23:59:59"
        if date_query:
            query['created_at'] = date_query
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return leads

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, user: dict = Depends(get_current_user_optional)):
    query = {"id": lead_id}
    if user and not is_admin(user):
        query['tenant_id'] = user["id"]
    
    lead = await db.leads.find_one(query, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, update_data: Dict[str, Any], user: dict = Depends(get_current_user_optional)):
    query = {"id": lead_id}
    if user and not is_admin(user):
        query['tenant_id'] = user["id"]
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    # Prevent tenant_id tampering
    update_data.pop('tenant_id', None)
    
    # Recalculate score if relevant fields changed
    if any(k in update_data for k in ['category', 'website', 'review_count', 'rating', 'email', 'competitor_detected']):
        current = await db.leads.find_one(query, {"_id": 0})
        if current:
            merged = {**current, **update_data}
            score, breakdown = calculate_lead_score(merged)
            update_data['lead_score'] = score
            update_data['score_breakdown'] = breakdown
    
    await db.leads.update_one(query, {"$set": update_data})
    lead = await db.leads.find_one(query, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    query = {"id": lead_id, "tenant_id": tenant_id} if not is_admin(user) else {"id": lead_id}
    result = await db.leads.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

@api_router.post("/leads/bulk-delete")
async def bulk_delete_leads(data: Dict[str, List[str]], user: dict = Depends(get_current_user)):
    """Delete multiple leads at once"""
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    tenant_id = user["id"]
    query = {"id": {"$in": ids}, "tenant_id": tenant_id} if not is_admin(user) else {"id": {"$in": ids}}
    result = await db.leads.delete_many(query)
    return {"deleted": result.deleted_count, "requested": len(ids)}

@api_router.get("/leads/export/csv")
async def export_leads_csv(user: dict = Depends(get_current_user)):
    """Export all leads as CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    tenant_id = user["id"]
    leads = await db.leads.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    
    if not leads:
        raise HTTPException(status_code=404, detail="No leads to export")
    
    output = io.StringIO()
    fieldnames = ['business_name', 'email', 'phone', 'website', 'address', 'city', 'state', 'category', 'rating', 'review_count', 'lead_score', 'status', 'created_at']
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    
    for lead in leads:
        writer.writerow(lead)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=autobookd_leads.csv"}
    )

@api_router.post("/leads/import/csv")
async def import_csv_leads(file: UploadFile = File(...)):
    """Import leads from CSV file"""
    import csv
    import io
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created = 0
    skipped = 0
    errors = []
    
    for row in reader:
        try:
            # Map common column names
            business_name = row.get('business_name') or row.get('Business Name') or row.get('company') or row.get('Company') or row.get('name') or row.get('Name')
            if not business_name:
                skipped += 1
                continue
            
            # Check for duplicates
            existing = await db.leads.find_one({
                "business_name": {"$regex": f"^{business_name}$", "$options": "i"}
            })
            if existing:
                skipped += 1
                continue
            
            lead = Lead(
                business_name=business_name,
                category=row.get('category') or row.get('Category') or row.get('industry') or row.get('Industry') or 'Unknown',
                city=row.get('city') or row.get('City'),
                state=row.get('state') or row.get('State'),
                phone=row.get('phone') or row.get('Phone') or row.get('phone_number'),
                email=row.get('email') or row.get('Email') or row.get('email_address'),
                website=row.get('website') or row.get('Website') or row.get('url') or row.get('URL'),
                rating=float(row.get('rating') or row.get('Rating') or 0) if row.get('rating') or row.get('Rating') else None,
                review_count=int(row.get('review_count') or row.get('Reviews') or row.get('reviews') or 0),
                context={
                    "source": "csv_import",
                    "imported_at": datetime.now(timezone.utc).isoformat(),
                    "original_row": {k: v for k, v in row.items() if v}
                }
            )
            
            score, breakdown = calculate_lead_score(lead.model_dump())
            lead.lead_score = score
            lead.score_breakdown = breakdown
            
            doc = lead.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            doc['pipeline_stage'] = 'needs_enrichment' if not lead.email else 'needs_research'
            
            await db.leads.insert_one(doc)
            created += 1
            
        except Exception as e:
            errors.append(f"Row error: {str(e)}")
            skipped += 1
    
    return {
        "created": created,
        "skipped": skipped,
        "errors": errors[:5] if errors else []
    }

@api_router.post("/leads/{lead_id}/rescore", response_model=Lead)
async def rescore_lead(lead_id: str, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    query = {"id": lead_id, "tenant_id": tenant_id} if not is_admin(user) else {"id": lead_id}
    lead = await db.leads.find_one(query, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    score, breakdown = calculate_lead_score(lead)
    await db.leads.update_one(
        query,
        {"$set": {"lead_score": score, "score_breakdown": breakdown, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    lead['lead_score'] = score
    lead['score_breakdown'] = breakdown
    return lead

# ----- Conversations -----
@api_router.post("/conversations", response_model=Conversation)
async def create_conversation(message: MessageCreate, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    
    # Check if conversation exists for this lead and tenant
    existing = await db.conversations.find_one({"lead_id": message.lead_id, "tenant_id": tenant_id}, {"_id": 0})
    
    if existing:
        # Add message to existing conversation
        new_message = {
            "id": str(uuid.uuid4()),
            "content": message.content,
            "direction": message.direction,
            "channel": message.channel.value,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.update_one(
            {"lead_id": message.lead_id, "tenant_id": tenant_id},
            {
                "$push": {"messages": new_message},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        conv = await db.conversations.find_one({"lead_id": message.lead_id, "tenant_id": tenant_id}, {"_id": 0})
        return conv
    
    # Create new conversation
    conv = Conversation(
        lead_id=message.lead_id,
        channel=message.channel,
        messages=[{
            "id": str(uuid.uuid4()),
            "content": message.content,
            "direction": message.direction,
            "channel": message.channel.value,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    )
    doc = conv.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['tenant_id'] = tenant_id
    await db.conversations.insert_one(doc)
    
    # Update lead status
    new_status = LeadStatus.OUTREACH_SENT if message.direction == "outbound" else LeadStatus.ENGAGED
    await db.leads.update_one(
        {"id": message.lead_id},
        {"$set": {
            "status": new_status.value,
            "last_contacted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        "$inc": {"follow_up_count": 1}}
    )
    
    return conv

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(lead_id: Optional[str] = None, limit: int = 50, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["id"]}
    if lead_id:
        query['lead_id'] = lead_id
    convs = await db.conversations.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return convs

@api_router.get("/conversations/{lead_id}", response_model=Conversation)
async def get_conversation(lead_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"lead_id": lead_id, "tenant_id": user["id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@api_router.post("/conversations/{lead_id}/send")
async def send_draft_email(lead_id: str, data: Dict[str, Any], user: dict = Depends(get_current_user)):
    """Send or edit and send a draft email from conversation"""
    tenant_id = user["id"]
    
    # Get lead
    lead = await db.leads.find_one({"id": lead_id, "tenant_id": tenant_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get config for email settings
    config = await db.system_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Please configure email settings first")
    
    resend_key = config.get("resend_api_key")
    from_email = config.get("from_email")
    sender_name = config.get("sender_name", "Team")
    
    if not resend_key or not from_email:
        raise HTTPException(status_code=400, detail="Resend API key and From Email required in settings")
    
    subject = data.get("subject")
    body = data.get("body")
    
    if not subject or not body:
        raise HTTPException(status_code=400, detail="Subject and body required")
    
    to_email = lead.get("email")
    if not to_email:
        raise HTTPException(status_code=400, detail="Lead has no email address")
    
    # Send via Resend
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_key}"},
                json={
                    "from": f"{sender_name} <{from_email}>",
                    "to": [to_email],
                    "subject": subject,
                    "text": body
                }
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(status_code=500, detail=f"Email send failed: {response.text}")
        
        # Log to conversation
        message = {
            "id": f"msg_{uuid.uuid4().hex[:8]}",
            "direction": "outbound",
            "channel": "email",
            "content": f"Subject: {subject}\n\n{body}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "sent"
        }
        
        await db.conversations.update_one(
            {"lead_id": lead_id, "tenant_id": tenant_id},
            {"$push": {"messages": message}},
            upsert=True
        )
        
        return {"status": "sent", "message": "Email sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ----- Niches -----
@api_router.post("/niches", response_model=Niche)
async def create_niche(niche_data: NicheCreate, user: dict = Depends(get_current_user)):
    niche = Niche(**niche_data.model_dump())
    doc = niche.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['tenant_id'] = user["id"]
    await db.niches.insert_one(doc)
    return niche

@api_router.get("/niches", response_model=List[Niche])
async def get_niches(user: dict = Depends(get_current_user)):
    niches = await db.niches.find({"tenant_id": user["id"]}, {"_id": 0}).to_list(100)
    return niches

@api_router.get("/niches/{niche_id}", response_model=Niche)
async def get_niche(niche_id: str, user: dict = Depends(get_current_user)):
    niche = await db.niches.find_one({"id": niche_id, "tenant_id": user["id"]}, {"_id": 0})
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    return niche

@api_router.put("/niches/{niche_id}", response_model=Niche)
async def update_niche(niche_id: str, update_data: Dict[str, Any], user: dict = Depends(get_current_user)):
    await db.niches.update_one({"id": niche_id, "tenant_id": user["id"]}, {"$set": update_data})
    niche = await db.niches.find_one({"id": niche_id, "tenant_id": user["id"]}, {"_id": 0})
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    return niche

@api_router.delete("/niches/{niche_id}")
async def delete_niche(niche_id: str, user: dict = Depends(get_current_user)):
    result = await db.niches.delete_one({"id": niche_id, "tenant_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Niche not found")
    return {"message": "Niche deleted"}

# ----- Bookings -----
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, user: dict = Depends(get_current_user)):
    tenant_id = user["id"]
    
    # Verify lead belongs to tenant
    lead = await db.leads.find_one({"id": booking_data.lead_id, "tenant_id": tenant_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Parse meeting_date string to datetime
    meeting_date = datetime.fromisoformat(booking_data.meeting_date.replace('Z', '+00:00'))
    
    booking = Booking(
        lead_id=booking_data.lead_id,
        meeting_date=meeting_date,
        meeting_time=booking_data.meeting_time,
        timezone=booking_data.timezone,
        duration_minutes=booking_data.duration_minutes,
        notes=booking_data.notes
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['meeting_date'] = doc['meeting_date'].isoformat()
    doc['tenant_id'] = tenant_id
    
    await db.bookings.insert_one(doc)
    
    # Update lead status
    await db.leads.update_one(
        {"id": booking_data.lead_id, "tenant_id": tenant_id},
        {"$set": {"status": LeadStatus.BOOKED.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update niche stats
    if lead.get('niche_id'):
        await db.niches.update_one(
            {"id": lead['niche_id'], "tenant_id": tenant_id},
            {"$inc": {"bookings": 1}}
        )
    
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(status: Optional[str] = None, limit: int = 50, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["id"]}
    if status:
        query['status'] = status
    bookings = await db.bookings.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "tenant_id": user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, update_data: Dict[str, Any], user: dict = Depends(get_current_user)):
    if 'meeting_date' in update_data and isinstance(update_data['meeting_date'], str):
        update_data['meeting_date'] = datetime.fromisoformat(update_data['meeting_date'].replace('Z', '+00:00')).isoformat()
    
    await db.bookings.update_one({"id": booking_id, "tenant_id": user["id"]}, {"$set": update_data})
    booking = await db.bookings.find_one({"id": booking_id, "tenant_id": user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

# ----- Analytics -----
@api_router.get("/analytics", response_model=Analytics)
async def get_analytics(user: dict = Depends(get_current_user)):
    tenant_filter = {"tenant_id": user["id"]}
    # Total leads
    total_leads = await db.leads.count_documents(tenant_filter)
    
    # Leads by status
    pipeline = [
        {"$match": tenant_filter},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.leads.aggregate(pipeline).to_list(20)
    leads_by_status = {item['_id']: item['count'] for item in status_counts}
    
    # Total conversations
    total_conversations = await db.conversations.count_documents(tenant_filter)
    
    # Total bookings
    total_bookings = await db.bookings.count_documents(tenant_filter)
    
    # Calculate rates
    contacted = leads_by_status.get(LeadStatus.OUTREACH_SENT.value, 0) + \
                leads_by_status.get(LeadStatus.ENGAGED.value, 0) + \
                leads_by_status.get(LeadStatus.DISCOVERY.value, 0) + \
                leads_by_status.get(LeadStatus.QUALIFIED.value, 0) + \
                leads_by_status.get(LeadStatus.CALENDAR_OFFERED.value, 0) + \
                leads_by_status.get(LeadStatus.BOOKED.value, 0)
    
    engaged = leads_by_status.get(LeadStatus.ENGAGED.value, 0) + \
              leads_by_status.get(LeadStatus.DISCOVERY.value, 0) + \
              leads_by_status.get(LeadStatus.QUALIFIED.value, 0) + \
              leads_by_status.get(LeadStatus.CALENDAR_OFFERED.value, 0) + \
              leads_by_status.get(LeadStatus.BOOKED.value, 0)
    
    reply_rate = (engaged / contacted * 100) if contacted > 0 else 0
    booking_rate = (total_bookings / contacted * 100) if contacted > 0 else 0
    
    # Average score
    score_pipeline = [{"$match": tenant_filter}, {"$group": {"_id": None, "avg": {"$avg": "$lead_score"}}}]
    avg_result = await db.leads.aggregate(score_pipeline).to_list(1)
    avg_score = avg_result[0]['avg'] if avg_result else 0
    
    # Niches/Categories performance - compute from leads directly
    category_pipeline = [
        {"$match": tenant_filter},
        {"$group": {
            "_id": "$category",
            "leads_scraped": {"$sum": 1},
            "leads_contacted": {"$sum": {"$cond": [
                {"$in": ["$status", ["outreach_sent", "engaged", "discovery", "qualified", "calendar_offered", "booked"]]},
                1, 0
            ]}},
            "bookings": {"$sum": {"$cond": [{"$eq": ["$status", "booked"]}, 1, 0]}},
            "replies": {"$sum": {"$cond": [
                {"$in": ["$status", ["engaged", "discovery", "qualified", "calendar_offered", "booked"]]},
                1, 0
            ]}}
        }},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"leads_scraped": -1}},
        {"$limit": 10}
    ]
    category_stats = await db.leads.aggregate(category_pipeline).to_list(10)
    
    niches_performance = []
    for cat in category_stats:
        contacted = cat.get('leads_contacted', 0)
        reply_rate = (cat.get('replies', 0) / contacted * 100) if contacted > 0 else 0
        booking_rate = (cat.get('bookings', 0) / contacted * 100) if contacted > 0 else 0
        niches_performance.append({
            "name": cat.get('_id', 'Unknown'),
            "leads_scraped": cat.get('leads_scraped', 0),
            "leads_contacted": contacted,
            "bookings": cat.get('bookings', 0),
            "reply_rate": round(reply_rate, 1),
            "booking_rate": round(booking_rate, 1)
        })
    
    return Analytics(
        total_leads=total_leads,
        leads_by_status=leads_by_status,
        total_conversations=total_conversations,
        total_bookings=total_bookings,
        reply_rate=round(reply_rate, 2),
        booking_rate=round(booking_rate, 2),
        avg_score=round(avg_score, 1) if avg_score else 0,
        niches_performance=niches_performance
    )

# ----- Queue Management -----
@api_router.get("/queue/priority", response_model=List[Lead])
async def get_priority_queue(limit: int = 20, user: dict = Depends(get_current_user)):
    """Get leads ready for priority outreach (score >= 80)"""
    leads = await db.leads.find(
        {"tenant_id": user["id"], "status": LeadStatus.UNCONTACTED.value, "lead_score": {"$gte": 80}},
        {"_id": 0}
    ).sort("lead_score", -1).limit(limit).to_list(limit)
    return leads

@api_router.get("/queue/standard", response_model=List[Lead])
async def get_standard_queue(limit: int = 50, user: dict = Depends(get_current_user)):
    """Get leads for standard outreach (score 70-79)"""
    leads = await db.leads.find(
        {"tenant_id": user["id"], "status": LeadStatus.UNCONTACTED.value, "lead_score": {"$gte": 70, "$lt": 80}},
        {"_id": 0}
    ).sort("lead_score", -1).limit(limit).to_list(limit)
    return leads

@api_router.get("/queue/follow-up", response_model=List[Lead])
async def get_followup_queue(limit: int = 30, user: dict = Depends(get_current_user)):
    """Get leads needing follow-up"""
    leads = await db.leads.find(
        {
            "tenant_id": user["id"],
            "status": {"$in": [LeadStatus.OUTREACH_SENT.value, LeadStatus.STALLED.value]},
            "follow_up_count": {"$lt": 2}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    return leads

# ----- Email Tracking -----
@api_router.get("/track/open/{tracking_id}")
async def track_email_open(tracking_id: str):
    """Track email opens via pixel - returns 1x1 transparent GIF"""
    from email_engine import DeliverabilityTracker
    from fastapi.responses import Response
    
    tracker = DeliverabilityTracker(db)
    
    # Find the email event by tracking_id
    email_event = await db.email_tracking.find_one({"tracking_id": tracking_id}, {"_id": 0})
    
    if email_event:
        lead_id = email_event.get("lead_id")
        sequence_id = email_event.get("sequence_id")
        
        # Record open event
        await tracker.record_event("opened", email_event.get("message_id", tracking_id), {
            "lead_id": lead_id,
            "sequence_id": sequence_id,
            "tracking_id": tracking_id
        })
        
        # Update lead with open tracking
        if lead_id:
            await db.leads.update_one(
                {"id": lead_id},
                {
                    "$set": {"last_email_opened_at": datetime.now(timezone.utc).isoformat()},
                    "$inc": {"email_opens": 1}
                }
            )
        
        # Update sequence tracking
        if sequence_id:
            await db.sequences.update_one(
                {"id": sequence_id},
                {"$inc": {"opens": 1}}
            )
    
    # Return 1x1 transparent GIF
    gif_bytes = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return Response(content=gif_bytes, media_type="image/gif")


@api_router.get("/track/click/{tracking_id}")
async def track_email_click(tracking_id: str, url: str = ""):
    """Track email link clicks and redirect"""
    from email_engine import DeliverabilityTracker
    from fastapi.responses import RedirectResponse
    import base64
    
    tracker = DeliverabilityTracker(db)
    
    # Find the email event by tracking_id
    email_event = await db.email_tracking.find_one({"tracking_id": tracking_id}, {"_id": 0})
    
    if email_event:
        lead_id = email_event.get("lead_id")
        sequence_id = email_event.get("sequence_id")
        
        # Record click event
        await tracker.record_event("clicked", email_event.get("message_id", tracking_id), {
            "lead_id": lead_id,
            "sequence_id": sequence_id,
            "tracking_id": tracking_id,
            "clicked_url": url
        })
        
        # Update lead with click tracking
        if lead_id:
            await db.leads.update_one(
                {"id": lead_id},
                {
                    "$set": {"last_email_clicked_at": datetime.now(timezone.utc).isoformat()},
                    "$inc": {"email_clicks": 1}
                }
            )
        
        # Update sequence tracking
        if sequence_id:
            await db.sequences.update_one(
                {"id": sequence_id},
                {"$inc": {"clicks": 1}}
            )
    
    # Decode and redirect to original URL
    if url:
        try:
            decoded_url = base64.urlsafe_b64decode(url.encode()).decode()
            return RedirectResponse(url=decoded_url, status_code=302)
        except Exception:
            pass
    
    # Fallback - redirect to calendly or main site (use lead's tenant config if available)
    fallback_url = "https://calendly.com"
    if lead_id:
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0, "tenant_id": 1})
        if lead and lead.get("tenant_id"):
            config = await db.system_config.find_one({"tenant_id": lead["tenant_id"]}, {"_id": 0})
            if config and config.get("calendly_link"):
                fallback_url = config["calendly_link"]
    return RedirectResponse(url=fallback_url, status_code=302)


@api_router.get("/tracking/stats")
async def get_tracking_stats(user: dict = Depends(get_current_user)):
    """Get email engagement statistics for current tenant"""
    from email_engine import DeliverabilityTracker
    
    tenant_id = user["id"]
    tracker = DeliverabilityTracker(db)
    stats = await tracker.get_deliverability_stats(days=30, tenant_id=tenant_id)
    
    # Get top engaged leads (tenant-filtered)
    engaged_leads = await db.leads.find(
        {"email_opens": {"$gt": 0}, "tenant_id": tenant_id},
        {"_id": 0, "id": 1, "business_name": 1, "email": 1, "email_opens": 1, "email_clicks": 1, "last_email_opened_at": 1}
    ).sort("email_opens", -1).limit(10).to_list(10)
    
    return {
        "stats": stats,
        "engaged_leads": engaged_leads
    }


# ----- Health Check -----
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/")
async def root():
    return {"message": "AutoBooked AI API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
