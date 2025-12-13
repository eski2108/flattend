"""
AI Price Movement Alerts System
Notifies users when selected coins move +5%, -5%, etc.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

# Price change thresholds
ALERT_THRESHOLDS = [5, 10, 15, 20, 25]  # Percentage changes


async def create_price_alert(
    db,
    user_id: str,
    coin: str,
    threshold: float,
    direction: str  # "up" or "down"
) -> Dict[str, Any]:
    """
    Create a price alert for a user
    """
    alert_id = str(uuid.uuid4())
    
    alert = {
        "alert_id": alert_id,
        "user_id": user_id,
        "coin": coin.upper(),
        "threshold": float(threshold),
        "direction": direction,
        "enabled": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "triggered_count": 0,
        "last_triggered_at": None
    }
    
    try:
        # Make a copy before inserting to avoid MongoDB _id mutation
        alert_copy = alert.copy()
        await db.price_alerts.insert_one(alert_copy)
        logger.info(f"✅ Price alert created: {coin} {direction} {threshold}% for user {user_id}")
        
        # Return original alert without MongoDB _id
        return {
            "success": True,
            "alert_id": alert_id,
            "alert": alert
        }
    except Exception as e:
        logger.error(f"Failed to insert price alert: {str(e)}")
        return {
            "success": False,
            "error": f"Database error: {str(e)}"
        }


async def delete_price_alert(
    db,
    user_id: str,
    alert_id: str
) -> Dict[str, Any]:
    """
    Delete a price alert
    """
    result = await db.price_alerts.delete_one({
        "alert_id": alert_id,
        "user_id": user_id
    })
    
    if result.deleted_count > 0:
        return {"success": True, "message": "Alert deleted"}
    
    return {"success": False, "error": "Alert not found"}


async def toggle_price_alert(
    db,
    user_id: str,
    alert_id: str,
    enabled: bool
) -> Dict[str, Any]:
    """
    Enable or disable a price alert
    """
    result = await db.price_alerts.update_one(
        {"alert_id": alert_id, "user_id": user_id},
        {"$set": {"enabled": enabled}}
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": f"Alert {'enabled' if enabled else 'disabled'}"}
    
    return {"success": False, "error": "Alert not found"}


async def get_user_price_alerts(
    db,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Get all price alerts for a user
    """
    alerts = await db.price_alerts.find({
        "user_id": user_id
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return alerts


async def check_price_alerts(
    db,
    current_prices: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Check all active alerts against current prices
    Returns list of triggered alerts
    """
    triggered_alerts = []
    
    # Get all enabled alerts
    all_alerts = await db.price_alerts.find({"enabled": True}, {"_id": 0}).to_list(1000)
    
    for alert in all_alerts:
        coin = alert["coin"]
        
        if coin not in current_prices:
            continue
        
        # Get last known price for this alert
        last_price_doc = await db.price_alert_history.find_one({
            "alert_id": alert["alert_id"]
        }, {"_id": 0})
        
        if not last_price_doc:
            # First time checking - save current price as baseline
            await db.price_alert_history.insert_one({
                "alert_id": alert["alert_id"],
                "coin": coin,
                "baseline_price": current_prices[coin],
                "last_checked": datetime.now(timezone.utc).isoformat()
            })
            continue
        
        baseline_price = last_price_doc["baseline_price"]
        current_price = current_prices[coin]
        
        # Calculate percentage change
        price_change = ((current_price - baseline_price) / baseline_price) * 100
        
        # Check if alert should trigger
        threshold = alert["threshold"]
        direction = alert["direction"]
        
        triggered = False
        
        if direction == "up" and price_change >= threshold:
            triggered = True
        elif direction == "down" and price_change <= -threshold:
            triggered = True
        
        if triggered:
            # Update trigger count and timestamp
            await db.price_alerts.update_one(
                {"alert_id": alert["alert_id"]},
                {
                    "$inc": {"triggered_count": 1},
                    "$set": {"last_triggered_at": datetime.now(timezone.utc).isoformat()}
                }
            )
            
            # Reset baseline price
            await db.price_alert_history.update_one(
                {"alert_id": alert["alert_id"]},
                {
                    "$set": {
                        "baseline_price": current_price,
                        "last_checked": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            triggered_alerts.append({
                "alert": alert,
                "price_change": price_change,
                "baseline_price": baseline_price,
                "current_price": current_price
            })
            
            logger.info(f"🔔 Price alert triggered: {coin} {direction} {threshold}% (actual: {price_change:.2f}%)")
    
    return triggered_alerts


async def send_price_alert_notification(
    db,
    user_id: str,
    coin: str,
    direction: str,
    threshold: float,
    price_change: float,
    current_price: float
):
    """
    Send notification to user about triggered price alert
    """
    from notifications import create_notification
    from email_service import send_email
    
    # Create in-app notification
    message = f"{coin} has moved {direction} by {abs(price_change):.2f}%! Current price: £{current_price:,.2f}"
    
    await create_notification(
        db=db,
        user_id=user_id,
        notification_type="price_alert",
        title=f"🔔 {coin} Price Alert",
        message=message,
        link=f"/dashboard"
    )
    
    # Send email notification
    try:
        user = await db.users.find_one({"user_id": user_id})
        
        if user and user.get("email_alerts_enabled", True):
            await send_email(
                to_email=user["email"],
                subject=f"🔔 {coin} Price Alert - {direction.upper()} {abs(price_change):.2f}%",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #00F0FF;">🔔 Price Alert Triggered</h2>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px;">{coin}</h3>
                        <p style="font-size: 24px; font-weight: bold; color: {'#22C55E' if direction == 'up' else '#EF4444'}; margin: 0;">
                            {'+' if direction == 'up' else ''}{price_change:.2f}%
                        </p>
                        <p style="margin: 10px 0 0; color: #666;">Current Price: £{current_price:,.2f}</p>
                    </div>
                    <p>Your price alert for <strong>{coin}</strong> moving {direction} by {threshold}% has been triggered!</p>
                    <p style="margin-top: 20px;">
                        <a href="https://coinhubx.com/dashboard" style="background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            View Dashboard
                        </a>
                    </p>
                </div>
                """
            )
    except Exception as e:
        logger.error(f"Failed to send price alert email: {str(e)}")
