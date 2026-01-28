"""
Production Lead Scraping Engine
- Google Maps via SerpAPI
- Email enrichment via Hunter.io or Apollo.io
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
APOLLO_API_KEY = os.environ.get('APOLLO_API_KEY')


class GoogleMapsScraper:
    """Scrape Google Maps via SerpAPI"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or SERPAPI_KEY
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://serpapi.com/search"
    
    def set_api_key(self, api_key: str):
        """Update API key dynamically"""
        self.api_key = api_key
    
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
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or HUNTER_API_KEY
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://api.hunter.io/v2"
    
    def set_api_key(self, api_key: str):
        """Update API key dynamically"""
        self.api_key = api_key
    
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


class ApolloEmailFinder:
    """Find and enrich leads via Apollo.io"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or APOLLO_API_KEY
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://api.apollo.io/v1"
    
    def set_api_key(self, api_key: str):
        """Update API key dynamically"""
        self.api_key = api_key
    
    async def find_email(self, domain: str, company_name: str = None) -> Optional[Dict[str, Any]]:
        """
        Find email and company info via Apollo.io
        """
        if not self.api_key:
            logger.error("Apollo API key not configured")
            return None
        
        try:
            # Search for organization
            headers = {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "X-Api-Key": self.api_key
            }
            
            # First, search for the organization
            org_response = await self.http_client.post(
                f"{self.base_url}/organizations/enrich",
                headers=headers,
                json={"domain": domain}
            )
            
            org_data = {}
            if org_response.status_code == 200:
                org_data = org_response.json().get("organization", {})
            
            # Search for people at the organization
            people_response = await self.http_client.post(
                f"{self.base_url}/mixed_people/search",
                headers=headers,
                json={
                    "q_organization_domains": domain,
                    "page": 1,
                    "per_page": 5,
                    "person_titles": ["owner", "ceo", "founder", "president", "manager", "director"]
                }
            )
            
            if people_response.status_code == 200:
                people_data = people_response.json()
                people = people_data.get("people", [])
                
                if people:
                    # Get the first person with an email
                    for person in people:
                        email = person.get("email")
                        if email:
                            return {
                                "email": email,
                                "confidence": 90 if person.get("email_status") == "verified" else 70,
                                "type": "personal",
                                "first_name": person.get("first_name"),
                                "last_name": person.get("last_name"),
                                "position": person.get("title"),
                                "verified": person.get("email_status") == "verified",
                                "linkedin_url": person.get("linkedin_url"),
                                "company_info": {
                                    "name": org_data.get("name"),
                                    "industry": org_data.get("industry"),
                                    "employee_count": org_data.get("estimated_num_employees"),
                                    "annual_revenue": org_data.get("annual_revenue"),
                                    "founded_year": org_data.get("founded_year")
                                }
                            }
                    
                    # If no email found, try to get company generic email
                    if org_data.get("primary_domain"):
                        return {
                            "email": f"info@{domain}",
                            "confidence": 30,
                            "type": "guessed",
                            "company_info": {
                                "name": org_data.get("name"),
                                "industry": org_data.get("industry"),
                                "employee_count": org_data.get("estimated_num_employees")
                            }
                        }
            
            elif people_response.status_code == 401:
                logger.error("Apollo API: Invalid API key")
            elif people_response.status_code == 403:
                logger.warning("Apollo API: People Search API access denied (403). Your plan may not include People API access. Falling back to generic email.")
                # Fallback: Generate a generic contact email
                if org_data:
                    return {
                        "email": f"info@{domain}",
                        "confidence": 25,
                        "type": "guessed",
                        "company_info": {
                            "name": org_data.get("name"),
                            "industry": org_data.get("industry"),
                            "employee_count": org_data.get("estimated_num_employees")
                        }
                    }
            elif people_response.status_code == 429:
                logger.warning("Apollo API: Rate limit reached")
            else:
                logger.debug(f"Apollo API: No results for {domain} (status: {people_response.status_code})")
                
        except Exception as e:
            logger.error(f"Apollo email finder error: {e}")
        
        return None
    
    async def enrich_lead(self, domain: str) -> Dict[str, Any]:
        """Get additional company information"""
        if not self.api_key:
            return {}
        
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Api-Key": self.api_key
            }
            
            response = await self.http_client.post(
                f"{self.base_url}/organizations/enrich",
                headers=headers,
                json={"domain": domain}
            )
            
            if response.status_code == 200:
                org = response.json().get("organization", {})
                return {
                    "company_name": org.get("name"),
                    "industry": org.get("industry"),
                    "employee_count": org.get("estimated_num_employees"),
                    "annual_revenue": org.get("annual_revenue"),
                    "founded_year": org.get("founded_year"),
                    "technologies": org.get("technologies", []),
                    "keywords": org.get("keywords", []),
                    "seo_description": org.get("seo_description")
                }
        except Exception as e:
            logger.error(f"Apollo enrichment error: {e}")
        
        return {}
    
    async def close(self):
        await self.http_client.aclose()


class WebsiteScraper:
    """Scrape websites for research data and company information"""
    
    # Email regex pattern
    EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    
    # Common generic email prefixes (preferred order)
    GENERIC_PREFIXES = ['info', 'contact', 'hello', 'sales', 'support', 'admin', 'office', 'enquiries', 'inquiries']
    
    # Domains to ignore
    IGNORE_DOMAINS = {'example.com', 'yourdomain.com', 'domain.com', 'email.com', 'sentry.io', 'wixpress.com', 'squarespace.com'}
    
    # Service-related keywords to look for
    SERVICE_KEYWORDS = [
        'services', 'solutions', 'offerings', 'what we do', 'our work', 
        'capabilities', 'specialties', 'expertise'
    ]
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
    
    def _extract_emails_from_html(self, html_content: str, domain: str = None) -> List[str]:
        """Extract all email addresses from HTML content"""
        emails = set()
        
        # Find all email patterns
        found = self.EMAIL_PATTERN.findall(html_content.lower())
        
        for email in found:
            # Skip invalid/fake emails
            email_domain = email.split('@')[1] if '@' in email else ''
            if email_domain in self.IGNORE_DOMAINS:
                continue
            if 'example' in email or 'test@' in email or 'noreply' in email:
                continue
            # Skip image file extensions
            if any(email.endswith(ext) for ext in ['.png', '.jpg', '.gif', '.svg', '.webp']):
                continue
            emails.add(email)
        
        # Also check mailto: links
        mailto_pattern = re.compile(r'mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})')
        mailto_emails = mailto_pattern.findall(html_content.lower())
        for email in mailto_emails:
            email_domain = email.split('@')[1] if '@' in email else ''
            if email_domain not in self.IGNORE_DOMAINS:
                emails.add(email)
        
        return list(emails)
    
    def _select_best_email(self, emails: List[str], domain: str = None) -> Optional[str]:
        """Select the best email from a list, preferring generic business emails"""
        if not emails:
            return None
        
        # First, prefer emails matching the website domain
        if domain:
            domain_clean = domain.lower().replace('www.', '').split('/')[0]
            domain_emails = [e for e in emails if domain_clean in e]
            if domain_emails:
                emails = domain_emails
        
        # Prefer generic emails (info@, contact@, etc.)
        for prefix in self.GENERIC_PREFIXES:
            for email in emails:
                if email.startswith(f"{prefix}@"):
                    return email
        
        # Return first non-personal looking email
        for email in emails:
            local_part = email.split('@')[0]
            # Skip likely personal emails (first.last@ patterns)
            if '.' not in local_part and len(local_part) < 20:
                return email
        
        # Return any email
        return emails[0] if emails else None
    
    def _extract_company_info(self, soup: BeautifulSoup, all_text: str) -> Dict[str, Any]:
        """Extract structured company information from website"""
        company_info = {
            "tagline": None,
            "description": None,
            "services": [],
            "unique_selling_points": [],
            "years_in_business": None,
            "team_size": None,
            "certifications": [],
            "awards": [],
            "locations_served": [],
            "social_proof": []
        }
        
        # Extract tagline (usually in h1, h2, or hero section)
        hero_elements = soup.find_all(['h1', 'h2'], limit=3)
        for el in hero_elements:
            text = el.get_text(strip=True)
            if 10 < len(text) < 150 and not any(skip in text.lower() for skip in ['menu', 'navigation', 'copyright']):
                company_info["tagline"] = text
                break
        
        # Extract meta description as company description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            company_info["description"] = meta_desc.get('content', '')[:500]
        
        # Extract services from lists
        service_sections = soup.find_all(['ul', 'ol'], limit=10)
        for section in service_sections:
            items = section.find_all('li', limit=10)
            for item in items:
                text = item.get_text(strip=True)
                if 5 < len(text) < 100:
                    # Check if it looks like a service
                    if any(kw in text.lower() for kw in ['service', 'solution', 'consulting', 'management', 'installation', 'repair', 'maintenance']):
                        company_info["services"].append(text)
        
        # Look for years in business
        year_patterns = [
            r'since\s+(\d{4})',
            r'established\s+(?:in\s+)?(\d{4})',
            r'founded\s+(?:in\s+)?(\d{4})',
            r'(\d+)\+?\s+years?\s+(?:of\s+)?experience',
            r'over\s+(\d+)\s+years'
        ]
        for pattern in year_patterns:
            match = re.search(pattern, all_text.lower())
            if match:
                company_info["years_in_business"] = match.group(1)
                break
        
        # Look for certifications/licenses
        cert_patterns = [
            r'(licensed|certified|insured|bonded)',
            r'(ISO\s*\d+)',
            r'(BBB\s*(?:A\+?|accredited))',
            r'(EPA\s*certified)',
        ]
        for pattern in cert_patterns:
            matches = re.findall(pattern, all_text, re.I)
            company_info["certifications"].extend([m for m in matches if m])
        
        # Look for social proof (reviews, ratings)
        social_patterns = [
            r'(\d+)\+?\s*(?:5[- ]star)?\s*reviews?',
            r'(\d+(?:\.\d)?)\s*(?:star)?\s*rating',
            r'(\d+)\+?\s*happy\s*customers?',
            r'(\d+)\+?\s*projects?\s*completed'
        ]
        for pattern in social_patterns:
            match = re.search(pattern, all_text.lower())
            if match:
                company_info["social_proof"].append(match.group(0))
        
        # Extract unique selling points (look for "why choose us" type sections)
        usp_headers = soup.find_all(['h2', 'h3', 'h4'], string=re.compile(r'why\s+choose|what\s+sets|our\s+difference|benefits', re.I))
        for header in usp_headers[:1]:
            parent = header.find_parent(['section', 'div'])
            if parent:
                items = parent.find_all('li', limit=5)
                for item in items:
                    text = item.get_text(strip=True)
                    if 10 < len(text) < 150:
                        company_info["unique_selling_points"].append(text)
        
        # Clean up empty lists
        company_info["services"] = list(set(company_info["services"]))[:10]
        company_info["certifications"] = list(set(company_info["certifications"]))[:5]
        company_info["social_proof"] = list(set(company_info["social_proof"]))[:5]
        company_info["unique_selling_points"] = company_info["unique_selling_points"][:5]
        
        return company_info
    
    async def scrape_website(self, url: str) -> Dict[str, Any]:
        """
        Scrape key pages from a website for AI research
        
        Returns:
            Dict with homepage, about, services, contact content, emails, and company info
        """
        result = {
            "url": url,
            "homepage": "",
            "about": "",
            "services": "",
            "contact": "",
            "title": "",
            "meta_description": "",
            "emails_found": [],
            "best_email": None,
            "phone_found": None,
            "company_info": {},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "error": None
        }
        
        # Normalize URL
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        
        domain = url.replace('https://', '').replace('http://', '').split('/')[0]
        all_emails = set()
        all_html = ""
        all_text = ""
        main_soup = None
        
        try:
            # Scrape homepage
            response = await self.http_client.get(url)
            
            if response.status_code == 200:
                html_content = response.text
                all_html += html_content
                soup = BeautifulSoup(html_content, 'html.parser')
                main_soup = soup
                
                # Extract title
                title_tag = soup.find('title')
                result["title"] = title_tag.get_text(strip=True) if title_tag else ""
                
                # Extract meta description
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                result["meta_description"] = meta_desc.get('content', '') if meta_desc else ""
                
                # Extract main content
                homepage_text = self._extract_text(soup)
                result["homepage"] = homepage_text
                all_text += homepage_text + " "
                result["success"] = True
                
                # Extract emails from homepage
                all_emails.update(self._extract_emails_from_html(html_content, domain))
                
                # Try to find and scrape about page
                about_links = soup.find_all('a', href=re.compile(r'about|who-we-are|our-story|team', re.I))
                if about_links:
                    about_url = self._resolve_url(url, about_links[0].get('href', ''))
                    about_content, about_html = await self._scrape_page_with_html(about_url)
                    result["about"] = about_content
                    all_text += about_content + " "
                    if about_html:
                        all_emails.update(self._extract_emails_from_html(about_html, domain))
                        all_html += about_html
                
                # Try to find services page
                services_links = soup.find_all('a', href=re.compile(r'service|what-we-do|solution|offering', re.I))
                if services_links:
                    services_url = self._resolve_url(url, services_links[0].get('href', ''))
                    services_content, services_html = await self._scrape_page_with_html(services_url)
                    result["services"] = services_content
                    all_text += services_content + " "
                    if services_html:
                        all_emails.update(self._extract_emails_from_html(services_html, domain))
                        all_html += services_html
                
                # Try to find contact page (highest priority for emails!)
                contact_links = soup.find_all('a', href=re.compile(r'contact|get-in-touch|reach-us', re.I))
                if contact_links:
                    contact_url = self._resolve_url(url, contact_links[0].get('href', ''))
                    contact_content, contact_html = await self._scrape_page_with_html(contact_url)
                    result["contact"] = contact_content
                    if contact_html:
                        all_emails.update(self._extract_emails_from_html(contact_html, domain))
                
                # Extract phone number
                phone_pattern = re.compile(r'[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]?\d{4}')
                phones = phone_pattern.findall(all_html)
                if phones:
                    result["phone_found"] = phones[0]
                
                # Set email results
                result["emails_found"] = list(all_emails)
                result["best_email"] = self._select_best_email(list(all_emails), domain)
                
                # Extract structured company information
                if main_soup:
                    result["company_info"] = self._extract_company_info(main_soup, all_text)
                
        except httpx.TimeoutException:
            result["error"] = "timeout"
            logger.debug(f"Timeout scraping {url}")
        except Exception as e:
            result["error"] = str(e)
            logger.debug(f"Error scraping {url}: {e}")
        
        return result
    
    async def _scrape_page_with_html(self, url: str) -> tuple:
        """Scrape a single page and return both text content and raw HTML"""
        try:
            response = await self.http_client.get(url)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                return self._extract_text(soup), response.text
        except:
            pass
        return "", ""
    
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
