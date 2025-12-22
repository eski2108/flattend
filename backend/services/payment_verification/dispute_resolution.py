""" 
Dynamic Dispute Resolution System
CRITICAL: Replaces flat £5 fee with percentage-based penalties
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import re

logger = logging.getLogger(__name__)


class DisputePenaltyCalculator:
    """
    Calculate dynamic penalties based on:
    - Trade amount
    - Fault percentage  
    - User reputation
    - Dispute history
    """
    
    # Base penalties
    BASE_PENALTY_GBP = 25.0  # Minimum penalty
    MAX_PENALTY_PERCENT = 25.0  # Maximum 25% of trade value
    
    # Reputation multipliers
    REPUTATION_MULTIPLIERS = {
        "excellent": 0.5,   # 50% reduction for good users
        "good": 0.75,
        "neutral": 1.0,
        "poor": 1.5,
        "bad": 2.0,         # 2x penalty for bad actors
        "scammer": 3.0      # 3x for known scammers
    }
    
    # Fault percentages by dispute reason
    FAULT_PERCENTAGES = {
        "payment_not_received": {"buyer": 100, "seller": 0},
        "payment_not_sent": {"buyer": 100, "seller": 0},
        "wrong_amount_sent": {"buyer": 80, "seller": 20},
        "payment_reversed": {"buyer": 100, "seller": 0},
        "crypto_not_released": {"buyer": 0, "seller": 100},
        "timeout_expired": {"buyer": 70, "seller": 30},
        "communication_issues": {"buyer": 50, "seller": 50},
        "fraud_suspected": {"loser": 100},
        "other": {"buyer": 50, "seller": 50}
    }
    
    def __init__(self, db):
        self.db = db
    
    async def calculate_penalty(
        self,
        trade_id: str,
        loser_id: str,
        winner_id: str,
        reason: str,
        admin_fault_override: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate dynamic penalty for dispute loser
        
        Formula:
        Penalty = max(BASE, trade_amount * fault% * reputation_multiplier)
        Capped at MAX_PENALTY_PERCENT of trade value
        """
        # Get trade details
        trade = await self.db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
        if not trade:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id}, {"_id": 0})
        
        if not trade:
            return {
                "penalty": self.BASE_PENALTY_GBP,
                "currency": "GBP",
                "calculation": "fallback_base"
            }
        
        trade_amount = float(trade.get("fiat_amount", 0))
        trade_currency = trade.get("fiat_currency", "GBP")
        
        # Determine fault percentage
        if admin_fault_override is not None:
            fault_percent = admin_fault_override
        else:
            fault_config = self.FAULT_PERCENTAGES.get(reason, {"buyer": 50, "seller": 50})
            if loser_id == trade.get("buyer_id"):
                fault_percent = fault_config.get("buyer", fault_config.get("loser", 50))
            else:
                fault_percent = fault_config.get("seller", fault_config.get("loser", 50))
        
        # Get user reputation
        reputation = await self._get_user_reputation(loser_id)
        reputation_multiplier = self.REPUTATION_MULTIPLIERS.get(reputation, 1.0)
        
        # Get dispute history
        dispute_count = await self._get_dispute_history(loser_id)
        history_multiplier = 1.0 + (dispute_count * 0.1)  # +10% per previous dispute
        
        # Calculate penalty
        percentage_penalty = trade_amount * (fault_percent / 100.0) * 0.1  # 10% of fault amount
        
        raw_penalty = percentage_penalty * reputation_multiplier * history_multiplier
        
        # Apply bounds
        min_penalty = self.BASE_PENALTY_GBP
        max_penalty = trade_amount * (self.MAX_PENALTY_PERCENT / 100.0)
        
        final_penalty = max(min_penalty, min(raw_penalty, max_penalty))
        
        calculation = {
            "trade_amount": trade_amount,
            "trade_currency": trade_currency,
            "fault_percent": fault_percent,
            "reputation": reputation,
            "reputation_multiplier": reputation_multiplier,
            "dispute_history_count": dispute_count,
            "history_multiplier": history_multiplier,
            "raw_penalty": raw_penalty,
            "min_penalty": min_penalty,
            "max_penalty": max_penalty,
            "final_penalty": round(final_penalty, 2)
        }
        
        logger.info(f"Calculated dispute penalty for {loser_id}: £{final_penalty:.2f}")
        
        return {
            "penalty": round(final_penalty, 2),
            "currency": trade_currency,
            "calculation": calculation
        }
    
    async def _get_user_reputation(self, user_id: str) -> str:
        """Get user's reputation tier"""
        user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            return "neutral"
        
        # Check for scammer flag
        if user.get("is_scammer") or user.get("flagged_fraud"):
            return "scammer"
        
        # Calculate based on trade history
        total_trades = user.get("total_trades", 0)
        successful_trades = user.get("successful_trades", 0)
        disputes_lost = user.get("disputes_lost", 0)
        
        if total_trades < 5:
            return "neutral"
        
        success_rate = (successful_trades / total_trades) * 100 if total_trades > 0 else 0
        dispute_rate = (disputes_lost / total_trades) * 100 if total_trades > 0 else 0
        
        if dispute_rate > 20:
            return "bad"
        elif dispute_rate > 10:
            return "poor"
        elif success_rate >= 98 and total_trades >= 50:
            return "excellent"
        elif success_rate >= 95:
            return "good"
        else:
            return "neutral"
    
    async def _get_dispute_history(self, user_id: str) -> int:
        """Get count of disputes user has lost"""
        count = await self.db.p2p_disputes.count_documents({
            "$or": [
                {"buyer_id": user_id, "winner": "seller"},
                {"seller_id": user_id, "winner": "buyer"}
            ],
            "status": "resolved"
        })
        return count


class DisputeRulesEngine:
    """
    Automated dispute resolution rules
    """
    
    RULES = [
        {
            "rule_id": "RULE_001",
            "name": "Payment verification timeout",
            "condition": "payment_not_verified AND timer_expired",
            "action": "auto_refund_seller",
            "confidence": 0.9,
            "auto_execute": True
        },
        {
            "rule_id": "RULE_002",
            "name": "Early release without verification",
            "condition": "crypto_released AND payment_not_verified",
            "action": "flag_for_review",
            "confidence": 0.8,
            "auto_execute": False
        },
        {
            "rule_id": "RULE_003",
            "name": "Buyer marked paid but no proof",
            "condition": "buyer_marked_paid AND no_proof_uploaded AND 24h_elapsed",
            "action": "auto_refund_seller",
            "confidence": 0.85,
            "auto_execute": True
        },
        {
            "rule_id": "RULE_004",
            "name": "Seller not responding",
            "condition": "payment_verified AND seller_no_response AND 4h_elapsed",
            "action": "auto_release_to_buyer",
            "confidence": 0.9,
            "auto_execute": True
        },
        {
            "rule_id": "RULE_005",
            "name": "Chat evidence of agreement",
            "condition": "chat_contains_agreement_keywords",
            "action": "influence_toward_agreement",
            "confidence": 0.7,
            "auto_execute": False,
            "keywords": ["agreed", "ok", "confirmed", "sent", "received", "done"]
        },
        {
            "rule_id": "RULE_006",
            "name": "Known scammer pattern",
            "condition": "user_reputation == scammer",
            "action": "auto_favor_counterparty",
            "confidence": 0.95,
            "auto_execute": True
        },
        {
            "rule_id": "RULE_007",
            "name": "Amount mismatch small",
            "condition": "payment_amount_within_5_percent",
            "action": "suggest_partial_release",
            "confidence": 0.75,
            "auto_execute": False
        },
        {
            "rule_id": "RULE_008",
            "name": "First trade dispute",
            "condition": "both_users_first_trade AND no_evidence",
            "action": "manual_review_required",
            "confidence": 0.5,
            "auto_execute": False
        }
    ]
    
    def __init__(self, db):
        self.db = db
        self.penalty_calculator = DisputePenaltyCalculator(db)
    
    async def evaluate_dispute(self, dispute_id: str) -> Dict[str, Any]:
        """
        Evaluate dispute against all rules and return recommendation
        """
        dispute = await self.db.p2p_disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        if not dispute:
            return {"error": "Dispute not found"}
        
        trade = await self.db.trades.find_one({"trade_id": dispute.get("trade_id")}, {"_id": 0})
        if not trade:
            trade = await self.db.p2p_trades.find_one({"trade_id": dispute.get("trade_id")}, {"_id": 0})
        
        # Gather evidence
        evidence = await self._gather_evidence(dispute, trade)
        
        # Evaluate each rule
        triggered_rules = []
        for rule in self.RULES:
            result = await self._evaluate_rule(rule, dispute, trade, evidence)
            if result.get("triggered"):
                triggered_rules.append({
                    "rule_id": rule["rule_id"],
                    "name": rule["name"],
                    "action": rule["action"],
                    "confidence": result.get("confidence", rule["confidence"]),
                    "auto_execute": rule["auto_execute"],
                    "details": result.get("details")
                })
        
        # Sort by confidence
        triggered_rules.sort(key=lambda x: x["confidence"], reverse=True)
        
        # Determine recommendation
        if triggered_rules:
            top_rule = triggered_rules[0]
            recommendation = {
                "action": top_rule["action"],
                "confidence": top_rule["confidence"],
                "based_on_rule": top_rule["rule_id"],
                "can_auto_execute": top_rule["auto_execute"] and top_rule["confidence"] >= 0.85,
                "all_triggered_rules": triggered_rules
            }
        else:
            recommendation = {
                "action": "manual_review_required",
                "confidence": 0.0,
                "based_on_rule": None,
                "can_auto_execute": False,
                "all_triggered_rules": []
            }
        
        # Calculate potential penalties
        if recommendation["action"] in ["auto_refund_seller", "auto_favor_counterparty"]:
            loser_id = dispute.get("buyer_id")
            winner_id = dispute.get("seller_id")
        else:
            loser_id = dispute.get("seller_id")
            winner_id = dispute.get("buyer_id")
        
        penalty_calc = await self.penalty_calculator.calculate_penalty(
            trade_id=dispute.get("trade_id"),
            loser_id=loser_id,
            winner_id=winner_id,
            reason=dispute.get("reason", "other")
        )
        
        recommendation["penalty"] = penalty_calc
        recommendation["evidence_summary"] = evidence
        
        # Save evaluation
        await self.db.p2p_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$set": {
                    "auto_evaluation": recommendation,
                    "evaluated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return recommendation
    
    async def _gather_evidence(self, dispute: Dict, trade: Dict) -> Dict[str, Any]:
        """Gather all evidence for dispute"""
        trade_id = dispute.get("trade_id")
        
        # Payment verification status
        payment_verification = await self.db.payment_verifications.find_one(
            {"trade_id": trade_id},
            {"_id": 0}
        )
        
        # Payment proof
        payment_proof = await self.db.payment_proofs.find_one(
            {"trade_id": trade_id},
            {"_id": 0}
        )
        
        # Chat messages
        messages = await self.db.trade_messages.find(
            {"trade_id": trade_id},
            {"_id": 0}
        ).to_list(1000)
        
        # User reputations
        buyer_rep = await self.penalty_calculator._get_user_reputation(dispute.get("buyer_id"))
        seller_rep = await self.penalty_calculator._get_user_reputation(dispute.get("seller_id"))
        
        # Timing analysis
        trade_created = trade.get("created_at") if trade else None
        payment_marked = trade.get("buyer_marked_paid_at") if trade else None
        dispute_opened = dispute.get("created_at")
        
        return {
            "payment_verified": payment_verification.get("status") == "verified" if payment_verification else False,
            "proof_uploaded": payment_proof is not None,
            "proof_status": payment_proof.get("status") if payment_proof else None,
            "message_count": len(messages),
            "buyer_messages": len([m for m in messages if m.get("sender_id") == dispute.get("buyer_id")]),
            "seller_messages": len([m for m in messages if m.get("sender_id") == dispute.get("seller_id")]),
            "chat_keywords": self._extract_keywords(messages),
            "buyer_reputation": buyer_rep,
            "seller_reputation": seller_rep,
            "trade_created": trade_created,
            "payment_marked": payment_marked,
            "dispute_opened": dispute_opened,
            "timer_expired": trade.get("status") == "expired" if trade else False
        }
    
    def _extract_keywords(self, messages: List[Dict]) -> List[str]:
        """Extract relevant keywords from chat"""
        keywords_found = []
        agreement_keywords = ["agreed", "ok", "confirmed", "sent", "received", "done", "paid", "transferred"]
        dispute_keywords = ["scam", "fraud", "cheat", "lie", "fake", "never"]
        
        for msg in messages:
            text = msg.get("message", "").lower()
            for kw in agreement_keywords + dispute_keywords:
                if kw in text and kw not in keywords_found:
                    keywords_found.append(kw)
        
        return keywords_found
    
    async def _evaluate_rule(self, rule: Dict, dispute: Dict, trade: Dict, evidence: Dict) -> Dict[str, Any]:
        """Evaluate a single rule"""
        condition = rule.get("condition", "")
        triggered = False
        confidence = rule.get("confidence", 0.5)
        details = {}
        
        if "payment_not_verified AND timer_expired" in condition:
            triggered = not evidence.get("payment_verified") and evidence.get("timer_expired")
            details = {"payment_verified": evidence.get("payment_verified"), "timer_expired": evidence.get("timer_expired")}
        
        elif "crypto_released AND payment_not_verified" in condition:
            triggered = trade.get("status") == "completed" and not evidence.get("payment_verified")
            details = {"trade_status": trade.get("status"), "payment_verified": evidence.get("payment_verified")}
        
        elif "buyer_marked_paid AND no_proof_uploaded" in condition:
            triggered = trade.get("status") == "buyer_marked_paid" and not evidence.get("proof_uploaded")
            details = {"trade_status": trade.get("status"), "proof_uploaded": evidence.get("proof_uploaded")}
        
        elif "payment_verified AND seller_no_response" in condition:
            triggered = evidence.get("payment_verified") and evidence.get("seller_messages", 0) == 0
            details = {"payment_verified": evidence.get("payment_verified"), "seller_messages": evidence.get("seller_messages")}
        
        elif "chat_contains_agreement_keywords" in condition:
            keywords = rule.get("keywords", [])
            matches = [kw for kw in keywords if kw in evidence.get("chat_keywords", [])]
            triggered = len(matches) >= 2
            confidence = min(0.9, 0.5 + (len(matches) * 0.1))
            details = {"matched_keywords": matches}
        
        elif "user_reputation == scammer" in condition:
            triggered = evidence.get("buyer_reputation") == "scammer" or evidence.get("seller_reputation") == "scammer"
            details = {"buyer_rep": evidence.get("buyer_reputation"), "seller_rep": evidence.get("seller_reputation")}
        
        return {
            "triggered": triggered,
            "confidence": confidence,
            "details": details
        }
    
    async def auto_resolve_if_possible(self, dispute_id: str) -> Dict[str, Any]:
        """
        Automatically resolve dispute if rules allow
        """
        evaluation = await self.evaluate_dispute(dispute_id)
        
        if not evaluation.get("can_auto_execute"):
            return {
                "auto_resolved": False,
                "reason": "Confidence too low or rule doesn't allow auto-execution",
                "evaluation": evaluation
            }
        
        action = evaluation.get("action")
        dispute = await self.db.p2p_disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        
        if action == "auto_refund_seller":
            resolution = "return_to_seller"
            winner = "seller"
        elif action == "auto_release_to_buyer":
            resolution = "release_to_buyer"
            winner = "buyer"
        elif action == "auto_favor_counterparty":
            # Favor whoever isn't the scammer
            if evaluation.get("evidence_summary", {}).get("buyer_reputation") == "scammer":
                resolution = "return_to_seller"
                winner = "seller"
            else:
                resolution = "release_to_buyer"
                winner = "buyer"
        else:
            return {
                "auto_resolved": False,
                "reason": f"Action '{action}' not supported for auto-resolution",
                "evaluation": evaluation
            }
        
        # Execute resolution
        penalty = evaluation.get("penalty", {}).get("penalty", 25.0)
        loser = "buyer" if winner == "seller" else "seller"
        loser_id = dispute.get("buyer_id") if loser == "buyer" else dispute.get("seller_id")
        
        # Update dispute
        await self.db.p2p_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$set": {
                    "status": "resolved",
                    "resolution": resolution,
                    "winner": winner,
                    "loser": loser,
                    "penalty_amount": penalty,
                    "penalty_charged_to": loser_id,
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                    "resolved_by": "AUTO_SYSTEM",
                    "auto_resolution": True,
                    "resolution_rule": evaluation.get("based_on_rule"),
                    "resolution_confidence": evaluation.get("confidence")
                }
            }
        )
        
        # Log penalty
        await self.db.fee_transactions.insert_one({
            "transaction_id": f"dispute_fee_{dispute_id}",
            "user_id": loser_id,
            "type": "dispute_penalty",
            "amount": penalty,
            "currency": evaluation.get("penalty", {}).get("currency", "GBP"),
            "dispute_id": dispute_id,
            "calculation": evaluation.get("penalty", {}).get("calculation"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Audit trail
        await self.db.audit_trail.insert_one({
            "action": "AUTO_DISPUTE_RESOLUTION",
            "dispute_id": dispute_id,
            "resolution": resolution,
            "winner": winner,
            "penalty": penalty,
            "rule_used": evaluation.get("based_on_rule"),
            "confidence": evaluation.get("confidence"),
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.info(f"✅ Auto-resolved dispute {dispute_id}: {resolution}, penalty £{penalty}")
        
        return {
            "auto_resolved": True,
            "resolution": resolution,
            "winner": winner,
            "penalty": penalty,
            "rule_used": evaluation.get("based_on_rule"),
            "confidence": evaluation.get("confidence")
        }


# Singleton
_dispute_rules_engine = None

def get_dispute_rules_engine(db) -> DisputeRulesEngine:
    global _dispute_rules_engine
    if _dispute_rules_engine is None:
        _dispute_rules_engine = DisputeRulesEngine(db)
    return _dispute_rules_engine
