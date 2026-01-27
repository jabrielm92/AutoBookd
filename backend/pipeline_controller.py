"""
Production Pipeline Controller
Orchestrates the full lead-to-calendar flow
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import uuid

from lead_scraper import GoogleMapsScraper, HunterEmailFinder, ApolloEmailFinder, WebsiteScraper, LeadCleaner
from ai_engine import AIResearchEngine, EmailSequenceGenerator
from email_engine import EmailSender, SequenceManager, DeliverabilityTracker

logger = logging.getLogger(__name__)


class PipelineController:
    """
    Full autonomous pipeline:
    Scrape → Clean → Enrich → Research → Sequence → Send → Track
    """
    
    def __init__(self, db):
        self.db = db
        self.is_running = False
        self._tasks = []
        
        # Initialize components
        self.maps_scraper = GoogleMapsScraper()
        self.hunter_finder = HunterEmailFinder()
        self.apollo_finder = ApolloEmailFinder()
        self.website_scraper = WebsiteScraper()
        self.ai_engine = AIResearchEngine()
        self.sequence_generator = EmailSequenceGenerator()
        self.email_sender = EmailSender()
        self.sequence_manager = SequenceManager(db, self.email_sender)
        self.deliverability_tracker = DeliverabilityTracker(db)
    
    async def _get_email_finder(self):
        """Get the configured email finder (Hunter or Apollo) with API key from config"""
        config = await self.db.system_config.find_one({"id": "system_config"})
        provider = config.get("enrichment_provider", "hunter") if config else "hunter"
        
        if provider == "apollo":
            api_key = config.get("apollo_api_key") if config else None
            if api_key:
                self.apollo_finder.set_api_key(api_key)
            return self.apollo_finder
        else:
            api_key = config.get("hunter_api_key") if config else None
            if api_key:
                self.hunter_finder.set_api_key(api_key)
            return self.hunter_finder
    
    async def _log_activity(self, stage: str, message: str, activity_type: str = "info", lead_name: str = None):
        """Log activity to database for real-time display"""
        try:
            activity = {
                "id": str(uuid.uuid4()),
                "type": activity_type,
                "stage": stage,
                "message": message,
                "lead_name": lead_name,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await self.db.pipeline_activity.insert_one(activity)
        except Exception as e:
            logger.error(f"Failed to log activity: {e}")
    
    async def start(self):
        """Start the full pipeline"""
        if self.is_running:
            return {"status": "already_running"}
        
        self.is_running = True
        
        # Clear old activities
        await self.db.pipeline_activity.delete_many({})
        await self._log_activity("system", "Pipeline started", "success")
        
        # Start background tasks
        self._tasks = [
            asyncio.create_task(self._scraping_loop()),
            asyncio.create_task(self._enrichment_loop()),
            asyncio.create_task(self._research_loop()),
            asyncio.create_task(self._sequence_loop()),
            asyncio.create_task(self._analytics_loop())
        ]
        
        await self.db.system_config.update_one(
            {"id": "system_config"},
            {"$set": {
                "is_running": True,
                "pipeline_started_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info("Pipeline started with all components")
        return {"status": "started", "components": ["scraping", "enrichment", "research", "sequence", "analytics"]}
    
    async def stop(self):
        """Stop the pipeline"""
        self.is_running = False
        
        for task in self._tasks:
            task.cancel()
        
        await self.db.system_config.update_one(
            {"id": "system_config"},
            {"$set": {
                "is_running": False,
                "pipeline_stopped_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info("Pipeline stopped")
        return {"status": "stopped"}
    
    async def _get_config(self) -> Dict[str, Any]:
        """Get system configuration"""
        config = await self.db.system_config.find_one({"id": "system_config"}, {"_id": 0})
        return config or {}
    
    async def _get_scrape_config(self) -> Dict[str, Any]:
        """Get scraping configuration"""
        config = await self.db.scrape_config.find_one({"id": "scrape_config"}, {"_id": 0})
        if not config:
            config = {
                "id": "scrape_config",
                "keywords": ["accounting firm", "law firm", "plumber", "electrician", "HVAC"],
                "locations": ["Philadelphia, PA"],
                "min_reviews": 5,
                "max_per_search": 20,
                "daily_limit": 100
            }
            await self.db.scrape_config.insert_one(config)
        return config
    
    # ==================== SCRAPING LOOP ====================
    async def _scraping_loop(self):
        """Scrape Google Maps for leads"""
        logger.info("Scraping loop started")
        
        while self.is_running:
            try:
                scrape_config = await self._get_scrape_config()
                
                # Get SerpAPI key from system config
                system_config = await self.db.system_config.find_one({"id": "system_config"})
                serpapi_key = system_config.get("serpapi_key") if system_config else None
                if serpapi_key:
                    self.maps_scraper.set_api_key(serpapi_key)
                
                # Get daily scrape count
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                daily_stats = await self.db.daily_scrape_stats.find_one({"date": today}) or {}
                scraped_today = daily_stats.get("scraped", 0)
                
                if scraped_today >= scrape_config.get("daily_limit", 100):
                    logger.info(f"Daily scrape limit reached ({scraped_today})")
                    await asyncio.sleep(3600)  # Wait an hour
                    continue
                
                # Scrape for each keyword/location combo
                keywords = scrape_config.get("keywords", [])
                locations = scrape_config.get("locations", [])
                
                for location in locations:
                    for keyword in keywords:
                        if not self.is_running:
                            break
                        
                        if scraped_today >= scrape_config.get("daily_limit", 100):
                            break
                        
                        logger.info(f"Scraping: {keyword} in {location}")
                        await self._log_activity("scrape", f"Searching for {keyword} in {location}", "info")
                        
                        leads = await self.maps_scraper.search_businesses(
                            keyword=keyword,
                            location=location,
                            limit=scrape_config.get("max_per_search", 20)
                        )
                        
                        # Clean leads
                        for lead in leads:
                            lead = LeadCleaner.clean_lead(lead)
                            
                            is_valid, reason = LeadCleaner.is_valid_lead(
                                lead,
                                min_reviews=scrape_config.get("min_reviews", 5)
                            )
                            
                            if not is_valid:
                                logger.debug(f"Rejected {lead.get('business_name')}: {reason}")
                                continue
                            
                            # Deduplicate
                            existing = await self.db.leads.find_one({
                                "$or": [
                                    {"domain": lead.get("domain")},
                                    {"place_id": lead.get("place_id")}
                                ]
                            })
                            
                            if existing:
                                continue
                            
                            # Save lead
                            lead["id"] = str(uuid.uuid4())
                            lead["status"] = "scraped"
                            lead["pipeline_stage"] = "needs_enrichment"
                            lead["created_at"] = datetime.now(timezone.utc).isoformat()
                            lead["updated_at"] = datetime.now(timezone.utc).isoformat()
                            
                            await self.db.leads.insert_one(lead)
                            scraped_today += 1
                            
                            logger.info(f"Saved lead: {lead['business_name']}")
                            await self._log_activity("scrape", f"Found: {lead['business_name']}", "success", lead['business_name'])
                        
                        # Update daily stats
                        await self.db.daily_scrape_stats.update_one(
                            {"date": today},
                            {"$set": {"scraped": scraped_today}},
                            upsert=True
                        )
                        
                        # Rate limit
                        await asyncio.sleep(5)
                
                # Wait before next cycle
                await asyncio.sleep(300)  # 5 minutes
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scraping loop error: {e}")
                await asyncio.sleep(60)
    
    # ==================== ENRICHMENT LOOP ====================
    async def _enrichment_loop(self):
        """Enrich leads with email and website data"""
        logger.info("Enrichment loop started")
        await self._log_activity("enrich", "Enrichment engine started", "info")
        
        while self.is_running:
            try:
                # Get the configured email finder
                email_finder = await self._get_email_finder()
                provider_name = "Apollo" if isinstance(email_finder, ApolloEmailFinder) else "Hunter"
                
                # Get leads needing enrichment
                leads = await self.db.leads.find({
                    "pipeline_stage": "needs_enrichment",
                    "email": {"$exists": False}
                }).limit(10).to_list(10)
                
                if leads:
                    await self._log_activity("enrich", f"Processing {len(leads)} leads via {provider_name}", "info")
                
                for lead in leads:
                    if not self.is_running:
                        break
                    
                    domain = lead.get("domain") or lead.get("website", "").split("/")[0]
                    
                    if not domain:
                        await self.db.leads.update_one(
                            {"id": lead["id"]},
                            {"$set": {"pipeline_stage": "no_domain", "updated_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        await self._log_activity("enrich", f"No domain for {lead.get('business_name')}", "warning", lead.get('business_name'))
                        continue
                    
                    await self._log_activity("enrich", f"Looking up email for {lead.get('business_name')} ({provider_name})", "info", lead.get('business_name'))
                    
                    # Find email using configured provider
                    email_data = await email_finder.find_email(domain, lead.get("business_name"))
                    
                    if email_data and email_data.get("email"):
                        update_data = {
                            "email": email_data["email"],
                            "email_confidence": email_data.get("confidence", 0),
                            "email_type": email_data.get("type"),
                            "contact_name": f"{email_data.get('first_name', '')} {email_data.get('last_name', '')}".strip() or None,
                            "contact_position": email_data.get("position"),
                            "enrichment_provider": provider_name.lower(),
                            "pipeline_stage": "needs_research",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                        # Add Apollo-specific company info if available
                        if email_data.get("company_info"):
                            update_data["company_info"] = email_data["company_info"]
                        if email_data.get("linkedin_url"):
                            update_data["linkedin_url"] = email_data["linkedin_url"]
                            
                        await self._log_activity("enrich", f"Email found: {email_data['email']}", "success", lead.get('business_name'))
                    else:
                        update_data = {
                            "pipeline_stage": "no_email",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                        await self._log_activity("enrich", f"No email found for {lead.get('business_name')}", "warning", lead.get('business_name'))
                    
                    await self.db.leads.update_one(
                        {"id": lead["id"]},
                        {"$set": update_data}
                    )
                    
                    logger.info(f"Enriched {lead['business_name']}: {'email found' if email_data else 'no email'}")
                    
                    # Rate limit API
                    await asyncio.sleep(2)
                
                # Wait before next batch
                await asyncio.sleep(30)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Enrichment loop error: {e}")
                await self._log_activity("enrich", f"Error: {str(e)}", "error")
                await asyncio.sleep(60)
    
    # ==================== RESEARCH LOOP ====================
    async def _research_loop(self):
        """AI research on leads"""
        logger.info("Research loop started")
        await self._log_activity("research", "AI Research engine started", "info")
        
        while self.is_running:
            try:
                config = await self._get_config()
                
                if not config.get("openai_api_key"):
                    await asyncio.sleep(60)
                    continue
                
                self.ai_engine.api_key = config["openai_api_key"]
                
                # Get leads needing research
                leads = await self.db.leads.find({
                    "pipeline_stage": "needs_research",
                    "email": {"$exists": True}
                }).limit(5).to_list(5)
                
                if leads:
                    await self._log_activity("research", f"Researching {len(leads)} leads with AI", "info")
                
                for lead in leads:
                    if not self.is_running:
                        break
                    
                    website_url = lead.get("website")
                    if not website_url:
                        continue
                    
                    await self._log_activity("research", f"Analyzing website for {lead.get('business_name')}", "info", lead.get('business_name'))
                    
                    # Scrape website
                    website_data = await self.website_scraper.scrape_website(website_url)
                    
                    await self._log_activity("research", f"Running AI research on {lead.get('business_name')}", "info", lead.get('business_name'))
                    
                    # AI research
                    research = await self.ai_engine.research_lead(lead, website_data)
                    
                    # Calculate lead score
                    score = self._calculate_lead_score(lead, research, website_data)
                    
                    # Update lead
                    await self.db.leads.update_one(
                        {"id": lead["id"]},
                        {"$set": {
                            "research": research,
                            "website_data": {
                                "title": website_data.get("title"),
                                "meta_description": website_data.get("meta_description"),
                                "scraped": website_data.get("success", False)
                            },
                            "lead_score": score,
                            "pipeline_stage": "ready_for_outreach" if score >= 60 else "low_score",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    quality = research.get('personalization_quality', 'unknown')
                    if score >= 60:
                        await self._log_activity("research", f"Lead ready: {lead.get('business_name')} (Score: {score})", "success", lead.get('business_name'))
                    else:
                        await self._log_activity("research", f"Low score: {lead.get('business_name')} ({score})", "warning", lead.get('business_name'))
                    
                    logger.info(f"Researched {lead['business_name']}: score={score}, quality={quality}")
                    
                    # Rate limit
                    await asyncio.sleep(3)
                
                await asyncio.sleep(30)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Research loop error: {e}")
                await self._log_activity("research", f"Error: {str(e)}", "error")
                await asyncio.sleep(60)
    
    def _calculate_lead_score(self, lead: Dict, research: Dict, website_data: Dict) -> int:
        """Calculate lead score based on all data"""
        score = 0
        
        # Base score from reviews
        reviews = lead.get("review_count", 0)
        rating = lead.get("rating", 0)
        
        if 5 <= reviews <= 50:
            score += 20  # Sweet spot - established but not huge
        elif reviews > 50:
            score += 10
        
        if rating and rating >= 4.0:
            score += 10
        elif rating and rating < 3.5:
            score -= 10  # Might have problems
        
        # Email quality
        email_confidence = lead.get("email_confidence", 0)
        if email_confidence >= 80:
            score += 20
        elif email_confidence >= 50:
            score += 10
        
        # Website quality
        if website_data.get("success"):
            score += 10
            if website_data.get("meta_description"):
                score += 5
        
        # Research quality
        quality = research.get("personalization_quality", "low")
        if quality == "high":
            score += 25
        elif quality == "medium":
            score += 15
        else:
            score += 5
        
        # Pain point identified
        if research.get("pain_point") and len(research["pain_point"]) > 20:
            score += 10
        
        return min(max(score, 0), 100)
    
    # ==================== SEQUENCE LOOP ====================
    async def _sequence_loop(self):
        """Create and send email sequences"""
        logger.info("Sequence loop started")
        await self._log_activity("sequence", "Email sequence engine started", "info")
        
        while self.is_running:
            try:
                config = await self._get_config()
                test_mode = config.get("test_mode", False)
                
                if not config.get("resend_api_key") and not test_mode:
                    await asyncio.sleep(60)
                    continue
                
                self.email_sender.api_key = config.get("resend_api_key")
                self.email_sender.test_mode = test_mode
                
                # Check daily limit
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                daily_stats = await self.db.daily_email_stats.find_one({"date": today}) or {}
                sent_today = daily_stats.get("sent_count", 0)
                
                daily_limit = config.get("daily_outreach_limit", 50)
                
                if sent_today >= daily_limit:
                    logger.info(f"Daily email limit reached ({sent_today}/{daily_limit})")
                    await self._log_activity("sequence", f"Daily limit reached ({sent_today}/{daily_limit})", "warning")
                    await asyncio.sleep(3600)
                    continue
                
                # Process due sequences first
                sequence_stats = await self.sequence_manager.process_due_sequences(test_mode=test_mode)
                
                if sequence_stats["sent"] > 0:
                    await self._log_activity("sequence", f"Sent {sequence_stats['sent']} follow-up emails", "success")
                    # Update daily stats
                    await self.db.daily_email_stats.update_one(
                        {"date": today},
                        {"$inc": {"sent_count": sequence_stats["sent"]}},
                        upsert=True
                    )
                
                # Create new sequences for ready leads
                ready_leads = await self.db.leads.find({
                    "pipeline_stage": "ready_for_outreach",
                    "sequence_id": {"$exists": False}
                }).limit(5).to_list(5)
                
                if ready_leads:
                    await self._log_activity("sequence", f"Creating sequences for {len(ready_leads)} leads", "info")
                
                for lead in ready_leads:
                    if sent_today >= daily_limit:
                        break
                    
                    research = lead.get("research", {})
                    
                    await self._log_activity("sequence", f"Generating AI email sequence for {lead.get('business_name')}", "info", lead.get('business_name'))
                    
                    # Get product info if available
                    product = None
                    if config.get("active_product_id"):
                        product = await self.db.products.find_one({"id": config.get("active_product_id")}, {"_id": 0})
                    
                    # Generate AI-powered sequence (not template)
                    emails = await self.sequence_generator.generate_ai_sequence(
                        lead=lead,
                        research=research,
                        sender_name=config.get("sender_name", "Team"),
                        sender_company=config.get("sender_company", "ARI Solutions"),
                        calendar_link=config.get("calendly_link"),
                        product=product
                    )
                    
                    # Create sequence
                    sequence_id = await self.sequence_manager.create_sequence(
                        lead_id=lead["id"],
                        emails=emails,
                        from_email=config.get("from_email", "outreach@yourdomain.com"),
                        from_name=config.get("sender_name", "Team")
                    )
                    
                    # Update lead
                    await self.db.leads.update_one(
                        {"id": lead["id"]},
                        {"$set": {
                            "sequence_id": sequence_id,
                            "pipeline_stage": "in_sequence",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    mode_label = " [TEST]" if test_mode else ""
                    await self._log_activity("sequence", f"Sequence created for {lead.get('business_name')}{mode_label}", "success", lead.get('business_name'))
                    logger.info(f"Created sequence for {lead['business_name']}" + (" [TEST MODE]" if test_mode else ""))
                
                await asyncio.sleep(60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Sequence loop error: {e}")
                await self._log_activity("sequence", f"Error: {str(e)}", "error")
                await asyncio.sleep(60)
    
    # ==================== ANALYTICS LOOP ====================
    async def _analytics_loop(self):
        """Update analytics and metrics"""
        logger.info("Analytics loop started")
        await self._log_activity("analytics", "Analytics engine started", "info")
        
        while self.is_running:
            try:
                # Calculate funnel metrics
                pipeline = [
                    {"$group": {
                        "_id": "$pipeline_stage",
                        "count": {"$sum": 1}
                    }}
                ]
                
                stage_counts = await self.db.leads.aggregate(pipeline).to_list(20)
                funnel = {item["_id"]: item["count"] for item in stage_counts}
                
                # Calculate conversion rates
                scraped = funnel.get("scraped", 0) + funnel.get("needs_enrichment", 0)
                enriched = funnel.get("needs_research", 0) + funnel.get("ready_for_outreach", 0) + funnel.get("in_sequence", 0)
                ready = funnel.get("ready_for_outreach", 0) + funnel.get("in_sequence", 0)
                
                # Get reply and booking stats
                status_pipeline = [
                    {"$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }}
                ]
                
                status_counts = await self.db.leads.aggregate(status_pipeline).to_list(20)
                statuses = {item["_id"]: item["count"] for item in status_counts}
                
                contacted = statuses.get("outreach_sent", 0) + statuses.get("engaged", 0) + statuses.get("qualified", 0) + statuses.get("booked", 0)
                replied = statuses.get("engaged", 0) + statuses.get("qualified", 0) + statuses.get("booked", 0)
                booked = statuses.get("booked", 0)
                
                # Save analytics
                analytics = {
                    "id": "pipeline_analytics",
                    "funnel": funnel,
                    "statuses": statuses,
                    "metrics": {
                        "total_scraped": scraped,
                        "total_enriched": enriched,
                        "total_ready": ready,
                        "total_contacted": contacted,
                        "total_replied": replied,
                        "total_booked": booked,
                        "scrape_to_enrich_rate": round(enriched / scraped * 100, 2) if scraped > 0 else 0,
                        "enrich_to_ready_rate": round(ready / enriched * 100, 2) if enriched > 0 else 0,
                        "reply_rate": round(replied / contacted * 100, 2) if contacted > 0 else 0,
                        "booking_rate": round(booked / contacted * 100, 2) if contacted > 0 else 0
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await self.db.pipeline_analytics.update_one(
                    {"id": "pipeline_analytics"},
                    {"$set": analytics},
                    upsert=True
                )
                
                # Get deliverability stats
                deliverability = await self.deliverability_tracker.get_deliverability_stats()
                
                await self.db.deliverability_stats.update_one(
                    {"id": "deliverability_stats"},
                    {"$set": {**deliverability, "updated_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                
                await asyncio.sleep(300)  # Every 5 minutes
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Analytics loop error: {e}")
                await asyncio.sleep(60)
    
    # ==================== MANUAL TRIGGERS ====================
    async def scrape_now(self, keyword: str, location: str, limit: int = 20) -> Dict[str, Any]:
        """Manually trigger a scrape"""
        leads = await self.maps_scraper.search_businesses(keyword, location, limit)
        
        saved = 0
        for lead in leads:
            lead = LeadCleaner.clean_lead(lead)
            is_valid, _ = LeadCleaner.is_valid_lead(lead, min_reviews=0)
            
            if not is_valid:
                continue
            
            existing = await self.db.leads.find_one({"domain": lead.get("domain")})
            if existing:
                continue
            
            lead["id"] = str(uuid.uuid4())
            lead["status"] = "scraped"
            lead["pipeline_stage"] = "needs_enrichment"
            lead["created_at"] = datetime.now(timezone.utc).isoformat()
            lead["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await self.db.leads.insert_one(lead)
            saved += 1
        
        return {"scraped": len(leads), "saved": saved}
    
    async def enrich_lead(self, lead_id: str) -> Dict[str, Any]:
        """Manually enrich a single lead"""
        lead = await self.db.leads.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            return {"error": "Lead not found"}
        
        domain = lead.get("domain") or lead.get("website", "").split("/")[0]
        email_data = await self.email_finder.find_email(domain)
        
        if email_data:
            await self.db.leads.update_one(
                {"id": lead_id},
                {"$set": {
                    "email": email_data.get("email"),
                    "email_confidence": email_data.get("confidence"),
                    "pipeline_stage": "needs_research",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "email": email_data.get("email")}
        
        return {"success": False, "error": "No email found"}


# Global controller
_pipeline: Optional[PipelineController] = None


def get_pipeline(db) -> PipelineController:
    global _pipeline
    if _pipeline is None:
        _pipeline = PipelineController(db)
    return _pipeline
