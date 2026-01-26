"""
AI Research & Personalization Engine
Generates structured research and personalized outreach
"""

import asyncio
import logging
import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger(__name__)


class AIResearchEngine:
    """
    AI-powered research and personalization
    Uses OpenAI to analyze websites and generate personalized outreach
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY')
        self.http_client = httpx.AsyncClient(timeout=60.0)
        self.model = "gpt-4o-mini"  # Cost-effective, good quality
    
    async def research_lead(
        self, 
        lead: Dict[str, Any], 
        website_data: Dict[str, Any],
        product: Dict[str, Any] = None,
        email_guidelines: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform AI research on a lead
        
        Returns structured JSON with:
        - pain_point: Specific business pain
        - opportunity: What they're missing
        - opener: Personalized first line
        - services: What they offer
        - target_customer: Who they serve
        """
        
        if not self.api_key:
            logger.error("OpenAI API key not configured")
            return self._default_research(lead)
        
        # Combine website content
        website_content = f"""
        Title: {website_data.get('title', '')}
        Description: {website_data.get('meta_description', '')}
        Homepage: {website_data.get('homepage', '')[:1500]}
        About: {website_data.get('about', '')[:500]}
        Services: {website_data.get('services', '')[:500]}
        """
        
        # Build product context
        product_context = ""
        if product:
            product_context = f"""
YOUR PRODUCT/SERVICE:
- Name: {product.get('name', 'Business Solutions')}
- Description: {product.get('description', '')}
- Key Features: {', '.join(product.get('features', []))}
"""
        
        # Build email rules
        rules = """
RULES:
1. Be SPECIFIC - reference actual things from their website
2. Focus on operational pain points your solution can solve
3. DO NOT use generic phrases like "I noticed your website"
4. The opener should prove you did research
5. Keep opener under 25 words"""
        
        if email_guidelines:
            forbidden = email_guidelines.get('forbidden_words', [])
            if forbidden:
                rules += f"\n6. NEVER use these words: {', '.join(forbidden)}"
            
            preferred = email_guidelines.get('preferred_words', [])
            if preferred:
                rules += f"\n7. Prefer using: {', '.join(preferred)}"
            
            tone = email_guidelines.get('tone', 'professional')
            rules += f"\n8. Tone should be: {tone}"
            
            max_words = email_guidelines.get('max_words', 150)
            rules += f"\n9. Keep opener under {min(25, max_words // 6)} words"
            
            rule_toggles = email_guidelines.get('rules', {})
            if rule_toggles.get('no_exclamation_marks'):
                rules += "\n10. Do NOT use exclamation marks"
            if rule_toggles.get('always_include_question'):
                rules += "\n11. End with a question"
            if rule_toggles.get('first_name_only'):
                rules += "\n12. Use first name only (not Mr./Ms.)"
        
        prompt = f"""You are a sales research assistant.
{product_context}
BUSINESS INFO:
- Name: {lead.get('business_name')}
- Industry: {lead.get('category')}
- Location: {lead.get('city')}, {lead.get('state')}
- Rating: {lead.get('rating')} ({lead.get('review_count')} reviews)
- Website: {lead.get('website')}

WEBSITE CONTENT:
{website_content}

TASK:
Analyze this business and identify how your solution can help them.
{rules}

OUTPUT JSON:
{{
    "pain_point": "One specific operational pain they likely have",
    "opportunity": "One specific way your solution could help them",
    "opener": "A personalized first sentence that proves research",
    "services": "Their main services (brief)",
    "target_customer": "Who they serve",
    "personalization_quality": "high/medium/low"
}}

Return ONLY valid JSON, no markdown."""

        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a sales research assistant. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                
                # Parse JSON (handle potential markdown wrapping)
                content = content.strip()
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                
                research = json.loads(content)
                research['research_status'] = 'completed'
                research['researched_at'] = datetime.now(timezone.utc).isoformat()
                
                logger.info(f"AI research completed for {lead.get('business_name')}: {research.get('personalization_quality', 'unknown')} quality")
                
                return research
                
            else:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
        except Exception as e:
            logger.error(f"AI research error: {e}")
        
        return self._default_research(lead)
    
    def _default_research(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback research when AI fails"""
        return {
            "pain_point": "Managing customer inquiries and scheduling",
            "opportunity": "Automated customer response system",
            "opener": f"Your {lead.get('category', 'business')} in {lead.get('city', 'the area')} caught my attention.",
            "services": lead.get('category', 'Various services'),
            "target_customer": "Local customers",
            "personalization_quality": "low",
            "research_status": "fallback"
        }
    
    async def classify_reply(self, reply_text: str, conversation_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Classify an email reply as positive, neutral, or negative
        
        Returns:
            {
                "intent": "positive" | "neutral" | "negative",
                "action": "send_calendar" | "human_review" | "unsubscribe",
                "confidence": 0.0-1.0,
                "reasoning": "Why this classification"
            }
        """
        
        if not self.api_key:
            return {"intent": "neutral", "action": "human_review", "confidence": 0.5}
        
        prompt = f"""Classify this email reply for a cold outreach campaign.

REPLY:
{reply_text}

CLASSIFY AS:
- "positive": Shows interest, wants to talk, asks questions about the service
- "neutral": Non-committal, asks for more info, not sure
- "negative": Not interested, asks to stop emailing, rude

DETERMINE ACTION:
- "send_calendar": If positive and ready to meet
- "human_review": If unclear or needs personal response
- "unsubscribe": If negative or asks to stop

OUTPUT JSON:
{{
    "intent": "positive" | "neutral" | "negative",
    "action": "send_calendar" | "human_review" | "unsubscribe",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation"
}}"""

        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You classify email replies. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 200
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                
                # Parse JSON
                content = content.strip()
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                
                return json.loads(content)
                
        except Exception as e:
            logger.error(f"Reply classification error: {e}")
        
        return {"intent": "neutral", "action": "human_review", "confidence": 0.5}
    
    async def close(self):
        await self.http_client.aclose()


class EmailSequenceGenerator:
    """
    Generate proven 4-email sequences
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY')
        self.http_client = httpx.AsyncClient(timeout=60.0)
    
    def generate_sequence(
        self,
        lead: Dict[str, Any],
        research: Dict[str, Any],
        sender_name: str,
        sender_company: str,
        calendar_link: str = None,
        product: Dict[str, Any] = None,
        email_guidelines: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate a 4-email sequence based on research
        
        Sequence:
        1. Personal opener - prove research
        2. Pattern interrupt - short question
        3. Proof - case study/social proof
        4. Breakup - last attempt
        """
        
        opener = research.get('opener', f"Your {lead.get('category', 'business')} caught my attention.")
        pain_point = research.get('pain_point', 'managing customer inquiries')
        opportunity = research.get('opportunity', 'streamlined operations')
        business_name = lead.get('business_name', 'your business')
        
        # Use product info if available
        product_name = product.get('name', sender_company) if product else sender_company
        product_desc = product.get('description', '') if product else ''
        
        # Build value proposition from product
        value_prop = "respond to customers faster and never miss a lead"
        if product_desc:
            value_prop = product_desc[:100]
        
        # Apply email guidelines
        if email_guidelines:
            # Filter forbidden words from all content
            forbidden = email_guidelines.get('forbidden_words', [])
            for word in forbidden:
                opener = opener.replace(word, '').replace(word.lower(), '')
                pain_point = pain_point.replace(word, '').replace(word.lower(), '')
                opportunity = opportunity.replace(word, '').replace(word.lower(), '')
        
        sequence = [
            # Email 1: Personal opener
            {
                "sequence_number": 1,
                "delay_days": 0,
                "subject": f"Quick question about {business_name}",
                "body": f"""{opener}

I work with {lead.get('category', 'businesses')} to solve {pain_point} - typically helping them {value_prop}.

Would it make sense to chat for 15 minutes this week?

{sender_name}
{sender_company}""",
                "type": "opener"
            },
            
            # Email 2: Pattern interrupt (Day 3)
            {
                "sequence_number": 2,
                "delay_days": 3,
                "subject": "Re: Quick question about {business_name}",
                "body": f"""Hey,

Just circling back on my note.

Curious - how are you currently handling {pain_point.lower()}?

{sender_name}""",
                "type": "follow_up"
            },
            
            # Email 3: Proof (Day 6)
            {
                "sequence_number": 3,
                "delay_days": 6,
                "subject": "Re: Quick question about {business_name}",
                "body": f"""Quick thought -

I recently helped a {lead.get('category', 'similar business')} streamline their operations significantly. They went from missing 30% of leads to capturing nearly all of them.

{opportunity} could do the same for {business_name}.

Worth a quick call?

{sender_name}""",
                "type": "proof"
            },
            
            # Email 4: Breakup (Day 10)
            {
                "sequence_number": 4,
                "delay_days": 10,
                "subject": "Should I close the loop?",
                "body": f"""Hey,

I've reached out a few times about helping {business_name} with {pain_point.lower()}.

If the timing isn't right or this isn't a priority, no worries at all - just let me know and I'll close the loop.

But if you're curious about what's possible, I'm happy to do a quick no-pressure chat.

{sender_name}
{sender_company}""",
                "type": "breakup"
            }
        ]
        
        # Add calendar link to appropriate emails if provided
        if calendar_link:
            sequence[0]["body"] = sequence[0]["body"].replace(
                "Would it make sense to chat for 15 minutes this week?",
                f"Would it make sense to chat for 15 minutes this week?\n\nBook a time here: {calendar_link}"
            )
        
        return sequence
    
    async def generate_ai_sequence(
        self,
        lead: Dict[str, Any],
        research: Dict[str, Any],
        sender_name: str,
        sender_company: str
    ) -> List[Dict[str, Any]]:
        """
        Generate fully AI-personalized sequence (uses more tokens)
        Only use for high-value leads
        """
        if not self.api_key:
            return self.generate_sequence(lead, research, sender_name, sender_company)
        
        prompt = f"""Generate a 4-email cold outreach sequence.

LEAD INFO:
- Business: {lead.get('business_name')}
- Industry: {lead.get('category')}
- Location: {lead.get('city')}, {lead.get('state')}

RESEARCH:
- Pain point: {research.get('pain_point')}
- Opportunity: {research.get('opportunity')}
- Services: {research.get('services')}

SENDER:
- Name: {sender_name}
- Company: {sender_company}

SEQUENCE STRUCTURE:
1. Email 1 (Day 0): Personal opener - reference specific research, soft CTA
2. Email 2 (Day 3): Pattern interrupt - short, question-based, no links
3. Email 3 (Day 6): Proof - brief case study or social proof
4. Email 4 (Day 10): Breakup - "Should I close the loop?"

RULES:
- Keep each email under 100 words
- Sound human, not salesy
- Don't mention "AI" in subject lines
- Each email should stand alone

OUTPUT JSON array of 4 emails:
[
    {{
        "sequence_number": 1,
        "delay_days": 0,
        "subject": "...",
        "body": "...",
        "type": "opener"
    }},
    ...
]"""

        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You write cold email sequences. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 1500
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                
                # Parse JSON
                content = content.strip()
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                
                return json.loads(content)
                
        except Exception as e:
            logger.error(f"AI sequence generation error: {e}")
        
        # Fallback to template
        return self.generate_sequence(lead, research, sender_name, sender_company)
    
    async def close(self):
        await self.http_client.aclose()
