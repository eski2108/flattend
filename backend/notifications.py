"""
Notification System for Coin Hub X
Handles in-app notifications for all user events
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
import logging

logger = logging.getLogger(__name__)

# Notification types
NOTIFICATION_TYPES = {
    'login_alert': 'Security',
    'p2p_trade_update': 'Trading',
    'p2p_payment_marked': 'Trading',
    'p2p_crypto_released': 'Trading',
    'p2p_trade_cancelled': 'Trading',
    'p2p_dispute_opened': 'Trading',
    'p2p_dispute_resolved': 'Trading',
    'deposit_confirmed': 'Trading',
    'withdrawal_completed': 'Trading',
    'withdrawal_requested': 'Trading',
    'swap_completed': 'Trading',
    'dispute_update': 'Trading',
    'admin_announcement': 'System',
    'staking_reward': 'Trading'
}


async def create_notification(
    db,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a new notification for a user
    
    Args:
        db: MongoDB database instance
        user_id: User ID to send notification to
        notification_type: Type of notification (e.g., 'login_alert', 'p2p_trade_update')
        title: Short notification title
        message: Longer description
        link: Optional URL/route to navigate to
        metadata: Optional JSON blob for extra data
    
    Returns:
        Created notification document
    """
    try:
        notification = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'type': notification_type,
            'title': title,
            'message': message,
            'link': link,
            'metadata': metadata or {},
            'is_read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.notifications.insert_one(notification)
        logger.info(f"Created notification for user {user_id}: {notification_type}")
        
        return notification
    except Exception as e:
        logger.error(f"Failed to create notification: {str(e)}")
        return None


async def get_user_notifications(
    db,
    user_id: str,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0
) -> list:
    """
    Get notifications for a user with pagination
    
    Args:
        db: MongoDB database instance
        user_id: User ID
        unread_only: If True, only return unread notifications
        limit: Maximum number of notifications to return
        offset: Number of notifications to skip
    
    Returns:
        List of notification documents
    """
    try:
        query = {'user_id': user_id}
        if unread_only:
            query['is_read'] = False
        
        notifications = await db.notifications.find(query, {'_id': 0}).sort('created_at', -1).skip(offset).limit(limit).to_list(length=limit)
        
        return notifications
    except Exception as e:
        logger.error(f"Failed to get notifications: {str(e)}")
        return []


async def get_unread_count(db, user_id: str) -> int:
    """
    Get count of unread notifications for a user
    
    Args:
        db: MongoDB database instance
        user_id: User ID
    
    Returns:
        Count of unread notifications
    """
    try:
        count = await db.notifications.count_documents({
            'user_id': user_id,
            'is_read': False
        })
        return count
    except Exception as e:
        logger.error(f"Failed to get unread count: {str(e)}")
        return 0


async def mark_notifications_as_read(db, notification_ids: list) -> int:
    """
    Mark multiple notifications as read
    
    Args:
        db: MongoDB database instance
        notification_ids: List of notification IDs to mark as read
    
    Returns:
        Number of notifications updated
    """
    try:
        result = await db.notifications.update_many(
            {'id': {'$in': notification_ids}},
            {'$set': {'is_read': True}}
        )
        return result.modified_count
    except Exception as e:
        logger.error(f"Failed to mark notifications as read: {str(e)}")
        return 0


async def mark_all_as_read(db, user_id: str) -> int:
    """
    Mark all notifications as read for a user
    
    Args:
        db: MongoDB database instance
        user_id: User ID
    
    Returns:
        Number of notifications updated
    """
    try:
        result = await db.notifications.update_many(
            {'user_id': user_id, 'is_read': False},
            {'$set': {'is_read': True}}
        )
        return result.modified_count
    except Exception as e:
        logger.error(f"Failed to mark all as read: {str(e)}")
        return 0


async def broadcast_notification(
    db,
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    user_filter: Optional[Dict[str, Any]] = None
) -> int:
    """
    Create a notification for all users (or filtered users)
    
    Args:
        db: MongoDB database instance
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        link: Optional link
        metadata: Optional metadata
        user_filter: Optional filter for which users to send to
    
    Returns:
        Number of notifications created
    """
    try:
        # Get all users matching filter
        query = user_filter or {}
        users = await db.users.find(query, {'user_id': 1}).to_list(length=None)
        
        # Create notification for each user
        notifications = []
        for user in users:
            notification = {
                'id': str(uuid.uuid4()),
                'user_id': user['user_id'],
                'type': notification_type,
                'title': title,
                'message': message,
                'link': link,
                'metadata': metadata or {},
                'is_read': False,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            notifications.append(notification)
        
        if notifications:
            await db.notifications.insert_many(notifications)
            logger.info(f"Broadcast {len(notifications)} notifications")
            
        return len(notifications)
    except Exception as e:
        logger.error(f"Failed to broadcast notification: {str(e)}")
        return 0
