"""
Production Email Sending Engine
- Resend integration
- Sequence management
- Reply detection
- Deliverability tracking
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import httpx
import uuid

logger = logging.getLogger(__name__)


class EmailSender:
    """Send emails via Resend with open/click tracking"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('RESEND_API_KEY')
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://api.resend.com"
        self.test_mode = False
        self.tracking_base_url = os.environ.get('TRACKING_BASE_URL', '')
    
    def _inject_tracking(self, body: str, tracking_id: str, is_html: bool = False) -> tuple:
        """
        Inject tracking pixel and wrap links for click tracking
        Returns (text_body, html_body)
        """
        import base64
        import re
        
        if not self.tracking_base_url:
            return body, None
        
        # Create tracking pixel HTML
        pixel_url = f"{self.tracking_base_url}/api/track/open/{tracking_id}"
        tracking_pixel = f'<img src="{pixel_url}" width="1" height="1" style="display:none" alt="" />'
        
        # Wrap links for click tracking
        def wrap_link(match):
            original_url = match.group(1)
            encoded_url = base64.urlsafe_b64encode(original_url.encode()).decode()
            tracked_url = f"{self.tracking_base_url}/api/track/click/{tracking_id}?url={encoded_url}"
            return f'href="{tracked_url}"'
        
        # Convert plain text to basic HTML
        html_body = body.replace('\n', '<br>\n')
        
        # Wrap any links in the body
        html_body = re.sub(r'href="([^"]+)"', wrap_link, html_body)
        
        # Also handle plain text URLs (convert to clickable links)
        url_pattern = r'(https?://[^\s<>"]+)'
        def make_tracked_link(match):
            original_url = match.group(1)
            encoded_url = base64.urlsafe_b64encode(original_url.encode()).decode()
            tracked_url = f"{self.tracking_base_url}/api/track/click/{tracking_id}?url={encoded_url}"
            return f'<a href="{tracked_url}">{original_url}</a>'
        
        html_body = re.sub(url_pattern, make_tracked_link, html_body)
        
        # Add tracking pixel at the end
        html_body = f"<html><body>{html_body}{tracking_pixel}</body></html>"
        
        return body, html_body
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: str,
        from_name: str = None,
        reply_to: str = None,
        tags: List[str] = None,
        tracking_id: str = None
    ) -> Dict[str, Any]:
        """
        Send an email via Resend
        
        Returns:
            {
                "success": bool,
                "message_id": str | None,
                "error": str | None,
                "test_mode": bool
            }
        """
        # Test mode - simulate sending without actually sending
        if self.test_mode:
            test_id = f"test_{uuid.uuid4().hex[:12]}"
            logger.info(f"[TEST MODE] Would send email to {to_email}: {subject}")
            return {
                "success": True,
                "message_id": test_id,
                "tracking_id": tracking_id,
                "error": None,
                "test_mode": True
            }
        
        if not self.api_key:
            logger.error("Resend API key not configured")
            return {"success": False, "error": "no_api_key", "test_mode": False}
        
        try:
            # Format from address
            from_address = f"{from_name} <{from_email}>" if from_name else from_email
            
            # Inject tracking if tracking_id provided
            text_body = body
            html_body = None
            if tracking_id and self.tracking_base_url:
                text_body, html_body = self._inject_tracking(body, tracking_id)
            
            payload = {
                "from": from_address,
                "to": [to_email],
                "subject": subject,
                "text": text_body
            }
            
            # Add HTML version with tracking if available
            if html_body:
                payload["html"] = html_body
            
            if reply_to:
                payload["reply_to"] = reply_to
            
            if tags:
                payload["tags"] = [{"name": tag} for tag in tags[:5]]  # Resend limits to 5 tags
            
            response = await self.http_client.post(
                f"{self.base_url}/emails",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                logger.info(f"Email sent to {to_email}: {data.get('id')}")
                return {
                    "success": True,
                    "message_id": data.get("id"),
                    "error": None,
                    "test_mode": False
                }
            else:
                error_msg = response.text
                logger.error(f"Resend error: {response.status_code} - {error_msg}")
                return {
                    "success": False,
                    "message_id": None,
                    "error": error_msg,
                    "test_mode": False
                }
                
        except Exception as e:
            logger.error(f"Email send error: {e}")
            return {
                "success": False,
                "message_id": None,
                "error": str(e),
                "test_mode": False
            }
    
    async def close(self):
        await self.http_client.aclose()


class SequenceManager:
    """Manage email sequences for leads"""
    
    def __init__(self, db, email_sender: EmailSender):
        self.db = db
        self.email_sender = email_sender
    
    async def create_sequence(
        self,
        lead_id: str,
        emails: List[Dict[str, Any]],
        from_email: str,
        from_name: str
    ) -> str:
        """
        Create an email sequence for a lead
        
        Returns sequence_id
        """
        sequence_id = str(uuid.uuid4())
        
        sequence = {
            "id": sequence_id,
            "lead_id": lead_id,
            "status": "active",
            "current_step": 0,
            "emails": emails,
            "from_email": from_email,
            "from_name": from_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "sent_emails": [],
            "next_send_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.sequences.insert_one(sequence)
        logger.info(f"Created sequence {sequence_id} for lead {lead_id}")
        
        return sequence_id
    
    async def process_due_sequences(self, test_mode: bool = False) -> Dict[str, int]:
        """
        Process all sequences that have emails due
        
        Returns:
            {"processed": count, "sent": count, "errors": count}
        """
        now = datetime.now(timezone.utc)
        
        # Find sequences with emails due
        due_sequences = await self.db.sequences.find({
            "status": "active",
            "next_send_at": {"$lte": now.isoformat()}
        }).to_list(50)
        
        stats = {"processed": 0, "sent": 0, "errors": 0, "test_mode": test_mode}
        
        # Set test mode on email sender
        self.email_sender.test_mode = test_mode
        
        for sequence in due_sequences:
            stats["processed"] += 1
            
            try:
                result = await self._send_next_email(sequence)
                if result["success"]:
                    stats["sent"] += 1
                else:
                    stats["errors"] += 1
            except Exception as e:
                logger.error(f"Sequence processing error: {e}")
                stats["errors"] += 1
        
        return stats
    
    async def _send_next_email(self, sequence: Dict) -> Dict[str, Any]:
        """Send the next email in a sequence"""
        
        current_step = sequence.get("current_step", 0)
        emails = sequence.get("emails", [])
        
        if current_step >= len(emails):
            # Sequence complete
            await self.db.sequences.update_one(
                {"id": sequence["id"]},
                {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "status": "completed"}
        
        # Get lead info
        lead = await self.db.leads.find_one({"id": sequence["lead_id"]}, {"_id": 0})
        if not lead or not lead.get("email"):
            await self.db.sequences.update_one(
                {"id": sequence["id"]},
                {"$set": {"status": "error", "error": "no_email"}}
            )
            return {"success": False, "error": "no_email"}
        
        # Check if lead replied or unsubscribed
        if lead.get("status") in ["engaged", "qualified", "booked", "disqualified"]:
            await self.db.sequences.update_one(
                {"id": sequence["id"]},
                {"$set": {"status": "stopped", "reason": f"lead_status_{lead['status']}"}}
            )
            return {"success": True, "status": "stopped"}
        
        # Get current email
        email_template = emails[current_step]
        
        # Personalize subject (replace {business_name})
        subject = email_template["subject"].replace(
            "{business_name}",
            lead.get("business_name", "your business")
        )
        
        # Send email
        result = await self.email_sender.send_email(
            to_email=lead["email"],
            subject=subject,
            body=email_template["body"],
            from_email=sequence["from_email"],
            from_name=sequence["from_name"],
            tags=[f"sequence_{sequence['id']}", f"step_{current_step + 1}"]
        )
        
        if result["success"]:
            # Calculate next send time
            next_step = current_step + 1
            next_send_at = None
            
            if next_step < len(emails):
                next_email = emails[next_step]
                delay_days = next_email.get("delay_days", 3)
                next_send_at = (datetime.now(timezone.utc) + timedelta(days=delay_days)).isoformat()
            
            # Update sequence
            update_data = {
                "current_step": next_step,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "$push": {
                    "sent_emails": {
                        "step": current_step,
                        "message_id": result["message_id"],
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
            
            if next_send_at:
                update_data["next_send_at"] = next_send_at
            else:
                update_data["status"] = "completed"
            
            await self.db.sequences.update_one(
                {"id": sequence["id"]},
                {"$set": {k: v for k, v in update_data.items() if k != "$push"}}
            )
            
            if "$push" in update_data:
                await self.db.sequences.update_one(
                    {"id": sequence["id"]},
                    {"$push": update_data["$push"]}
                )
            
            # Update lead
            if current_step == 0:
                await self.db.leads.update_one(
                    {"id": lead["id"]},
                    {"$set": {
                        "status": "outreach_sent",
                        "last_contacted_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                await self.db.leads.update_one(
                    {"id": lead["id"]},
                    {"$set": {
                        "last_contacted_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {"follow_up_count": 1}}
                )
            
            # Create conversation record
            await self._record_sent_email(lead, email_template, subject, result["message_id"])
            
            logger.info(f"Sent email {current_step + 1}/{len(emails)} to {lead['email']}")
        
        return result
    
    async def _record_sent_email(
        self,
        lead: Dict,
        email_template: Dict,
        subject: str,
        message_id: str
    ):
        """Record sent email in conversation history"""
        
        # Check if conversation exists
        conversation = await self.db.conversations.find_one({"lead_id": lead["id"]}, {"_id": 0})
        
        message = {
            "id": str(uuid.uuid4()),
            "message_id": message_id,
            "content": f"Subject: {subject}\n\n{email_template['body']}",
            "direction": "outbound",
            "channel": "email",
            "email_type": email_template.get("type", "unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if conversation:
            await self.db.conversations.update_one(
                {"lead_id": lead["id"]},
                {
                    "$push": {"messages": message},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
        else:
            conversation = {
                "id": str(uuid.uuid4()),
                "lead_id": lead["id"],
                "channel": "email",
                "messages": [message],
                "sentiment_trajectory": [],
                "current_sentiment": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.conversations.insert_one(conversation)
    
    async def pause_sequence(self, sequence_id: str, reason: str = "manual"):
        """Pause a sequence"""
        await self.db.sequences.update_one(
            {"id": sequence_id},
            {"$set": {"status": "paused", "pause_reason": reason, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    async def resume_sequence(self, sequence_id: str):
        """Resume a paused sequence"""
        await self.db.sequences.update_one(
            {"id": sequence_id},
            {"$set": {"status": "active", "next_send_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    async def stop_sequence_for_lead(self, lead_id: str, reason: str):
        """Stop all sequences for a lead"""
        await self.db.sequences.update_many(
            {"lead_id": lead_id, "status": "active"},
            {"$set": {"status": "stopped", "stop_reason": reason, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )


class DeliverabilityTracker:
    """Track email deliverability metrics"""
    
    def __init__(self, db):
        self.db = db
    
    async def record_event(self, event_type: str, message_id: str, data: Dict = None):
        """
        Record an email event (sent, delivered, opened, clicked, bounced, complained)
        """
        event = {
            "id": str(uuid.uuid4()),
            "type": event_type,
            "message_id": message_id,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.email_events.insert_one(event)
        
        # Update daily stats
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        await self.db.daily_email_stats.update_one(
            {"date": today},
            {
                "$inc": {f"{event_type}_count": 1},
                "$setOnInsert": {"date": today}
            },
            upsert=True
        )
    
    async def get_deliverability_stats(self, days: int = 7) -> Dict[str, Any]:
        """Get deliverability stats for the last N days"""
        
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        
        stats = await self.db.daily_email_stats.find(
            {"date": {"$gte": cutoff}}
        ).to_list(days)
        
        totals = {
            "sent": 0,
            "delivered": 0,
            "opened": 0,
            "clicked": 0,
            "bounced": 0,
            "complained": 0
        }
        
        for day_stats in stats:
            for key in totals:
                totals[key] += day_stats.get(f"{key}_count", 0)
        
        # Calculate rates
        if totals["sent"] > 0:
            totals["delivery_rate"] = round(totals["delivered"] / totals["sent"] * 100, 2)
            totals["open_rate"] = round(totals["opened"] / totals["sent"] * 100, 2)
            totals["click_rate"] = round(totals["clicked"] / totals["sent"] * 100, 2)
            totals["bounce_rate"] = round(totals["bounced"] / totals["sent"] * 100, 2)
        else:
            totals["delivery_rate"] = 0
            totals["open_rate"] = 0
            totals["click_rate"] = 0
            totals["bounce_rate"] = 0
        
        return totals
