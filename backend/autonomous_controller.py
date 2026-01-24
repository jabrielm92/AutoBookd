"""
Autonomous System Controller
Manages the full autonomous loop:
Discovery -> Scoring -> Outreach -> Follow-up -> Learning
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from discovery_engine import DiscoveryEngine, DEFAULT_DISCOVERY_CONFIG
from outreach_engine import OutreachEngine, FollowUpEngine

logger = logging.getLogger(__name__)


class AutonomousController:
    """Main controller for the autonomous lead-to-calendar system"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.is_running = False
        self.discovery_engine = None
        self.outreach_engine = None
        self.follow_up_engine = None
        self._tasks = []
    
    async def start(self):
        """Start the autonomous system"""
        if self.is_running:
            return {"status": "already_running"}
        
        # Load config
        config = await self._get_config()
        
        self.is_running = True
        
        # Initialize engines
        discovery_config = await self._get_discovery_config()
        self.discovery_engine = DiscoveryEngine(self.db, config.get('openai_api_key'))
        self.outreach_engine = OutreachEngine(self.db, config)
        self.follow_up_engine = FollowUpEngine(self.db, config)
        
        # Start background tasks
        self._tasks = [
            asyncio.create_task(self._run_discovery_loop(discovery_config)),
            asyncio.create_task(self._run_outreach_loop()),
            asyncio.create_task(self._run_follow_up_loop()),
            asyncio.create_task(self._run_learning_loop())
        ]
        
        # Update status
        await self.db.system_config.update_one(
            {"id": "system_config"},
            {"$set": {"is_running": True, "started_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        logger.info("Autonomous system started")
        return {"status": "started", "engines": ["discovery", "outreach", "follow_up", "learning"]}
    
    async def stop(self):
        """Stop the autonomous system"""
        self.is_running = False
        
        # Cancel all tasks
        for task in self._tasks:
            task.cancel()
        
        # Update status
        await self.db.system_config.update_one(
            {"id": "system_config"},
            {"$set": {"is_running": False, "stopped_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info("Autonomous system stopped")
        return {"status": "stopped"}
    
    async def _get_config(self) -> Dict[str, Any]:
        """Get system configuration"""
        config = await self.db.system_config.find_one({"id": "system_config"}, {"_id": 0})
        return config or {}
    
    async def _get_discovery_config(self) -> Dict[str, Any]:
        """Get discovery configuration"""
        config = await self.db.discovery_config.find_one({"id": "discovery_config"}, {"_id": 0})
        if not config:
            config = DEFAULT_DISCOVERY_CONFIG.copy()
            config['id'] = 'discovery_config'
            await self.db.discovery_config.insert_one(config)
        return config
    
    async def _run_discovery_loop(self, config: Dict[str, Any]):
        """Run discovery engine in background"""
        logger.info("Discovery loop started")
        
        while self.is_running:
            try:
                # Refresh config each cycle
                discovery_config = await self._get_discovery_config()
                self.discovery_engine.config = discovery_config
                await self.discovery_engine._run_discovery_cycle()
                await asyncio.sleep(discovery_config.get('cycle_interval_seconds', 300))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Discovery loop error: {e}")
                await asyncio.sleep(60)
    
    async def _run_outreach_loop(self):
        """Run outreach engine in background"""
        logger.info("Outreach loop started")
        
        while self.is_running:
            try:
                config = await self._get_config()
                
                # Check if we have Resend key
                if not config.get('resend_api_key'):
                    logger.debug("No Resend API key - skipping outreach")
                    await asyncio.sleep(60)
                    continue
                
                self.outreach_engine.config = config
                await self.outreach_engine._process_outreach_queue()
                await asyncio.sleep(config.get('outreach_interval_seconds', 60))
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Outreach loop error: {e}")
                await asyncio.sleep(60)
    
    async def _run_follow_up_loop(self):
        """Run follow-up engine in background"""
        logger.info("Follow-up loop started")
        
        while self.is_running:
            try:
                config = await self._get_config()
                
                if not config.get('resend_api_key'):
                    await asyncio.sleep(300)
                    continue
                
                self.follow_up_engine.config = config
                await self.follow_up_engine.process_follow_ups()
                await asyncio.sleep(3600)  # Check hourly
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Follow-up loop error: {e}")
                await asyncio.sleep(300)
    
    async def _run_learning_loop(self):
        """Run learning/optimization loop"""
        logger.info("Learning loop started")
        
        while self.is_running:
            try:
                await self._update_metrics()
                await self._optimize_scoring()
                await asyncio.sleep(3600)  # Run hourly
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Learning loop error: {e}")
                await asyncio.sleep(300)
    
    async def _update_metrics(self):
        """Update performance metrics"""
        
        # Calculate reply rate
        total_contacted = await self.db.leads.count_documents({
            'status': {'$in': ['outreach_sent', 'engaged', 'discovery', 'qualified', 'calendar_offered', 'booked']}
        })
        
        total_engaged = await self.db.leads.count_documents({
            'status': {'$in': ['engaged', 'discovery', 'qualified', 'calendar_offered', 'booked']}
        })
        
        total_booked = await self.db.leads.count_documents({'status': 'booked'})
        
        reply_rate = (total_engaged / total_contacted * 100) if total_contacted > 0 else 0
        booking_rate = (total_booked / total_contacted * 100) if total_contacted > 0 else 0
        
        await self.db.system_metrics.update_one(
            {"id": "metrics"},
            {"$set": {
                "reply_rate": round(reply_rate, 2),
                "booking_rate": round(booking_rate, 2),
                "total_contacted": total_contacted,
                "total_engaged": total_engaged,
                "total_booked": total_booked,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    async def _optimize_scoring(self):
        """Adjust scoring based on what's converting"""
        
        # Find patterns in booked leads
        booked_leads = await self.db.leads.find({'status': 'booked'}).to_list(100)
        
        if len(booked_leads) < 5:
            return  # Not enough data
        
        # Analyze what sources are converting
        source_performance = {}
        for lead in booked_leads:
            source = lead.get('source', 'unknown')
            if source not in source_performance:
                source_performance[source] = 0
            source_performance[source] += 1
        
        # Store insights
        await self.db.learning_insights.update_one(
            {"id": "scoring_insights"},
            {"$set": {
                "source_performance": source_performance,
                "top_converting_source": max(source_performance, key=source_performance.get) if source_performance else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )


# Global controller instance
_controller: Optional[AutonomousController] = None


def get_controller(db: AsyncIOMotorDatabase) -> AutonomousController:
    """Get or create the autonomous controller"""
    global _controller
    if _controller is None:
        _controller = AutonomousController(db)
    return _controller
