"""
Script to recreate admin liquidity offers for Express Buy
Run this once to fix BUG 7
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from unified_price_service import get_unified_price_service

async def main():
    """Recreate admin liquidity offers"""
    
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    db_name = os.getenv('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("ADMIN LIQUIDITY OFFER RECREATION SCRIPT")
    print("=" * 60)
    
    # Get unified price service
    price_service = get_unified_price_service()
    
    try:
        # Step 1: Get admin liquidity balances
        print("\n📊 Step 1: Fetching admin liquidity balances...")
        liquidity_wallets = await db.admin_liquidity_wallets.find({}).to_list(100)
        
        if not liquidity_wallets:
            print("❌ No admin liquidity wallets found!")
            return
        
        print(f"✅ Found {len(liquidity_wallets)} liquidity wallets:")
        for wallet in liquidity_wallets:
            print(f"   • {wallet['currency']}: {wallet.get('balance', 0)} (reserved: {wallet.get('reserved_balance', 0)})")
        
        # Step 2: Delete old offers
        print("\n🗑️  Step 2: Deleting old admin liquidity offers...")
        result = await db.enhanced_sell_orders.delete_many({"is_admin_liquidity": True})
        print(f"✅ Deleted {result.deleted_count} old offers")
        
        # Step 3: Create new offers
        print("\n🆕 Step 3: Creating new admin liquidity offers...")
        offers_created = 0
        
        for wallet in liquidity_wallets:
            currency = wallet['currency']
            balance = wallet.get('balance', 0)
            reserved = wallet.get('reserved_balance', 0)
            available = balance - reserved
            
            # Skip if no available balance
            if available <= 0:
                print(f"⚠️  Skipping {currency}: No available balance")
                continue
            
            # Skip GBP (fiat)
            if currency == 'GBP':
                print(f"⚠️  Skipping {currency}: Fiat currency")
                continue
            
            try:
                # Get market price
                market_price_gbp = await price_service.get_price(currency, 'GBP')
                
                # Apply 3% markup for Express Buy
                markup_percent = 3.0
                offer_price_gbp = market_price_gbp * (1 + markup_percent / 100)
                
                # Create offer
                offer = {
                    "order_id": str(uuid4()),
                    "user_id": "ADMIN_LIQUIDITY",
                    "seller_email": "admin@coinhubx.com",
                    "is_admin_liquidity": True,
                    "crypto_currency": currency,
                    "crypto_amount": available,
                    "fiat_currency": "GBP",
                    "price_per_unit": offer_price_gbp,
                    "market_price": market_price_gbp,
                    "markup_percent": markup_percent,
                    "min_order": 10.0,  # Minimum £10 purchase
                    "max_order": available * offer_price_gbp,  # Up to full balance
                    "payment_methods": ["wallet_balance"],
                    "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "orders_completed": 0,
                    "total_volume": 0,
                    "description": f"Instant buy {currency} from platform liquidity"
                }
                
                await db.enhanced_sell_orders.insert_one(offer)
                
                print(f"✅ Created offer for {currency}:")
                print(f"   • Available: {available} {currency}")
                print(f"   • Market price: £{market_price_gbp:,.2f}")
                print(f"   • Offer price: £{offer_price_gbp:,.2f} (+{markup_percent}%)")
                print(f"   • Max purchase: £{offer['max_order']:,.2f}")
                
                offers_created += 1
                
            except Exception as e:
                print(f"❌ Failed to create offer for {currency}: {e}")
        
        # Step 4: Verify
        print(f"\n✅ Step 4: Verification...")
        print(f"✅ Successfully created {offers_created} offers")
        
        # List all active offers
        all_offers = await db.enhanced_sell_orders.find({"is_admin_liquidity": True, "status": "active"}).to_list(100)
        print(f"\n📋 Active Express Buy Offers:")
        for offer in all_offers:
            print(f"   • {offer['crypto_amount']:.8f} {offer['crypto_currency']} @ £{offer['price_per_unit']:,.2f} each")
        
        print("\n" + "=" * 60)
        print("✅ ADMIN LIQUIDITY OFFERS SUCCESSFULLY RECREATED")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
