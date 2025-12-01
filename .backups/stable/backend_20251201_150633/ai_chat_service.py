"""
CoinHub X AI Chat Assistant Service
Custom AI with platform-specific knowledge base
NO fees, percentages, admin systems, liquidity, or referral data
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

# CoinHub X Knowledge Base - STRICT PLATFORM FEATURES ONLY
COINHUB_KNOWLEDGE_BASE = """
You are the CoinHub X AI Assistant. You help users with general platform questions only.

ABOUT COINHUB X:
CoinHub X is a secure cryptocurrency P2P trading platform with multiple features:
- P2P Marketplace with escrow protection
- Express Buy system for fast purchases
- Spot Trading for direct market trades
- Swap system for instant coin conversions
- Deposits & Withdrawals
- Staking to lock coins for rewards
- Dispute resolution centre
- Admin-verified sellers
- Security tools: email alerts, login notifications, encryption

FEATURE EXPLANATIONS:

1. P2P MARKETPLACE:
- Users can buy or sell crypto peer-to-peer
- Escrow system protects both parties
- Buyer sends payment → marks as paid → seller releases crypto
- Payment methods: Bank Transfer, PayPal, Revolut, Wise, etc.
- Always check seller ratings and completion rates

2. EXPRESS BUY:
- Fast way to buy crypto instantly
- Platform provides verified liquidity
- No need to wait for seller
- Enter amount → get instant price → buy now
- Crypto credited to your wallet immediately

3. SPOT TRADING:
- Direct market trading with order book
- Buy or sell at market prices
- Real-time price charts available
- Multiple trading pairs supported

4. SWAP SYSTEM:
- Convert between supported cryptocurrencies instantly
- Example: BTC → ETH, USDT → BTC, etc.
- Preview exchange rate before confirming
- Instant conversion in your wallet

5. DEPOSITS:
- Go to Wallet → Deposit
- Select cryptocurrency
- Copy your deposit address
- Send crypto from external wallet
- Funds arrive after blockchain confirmations

6. WITHDRAWALS:
- Go to Wallet → Withdraw
- Enter destination wallet address
- Enter amount to withdraw
- Confirm transaction
- Crypto sent to your external wallet

7. STAKING:
- Lock your coins to earn rewards
- View available staking options
- Choose duration and amount
- Earn passive income on holdings

8. SECURITY:
- Email verification required
- Login email alerts sent automatically
- Enable 2FA for extra protection
- Never share your password
- Check email notifications for any suspicious activity

9. DISPUTE PROCESS:
- If P2P trade has issues, open a dispute
- Provide evidence (payment proof, screenshots)
- Admin team reviews both sides
- Fair resolution based on evidence
- Usually resolved within 24-48 hours

STRICT RULES YOU MUST FOLLOW:
❌ NEVER mention fees, percentages, rates, commissions, or any numbers
❌ NEVER discuss admin systems, liquidity, internal wallets, platform earnings
❌ NEVER talk about referral payouts, bonuses, or rewards structure
❌ NEVER give financial advice or price predictions

✅ Only answer general "how-to" questions about platform features
✅ For account-specific questions (transaction stuck, missing funds, balance issues), say:
   "I can't check account details. Let me connect you to a live agent who can help."

✅ For questions about fees/percentages, say:
   "For fee information, please speak to a live agent or check the Help Center."

RESPONSE STYLE:
- Be friendly and helpful
- Keep answers short (2-3 sentences max)
- Use simple language
- Provide step-by-step instructions when needed
- Always offer to connect to live agent if unsure
"""


def get_ai_system_prompt() -> str:
    """
    Get the AI system prompt with CoinHub X knowledge base
    """
    return COINHUB_KNOWLEDGE_BASE


async def generate_ai_response(
    user_message: str,
    chat_history: List[Dict[str, str]] = None,
    ai_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate AI response using OpenAI via Emergent LLM integration
    
    Args:
        user_message: User's message
        chat_history: Previous messages in conversation
        ai_api_key: Optional custom AI API key (uses Emergent key if not provided)
    
    Returns:
        Dict with response text and escalation flag
    """
    try:
        # Check if user is asking account-specific questions
        account_keywords = [
            "my transaction", "my balance", "my account", "my funds",
            "missing", "stuck", "not received", "where is my",
            "can't withdraw", "can't deposit", "locked account"
        ]
        
        user_message_lower = user_message.lower()
        if any(keyword in user_message_lower for keyword in account_keywords):
            return {
                "response": "I can't check account details. Let me connect you to a live agent who can help with your specific issue.",
                "should_escalate": True
            }
        
        # Check for fee-related questions
        fee_keywords = ["fee", "fees", "cost", "charge", "percentage", "commission", "rate"]
        if any(keyword in user_message_lower for keyword in fee_keywords):
            return {
                "response": "For fee information, please speak to a live agent or check our Help Center.",
                "should_escalate": False
            }
        
        # Use Emergent LLM integration
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            # Get Emergent LLM key
            emergent_key = os.getenv("EMERGENT_LLM_KEY")
            if not emergent_key and not ai_api_key:
                logger.error("No AI API key available")
                return {
                    "response": "AI assistant is temporarily unavailable. Please speak to a live agent.",
                    "should_escalate": True
                }
            
            # Build conversation context with history
            system_prompt = get_ai_system_prompt()
            
            if chat_history:
                # Add last few messages as context
                for msg in chat_history[-4:]:
                    system_prompt += f"\n\nPrevious {msg.get('role', 'user')}: {msg.get('content', '')}"
            
            # Initialize LLM chat
            chat = LlmChat(
                api_key=ai_api_key or emergent_key,
                session_id=f"chat_{user_message[:20]}",
                system_message=system_prompt
            ).with_model("openai", "gpt-5")
            
            # Create user message
            message = UserMessage(text=user_message)
            
            # Generate response
            ai_response = await chat.send_message(message)
            
            return {
                "response": ai_response,
                "should_escalate": False
            }
            
        except Exception as e:
            logger.error(f"AI generation error: {str(e)}")
            return {
                "response": "I'm having trouble right now. Let me connect you to a live agent.",
                "should_escalate": True
            }
    
    except Exception as e:
        logger.error(f"AI chat service error: {str(e)}")
        return {
            "response": "Something went wrong. Please speak to a live agent for assistance.",
            "should_escalate": True
        }


async def save_chat_message(
    db,
    chat_session_id: str,
    message: str,
    sender: str,  # "user", "ai", "agent"
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Save chat message to database
    """
    message_doc = {
        "message_id": str(uuid.uuid4()),
        "chat_session_id": chat_session_id,
        "message": message,
        "sender": sender,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    await db.chat_messages.insert_one(message_doc)
    
    # Update chat session last activity
    await db.chat_sessions.update_one(
        {"session_id": chat_session_id},
        {
            "$set": {
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "last_message": message[:100]
            }
        }
    )
    
    return message_doc


async def create_chat_session(
    db,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None
) -> str:
    """
    Create new chat session
    """
    session_id = str(uuid.uuid4())
    
    session_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "user_email": user_email,
        "status": "ai",  # "ai" or "live_agent"
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "escalated": False,
        "escalated_at": None,
        "resolved": False
    }
    
    await db.chat_sessions.insert_one(session_doc)
    
    return session_id


async def escalate_to_live_agent(
    db,
    chat_session_id: str
) -> bool:
    """
    Escalate chat session to live agent
    """
    try:
        result = await db.chat_sessions.update_one(
            {"session_id": chat_session_id},
            {
                "$set": {
                    "status": "live_agent",
                    "escalated": True,
                    "escalated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Chat {chat_session_id} escalated to live agent")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Failed to escalate chat: {str(e)}")
        return False


async def get_chat_history(
    db,
    chat_session_id: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Get chat history for a session
    """
    messages = await db.chat_messages.find({
        "chat_session_id": chat_session_id
    }).sort("timestamp", 1).limit(limit).to_list(limit)
    
    return messages


async def get_open_chat_sessions(
    db,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all open chat sessions for admin
    """
    query = {"resolved": False}
    
    if status:
        query["status"] = status
    
    sessions = await db.chat_sessions.find(query).sort(
        "last_message_at", -1
    ).limit(100).to_list(100)
    
    return sessions
