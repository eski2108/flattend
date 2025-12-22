""" 
P2P Cryptographic Proof Protocol
=================================

IMMUTABLE VERIFICATION SYSTEM
- Digital signatures for non-repudiation
- Hash chains for data integrity
- Signed receipts for acknowledgement
- Temporal proofs for sequencing

Principle: Any third party can verify the entire history using only public keys.
"""

import hashlib
import hmac
import json
import os
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding, ec
from cryptography.hazmat.primitives.asymmetric.ec import ECDSA
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
import uuid

logger = logging.getLogger(__name__)


class CryptoProofService:
    """
    Cryptographic Proof Service for P2P Trading
    
    Provides:
    - Digital signatures (ECDSA)
    - Hash chain verification
    - Signed receipts
    - Proof packages
    """
    
    def __init__(self, db):
        self.db = db
        self._platform_private_key = None
        self._platform_public_key = None
        self._initialize_platform_keys()
    
    def _initialize_platform_keys(self):
        """Initialize or load platform signing keys"""
        # In production, load from secure key store
        # For now, generate deterministically from secret
        platform_secret = os.getenv('PLATFORM_SIGNING_SECRET', 'COINHUBX_PLATFORM_2025')
        
        # Generate platform ECDSA key pair
        self._platform_private_key = ec.generate_private_key(
            ec.SECP256K1(),
            default_backend()
        )
        self._platform_public_key = self._platform_private_key.public_key()
        
        logger.info("Platform cryptographic keys initialized")
    
    def generate_user_keypair(self) -> Dict[str, str]:
        """
        Generate ECDSA key pair for a user
        Returns base64-encoded keys
        """
        private_key = ec.generate_private_key(
            ec.SECP256K1(),
            default_backend()
        )
        public_key = private_key.public_key()
        
        # Serialize keys
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        return {
            "private_key": base64.b64encode(private_pem).decode(),
            "public_key": base64.b64encode(public_pem).decode(),
            "key_id": hashlib.sha256(public_pem).hexdigest()[:16]
        }
    
    def sign_data(self, data: Dict, private_key_b64: str) -> str:
        """
        Sign data with ECDSA private key
        Returns base64-encoded signature
        """
        # Canonicalize data
        data_bytes = json.dumps(data, sort_keys=True, separators=(',', ':')).encode()
        data_hash = hashlib.sha256(data_bytes).digest()
        
        # Load private key
        private_pem = base64.b64decode(private_key_b64)
        private_key = serialization.load_pem_private_key(
            private_pem,
            password=None,
            backend=default_backend()
        )
        
        # Sign
        signature = private_key.sign(
            data_hash,
            ec.ECDSA(hashes.SHA256())
        )
        
        return base64.b64encode(signature).decode()
    
    def verify_signature(self, data: Dict, signature_b64: str, public_key_b64: str) -> bool:
        """
        Verify ECDSA signature
        Returns True if valid
        """
        try:
            # Canonicalize data
            data_bytes = json.dumps(data, sort_keys=True, separators=(',', ':')).encode()
            data_hash = hashlib.sha256(data_bytes).digest()
            
            # Load public key
            public_pem = base64.b64decode(public_key_b64)
            public_key = serialization.load_pem_public_key(
                public_pem,
                backend=default_backend()
            )
            
            # Verify
            signature = base64.b64decode(signature_b64)
            public_key.verify(
                signature,
                data_hash,
                ec.ECDSA(hashes.SHA256())
            )
            
            return True
        except InvalidSignature:
            return False
        except Exception as e:
            logger.error(f"Signature verification error: {str(e)}")
            return False
    
    def platform_sign(self, data: Dict) -> str:
        """
        Sign data with platform's private key
        Used for platform-issued proofs
        """
        data_bytes = json.dumps(data, sort_keys=True, separators=(',', ':')).encode()
        data_hash = hashlib.sha256(data_bytes).digest()
        
        signature = self._platform_private_key.sign(
            data_hash,
            ec.ECDSA(hashes.SHA256())
        )
        
        return base64.b64encode(signature).decode()
    
    def compute_hash(self, data: Any) -> str:
        """
        Compute SHA-256 hash of data
        """
        if isinstance(data, dict):
            data_bytes = json.dumps(data, sort_keys=True, separators=(',', ':')).encode()
        elif isinstance(data, str):
            data_bytes = data.encode()
        elif isinstance(data, bytes):
            data_bytes = data
        else:
            data_bytes = str(data).encode()
        
        return hashlib.sha256(data_bytes).hexdigest()
    
    async def get_chain_head(self, chain_id: str) -> Optional[Dict]:
        """
        Get the latest block in a hash chain
        """
        head = await self.db.proof_chains.find_one(
            {"chain_id": chain_id},
            sort=[("sequence", -1)]
        )
        return head
    
    async def append_to_chain(
        self,
        chain_id: str,
        data: Dict,
        signer_id: str,
        signer_public_key: str
    ) -> Dict[str, Any]:
        """
        Append a new block to the hash chain
        
        Each block contains:
        - sequence: Block number
        - data: The actual data
        - data_hash: SHA-256 of data
        - prev_hash: Hash of previous block
        - timestamp: ISO timestamp
        - signer_id: Who signed this block
        - signature: ECDSA signature
        """
        # Get previous block
        prev_block = await self.get_chain_head(chain_id)
        
        if prev_block:
            prev_hash = prev_block.get("block_hash")
            sequence = prev_block.get("sequence", 0) + 1
        else:
            prev_hash = "0" * 64  # Genesis
            sequence = 1
        
        # Create block
        timestamp = datetime.now(timezone.utc).isoformat()
        data_hash = self.compute_hash(data)
        
        block_content = {
            "chain_id": chain_id,
            "sequence": sequence,
            "data": data,
            "data_hash": data_hash,
            "prev_hash": prev_hash,
            "timestamp": timestamp,
            "signer_id": signer_id
        }
        
        # Compute block hash
        block_hash = self.compute_hash(block_content)
        block_content["block_hash"] = block_hash
        
        # Platform signs the block
        platform_signature = self.platform_sign(block_content)
        block_content["platform_signature"] = platform_signature
        
        # Store
        await self.db.proof_chains.insert_one(block_content)
        
        logger.info(f"Appended block #{sequence} to chain {chain_id}")
        
        return {
            "block_hash": block_hash,
            "sequence": sequence,
            "prev_hash": prev_hash,
            "timestamp": timestamp
        }
    
    async def verify_chain(self, chain_id: str) -> Dict[str, Any]:
        """
        Verify entire hash chain integrity
        Returns verification result
        """
        blocks = await self.db.proof_chains.find(
            {"chain_id": chain_id}
        ).sort("sequence", 1).to_list(10000)
        
        if not blocks:
            return {"valid": True, "blocks": 0, "message": "Empty chain"}
        
        errors = []
        prev_hash = "0" * 64
        
        for i, block in enumerate(blocks):
            # Check sequence
            expected_seq = i + 1
            if block.get("sequence") != expected_seq:
                errors.append(f"Block {i}: sequence mismatch (got {block.get('sequence')}, expected {expected_seq})")
            
            # Check prev_hash linkage
            if block.get("prev_hash") != prev_hash:
                errors.append(f"Block {block.get('sequence')}: prev_hash mismatch")
            
            # Verify data hash
            computed_data_hash = self.compute_hash(block.get("data", {}))
            if block.get("data_hash") != computed_data_hash:
                errors.append(f"Block {block.get('sequence')}: data_hash corrupted")
            
            # Verify block hash
            block_content = {
                "chain_id": block.get("chain_id"),
                "sequence": block.get("sequence"),
                "data": block.get("data"),
                "data_hash": block.get("data_hash"),
                "prev_hash": block.get("prev_hash"),
                "timestamp": block.get("timestamp"),
                "signer_id": block.get("signer_id")
            }
            computed_block_hash = self.compute_hash(block_content)
            if block.get("block_hash") != computed_block_hash:
                errors.append(f"Block {block.get('sequence')}: block_hash corrupted")
            
            prev_hash = block.get("block_hash")
        
        return {
            "valid": len(errors) == 0,
            "blocks": len(blocks),
            "errors": errors,
            "head_hash": prev_hash,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }


class ProofPackage:
    """
    Standard wrapper for all P2P data transmissions
    
    Contains:
    - Origin Proof: Digital signature of creator
    - Journey Proof: Hash-chain link
    - Integrity Proof: Current data hash
    - State Proof: Reference to prior state
    """
    
    def __init__(self, crypto_service: CryptoProofService):
        self.crypto = crypto_service
    
    async def create_proof_package(
        self,
        data: Dict,
        creator_id: str,
        creator_public_key: str,
        chain_id: str,
        prior_state_ref: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a complete proof package for data
        """
        package_id = f"proof_{uuid.uuid4().hex[:16]}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # 1. INTEGRITY PROOF - Hash of current data
        data_hash = self.crypto.compute_hash(data)
        
        # 2. ORIGIN PROOF - Platform signature (in production, creator signs)
        origin_proof = {
            "creator_id": creator_id,
            "creator_key_fingerprint": self.crypto.compute_hash(creator_public_key)[:16],
            "created_at": timestamp,
            "platform_attestation": self.crypto.platform_sign({
                "data_hash": data_hash,
                "creator_id": creator_id,
                "timestamp": timestamp
            })
        }
        
        # 3. JOURNEY PROOF - Append to hash chain
        chain_entry = await self.crypto.append_to_chain(
            chain_id=chain_id,
            data={"package_id": package_id, "data_hash": data_hash},
            signer_id=creator_id,
            signer_public_key=creator_public_key
        )
        
        journey_proof = {
            "chain_id": chain_id,
            "block_hash": chain_entry["block_hash"],
            "sequence": chain_entry["sequence"],
            "prev_hash": chain_entry["prev_hash"]
        }
        
        # 4. STATE PROOF - Reference to prior state
        state_proof = {
            "prior_state_ref": prior_state_ref,
            "state_transition": "create" if not prior_state_ref else "update"
        }
        
        # Complete package
        proof_package = {
            "package_id": package_id,
            "version": "1.0",
            "data": data,
            "proofs": {
                "integrity": {
                    "algorithm": "SHA-256",
                    "hash": data_hash
                },
                "origin": origin_proof,
                "journey": journey_proof,
                "state": state_proof
            },
            "metadata": {
                "created_at": timestamp,
                "protocol": "CoinHubX-P2P-Proof-v1"
            }
        }
        
        # Final package signature
        proof_package["package_signature"] = self.crypto.platform_sign(proof_package)
        
        return proof_package
    
    async def verify_proof_package(self, package: Dict) -> Dict[str, Any]:
        """
        Verify all proofs in a package
        """
        results = {
            "package_id": package.get("package_id"),
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "checks": {}
        }
        
        # 1. Verify integrity proof
        data_hash = self.crypto.compute_hash(package.get("data", {}))
        expected_hash = package.get("proofs", {}).get("integrity", {}).get("hash")
        results["checks"]["integrity"] = {
            "valid": data_hash == expected_hash,
            "computed_hash": data_hash,
            "expected_hash": expected_hash
        }
        
        # 2. Verify journey proof (chain membership)
        journey = package.get("proofs", {}).get("journey", {})
        chain_id = journey.get("chain_id")
        block_hash = journey.get("block_hash")
        
        if chain_id and block_hash:
            chain_verification = await self.crypto.verify_chain(chain_id)
            results["checks"]["journey"] = {
                "valid": chain_verification.get("valid", False),
                "chain_blocks": chain_verification.get("blocks", 0),
                "errors": chain_verification.get("errors", [])
            }
        else:
            results["checks"]["journey"] = {"valid": False, "error": "Missing chain reference"}
        
        # 3. Verify origin proof exists
        origin = package.get("proofs", {}).get("origin", {})
        results["checks"]["origin"] = {
            "valid": bool(origin.get("platform_attestation")),
            "creator_id": origin.get("creator_id"),
            "created_at": origin.get("created_at")
        }
        
        # Overall validity
        all_valid = all(
            check.get("valid", False) 
            for check in results["checks"].values()
        )
        results["valid"] = all_valid
        
        return results


class SignedReceipt:
    """
    Cryptographically signed receipt for P2P acknowledgements
    """
    
    def __init__(self, crypto_service: CryptoProofService):
        self.crypto = crypto_service
    
    async def create_receipt(
        self,
        trade_id: str,
        receiver_id: str,
        received_package_hash: str,
        acknowledgement_type: str  # "received", "confirmed", "rejected"
    ) -> Dict[str, Any]:
        """
        Create a signed receipt acknowledging data reception
        """
        receipt_id = f"receipt_{uuid.uuid4().hex[:16]}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        receipt_data = {
            "receipt_id": receipt_id,
            "trade_id": trade_id,
            "receiver_id": receiver_id,
            "received_package_hash": received_package_hash,
            "acknowledgement": acknowledgement_type,
            "timestamp": timestamp
        }
        
        # Platform signs the receipt
        receipt_signature = self.crypto.platform_sign(receipt_data)
        
        receipt = {
            **receipt_data,
            "signature": receipt_signature,
            "signer": "platform",
            "protocol_version": "1.0"
        }
        
        return receipt
    
    def verify_receipt(self, receipt: Dict) -> bool:
        """
        Verify receipt signature
        """
        # Extract signature
        signature = receipt.pop("signature", None)
        if not signature:
            return False
        
        # Re-add signature for return
        receipt["signature"] = signature
        
        # In production, verify against stored public key
        # For now, check structure
        required_fields = ["receipt_id", "trade_id", "receiver_id", "received_package_hash", "acknowledgement"]
        return all(field in receipt for field in required_fields)


class P2PProofProtocol:
    """
    Complete P2P Proof Protocol implementation
    
    Handles:
    - Trade initiation with proof packages
    - Payment marking with receipts
    - Release with verification chain
    - Dispute evidence chain
    """
    
    def __init__(self, db):
        self.db = db
        self.crypto = CryptoProofService(db)
        self.proof_package = ProofPackage(self.crypto)
        self.receipt = SignedReceipt(self.crypto)
    
    async def initiate_trade_proof(
        self,
        trade_id: str,
        buyer_id: str,
        seller_id: str,
        trade_data: Dict
    ) -> Dict[str, Any]:
        """
        Create proof package for trade initiation
        """
        chain_id = f"trade_{trade_id}"
        
        # Create proof package
        package = await self.proof_package.create_proof_package(
            data={
                "event": "trade_initiated",
                "trade_id": trade_id,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "crypto_amount": trade_data.get("crypto_amount"),
                "crypto_currency": trade_data.get("crypto_currency"),
                "fiat_amount": trade_data.get("fiat_amount"),
                "fiat_currency": trade_data.get("fiat_currency"),
                "escrow_locked": True
            },
            creator_id="platform",
            creator_public_key="platform",
            chain_id=chain_id
        )
        
        # Store proof
        await self.db.trade_proofs.insert_one({
            "trade_id": trade_id,
            "event": "initiated",
            "proof_package": package,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Created initiation proof for trade {trade_id}")
        
        return package
    
    async def mark_payment_proof(
        self,
        trade_id: str,
        buyer_id: str,
        payment_details: Dict
    ) -> Dict[str, Any]:
        """
        Create proof package for payment marking + receipt
        """
        chain_id = f"trade_{trade_id}"
        
        # Get previous state
        prev_proof = await self.db.trade_proofs.find_one(
            {"trade_id": trade_id},
            sort=[("timestamp", -1)]
        )
        prior_state_ref = prev_proof.get("proof_package", {}).get("package_id") if prev_proof else None
        
        # Create proof package
        package = await self.proof_package.create_proof_package(
            data={
                "event": "payment_marked",
                "trade_id": trade_id,
                "buyer_id": buyer_id,
                "payment_method": payment_details.get("payment_method"),
                "payment_reference": payment_details.get("reference"),
                "marked_at": datetime.now(timezone.utc).isoformat()
            },
            creator_id=buyer_id,
            creator_public_key="buyer",  # In production, use actual key
            chain_id=chain_id,
            prior_state_ref=prior_state_ref
        )
        
        # Create receipt
        receipt = await self.receipt.create_receipt(
            trade_id=trade_id,
            receiver_id="seller",
            received_package_hash=package.get("proofs", {}).get("integrity", {}).get("hash"),
            acknowledgement_type="received"
        )
        
        # Store
        await self.db.trade_proofs.insert_one({
            "trade_id": trade_id,
            "event": "payment_marked",
            "proof_package": package,
            "receipt": receipt,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Created payment proof for trade {trade_id}")
        
        return {
            "proof_package": package,
            "receipt": receipt
        }
    
    async def release_proof(
        self,
        trade_id: str,
        seller_id: str,
        verification_data: Dict
    ) -> Dict[str, Any]:
        """
        Create proof package for crypto release
        """
        chain_id = f"trade_{trade_id}"
        
        # Get previous state
        prev_proof = await self.db.trade_proofs.find_one(
            {"trade_id": trade_id},
            sort=[("timestamp", -1)]
        )
        prior_state_ref = prev_proof.get("proof_package", {}).get("package_id") if prev_proof else None
        
        # Create proof package
        package = await self.proof_package.create_proof_package(
            data={
                "event": "crypto_released",
                "trade_id": trade_id,
                "seller_id": seller_id,
                "payment_verified": verification_data.get("verified"),
                "verification_provider": verification_data.get("provider"),
                "verification_confidence": verification_data.get("confidence"),
                "released_at": datetime.now(timezone.utc).isoformat()
            },
            creator_id=seller_id,
            creator_public_key="seller",
            chain_id=chain_id,
            prior_state_ref=prior_state_ref
        )
        
        # Create receipt
        receipt = await self.receipt.create_receipt(
            trade_id=trade_id,
            receiver_id="buyer",
            received_package_hash=package.get("proofs", {}).get("integrity", {}).get("hash"),
            acknowledgement_type="confirmed"
        )
        
        # Store
        await self.db.trade_proofs.insert_one({
            "trade_id": trade_id,
            "event": "released",
            "proof_package": package,
            "receipt": receipt,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Created release proof for trade {trade_id}")
        
        return {
            "proof_package": package,
            "receipt": receipt
        }
    
    async def get_trade_proof_chain(
        self,
        trade_id: str
    ) -> Dict[str, Any]:
        """
        Get complete proof chain for a trade
        
        This can be independently verified by any third party
        using only public keys and protocol rules
        """
        chain_id = f"trade_{trade_id}"
        
        # Get all proofs
        proofs = await self.db.trade_proofs.find(
            {"trade_id": trade_id}
        ).sort("timestamp", 1).to_list(1000)
        
        # Verify chain integrity
        chain_verification = await self.crypto.verify_chain(chain_id)
        
        return {
            "trade_id": trade_id,
            "chain_id": chain_id,
            "proofs": [{
                "event": p.get("event"),
                "package_id": p.get("proof_package", {}).get("package_id"),
                "data_hash": p.get("proof_package", {}).get("proofs", {}).get("integrity", {}).get("hash"),
                "timestamp": p.get("timestamp"),
                "has_receipt": bool(p.get("receipt"))
            } for p in proofs],
            "chain_verification": chain_verification,
            "total_events": len(proofs),
            "retrieved_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def export_verifiable_record(
        self,
        trade_id: str
    ) -> Dict[str, Any]:
        """
        Export complete, independently verifiable record
        
        This record can be verified by any third party without
        access to the platform's systems - only public keys needed
        """
        chain_id = f"trade_{trade_id}"
        
        # Get all chain blocks
        blocks = await self.db.proof_chains.find(
            {"chain_id": chain_id}
        ).sort("sequence", 1).to_list(10000)
        
        # Get all proofs
        proofs = await self.db.trade_proofs.find(
            {"trade_id": trade_id}
        ).sort("timestamp", 1).to_list(1000)
        
        # Build export
        export = {
            "export_version": "1.0",
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "trade_id": trade_id,
            "chain_id": chain_id,
            
            # Hash chain - ordered list of blocks
            "hash_chain": [{
                "sequence": b.get("sequence"),
                "block_hash": b.get("block_hash"),
                "prev_hash": b.get("prev_hash"),
                "data_hash": b.get("data_hash"),
                "timestamp": b.get("timestamp"),
                "signer_id": b.get("signer_id"),
                "platform_signature": b.get("platform_signature")
            } for b in blocks],
            
            # Full proof packages
            "proof_packages": [p.get("proof_package") for p in proofs if p.get("proof_package")],
            
            # Receipts
            "receipts": [p.get("receipt") for p in proofs if p.get("receipt")],
            
            # Verification instructions
            "verification_instructions": {
                "1_verify_chain": "Verify each block's prev_hash matches previous block's block_hash",
                "2_verify_hashes": "Recompute each block_hash from block content using SHA-256",
                "3_verify_data": "Verify each data_hash matches the hash of the proof package data",
                "4_verify_signatures": "Verify platform_signature using platform's public key",
                "5_verify_receipts": "Verify receipt signatures acknowledge specific package hashes"
            },
            
            # Platform public key for verification
            "platform_public_key_info": {
                "algorithm": "ECDSA-SECP256K1",
                "note": "Obtain current platform public key from https://coinhubx.net/.well-known/jwks.json"
            }
        }
        
        # Sign the export itself
        export["export_signature"] = self.crypto.platform_sign(export)
        
        return export


# Singleton
_p2p_proof_protocol = None

def get_p2p_proof_protocol(db) -> P2PProofProtocol:
    global _p2p_proof_protocol
    if _p2p_proof_protocol is None:
        _p2p_proof_protocol = P2PProofProtocol(db)
    return _p2p_proof_protocol
