"""
Security Logger Module
Tracks all login attempts, device fingerprints, and security events
"""

import os
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict
import httpx
from pymongo import MongoClient

logger = logging.getLogger(__name__)


class SecurityLogger:
    def __init__(self, db):
        self.db = db
        self.security_logs = db.security_logs
        
    async def log_login_attempt(
        self,
        user_id: Optional[str],
        email: str,
        success: bool,
        ip_address: str,
        user_agent: str,
        device_fingerprint: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> Dict:
        """
        Log a login attempt with full security details
        """
        try:
            # Get geolocation from IP
            location_data = await self._get_location_from_ip(ip_address)
            
            # Parse user agent for device/browser info
            device_info = self._parse_user_agent(user_agent)
            
            # Check if this is a new device
            is_new_device = False
            if user_id and device_fingerprint:
                is_new_device = await self._is_new_device(user_id, device_fingerprint)
            
            log_entry = {
                "user_id": user_id,
                "email": email,
                "success": success,
                "ip_address": ip_address,
                "country": location_data.get("country"),
                "region": location_data.get("region"),
                "city": location_data.get("city"),
                "device_type": device_info.get("device_type"),
                "browser": device_info.get("browser"),
                "os": device_info.get("os"),
                "device_fingerprint": device_fingerprint,
                "is_new_device": is_new_device,
                "failure_reason": failure_reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "login"
            }
            
            await self.security_logs.insert_one(log_entry)
            logger.info(f"Security log created for {email}: success={success}")
            
            return {
                "is_new_device": is_new_device,
                "location": f"{location_data.get('city', 'Unknown')}, {location_data.get('country', 'Unknown')}"
            }
            
        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")
            return {"is_new_device": False, "location": "Unknown"}
    
    async def log_signup_attempt(
        self,
        email: str,
        success: bool,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
        failure_reason: Optional[str] = None
    ):
        """
        Log a signup attempt
        """
        try:
            location_data = await self._get_location_from_ip(ip_address)
            device_info = self._parse_user_agent(user_agent)
            
            log_entry = {
                "user_id": user_id,
                "email": email,
                "success": success,
                "ip_address": ip_address,
                "country": location_data.get("country"),
                "region": location_data.get("region"),
                "city": location_data.get("city"),
                "device_type": device_info.get("device_type"),
                "browser": device_info.get("browser"),
                "os": device_info.get("os"),
                "failure_reason": failure_reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "signup"
            }
            
            await self.security_logs.insert_one(log_entry)
            logger.info(f"Signup log created for {email}: success={success}")
            
        except Exception as e:
            logger.error(f"Error logging signup event: {str(e)}")
    
    async def _is_new_device(self, user_id: str, device_fingerprint: str) -> bool:
        """
        Check if this device fingerprint has been seen before for this user
        """
        try:
            existing = await self.security_logs.find_one({
                "user_id": user_id,
                "device_fingerprint": device_fingerprint,
                "success": True
            })
            return existing is None
        except Exception as e:
            logger.error(f"Error checking device: {str(e)}")
            return False
    
    async def _get_location_from_ip(self, ip_address: str) -> Dict:
        """
        Get geolocation data from IP address
        """
        # Skip for localhost/private IPs
        if ip_address in ["127.0.0.1", "localhost"] or ip_address.startswith("192.168.") or ip_address.startswith("10."):
            return {"country": "Local", "region": "Local", "city": "Local"}
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"http://ip-api.com/json/{ip_address}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "success":
                        return {
                            "country": data.get("country"),
                            "region": data.get("regionName"),
                            "city": data.get("city")
                        }
        except Exception as e:
            logger.error(f"Error getting location for IP {ip_address}: {str(e)}")
        
        return {"country": "Unknown", "region": "Unknown", "city": "Unknown"}
    
    def _parse_user_agent(self, user_agent: str) -> Dict:
        """
        Parse user agent string to extract device and browser info
        """
        ua_lower = user_agent.lower()
        
        # Detect device type
        if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
            device_type = "Mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            device_type = "Tablet"
        else:
            device_type = "Desktop"
        
        # Detect browser
        if "edg" in ua_lower:
            browser = "Edge"
        elif "chrome" in ua_lower:
            browser = "Chrome"
        elif "firefox" in ua_lower:
            browser = "Firefox"
        elif "safari" in ua_lower:
            browser = "Safari"
        else:
            browser = "Other"
        
        # Detect OS
        if "windows" in ua_lower:
            os_name = "Windows"
        elif "mac" in ua_lower:
            os_name = "macOS"
        elif "linux" in ua_lower:
            os_name = "Linux"
        elif "android" in ua_lower:
            os_name = "Android"
        elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
            os_name = "iOS"
        else:
            os_name = "Other"
        
        return {
            "device_type": device_type,
            "browser": browser,
            "os": os_name
        }
    
    def generate_device_fingerprint(self, ip_address: str, user_agent: str) -> str:
        """
        Generate a device fingerprint from IP and user agent
        """
        fingerprint_string = f"{ip_address}:{user_agent}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    async def get_user_devices(self, user_id: str) -> list:
        """
        Get all unique devices for a user
        """
        try:
            devices = await self.security_logs.aggregate([
                {"$match": {"user_id": user_id, "success": True}},
                {"$group": {
                    "_id": "$device_fingerprint",
                    "last_seen": {"$max": "$timestamp"},
                    "device_type": {"$first": "$device_type"},
                    "browser": {"$first": "$browser"},
                    "os": {"$first": "$os"},
                    "location": {"$first": "$city"}
                }},
                {"$sort": {"last_seen": -1}}
            ]).to_list(50)
            
            return devices
        except Exception as e:
            logger.error(f"Error getting user devices: {str(e)}")
            return []
