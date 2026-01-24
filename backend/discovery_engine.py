"""
Autonomous Lead Discovery Engine
Finds businesses showing AI pain signals through:
1. Google Maps + Review Analysis
2. Reddit/Social Intent Mining
3. Job Posting Signals
"""

import asyncio
import random
import re
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import httpx
import feedparser

logger = logging.getLogger(__name__)

# Pain signal keywords for AI consulting
PAIN_KEYWORDS = {
    'review_pain': [
        'slow response', 'never called back', 'waited days', 'took forever',
        'no response', 'hard to reach', 'unreliable', 'disorganized',
        'lost my information', 'had to call multiple times', 'poor communication',
        'missed appointment', 'scheduling nightmare', 'outdated', 'old school'
    ],
    'ai_intent': [
        'need automation', 'automate my', 'looking for AI', 'chatbot',
        'too much manual', 'waste time on', 'repetitive tasks', 'streamline',
        'efficiency', 'modernize', 'digital transformation', 'AI tools',
        'machine learning', 'save time', 'reduce manual'
    ],
    'job_signals': [
        'data entry', 'administrative assistant', 'appointment scheduler',
        'customer service representative', 'receptionist', 'virtual assistant',
        'email support', 'phone support', 'manual reporting', 'spreadsheet'
    ]
}

# Industry categories
INDUSTRIES = {
    'professional_services': [
        'accounting firm', 'law firm', 'legal services', 'consulting',
        'financial advisor', 'insurance agency', 'real estate agent',
        'marketing agency', 'CPA', 'attorney', 'lawyer'
    ],
    'home_services': [
        'plumber', 'electrician', 'HVAC', 'roofing', 'landscaping',
        'home cleaning', 'pest control', 'painting', 'handyman',
        'garage door', 'flooring', 'remodeling', 'contractor'
    ],
    'field_services': [
        'property management', 'construction', 'maintenance',
        'inspection services', 'surveying', 'appliance repair',
        'pool service', 'lawn care', 'tree service', 'moving company'
    ]
}

class DiscoveryEngine:
    """Autonomous lead discovery engine"""
    
    def __init__(self, db, openai_key: Optional[str] = None):
        self.db = db
        self.openai_key = openai_key
        self.is_running = False
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
    async def start(self, config: Dict[str, Any]):
        """Start autonomous discovery loop"""
        self.is_running = True
        self.config = config
        
        while self.is_running:
            try:
                # Run discovery sources
                await self._run_discovery_cycle()
                
                # Wait between cycles (configurable)
                await asyncio.sleep(config.get('cycle_interval_seconds', 300))
            except Exception as e:
                logger.error(f"Discovery cycle error: {e}")
                await asyncio.sleep(60)  # Wait before retry
    
    def stop(self):
        """Stop discovery loop"""
        self.is_running = False
    
    async def _run_discovery_cycle(self):
        """Run one full discovery cycle"""
        logger.info("Starting discovery cycle...")
        
        sources = self.config.get('enabled_sources', ['reddit', 'jobs', 'google_maps'])
        industries = self.config.get('industries', list(INDUSTRIES.keys()))
        locations = self.config.get('locations', [])
        
        discovered = []
        
        # Reddit intent mining
        if 'reddit' in sources:
            reddit_leads = await self.discover_from_reddit()
            discovered.extend(reddit_leads)
        
        # Job posting signals
        if 'jobs' in sources:
            job_leads = await self.discover_from_jobs(industries)
            discovered.extend(job_leads)
        
        # Google Maps (basic - will be enhanced with SerpAPI later)
        if 'google_maps' in sources and locations:
            for industry in industries:
                for location in locations:
                    maps_leads = await self.discover_from_maps(industry, location)
                    discovered.extend(maps_leads)
        
        # Process and score all discovered leads
        for lead_data in discovered:
            await self._process_discovered_lead(lead_data)
        
        logger.info(f"Discovery cycle complete. Found {len(discovered)} potential leads.")
        
        # Update discovery stats
        await self.db.discovery_stats.update_one(
            {"id": "stats"},
            {"$inc": {"total_discovered": len(discovered), "cycles_run": 1},
             "$set": {"last_cycle_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    
    async def discover_from_reddit(self) -> List[Dict]:
        """Mine Reddit for AI/automation intent signals"""
        leads = []
        
        subreddits = [
            'smallbusiness', 'entrepreneur', 'startups', 'business'
        ]
        
        # Use old.reddit.com which is more scraping-friendly
        for subreddit in subreddits[:2]:  # Limit to avoid rate limits
            try:
                # Use RSS feed instead of JSON API (more reliable)
                url = f"https://www.reddit.com/r/{subreddit}/search.rss"
                
                search_terms = ['need automation', 'AI for business', 'automate my']
                
                for term in search_terms[:1]:  # One term per subreddit
                    params = {
                        'q': term,
                        'restrict_sr': 'on',
                        't': 'month',
                        'sort': 'new'
                    }
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                    
                    try:
                        response = await self.http_client.get(url, params=params, headers=headers, timeout=10.0)
                        
                        if response.status_code == 200:
                            # Parse RSS feed
                            import feedparser
                            feed = feedparser.parse(response.text)
                            
                            for entry in feed.entries[:5]:
                                title = entry.get('title', '')
                                summary = entry.get('summary', '')
                                
                                lead = {
                                    'source': 'reddit',
                                    'source_id': entry.get('id', entry.get('link', '')),
                                    'business_name': f"Reddit: {title[:50]}",
                                    'category': 'Intent Signal',
                                    'pain_signal': title,
                                    'pain_detail': summary[:500],
                                    'source_url': entry.get('link', ''),
                                    'subreddit': subreddit,
                                    'intent_score': self._calculate_intent_score(title + ' ' + summary)
                                }
                                
                                if lead['intent_score'] >= 20:
                                    leads.append(lead)
                    except Exception as e:
                        logger.debug(f"Reddit RSS error: {e}")
                    
                    await asyncio.sleep(3)  # Rate limit respect
                    
            except Exception as e:
                logger.error(f"Reddit discovery error for r/{subreddit}: {e}")
        
        return leads
    
    async def discover_from_jobs(self, industries: List[str]) -> List[Dict]:
        """Find companies hiring for roles AI could automate"""
        leads = []
        
        # Use Google Jobs via SerpAPI-style search (DuckDuckGo fallback)
        job_keywords = ['data entry hiring', 'administrative assistant needed', 'receptionist job']
        
        for keyword in job_keywords[:2]:  # Limit queries
            try:
                # Use DuckDuckGo to find job postings
                search_query = f"{keyword} site:indeed.com OR site:linkedin.com"
                url = "https://html.duckduckgo.com/html/"
                
                data = {'q': search_query}
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
                
                response = await self.http_client.post(url, data=data, headers=headers, timeout=10.0)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    results = soup.find_all('div', class_='result')
                    
                    for result in results[:3]:
                        title_elem = result.find('a', class_='result__a')
                        snippet_elem = result.find('a', class_='result__snippet')
                        
                        if title_elem:
                            title = title_elem.get_text(strip=True)
                            # Try to extract company name
                            company_match = re.search(r'at\s+([^-|]+)', title) or re.search(r'-\s*([^-]+?)\s*-', title)
                            company = company_match.group(1).strip() if company_match else title[:50]
                            
                            lead = {
                                'source': 'job_posting',
                                'source_id': title_elem.get('href', '')[:200],
                                'business_name': company,
                                'category': 'Hiring Signal',
                                'pain_signal': f"Hiring for: {keyword.replace(' hiring', '').replace(' needed', '').replace(' job', '')}",
                                'pain_detail': snippet_elem.get_text(strip=True)[:500] if snippet_elem else '',
                                'source_url': title_elem.get('href', ''),
                                'job_title': title[:100],
                                'intent_score': 45  # Base score for hiring automatable roles
                            }
                            
                            leads.append(lead)
                
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Job discovery error for {keyword}: {e}")
        
        return leads
    
    async def discover_from_maps(self, industry: str, location: str) -> List[Dict]:
        """
        Basic Google Maps discovery (will be enhanced with SerpAPI later)
        For now, uses Google search to find business listings
        """
        leads = []
        
        # Get industry keywords
        keywords = INDUSTRIES.get(industry, [])
        
        for keyword in keywords[:2]:
            try:
                # Use DuckDuckGo HTML search (more scraping-friendly)
                search_query = f"{keyword} near {location} reviews"
                url = f"https://html.duckduckgo.com/html/"
                
                data = {'q': search_query}
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
                
                response = await self.http_client.post(url, data=data, headers=headers)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    results = soup.find_all('div', class_='result')
                    
                    for result in results[:5]:
                        title_elem = result.find('a', class_='result__a')
                        snippet_elem = result.find('a', class_='result__snippet')
                        
                        if title_elem:
                            lead = {
                                'source': 'web_search',
                                'source_id': title_elem.get('href', ''),
                                'business_name': title_elem.get_text(strip=True)[:100],
                                'category': keyword,
                                'city': location,
                                'pain_signal': 'Discovered via search',
                                'pain_detail': snippet_elem.get_text(strip=True)[:500] if snippet_elem else '',
                                'source_url': title_elem.get('href', ''),
                                'intent_score': 20  # Base score, will be enriched
                            }
                            
                            leads.append(lead)
                
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Maps discovery error for {keyword} in {location}: {e}")
        
        return leads
    
    def _calculate_intent_score(self, text: str) -> int:
        """Calculate intent score based on pain keywords"""
        text_lower = text.lower()
        score = 0
        
        # Check AI intent keywords
        for keyword in PAIN_KEYWORDS['ai_intent']:
            if keyword.lower() in text_lower:
                score += 15
        
        # Check pain keywords
        for keyword in PAIN_KEYWORDS['review_pain']:
            if keyword.lower() in text_lower:
                score += 10
        
        return min(score, 100)
    
    async def _process_discovered_lead(self, lead_data: Dict):
        """Process and store discovered lead"""
        
        # Check for duplicates
        existing = await self.db.leads.find_one({
            "$or": [
                {"source_id": lead_data.get('source_id')},
                {"business_name": lead_data.get('business_name'), "source": lead_data.get('source')}
            ]
        })
        
        if existing:
            return  # Skip duplicate
        
        # Create lead document
        import uuid
        lead = {
            'id': str(uuid.uuid4()),
            'business_name': lead_data.get('business_name', 'Unknown'),
            'category': lead_data.get('category', 'Unknown'),
            'city': lead_data.get('city'),
            'state': lead_data.get('state'),
            'phone': lead_data.get('phone'),
            'email': lead_data.get('email'),
            'website': lead_data.get('source_url'),
            'rating': lead_data.get('rating'),
            'review_count': lead_data.get('review_count', 0),
            'source': lead_data.get('source'),
            'source_id': lead_data.get('source_id'),
            'source_url': lead_data.get('source_url'),
            'pain_signal': lead_data.get('pain_signal'),
            'pain_detail': lead_data.get('pain_detail'),
            'pain_points': [lead_data.get('pain_signal')] if lead_data.get('pain_signal') else [],
            'lead_score': lead_data.get('intent_score', 0),
            'score_breakdown': {'intent_signal': lead_data.get('intent_score', 0)},
            'status': 'uncontacted',
            'discovered_at': datetime.now(timezone.utc).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.leads.insert_one(lead)
        logger.info(f"Discovered new lead: {lead['business_name']} (score: {lead['lead_score']})")


class ReviewAnalyzer:
    """Analyze business reviews for pain signals"""
    
    def __init__(self, openai_key: Optional[str] = None):
        self.openai_key = openai_key
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def analyze_reviews(self, reviews: List[str]) -> Dict[str, Any]:
        """Analyze reviews for AI consulting opportunities"""
        
        combined_text = ' '.join(reviews)
        pain_signals = []
        
        # Rule-based analysis
        for keyword in PAIN_KEYWORDS['review_pain']:
            if keyword.lower() in combined_text.lower():
                pain_signals.append(keyword)
        
        # Calculate pain score
        pain_score = min(len(pain_signals) * 15, 50)
        
        # If OpenAI key available, do deeper analysis
        if self.openai_key and pain_signals:
            ai_analysis = await self._ai_analyze(combined_text)
            if ai_analysis:
                return {
                    'pain_signals': pain_signals,
                    'pain_score': pain_score,
                    'ai_opportunity': ai_analysis.get('opportunity'),
                    'suggested_solution': ai_analysis.get('solution'),
                    'outreach_angle': ai_analysis.get('outreach_angle')
                }
        
        return {
            'pain_signals': pain_signals,
            'pain_score': pain_score,
            'ai_opportunity': 'Manual process optimization' if pain_signals else None,
            'suggested_solution': None,
            'outreach_angle': None
        }
    
    async def _ai_analyze(self, text: str) -> Optional[Dict]:
        """Use OpenAI to analyze for AI consulting opportunities"""
        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are an AI consultant identifying automation opportunities.
                            Analyze the review text and return JSON with:
                            - opportunity: The specific AI/automation opportunity
                            - solution: What AI solution would help
                            - outreach_angle: A personalized outreach angle based on their pain"""
                        },
                        {"role": "user", "content": f"Analyze these reviews for AI opportunities:\n{text[:2000]}"}
                    ],
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                return json.loads(content)
                
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
        
        return None


# Discovery configuration model
DEFAULT_DISCOVERY_CONFIG = {
    'enabled_sources': ['reddit', 'jobs', 'web_search'],
    'industries': ['professional_services', 'home_services', 'field_services'],
    'locations': [],  # User configures
    'scope': 'any',  # 'local' or 'any'
    'cycle_interval_seconds': 300,  # 5 minutes
    'max_leads_per_cycle': 50,
    'min_intent_score': 30
}
