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
        
        # Add scraped company info if available (from lead data)
        scraped_info = lead.get('scraped_company_info', {})
        company_context = ""
        if scraped_info:
            tagline = scraped_info.get('tagline', '')
            services_list = scraped_info.get('services', [])
            usps = scraped_info.get('unique_selling_points', [])
            years = scraped_info.get('years_in_business', '')
            certs = scraped_info.get('certifications', [])
            social = scraped_info.get('social_proof', [])
            
            company_context = "\nSCRAPED COMPANY INSIGHTS:\n"
            if tagline:
                company_context += f"- Tagline: {tagline}\n"
            if services_list:
                company_context += f"- Services Offered: {', '.join(services_list[:5])}\n"
            if usps:
                company_context += f"- Selling Points: {', '.join(usps[:3])}\n"
            if years:
                company_context += f"- Years in Business: {years}\n"
            if certs:
                company_context += f"- Certifications: {', '.join(certs[:3])}\n"
            if social:
                company_context += f"- Social Proof: {', '.join(social[:3])}\n"
        
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
            
            custom_prompt = email_guidelines.get('custom_prompt', '')
            if custom_prompt and custom_prompt.strip():
                rules += f"\n\nADDITIONAL INSTRUCTIONS FROM USER:\n{custom_prompt.strip()}"
        
        prompt = f"""Analyze this business and provide sales intelligence for cold outreach.

BUSINESS:
- Name: {lead.get('business_name', 'Unknown')}
- Category: {lead.get('category', 'General Business')}
- Location: {lead.get('city', 'Unknown')}, {lead.get('state', '')}
- Website: {lead.get('website', 'N/A')}

WEBSITE DATA:
{website_content}
{company_context}
{product_context}

{rules}

Analyze their business and return JSON:
{{
    "pain_point": "Specific operational challenge they likely face (be concrete, not generic)",
    "opportunity": "What improvement or solution would benefit them most",
    "opener": "A unique, personalized first line - see OPENER VARIETY RULES below",
    "services": "What services/products they offer",
    "target_customer": "Who their ideal customer is",
    "unique_angle": "What makes this business different from competitors",
    "personalization_quality": "high" | "medium" | "low"
}}

OPENER VARIETY RULES - Make each opener genuinely unique by using ONE of these angles:
1. SPECIFIC SERVICE: Reference a unique service they offer (not generic category)
   Example: "Your same-day emergency plumbing service caught my eye..."
2. LOCATION INSIGHT: Reference something about their service area
   Example: "Serving the tri-state area for home repairs is no small feat..."
3. EXPERTISE/NICHE: Reference their specialty or focus area
   Example: "Your focus on commercial HVAC for restaurants is interesting..."
4. ACHIEVEMENT: Reference years in business, certifications, or awards
   Example: "Building a dental practice for 15+ years shows real staying power..."
5. CUSTOMER FOCUS: Reference who they serve
   Example: "Helping first-time homeowners navigate inspections is valuable work..."
6. PROBLEM-SOLUTION: Lead with the problem you solve
   Example: "Most medspas struggle with no-shows - does that sound familiar?"
7. OBSERVATION: A genuine insight from their website
   Example: "I noticed you offer both commercial and residential services..."

NEVER use these patterns:
- "I noticed your website" / "I came across your business"
- "With X reviews" / "Your X-star rating" / mentioning ratings or review counts
- "I see you're in the [industry] space"
- Generic compliments like "impressive" or "great work"

The opener should feel like it was written specifically for THIS business."""

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
        
        # Use scraped company info for deeper personalization
        scraped_info = lead.get('scraped_company_info', {})
        services = research.get('services', '')
        if scraped_info.get('services'):
            services = ', '.join(scraped_info['services'][:3])
        
        years_experience = scraped_info.get('years_in_business', '')
        unique_angle = research.get('unique_angle', '')
        certifications = ', '.join(scraped_info.get('certifications', [])[:2]) if scraped_info.get('certifications') else ''
        
        # Use product info if available
        product_desc = product.get('description', '') if product else ''
        product_name = product.get('name', 'our solution') if product else 'our solution'
        
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
        
        # Build more personalized opener using scraped data
        personalized_line = ""
        if years_experience:
            personalized_line = f"With {years_experience} years in the business, you've clearly built something special. "
        elif certifications:
            personalized_line = f"Your {certifications} credentials show your commitment to quality. "
        elif services:
            personalized_line = f"Your {services} services are clearly in demand in {lead.get('city', 'your area')}. "
        
        sequence = [
            # Email 1: Personal opener
            {
                "sequence_number": 1,
                "delay_days": 0,
                "subject": f"Quick question about {business_name}",
                "body": f"""{opener}

{personalized_line}I work with {lead.get('category', 'businesses')} to solve {pain_point} - typically helping them {value_prop}.

Would it make sense to chat for 15 minutes this week?

{sender_name}
{sender_company}""",
                "type": "opener"
            },
            
            # Email 2: Pattern interrupt (Day 3)
            {
                "sequence_number": 2,
                "delay_days": 3,
                "subject": f"Re: Quick question about {business_name}",
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
                "subject": f"Re: Quick question about {business_name}",
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
        sender_company: str,
        calendar_link: str = None,
        product: Dict[str, Any] = None,
        follow_up_days: int = 2,
        email_guidelines: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate fully AI-personalized sequence with industry-specific messaging
        """
        if not self.api_key:
            return self.generate_sequence(lead, research, sender_name, sender_company)
        
        product_context = ""
        custom_guidelines = ""
        if product:
            product_context = f"""
YOUR PRODUCT/SERVICE TO SELL:
- Name: {product.get('name', sender_company)}
- Description: {product.get('description', '')}
- Key Benefits: {', '.join(product.get('features', []))}
"""
            # Add custom email guidelines if provided per-product
            if product.get('email_guidelines'):
                custom_guidelines = f"""
PRODUCT-SPECIFIC GUIDELINES:
{product.get('email_guidelines')}
"""
        
        # Add global email guidelines from config
        global_guidelines = ""
        if email_guidelines:
            parts = []
            forbidden = email_guidelines.get('forbidden_words', [])
            if forbidden:
                parts.append(f"- NEVER use these words: {', '.join(forbidden)}")
            preferred = email_guidelines.get('preferred_words', [])
            if preferred:
                parts.append(f"- Prefer using these words: {', '.join(preferred)}")
            tone = email_guidelines.get('tone', 'professional')
            parts.append(f"- Tone: {tone}")
            max_words = email_guidelines.get('max_words', 150)
            parts.append(f"- Keep emails under {max_words} words")
            
            rules = email_guidelines.get('rules', {})
            if rules.get('no_exclamation_marks'):
                parts.append("- Do NOT use exclamation marks")
            if rules.get('always_include_question'):
                parts.append("- End with a question")
            if rules.get('first_name_only'):
                parts.append("- Use first name only (not Mr./Ms.)")
            if rules.get('no_competitor_mentions'):
                parts.append("- Never mention competitors")
            if rules.get('no_roi_promises'):
                parts.append("- Don't make specific ROI promises")
            
            custom_prompt = email_guidelines.get('custom_prompt', '')
            if custom_prompt and custom_prompt.strip():
                parts.append(f"\nUSER'S CUSTOM INSTRUCTIONS:\n{custom_prompt.strip()}")
            
            if parts:
                global_guidelines = "\nEMAIL GUIDELINES (FOLLOW STRICTLY):\n" + "\n".join(parts)
        
        calendar_context = ""
        if calendar_link:
            calendar_context = f"\nInclude this booking link in Email 1: {calendar_link}"
        
        # Calculate delays based on follow_up_days
        delays = [0, follow_up_days, follow_up_days * 2, follow_up_days * 3]
        
        prompt = f"""You are an expert cold email copywriter. Generate a highly personalized 4-email sequence.

TARGET BUSINESS:
- Name: {lead.get('business_name')}
- Industry: {lead.get('category')}
- Location: {lead.get('city')}, {lead.get('state')}
- Website: {lead.get('website', 'N/A')}

RESEARCH INSIGHTS:
- Specific Pain Point: {research.get('pain_point')}
- Growth Opportunity: {research.get('opportunity')}
- Their Services: {research.get('services')}
- Target Customer: {research.get('target_customer', 'local customers')}
- Personalized Opener: {research.get('opener')}
- Unique Angle: {research.get('unique_angle', '')}
{product_context}
{custom_guidelines}
{global_guidelines}
SENDER:
- Name: {sender_name}
- Company: {sender_company}
{calendar_context}

SEQUENCE REQUIREMENTS:

EMAIL 1 (Day 0 - Personal Opener):
- Start with a specific observation about THEIR business using ONE of these angles:
  * A specific service they offer (not generic category)
  * Their geographic focus or service area
  * Their specialization or niche
  * Years in business or expertise
  * The type of customer they serve
  * A problem-first approach
- Connect their pain point to your solution naturally
- Soft CTA: "Would it make sense to chat?"
- Max 80 words

EMAIL 2 (Day {delays[1]} - Pattern Interrupt):
- Very short (under 40 words)
- Ask ONE specific question about their current process
- No links, no pitch
- Casual tone

EMAIL 3 (Day {delays[2]} - Value & Proof):
- Lead with a specific result or case study
- Make it relevant to their industry ({lead.get('category')})
- Bridge to how this applies to them
- Max 70 words

EMAIL 4 (Day {delays[3]} - Breakup):
- Acknowledge the busy reality
- Offer a clear "close the loop" out
- Leave door open without being pushy
- Max 50 words

CRITICAL RULES:
- NO typos or grammatical errors
- NEVER mention ratings, reviews, or star counts
- NO generic phrases like "I noticed your website" or "I came across your business"
- Each email MUST feel unique to THIS specific business
- Sound like a helpful human, not a salesperson
- Vary sentence structure and length
- Use their actual business name naturally
- Match the tone to a {lead.get('category')} business owner
- Each opener should be different - don't follow a formula

OUTPUT valid JSON array:
[
    {{"sequence_number": 1, "delay_days": 0, "subject": "...", "body": "...", "type": "opener"}},
    {{"sequence_number": 2, "delay_days": {delays[1]}, "subject": "Re: [Email 1 subject]", "body": "...", "type": "follow_up"}},
    {{"sequence_number": 3, "delay_days": {delays[2]}, "subject": "Re: [Email 1 subject]", "body": "...", "type": "proof"}},
    {{"sequence_number": 4, "delay_days": {delays[3]}, "subject": "Closing the loop", "body": "...", "type": "breakup"}}
]"""

        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",  # Use best model for quality emails
                    "messages": [
                        {"role": "system", "content": "You are an elite cold email copywriter who writes highly personalized, grammatically perfect emails that feel human and get responses. You never use generic templates. Each email is crafted specifically for the recipient's business. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,  # Higher creativity for varied emails
                    "max_tokens": 2000
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
                
                sequence = json.loads(content)
                logger.info(f"AI sequence generated for {lead.get('business_name')}")
                return sequence
                
        except Exception as e:
            logger.error(f"AI sequence generation error: {e}")
        
        # Fallback to template
        return self.generate_sequence(lead, research, sender_name, sender_company, calendar_link, product)
    
    async def close(self):
        await self.http_client.aclose()
