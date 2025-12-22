# FILE: /app/backend/services/balance_schema.py
# SERVICE LOCK: FROZEN. Balance field mapping.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

from typing import Dict, Any

# Standardized mapping for balance fields across all 4 collections
BALANCE_FIELD_MAP: Dict[str, Dict[str, str]] = {
    'wallets': {
        'available': 'available_balance',
        'locked': 'locked_balance',
        'total': 'total_balance',
        'id_field': 'user_id'
    },
    'crypto_balances': {
        'available': 'available_balance',
        'locked': 'locked_balance',
        'total': 'balance',
        'id_field': 'user_id'
    },
    'trader_balances': {
        'available': 'available_balance',
        'locked': 'locked_balance',
        'total': 'total_balance',
        'id_field': 'trader_id'
    },
    'internal_balances': {
        'available': 'available_balance',
        'locked': 'locked_balance',
        'total': 'balance',
        'id_field': 'user_id'
    }
}

# Collections that need to be synced
BALANCE_COLLECTIONS = ['wallets', 'crypto_balances', 'trader_balances', 'internal_balances']


def get_field(collection_name: str, field_type: str) -> str:
    """
    Get the actual field name for a collection.
    
    Args:
        collection_name: One of 'wallets', 'crypto_balances', 'trader_balances', 'internal_balances'
        field_type: One of 'available', 'locked', 'total', 'id_field'
        
    Returns:
        The actual field name in that collection
    """
    return BALANCE_FIELD_MAP.get(collection_name, {}).get(field_type, field_type)


def get_id_field(collection_name: str) -> str:
    """Get the ID field name for a collection."""
    return BALANCE_FIELD_MAP.get(collection_name, {}).get('id_field', 'user_id')


def normalize_balance_doc(collection_name: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a balance document to standard field names.
    
    Returns:
        Dict with standard fields: available, locked, total, user_id, currency
    """
    if not doc:
        return {'available': 0, 'locked': 0, 'total': 0, 'user_id': None, 'currency': None}
    
    mapping = BALANCE_FIELD_MAP.get(collection_name, {})
    
    return {
        'available': float(doc.get(mapping.get('available', 'available_balance'), 0)),
        'locked': float(doc.get(mapping.get('locked', 'locked_balance'), 0)),
        'total': float(doc.get(mapping.get('total', 'total_balance'), 0)),
        'user_id': doc.get(mapping.get('id_field', 'user_id')),
        'currency': doc.get('currency')
    }


def get_update_fields(collection_name: str, available_delta: float = 0, locked_delta: float = 0, total_delta: float = 0) -> Dict[str, float]:
    """
    Get the MongoDB $inc update fields for a collection.
    
    Args:
        collection_name: The collection name
        available_delta: Change to available balance
        locked_delta: Change to locked balance
        total_delta: Change to total balance
        
    Returns:
        Dict for use with MongoDB $inc operator
    """
    mapping = BALANCE_FIELD_MAP.get(collection_name, {})
    
    inc_fields = {}
    if available_delta != 0:
        inc_fields[mapping.get('available', 'available_balance')] = available_delta
    if locked_delta != 0:
        inc_fields[mapping.get('locked', 'locked_balance')] = locked_delta
    if total_delta != 0:
        inc_fields[mapping.get('total', 'total_balance')] = total_delta
    
    return inc_fields
