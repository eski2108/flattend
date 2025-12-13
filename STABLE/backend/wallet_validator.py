# Wallet Address Validation System
# Validates crypto wallet addresses for different blockchains

import re
from typing import Dict, Tuple

def validate_btc_address(address: str) -> Tuple[bool, str]:
    """
    Validate Bitcoin address (Legacy, SegWit, Bech32)
    """
    # Legacy P2PKH (starts with 1)
    legacy_pattern = r'^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$'
    # P2SH (starts with 3)
    p2sh_pattern = r'^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$'
    # Bech32 (starts with bc1)
    bech32_pattern = r'^(bc1)[a-z0-9]{39,87}$'
    
    if re.match(legacy_pattern, address):
        return True, "Valid BTC Legacy address"
    elif re.match(p2sh_pattern, address):
        return True, "Valid BTC P2SH address"
    elif re.match(bech32_pattern, address):
        return True, "Valid BTC Bech32 address"
    else:
        return False, "Invalid BTC address format"

def validate_eth_address(address: str) -> Tuple[bool, str]:
    """
    Validate Ethereum address (also valid for USDT-ERC20, BNB, etc.)
    """
    # ETH addresses are 42 characters, start with 0x
    eth_pattern = r'^0x[a-fA-F0-9]{40}$'
    
    if re.match(eth_pattern, address):
        return True, "Valid ETH/ERC20 address"
    else:
        return False, "Invalid ETH address format (must start with 0x and be 42 characters)"

def validate_usdt_trc20_address(address: str) -> Tuple[bool, str]:
    """
    Validate USDT TRC20 (TRON) address
    """
    # TRC20 addresses start with T and are 34 characters
    trc20_pattern = r'^T[a-zA-Z0-9]{33}$'
    
    if re.match(trc20_pattern, address):
        return True, "Valid USDT-TRC20 (TRON) address"
    else:
        return False, "Invalid TRC20 address format"

def validate_bnb_address(address: str) -> Tuple[bool, str]:
    """
    Validate Binance Chain (BEP2) address
    """
    # BNB addresses start with bnb and are 42 characters
    bnb_pattern = r'^bnb[a-z0-9]{39}$'
    
    if re.match(bnb_pattern, address):
        return True, "Valid BNB (BEP2) address"
    # BSC uses ETH format (0x...)
    elif address.startswith('0x') and len(address) == 42:
        return True, "Valid BNB (BSC/BEP20) address"
    else:
        return False, "Invalid BNB address format"

def validate_wallet_address(address: str, cryptocurrency: str, network: str = None) -> Dict:
    """
    Main validation function for all crypto wallet addresses
    
    Args:
        address: Wallet address to validate
        cryptocurrency: Currency code (BTC, ETH, USDT, BNB, etc.)
        network: Network type (ERC20, TRC20, BEP20, etc.) - optional
    
    Returns:
        Dict with validation result, message, and detected info
    """
    
    # Remove whitespace
    address = address.strip()
    
    # Empty check
    if not address:
        return {
            "valid": False,
            "message": "Wallet address cannot be empty",
            "address": address
        }
    
    cryptocurrency = cryptocurrency.upper()
    
    # Bitcoin validation
    if cryptocurrency == "BTC":
        valid, message = validate_btc_address(address)
        return {
            "valid": valid,
            "message": message,
            "address": address,
            "cryptocurrency": "BTC",
            "network": "Bitcoin"
        }
    
    # Ethereum validation (also covers USDT-ERC20, many ERC20 tokens)
    elif cryptocurrency == "ETH":
        valid, message = validate_eth_address(address)
        return {
            "valid": valid,
            "message": message,
            "address": address,
            "cryptocurrency": "ETH",
            "network": "Ethereum"
        }
    
    # USDT validation (multiple networks)
    elif cryptocurrency == "USDT":
        if network and network.upper() == "TRC20":
            valid, message = validate_usdt_trc20_address(address)
            network_name = "TRON (TRC20)"
        elif network and network.upper() == "BEP20":
            valid, message = validate_eth_address(address)  # BSC uses ETH format
            network_name = "BSC (BEP20)"
        else:
            # Default to ERC20
            valid, message = validate_eth_address(address)
            network_name = "Ethereum (ERC20)"
        
        return {
            "valid": valid,
            "message": message,
            "address": address,
            "cryptocurrency": "USDT",
            "network": network_name
        }
    
    # BNB validation
    elif cryptocurrency == "BNB":
        valid, message = validate_bnb_address(address)
        return {
            "valid": valid,
            "message": message,
            "address": address,
            "cryptocurrency": "BNB",
            "network": "Binance Chain or BSC"
        }
    
    # Other ERC20 tokens (use ETH validation)
    elif cryptocurrency in ["USDC", "DAI", "LINK", "UNI", "AAVE"]:
        valid, message = validate_eth_address(address)
        return {
            "valid": valid,
            "message": f"{message} (ERC20 token)",
            "address": address,
            "cryptocurrency": cryptocurrency,
            "network": "Ethereum (ERC20)"
        }
    
    # Unsupported cryptocurrency
    else:
        return {
            "valid": False,
            "message": f"Validation not implemented for {cryptocurrency}",
            "address": address,
            "cryptocurrency": cryptocurrency
        }

# Test examples
if __name__ == "__main__":
    test_addresses = [
        ("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "BTC", None),  # Bitcoin Genesis
        ("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "ETH", None),  # ETH
        ("TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS", "USDT", "TRC20"),  # USDT TRC20
        ("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "USDT", "ERC20"),  # USDT ERC20
        ("bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2", "BNB", None),  # BNB
    ]
    
    print("Testing wallet address validation:\n")
    for address, crypto, network in test_addresses:
        result = validate_wallet_address(address, crypto, network)
        print(f"{crypto} ({network or 'default'}): {result['valid']}")
        print(f"  Address: {address}")
        print(f"  Message: {result['message']}\n")
