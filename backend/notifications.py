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


# P2P-specific notification helpers
async def notify_p2p_payment_marked(db, trade_id: str, buyer_id: str, seller_id: str, crypto_amount: float, crypto: str):
    """Notify seller that buyer marked payment as sent"""
    await create_notification(
        db=db,
        user_id=seller_id,
        notification_type='p2p_payment_marked',
        title='💳 Payment Marked as Sent',
        message=f'Buyer has marked payment as sent for {crypto_amount} {crypto}. Please verify and release.',
        link=f'/p2p/order/{trade_id}',
        metadata={'trade_id': trade_id, 'buyer_id': buyer_id}
    )


async def notify_p2p_crypto_released(db, trade_id: str, buyer_id: str, seller_id: str, crypto_amount: float, crypto: str):
    """Notify buyer that seller released crypto"""
    await create_notification(
        db=db,
        user_id=buyer_id,
        notification_type='p2p_crypto_released',
        title='✅ Crypto Released',
        message=f'Seller has released {crypto_amount} {crypto}. Trade completed!',
        link=f'/p2p/order/{trade_id}',
        metadata={'trade_id': trade_id, 'seller_id': seller_id}
    )


async def notify_p2p_trade_cancelled(db, trade_id: str, buyer_id: str, seller_id: str, crypto: str):
    """Notify both parties that trade was cancelled"""
    for user_id in [buyer_id, seller_id]:
        await create_notification(
            db=db,
            user_id=user_id,
            notification_type='p2p_trade_cancelled',
            title='❌ Trade Cancelled',
            message=f'P2P trade for {crypto} has been cancelled.',
            link=f'/p2p/order/{trade_id}',
            metadata={'trade_id': trade_id}
        )


async def notify_p2p_dispute_opened(db, trade_id: str, buyer_id: str, seller_id: str, reported_by: str):
    """Notify both parties and admin that dispute was opened"""
    counterparty_id = seller_id if reported_by == buyer_id else buyer_id
    
    # Notify counterparty
    await create_notification(
        db=db,
        user_id=counterparty_id,
        notification_type='p2p_dispute_opened',
        title='⚠️ Dispute Opened',
        message='A dispute has been opened for your P2P trade. Admin is reviewing.',
        link=f'/p2p/order/{trade_id}',
        metadata={'trade_id': trade_id, 'reported_by': reported_by}
    )
    
    # Notify admins
    admins = await db.users.find({'role': 'admin'}).to_list(length=100)
    for admin in admins:
        await create_notification(
            db=db,
            user_id=admin['user_id'],
            notification_type='p2p_dispute_opened',
            title='⚠️ New P2P Dispute',
            message=f'New dispute opened for trade {trade_id}. Please review.',
            link=f'/admin/disputes/{trade_id}',
            metadata={'trade_id': trade_id, 'reported_by': reported_by}
        )


async def notify_p2p_dispute_resolved(db, trade_id: str, buyer_id: str, seller_id: str, winner: str):
    """Notify both parties that dispute was resolved"""
    for user_id in [buyer_id, seller_id]:
        is_winner = user_id == winner
        result_msg = "your favor" if is_winner else "counterparty's favor"
        await create_notification(
            db=db,
            user_id=user_id,
            notification_type='p2p_dispute_resolved',
            title='✅ Dispute Resolved' if is_winner else '❌ Dispute Resolved',
            message=f"Dispute has been resolved in {result_msg}.",
            link=f'/p2p/order/{trade_id}',
            metadata={'trade_id': trade_id, 'winner': winner}
        )
