"""
Unit tests for P2P Offers canonical schema mappers.

Tests:
1. map_p2p_ad_to_canonical() - Maps p2p_ads documents to canonical schema
2. enhanced_sell_orders mapping - Ensures source and canonical_offer_id are added
3. Dedup logic - Ensures canonical_offer_id prevents collisions
"""
import pytest
import uuid
from datetime import datetime, timezone

# ==================== MAPPER FUNCTIONS (extracted for testing) ====================

def map_p2p_ad_to_canonical(ad):
    """
    Maps a p2p_ad document to the canonical offer schema.
    """
    # Determine price
    price = ad.get("price_per_unit") or ad.get("price_value") or ad.get("price", 0)
    
    # Determine order limits
    min_limit = ad.get("min_order_limit") or ad.get("min_amount", 0)
    max_limit = ad.get("max_order_limit") or ad.get("max_amount", 0)
    
    # Normalize ad_type
    ad_type = (ad.get("ad_type") or ad.get("type") or "sell").lower()
    
    # Get offer_id
    offer_id = ad.get("ad_id") or ad.get("offer_id") or str(uuid.uuid4())
    
    # Available amount logic
    stored_available = ad.get("available_amount")
    if stored_available is not None and stored_available > 0:
        available = float(stored_available)
    elif ad_type == "sell":
        available = float(max_limit) if max_limit else None
    else:
        available = None
    
    return {
        "offer_id": offer_id,
        "canonical_offer_id": f"p2p_ads:{offer_id}",
        "seller_id": ad.get("seller_id", ""),
        "seller_name": ad.get("seller_name", "Seller"),
        "ad_type": ad_type,
        "crypto_currency": ad.get("crypto_currency") or ad.get("crypto", "BTC"),
        "fiat_currency": ad.get("fiat_currency") or ad.get("fiat", "GBP"),
        "price_per_unit": float(price) if price else 0,
        "price_type": ad.get("price_type", "fixed"),
        "price_margin": ad.get("price_value") if ad.get("price_type") == "floating" else None,
        "min_order_limit": float(min_limit) if min_limit else 0,
        "max_order_limit": float(max_limit) if max_limit else 0,
        "payment_methods": ad.get("payment_methods", []),
        "terms": ad.get("terms", ""),
        "status": ad.get("status", "active"),
        "created_at": ad.get("created_at").isoformat() if hasattr(ad.get("created_at"), 'isoformat') else str(ad.get("created_at", "")),
        "total_trades": ad.get("total_trades", 0),
        "available_amount": available,
        "source": "p2p_ads"
    }


def map_enhanced_to_canonical(offer):
    """
    Adds canonical fields to enhanced_sell_orders document.
    """
    offer_id = offer.get("offer_id") or offer.get("order_id") or ""
    offer["source"] = "enhanced_sell_orders"
    offer["canonical_offer_id"] = f"enhanced_sell_orders:{offer_id}"
    
    # Fix available_amount
    if offer.get("available_amount") is None or offer.get("available_amount") == 0:
        if offer.get("ad_type", "sell").lower() == "sell":
            offer["available_amount"] = offer.get("max_order_limit") or offer.get("available_crypto")
    
    return offer


# ==================== TESTS ====================

class TestP2PAdsMapper:
    """Tests for p2p_ads → canonical schema mapper"""
    
    def test_basic_sell_ad_mapping(self):
        """Test mapping a basic SELL ad"""
        ad = {
            "ad_id": "test-123",
            "seller_id": "user-456",
            "seller_name": "Test Seller",
            "ad_type": "sell",
            "crypto_currency": "BTC",
            "fiat_currency": "GBP",
            "price_value": 48500,
            "price_type": "fixed",
            "min_amount": 0.01,
            "max_amount": 2.0,
            "payment_methods": ["bank_transfer"],
            "terms": "Test terms",
            "status": "active",
            "created_at": datetime.now(timezone.utc)
        }
        
        result = map_p2p_ad_to_canonical(ad)
        
        assert result["offer_id"] == "test-123"
        assert result["canonical_offer_id"] == "p2p_ads:test-123"
        assert result["source"] == "p2p_ads"
        assert result["ad_type"] == "sell"
        assert result["price_per_unit"] == 48500.0
        assert result["price_type"] == "fixed"
        assert result["price_margin"] is None
        assert result["min_order_limit"] == 0.01
        assert result["max_order_limit"] == 2.0
        assert result["available_amount"] == 2.0  # Falls back to max_order_limit for sell
    
    def test_floating_price_mapping(self):
        """Test mapping a floating price ad"""
        ad = {
            "ad_id": "float-123",
            "ad_type": "buy",
            "price_type": "floating",
            "price_value": 3.5,  # 3.5% margin
            "min_amount": 100,
            "max_amount": 5000
        }
        
        result = map_p2p_ad_to_canonical(ad)
        
        assert result["price_type"] == "floating"
        assert result["price_margin"] == 3.5
        assert result["ad_type"] == "buy"
        assert result["available_amount"] is None  # BUY ads don't have available_amount
    
    def test_missing_fields_defaults(self):
        """Test that missing fields get sane defaults"""
        ad = {"ad_id": "minimal-123"}
        
        result = map_p2p_ad_to_canonical(ad)
        
        assert result["seller_id"] == ""
        assert result["seller_name"] == "Seller"
        assert result["ad_type"] == "sell"
        assert result["crypto_currency"] == "BTC"
        assert result["fiat_currency"] == "GBP"
        assert result["payment_methods"] == []
        assert result["terms"] == ""
        assert result["status"] == "active"
    
    def test_canonical_offer_id_format(self):
        """Test canonical_offer_id is correctly formatted"""
        ad = {"ad_id": "uuid-abc-123"}
        result = map_p2p_ad_to_canonical(ad)
        
        assert result["canonical_offer_id"] == "p2p_ads:uuid-abc-123"
        assert ":" in result["canonical_offer_id"]


class TestEnhancedSellOrdersMapper:
    """Tests for enhanced_sell_orders → canonical schema mapper"""
    
    def test_adds_source_and_canonical_id(self):
        """Test that source and canonical_offer_id are added"""
        offer = {
            "offer_id": "enhanced-456",
            "ad_type": "sell",
            "max_order_limit": 1000
        }
        
        result = map_enhanced_to_canonical(offer)
        
        assert result["source"] == "enhanced_sell_orders"
        assert result["canonical_offer_id"] == "enhanced_sell_orders:enhanced-456"
    
    def test_fixes_zero_available_amount(self):
        """Test that zero available_amount is fixed for sell ads"""
        offer = {
            "offer_id": "enhanced-789",
            "ad_type": "sell",
            "available_amount": 0,
            "max_order_limit": 500
        }
        
        result = map_enhanced_to_canonical(offer)
        
        assert result["available_amount"] == 500


class TestDedupLogic:
    """Tests for deduplication logic"""
    
    def test_no_collision_between_sources(self):
        """Test that same offer_id from different sources don't collide"""
        same_id = "duplicate-123"
        
        p2p_ad = {"ad_id": same_id}
        enhanced = {"offer_id": same_id, "ad_type": "sell", "max_order_limit": 100}
        
        p2p_result = map_p2p_ad_to_canonical(p2p_ad)
        enhanced_result = map_enhanced_to_canonical(enhanced)
        
        # canonical_offer_ids should be different
        assert p2p_result["canonical_offer_id"] != enhanced_result["canonical_offer_id"]
        assert p2p_result["canonical_offer_id"] == f"p2p_ads:{same_id}"
        assert enhanced_result["canonical_offer_id"] == f"enhanced_sell_orders:{same_id}"
    
    def test_dedup_by_canonical_id(self):
        """Test dedup logic using canonical_offer_id"""
        offers = []
        existing_ids = set()
        
        # Add p2p_ads offer
        p2p_offer = map_p2p_ad_to_canonical({"ad_id": "test-1"})
        if p2p_offer["canonical_offer_id"] not in existing_ids:
            offers.append(p2p_offer)
            existing_ids.add(p2p_offer["canonical_offer_id"])
        
        # Try to add duplicate
        duplicate = map_p2p_ad_to_canonical({"ad_id": "test-1"})
        if duplicate["canonical_offer_id"] not in existing_ids:
            offers.append(duplicate)
            existing_ids.add(duplicate["canonical_offer_id"])
        
        # Should only have 1 offer
        assert len(offers) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
