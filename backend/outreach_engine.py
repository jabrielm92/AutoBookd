"""
Autonomous Outreach Engine
Sends personalized emails based on discovered pain signals
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
import json
import re

logger = logging.getLogger(__name__)

# Email templates based on pain type
EMAIL_TEMPLATES = {
    'review_pain': {
        'subject': "Quick question about {business_name}",
        'body': """Hi,

I came across {business_name} and noticed some customers mentioning {pain_signal}.

I help businesses like yours solve exactly this - using AI to {solution_hint}.

Would you be open to a quick 15-minute call to see if there's a fit?

Best,
{sender_name}
{sender_company}"""
    },
    'intent_signal': {
        'subject': "Saw your post about {pain_signal}",
        'body': """Hi,

I saw your recent post about {pain_signal} and thought I could help.

I work with businesses to implement AI solutions that {solution_hint}. Recently helped a {similar_industry} company cut their {pain_area} time by 70%.

Would love to share how - free 15-min call?

{sender_name}
{sender_company}"""
    },
    'hiring_signal': {
        'subject': "Alternative to hiring for {pain_signal}",
        'body': """Hi,

I noticed {business_name} is hiring for {pain_signal}.

Before you commit to that salary, have you considered AI automation? I've helped similar companies handle this work without adding headcount.

Happy to show you what's possible in a quick call.

{sender_name}
{sender_company}"""
    },
    'generic': {
        'subject': "AI automation for {business_name}?",
        'body': """Hi,

I help {industry} businesses automate repetitive work with AI.

Common wins I deliver:
• Instant customer response (vs hours/days)
• Automated scheduling and follow-ups
• AI-powered lead qualification

Would a 15-minute call make sense to see if there's a fit?

{sender_name}
{sender_company}"""
    }
}

SOLUTION_HINTS = {
    'slow response': 'respond to customers instantly, 24/7',
    'never called back': 'ensure every lead gets immediate follow-up',
    'scheduling': 'automate appointment booking without phone tag',
    'data entry': 'eliminate manual data entry entirely',
    'manual': 'automate repetitive tasks so your team focuses on high-value work',
    'customer service': 'handle common questions automatically while you focus on complex issues',
    'default': 'save 10+ hours per week on repetitive tasks'
}


class OutreachEngine:
    """Autonomous email outreach engine"""
    
    def __init__(self, db, config: Dict[str, Any]):
        self.db = db
        self.config = config
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.is_running = False
        self.daily_sent = 0
        self.last_reset = datetime.now(timezone.utc).date()
    
    async def start(self):
        """Start autonomous outreach loop"""
        self.is_running = True
        
        while self.is_running:
            try:
                # Reset daily counter if new day
                today = datetime.now(timezone.utc).date()
                if today != self.last_reset:
                    self.daily_sent = 0
                    self.last_reset = today
                
                # Check if we can send more
                daily_limit = self.config.get('daily_outreach_limit', 50)
                if self.daily_sent >= daily_limit:
                    logger.info(f"Daily limit reached ({daily_limit}). Waiting for tomorrow.")
                    await asyncio.sleep(3600)  # Check again in an hour
                    continue
                
                # Get leads ready for outreach
                await self._process_outreach_queue()
                
                # Wait between batches
                await asyncio.sleep(self.config.get('outreach_interval_seconds', 60))
                
            except Exception as e:
                logger.error(f"Outreach error: {e}")
                await asyncio.sleep(60)
    
    def stop(self):
        """Stop outreach loop"""
        self.is_running = False
    
    async def _process_outreach_queue(self):
        """Process leads ready for outreach"""
        
        min_score = self.config.get('outreach_score_threshold', 70)
        
        # Get uncontacted leads with good scores
        leads = await self.db.leads.find({
            'status': 'uncontacted',
            'lead_score': {'$gte': min_score},
            'email': {'$exists': True, '$ne': None}
        }).sort('lead_score', -1).limit(5).to_list(5)
        
        for lead in leads:
            if self.daily_sent >= self.config.get('daily_outreach_limit', 50):
                break
            
            success = await self._send_outreach(lead)
            
            if success:
                self.daily_sent += 1
                
                # Update lead status
                await self.db.leads.update_one(
                    {'id': lead['id']},
                    {'$set': {
                        'status': 'outreach_sent',
                        'last_contacted_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    },
                    '$inc': {'follow_up_count': 1}}
                )
            
            # Delay between emails
            await asyncio.sleep(30)
    
    async def _send_outreach(self, lead: Dict) -> bool:
        """Send personalized outreach email"""
        
        resend_key = self.config.get('resend_api_key')
        if not resend_key:
            logger.warning("No Resend API key configured")
            return False
        
        # Generate personalized email
        email_content = await self._generate_email(lead)
        
        if not email_content:
            return False
        
        try:
            response = await self.http_client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": self.config.get('from_email', 'outreach@yourdomain.com'),
                    "to": lead['email'],
                    "subject": email_content['subject'],
                    "text": email_content['body']
                }
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Email sent to {lead['email']}")
                
                # Store in conversation
                await self._create_conversation(lead, email_content)
                
                return True
            else:
                logger.error(f"Email failed: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Email send error: {e}")
            return False
    
    async def _generate_email(self, lead: Dict) -> Optional[Dict]:
        """Generate personalized email based on lead data"""
        
        # Determine email type based on source
        source = lead.get('source', 'unknown')
        pain_signal = lead.get('pain_signal', '')
        
        if source == 'reddit':
            template_key = 'intent_signal'
        elif source == 'job_posting':
            template_key = 'hiring_signal'
        elif any(p in pain_signal.lower() for p in ['slow', 'response', 'called']):
            template_key = 'review_pain'
        else:
            template_key = 'generic'
        
        template = EMAIL_TEMPLATES[template_key]
        
        # Find appropriate solution hint
        solution_hint = SOLUTION_HINTS['default']
        for key, hint in SOLUTION_HINTS.items():
            if key in pain_signal.lower():
                solution_hint = hint
                break
        
        # Personalize
        subject = template['subject'].format(
            business_name=lead.get('business_name', 'your business'),
            pain_signal=pain_signal[:50] if pain_signal else 'automation'
        )
        
        body = template['body'].format(
            business_name=lead.get('business_name', 'your business'),
            pain_signal=pain_signal or 'streamlining operations',
            solution_hint=solution_hint,
            similar_industry=lead.get('category', 'similar'),
            pain_area='response time',
            industry=lead.get('category', 'service'),
            sender_name=self.config.get('sender_name', 'Your Name'),
            sender_company=self.config.get('sender_company', '')
        )
        
        # If OpenAI available, enhance with AI
        openai_key = self.config.get('openai_api_key')
        if openai_key and lead.get('pain_detail'):
            enhanced = await self._ai_personalize(lead, subject, body, openai_key)
            if enhanced:
                return enhanced
        
        return {'subject': subject, 'body': body}
    
    async def _ai_personalize(self, lead: Dict, subject: str, body: str, openai_key: str) -> Optional[Dict]:
        """Use AI to create highly personalized outreach"""
        try:
            prompt = f"""You are writing a cold outreach email for an AI consulting company.

Lead info:
- Business: {lead.get('business_name')}
- Industry: {lead.get('category')}
- Pain signal: {lead.get('pain_signal')}
- Details: {lead.get('pain_detail', '')[:500]}

Rules:
1. Keep it SHORT (under 100 words)
2. Reference their specific pain point
3. No pushy sales language
4. End with a soft CTA (15-min call)
5. Be conversational, not corporate

Return JSON with 'subject' and 'body' keys."""

            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You write short, personalized cold emails. Return JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = json.loads(data['choices'][0]['message']['content'])
                return content
                
        except Exception as e:
            logger.error(f"AI personalization error: {e}")
        
        return None
    
    async def _create_conversation(self, lead: Dict, email_content: Dict):
        """Create conversation record for sent email"""
        import uuid
        
        conversation = {
            'id': str(uuid.uuid4()),
            'lead_id': lead['id'],
            'channel': 'email',
            'messages': [{
                'id': str(uuid.uuid4()),
                'content': f"Subject: {email_content['subject']}\n\n{email_content['body']}",
                'direction': 'outbound',
                'channel': 'email',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }],
            'sentiment_trajectory': [],
            'current_sentiment': 0.0,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.conversations.insert_one(conversation)


class FollowUpEngine:
    """Handles automated follow-ups"""
    
    def __init__(self, db, config: Dict[str, Any]):
        self.db = db
        self.config = config
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def process_follow_ups(self):
        """Check and send follow-ups for stalled leads"""
        
        max_follow_ups = self.config.get('max_follow_ups', 2)
        
        # Get leads that need follow-up
        # (outreach sent but no response, under follow-up limit)
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=3)
        
        leads = await self.db.leads.find({
            'status': 'outreach_sent',
            'follow_up_count': {'$lt': max_follow_ups},
            'last_contacted_at': {'$lt': cutoff.isoformat()}
        }).limit(10).to_list(10)
        
        for lead in leads:
            await self._send_follow_up(lead)
    
    async def _send_follow_up(self, lead: Dict):
        """Send follow-up email"""
        
        follow_up_templates = [
            {
                'subject': "Re: Quick question about {business_name}",
                'body': """Hi,

Just wanted to bump this up in case it got buried.

I help businesses like {business_name} automate repetitive work with AI - would love to show you what's possible.

Worth a 15-minute call?

{sender_name}"""
            },
            {
                'subject': "Last attempt - {business_name}",
                'body': """Hi,

I'll keep this short - I've reached out a couple times about AI automation for {business_name}.

If the timing isn't right, no worries at all. But if you're curious about what's possible, I'm happy to do a quick no-pressure call.

Either way, wishing you success!

{sender_name}"""
            }
        ]
        
        follow_up_num = lead.get('follow_up_count', 0)
        template = follow_up_templates[min(follow_up_num, len(follow_up_templates) - 1)]
        
        subject = template['subject'].format(business_name=lead.get('business_name', 'your business'))
        body = template['body'].format(
            business_name=lead.get('business_name', 'your business'),
            sender_name=self.config.get('sender_name', 'Your Name')
        )
        
        # Send via Resend
        resend_key = self.config.get('resend_api_key')
        if not resend_key or not lead.get('email'):
            return
        
        try:
            response = await self.http_client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": self.config.get('from_email', 'outreach@yourdomain.com'),
                    "to": lead['email'],
                    "subject": subject,
                    "text": body
                }
            )
            
            if response.status_code in [200, 201]:
                await self.db.leads.update_one(
                    {'id': lead['id']},
                    {'$set': {
                        'last_contacted_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    },
                    '$inc': {'follow_up_count': 1}}
                )
                logger.info(f"Follow-up {follow_up_num + 1} sent to {lead['email']}")
                
        except Exception as e:
            logger.error(f"Follow-up error: {e}")
