"""
Encryption utilities for sensitive data (Shopify access tokens)
Uses Fernet symmetric encryption from the cryptography library.
"""
from cryptography.fernet import Fernet  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]


def _get_fernet() -> Fernet:
    """Get Fernet instance from ENCRYPTION_KEY"""
    key = settings.ENCRYPTION_KEY
    if not key:
        raise RuntimeError("ENCRYPTION_KEY not configured")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(plaintext: str) -> str:
    """Encrypt a Shopify access token for storage"""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a stored Shopify access token"""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def generate_encryption_key() -> str:
    """Generate a new Fernet encryption key (run once, store in env)"""
    return Fernet.generate_key().decode()
