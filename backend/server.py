from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Query, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum
import json
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="AutoBooked AI", version="1.0.0")
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
    niche_id: Optional[str] = None
    competitor_detected: Optional[str] = None
    pain_points: List[str] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    last_contacted_at: Optional[datetime] = None
    follow_up_count: int = 0
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
    is_running: bool = False
    test_mode: bool = False
    active_product_id: Optional[str] = None
    active_discovery_set_id: Optional[str] = None
    daily_outreach_limit: int = 50
    max_follow_ups: int = 2
    outreach_score_threshold: int = 70
    priority_score_threshold: int = 80
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    from_email: Optional[str] = None
    sender_name: Optional[str] = None
    sender_company: Optional[str] = "ARI Solutions"
    calendly_api_key: Optional[str] = None
    calendly_link: Optional[str] = None
    apollo_api_key: Optional[str] = None
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
    outreach_score_threshold: Optional[int] = None
    priority_score_threshold: Optional[int] = None
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    from_email: Optional[str] = None
    sender_name: Optional[str] = None
    sender_company: Optional[str] = None
    calendly_api_key: Optional[str] = None
    calendly_link: Optional[str] = None
    apollo_api_key: Optional[str] = None
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

# ============== API ROUTES ==============

# ----- System Config -----
@api_router.get("/config", response_model=SystemConfig)
async def get_config():
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    if not config:
        config = SystemConfig().model_dump()
        config['updated_at'] = config['updated_at'].isoformat()
        await db.system_config.insert_one(config)
    return config

@api_router.put("/config", response_model=SystemConfig)
async def update_config(update: SystemConfigUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": update_data},
        upsert=True
    )
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    return config

@api_router.post("/system/start")
async def start_system(background_tasks: BackgroundTasks, test_mode: bool = False):
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    if pipeline.is_running:
        return {"status": "already_running", "message": "Pipeline is already running"}
    
    # Update test mode setting
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {"test_mode": test_mode}},
        upsert=True
    )
    
    # Start pipeline in background
    background_tasks.add_task(pipeline.start)
    
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {"is_running": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    mode_msg = " (TEST MODE - no emails sent)" if test_mode else ""
    return {"status": "running", "test_mode": test_mode, "message": f"Production pipeline started{mode_msg} - Scraping, Enrichment, Research, Sequencing, Analytics"}

@api_router.post("/system/stop")
async def stop_system():
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    await pipeline.stop()
    
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {"is_running": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "stopped", "message": "Pipeline stopped"}

@api_router.get("/system/status")
async def get_system_status():
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    pipeline_analytics = await db.pipeline_analytics.find_one({"id": "pipeline_analytics"}, {"_id": 0})
    deliverability = await db.deliverability_stats.find_one({"id": "deliverability_stats"}, {"_id": 0})
    
    return {
        "is_running": pipeline.is_running,
        "test_mode": config.get("test_mode", False) if config else False,
        "config": config,
        "pipeline_analytics": pipeline_analytics,
        "deliverability": deliverability
    }

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
    
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    
    # Classify reply with AI
    ai_engine = AIResearchEngine(config.get("openai_api_key"))
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
    conversation = await db.conversations.find_one({"lead_id": lead["id"]}, {"_id": 0})
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
            {"lead_id": lead["id"]},
            {
                "$push": {"messages": reply_msg},
                "$set": {"current_sentiment": 1.0 if intent == "positive" else (-1.0 if intent == "negative" else 0.0)}
            }
        )
    
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
async def get_scrape_config():
    config = await db.scrape_config.find_one({"id": "scrape_config"}, {"_id": 0})
    if not config:
        config = {
            "id": "scrape_config",
            "keywords": ["accounting firm", "law firm", "plumber", "electrician", "HVAC", "roofing"],
            "locations": ["Philadelphia, PA"],
            "min_reviews": 5,
            "max_per_search": 20,
            "daily_limit": 50
        }
        await db.scrape_config.insert_one(config)
    return config

@api_router.put("/scrape/config")
async def update_scrape_config(update: Dict[str, Any]):
    await db.scrape_config.update_one(
        {"id": "scrape_config"},
        {"$set": update},
        upsert=True
    )
    return await db.scrape_config.find_one({"id": "scrape_config"}, {"_id": 0})

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
async def research_lead(lead_id: str):
    """Manually trigger AI research on a lead"""
    from lead_scraper import WebsiteScraper
    from ai_engine import AIResearchEngine
    
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Scrape website
    scraper = WebsiteScraper()
    website_data = await scraper.scrape_website(lead.get("website", ""))
    await scraper.close()
    
    # AI research
    ai_engine = AIResearchEngine(config.get("openai_api_key"))
    research = await ai_engine.research_lead(lead, website_data)
    await ai_engine.close()
    
    # Update lead
    await db.leads.update_one(
        {"id": lead_id},
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
async def get_pipeline_analytics():
    """Get full pipeline analytics"""
    analytics = await db.pipeline_analytics.find_one({"id": "pipeline_analytics"}, {"_id": 0})
    deliverability = await db.deliverability_stats.find_one({"id": "deliverability_stats"}, {"_id": 0})
    
    return {
        "funnel": analytics.get("funnel", {}) if analytics else {},
        "metrics": analytics.get("metrics", {}) if analytics else {},
        "deliverability": deliverability or {},
        "updated_at": analytics.get("updated_at") if analytics else None
    }

@api_router.get("/sequences")
async def get_sequences(status: Optional[str] = None, limit: int = 50):
    """Get email sequences"""
    query = {}
    if status:
        query["status"] = status
    
    sequences = await db.sequences.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return sequences

@api_router.post("/sequences/{sequence_id}/pause")
async def pause_sequence(sequence_id: str):
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    await pipeline.sequence_manager.pause_sequence(sequence_id)
    return {"status": "paused"}

@api_router.post("/sequences/{sequence_id}/resume")
async def resume_sequence(sequence_id: str):
    from pipeline_controller import get_pipeline
    pipeline = get_pipeline(db)
    await pipeline.sequence_manager.resume_sequence(sequence_id)
    return {"status": "resumed"}

# ----- Leads -----
@api_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate):
    lead = Lead(**lead_data.model_dump())
    score, breakdown = calculate_lead_score(lead.model_dump())
    lead.lead_score = score
    lead.score_breakdown = breakdown
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('last_contacted_at'):
        doc['last_contacted_at'] = doc['last_contacted_at'].isoformat()
    
    await db.leads.insert_one(doc)
    return lead

@api_router.post("/leads/bulk", response_model=Dict[str, Any])
async def bulk_create_leads(data: LeadBulkCreate):
    created = 0
    skipped = 0
    
    for lead_data in data.leads:
        # Check for duplicates
        existing = await db.leads.find_one({
            "business_name": lead_data.business_name,
            "city": lead_data.city
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
        
        await db.leads.insert_one(doc)
        created += 1
        
        # Update niche stats
        if lead_data.niche_id:
            await db.niches.update_one(
                {"id": lead_data.niche_id},
                {"$inc": {"leads_scraped": 1}}
            )
    
    return {"created": created, "skipped": skipped, "total": len(data.leads)}

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(
    status: Optional[LeadStatus] = None,
    min_score: Optional[int] = None,
    niche_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    skip: int = 0
):
    query = {}
    if status:
        query['status'] = status.value
    if min_score:
        query['lead_score'] = {"$gte": min_score}
    if niche_id:
        query['niche_id'] = niche_id
    
    leads = await db.leads.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return leads

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, update_data: Dict[str, Any]):
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate score if relevant fields changed
    if any(k in update_data for k in ['category', 'website', 'review_count', 'rating', 'email', 'competitor_detected']):
        current = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if current:
            merged = {**current, **update_data}
            score, breakdown = calculate_lead_score(merged)
            update_data['lead_score'] = score
            update_data['score_breakdown'] = breakdown
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

@api_router.post("/leads/bulk-delete")
async def bulk_delete_leads(data: Dict[str, List[str]]):
    """Delete multiple leads at once"""
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.leads.delete_many({"id": {"$in": ids}})
    return {"deleted": result.deleted_count, "requested": len(ids)}

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
async def rescore_lead(lead_id: str):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    score, breakdown = calculate_lead_score(lead)
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"lead_score": score, "score_breakdown": breakdown, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    lead['lead_score'] = score
    lead['score_breakdown'] = breakdown
    return lead

# ----- Conversations -----
@api_router.post("/conversations", response_model=Conversation)
async def create_conversation(message: MessageCreate):
    # Check if conversation exists for this lead
    existing = await db.conversations.find_one({"lead_id": message.lead_id}, {"_id": 0})
    
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
            {"lead_id": message.lead_id},
            {
                "$push": {"messages": new_message},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        conv = await db.conversations.find_one({"lead_id": message.lead_id}, {"_id": 0})
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
async def get_conversations(lead_id: Optional[str] = None, limit: int = 50):
    query = {}
    if lead_id:
        query['lead_id'] = lead_id
    convs = await db.conversations.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return convs

@api_router.get("/conversations/{lead_id}", response_model=Conversation)
async def get_conversation(lead_id: str):
    conv = await db.conversations.find_one({"lead_id": lead_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

# ----- Niches -----
@api_router.post("/niches", response_model=Niche)
async def create_niche(niche_data: NicheCreate):
    niche = Niche(**niche_data.model_dump())
    doc = niche.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.niches.insert_one(doc)
    return niche

@api_router.get("/niches", response_model=List[Niche])
async def get_niches():
    niches = await db.niches.find({}, {"_id": 0}).to_list(100)
    return niches

@api_router.get("/niches/{niche_id}", response_model=Niche)
async def get_niche(niche_id: str):
    niche = await db.niches.find_one({"id": niche_id}, {"_id": 0})
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    return niche

@api_router.put("/niches/{niche_id}", response_model=Niche)
async def update_niche(niche_id: str, update_data: Dict[str, Any]):
    await db.niches.update_one({"id": niche_id}, {"$set": update_data})
    niche = await db.niches.find_one({"id": niche_id}, {"_id": 0})
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    return niche

@api_router.delete("/niches/{niche_id}")
async def delete_niche(niche_id: str):
    result = await db.niches.delete_one({"id": niche_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Niche not found")
    return {"message": "Niche deleted"}

# ----- Bookings -----
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
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
    
    await db.bookings.insert_one(doc)
    
    # Update lead status
    await db.leads.update_one(
        {"id": booking_data.lead_id},
        {"$set": {"status": LeadStatus.BOOKED.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update niche stats
    lead = await db.leads.find_one({"id": booking_data.lead_id}, {"_id": 0})
    if lead and lead.get('niche_id'):
        await db.niches.update_one(
            {"id": lead['niche_id']},
            {"$inc": {"bookings": 1}}
        )
    
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(status: Optional[str] = None, limit: int = 50):
    query = {}
    if status:
        query['status'] = status
    bookings = await db.bookings.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, update_data: Dict[str, Any]):
    if 'meeting_date' in update_data and isinstance(update_data['meeting_date'], str):
        update_data['meeting_date'] = datetime.fromisoformat(update_data['meeting_date'].replace('Z', '+00:00')).isoformat()
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

# ----- Analytics -----
@api_router.get("/analytics", response_model=Analytics)
async def get_analytics():
    # Total leads
    total_leads = await db.leads.count_documents({})
    
    # Leads by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.leads.aggregate(pipeline).to_list(20)
    leads_by_status = {item['_id']: item['count'] for item in status_counts}
    
    # Total conversations
    total_conversations = await db.conversations.count_documents({})
    
    # Total bookings
    total_bookings = await db.bookings.count_documents({})
    
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
    score_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$lead_score"}}}]
    avg_result = await db.leads.aggregate(score_pipeline).to_list(1)
    avg_score = avg_result[0]['avg'] if avg_result else 0
    
    # Niches performance
    niches = await db.niches.find({}, {"_id": 0}).to_list(100)
    niches_performance = []
    for niche in niches:
        if niche.get('leads_contacted', 0) > 0:
            niche['reply_rate'] = (niche.get('replies', 0) / niche['leads_contacted']) * 100
            niche['booking_rate'] = (niche.get('bookings', 0) / niche['leads_contacted']) * 100
        niches_performance.append({
            "name": niche.get('name'),
            "leads_scraped": niche.get('leads_scraped', 0),
            "leads_contacted": niche.get('leads_contacted', 0),
            "bookings": niche.get('bookings', 0),
            "reply_rate": niche.get('reply_rate', 0),
            "booking_rate": niche.get('booking_rate', 0)
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
async def get_priority_queue(limit: int = 20):
    """Get leads ready for priority outreach (score >= 80)"""
    leads = await db.leads.find(
        {"status": LeadStatus.UNCONTACTED.value, "lead_score": {"$gte": 80}},
        {"_id": 0}
    ).sort("lead_score", -1).limit(limit).to_list(limit)
    return leads

@api_router.get("/queue/standard", response_model=List[Lead])
async def get_standard_queue(limit: int = 50):
    """Get leads for standard outreach (score 70-79)"""
    leads = await db.leads.find(
        {"status": LeadStatus.UNCONTACTED.value, "lead_score": {"$gte": 70, "$lt": 80}},
        {"_id": 0}
    ).sort("lead_score", -1).limit(limit).to_list(limit)
    return leads

@api_router.get("/queue/follow-up", response_model=List[Lead])
async def get_followup_queue(limit: int = 30):
    """Get leads needing follow-up"""
    leads = await db.leads.find(
        {
            "status": {"$in": [LeadStatus.OUTREACH_SENT.value, LeadStatus.STALLED.value]},
            "follow_up_count": {"$lt": 2}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    return leads

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
