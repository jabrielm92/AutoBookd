"""
Production Lead Scraping Engine
- Google Maps via SerpAPI
- Email enrichment via Hunter.io
- Website scraping via Playwright/httpx
"""

import asyncio
import logging
import re
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import json

logger = logging.getLogger(__name__)

SERPAPI_KEY = os.environ.get('SERPAPI_KEY')
HUNTER_API_KEY = os.environ.get('HUNTER_API_KEY')


class GoogleMapsScraper:
    """Scrape Google Maps via SerpAPI"""
    
    def __init__(self):
        self.api_key = SERPAPI_KEY
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://serpapi.com/search"
    
    async def search_businesses(
        self,
        keyword: str,
        location: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search Google Maps for businesses
        
        Args:
            keyword: Business type (e.g., "roofing company")
            location: City, State (e.g., "Philadelphia, PA")
            limit: Max results to return
        """
        if not self.api_key:
            logger.error("SerpAPI key not configured")
            return []
        
        leads = []
        
        try:
            params = {
                "engine": "google_maps",
                "q": f"{keyword} in {location}",
                "type": "search",
                "api_key": self.api_key,
                "num": min(limit, 20)  # SerpAPI max per request
            }
            
            response = await self.http_client.get(self.base_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for errors
                if "error" in data:
                    logger.error(f"SerpAPI error: {data['error']}")
                    return []
                
                local_results = data.get("local_results", [])
                
                for result in local_results[:limit]:
                    # Extract business data
                    lead = {
                        "business_name": result.get("title", ""),
                        "category": keyword,
                        "address": result.get("address", ""),
                        "phone": result.get("phone", ""),
                        "website": result.get("website", ""),
                        "rating": result.get("rating"),
                        "review_count": result.get("reviews", 0),
                        "maps_url": result.get("link", ""),
                        "place_id": result.get("place_id", ""),
                        "city": location.split(",")[0].strip() if "," in location else location,
                        "state": location.split(",")[1].strip() if "," in location else "",
                        "hours": result.get("hours", ""),
                        "thumbnail": result.get("thumbnail", ""),
                        "source": "google_maps",
                        "scraped_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    # Only include if has website (critical for personalization)
                    if lead["website"]:
                        leads.append(lead)
                    else:
                        logger.debug(f"Skipping {lead['business_name']} - no website")
                
                logger.info(f"SerpAPI: Found {len(leads)} leads with websites for '{keyword}' in {location}")
                
                # Track API usage
                search_info = data.get("search_metadata", {})
                logger.info(f"SerpAPI credits used: {search_info.get('google_maps_url', 'N/A')}")
                
            else:
                logger.error(f"SerpAPI request failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Google Maps scraping error: {e}")
        
        return leads
    
    async def close(self):
        await self.http_client.aclose()


class HunterEmailFinder:
    """Find and verify emails via Hunter.io"""
    
    def __init__(self):
        self.api_key = HUNTER_API_KEY
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://api.hunter.io/v2"
    
    async def find_email(self, domain: str, company_name: str = None) -> Optional[Dict[str, Any]]:
        """
        Find email for a domain
        Uses domain search to find generic/catch-all emails
        """
        if not self.api_key:
            logger.error("Hunter API key not configured")
            return None
        
        try:
            # First try domain search
            params = {
                "domain": domain,
                "api_key": self.api_key
            }
            
            response = await self.http_client.get(f"{self.base_url}/domain-search", params=params)
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                emails = data.get("emails", [])
                
                if emails:
                    # Prefer generic emails (info@, contact@, hello@)
                    generic_patterns = ["info", "contact", "hello", "sales", "support"]
                    
                    for pattern in generic_patterns:
                        for email_data in emails:
                            if pattern in email_data.get("value", "").lower():
                                return {
                                    "email": email_data.get("value"),
                                    "confidence": email_data.get("confidence", 0),
                                    "type": email_data.get("type", "generic"),
                                    "first_name": email_data.get("first_name"),
                                    "last_name": email_data.get("last_name"),
                                    "position": email_data.get("position"),
                                    "verified": email_data.get("verification", {}).get("status") == "valid"
                                }
                    
                    # If no generic, return first valid email
                    first_email = emails[0]
                    return {
                        "email": first_email.get("value"),
                        "confidence": first_email.get("confidence", 0),
                        "type": first_email.get("type"),
                        "first_name": first_email.get("first_name"),
                        "last_name": first_email.get("last_name"),
                        "position": first_email.get("position"),
                        "verified": first_email.get("verification", {}).get("status") == "valid"
                    }
                
                # Check for catch-all pattern
                pattern = data.get("pattern")
                if pattern and data.get("organization"):
                    # Generate likely email
                    guessed_email = f"info@{domain}"
                    return {
                        "email": guessed_email,
                        "confidence": 30,
                        "type": "guessed",
                        "pattern": pattern,
                        "verified": False
                    }
                    
            elif response.status_code == 401:
                logger.error("Hunter API: Invalid API key")
            elif response.status_code == 429:
                logger.warning("Hunter API: Rate limit reached")
            else:
                logger.debug(f"Hunter API: No results for {domain}")
                
        except Exception as e:
            logger.error(f"Hunter email finder error: {e}")
        
        return None
    
    async def verify_email(self, email: str) -> Dict[str, Any]:
        """Verify if an email is valid"""
        if not self.api_key:
            return {"status": "unknown", "score": 0}
        
        try:
            params = {
                "email": email,
                "api_key": self.api_key
            }
            
            response = await self.http_client.get(f"{self.base_url}/email-verifier", params=params)
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                return {
                    "status": data.get("status", "unknown"),
                    "score": data.get("score", 0),
                    "regexp": data.get("regexp", False),
                    "gibberish": data.get("gibberish", False),
                    "disposable": data.get("disposable", False),
                    "webmail": data.get("webmail", False),
                    "mx_records": data.get("mx_records", False),
                    "smtp_server": data.get("smtp_server", False),
                    "smtp_check": data.get("smtp_check", False),
                    "accept_all": data.get("accept_all", False)
                }
                
        except Exception as e:
            logger.error(f"Email verification error: {e}")
        
        return {"status": "unknown", "score": 0}
    
    async def close(self):
        await self.http_client.aclose()


class WebsiteScraper:
    """Scrape websites for research data"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
    
    async def scrape_website(self, url: str) -> Dict[str, Any]:
        """
        Scrape key pages from a website for AI research
        
        Returns:
            Dict with homepage, about, services, contact content
        """
        result = {
            "url": url,
            "homepage": "",
            "about": "",
            "services": "",
            "contact": "",
            "title": "",
            "meta_description": "",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "error": None
        }
        
        # Normalize URL
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        
        try:
            # Scrape homepage
            response = await self.http_client.get(url)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract title
                title_tag = soup.find('title')
                result["title"] = title_tag.get_text(strip=True) if title_tag else ""
                
                # Extract meta description
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                result["meta_description"] = meta_desc.get('content', '') if meta_desc else ""
                
                # Extract main content
                result["homepage"] = self._extract_text(soup)
                result["success"] = True
                
                # Try to find and scrape about page
                about_links = soup.find_all('a', href=re.compile(r'about|who-we-are|our-story', re.I))
                if about_links:
                    about_url = self._resolve_url(url, about_links[0].get('href', ''))
                    result["about"] = await self._scrape_page(about_url)
                
                # Try to find services page
                services_links = soup.find_all('a', href=re.compile(r'service|what-we-do|solution', re.I))
                if services_links:
                    services_url = self._resolve_url(url, services_links[0].get('href', ''))
                    result["services"] = await self._scrape_page(services_url)
                
                # Try to find contact page
                contact_links = soup.find_all('a', href=re.compile(r'contact|get-in-touch|reach-us', re.I))
                if contact_links:
                    contact_url = self._resolve_url(url, contact_links[0].get('href', ''))
                    result["contact"] = await self._scrape_page(contact_url)
                
        except httpx.TimeoutException:
            result["error"] = "timeout"
            logger.debug(f"Timeout scraping {url}")
        except Exception as e:
            result["error"] = str(e)
            logger.debug(f"Error scraping {url}: {e}")
        
        return result
    
    async def _scrape_page(self, url: str) -> str:
        """Scrape a single page and return text content"""
        try:
            response = await self.http_client.get(url)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                return self._extract_text(soup)
        except:
            pass
        return ""
    
    def _extract_text(self, soup: BeautifulSoup, max_length: int = 3000) -> str:
        """Extract readable text from HTML"""
        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            element.decompose()
        
        # Get text
        text = soup.get_text(separator=' ', strip=True)
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text[:max_length]
    
    def _resolve_url(self, base_url: str, href: str) -> str:
        """Resolve relative URL to absolute"""
        if href.startswith(('http://', 'https://')):
            return href
        
        from urllib.parse import urljoin
        return urljoin(base_url, href)
    
    async def close(self):
        await self.http_client.aclose()


class LeadCleaner:
    """Clean and deduplicate leads"""
    
    # Free email domains to reject
    FREE_EMAIL_DOMAINS = {
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
        'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com'
    }
    
    @staticmethod
    def clean_lead(lead: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and normalize lead data"""
        # Clean business name
        name = lead.get('business_name', '')
        name = re.sub(r'\s+', ' ', name).strip()
        lead['business_name'] = name
        
        # Clean phone
        phone = lead.get('phone', '')
        phone = re.sub(r'[^\d+]', '', phone)
        lead['phone'] = phone
        
        # Clean website
        website = lead.get('website', '')
        if website:
            website = website.lower().strip()
            website = re.sub(r'^https?://', '', website)
            website = re.sub(r'^www\.', '', website)
            website = website.rstrip('/')
            lead['website'] = website
            lead['domain'] = website.split('/')[0]
        
        return lead
    
    @staticmethod
    def is_valid_lead(lead: Dict[str, Any], min_reviews: int = 0) -> tuple[bool, str]:
        """
        Check if lead passes quality filters
        
        Returns:
            (is_valid, rejection_reason)
        """
        # Must have website
        if not lead.get('website'):
            return False, "no_website"
        
        # Must have business name
        if not lead.get('business_name') or len(lead['business_name']) < 2:
            return False, "no_name"
        
        # Check minimum reviews
        reviews = lead.get('review_count', 0)
        if reviews < min_reviews:
            return False, f"low_reviews_{reviews}"
        
        # Check if email is free/personal (if email exists)
        email = lead.get('email', '')
        if email:
            domain = email.split('@')[-1].lower()
            if domain in LeadCleaner.FREE_EMAIL_DOMAINS:
                return False, "free_email"
        
        return True, "passed"
    
    @staticmethod
    async def deduplicate_leads(db, leads: List[Dict]) -> List[Dict]:
        """Remove leads that already exist in database"""
        unique_leads = []
        
        for lead in leads:
            domain = lead.get('domain') or lead.get('website', '').split('/')[0]
            
            if not domain:
                continue
            
            # Check if domain already exists
            existing = await db.leads.find_one({
                "$or": [
                    {"domain": domain},
                    {"website": {"$regex": domain, "$options": "i"}}
                ]
            })
            
            if not existing:
                unique_leads.append(lead)
            else:
                logger.debug(f"Skipping duplicate: {domain}")
        
        return unique_leads
