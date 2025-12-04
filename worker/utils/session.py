"""
Session Management Utilities
Handles encryption/decryption of session tokens
"""

import os
import json
from typing import Dict, List
from cryptography.fernet import Fernet


class SessionManager:
    """
    Manages session encryption and decryption
    """
    
    def __init__(self, encryption_key: str = None):
        """
        Initialize session manager
        
        Args:
            encryption_key: Fernet encryption key (base64 encoded)
        """
        if encryption_key is None:
            encryption_key = os.getenv('SESSION_ENCRYPTION_KEY')
        
        if not encryption_key:
            raise ValueError("SESSION_ENCRYPTION_KEY not provided")
        
        self.fernet = Fernet(encryption_key.encode())
    
    def encrypt_session(self, cookies: List[Dict], local_storage: Dict = None) -> str:
        """
        Encrypt session data (cookies + localStorage)
        
        Args:
            cookies: List of cookie dictionaries
            local_storage: Dictionary of localStorage items
        
        Returns:
            Encrypted session token (string)
        """
        session_data = {
            'cookies': cookies,
            'local_storage': local_storage or {}
        }
        
        json_data = json.dumps(session_data)
        encrypted = self.fernet.encrypt(json_data.encode())
        
        return encrypted.decode()
    
    def decrypt_session(self, encrypted_token: str) -> Dict:
        """
        Decrypt session token
        
        Args:
            encrypted_token: Encrypted session string
        
        Returns:
            Dictionary with 'cookies' and 'local_storage' keys
        """
        decrypted = self.fernet.decrypt(encrypted_token.encode())
        session_data = json.loads(decrypted.decode())
        
        return session_data
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new Fernet encryption key
        
        Returns:
            Base64-encoded Fernet key
        """
        key = Fernet.generate_key()
        return key.decode()


def main():
    """CLI tool for session management"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python session.py generate-key")
        print("  python session.py encrypt <cookies_json_file>")
        print("  python session.py decrypt <encrypted_token>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'generate-key':
        key = SessionManager.generate_key()
        print(f"Generated encryption key:\n{key}")
        print("\nAdd to .env:")
        print(f"SESSION_ENCRYPTION_KEY={key}")
    
    elif command == 'encrypt':
        if len(sys.argv) < 3:
            print("Error: Please provide cookies JSON file path")
            sys.exit(1)
        
        cookies_file = sys.argv[2]
        
        with open(cookies_file, 'r') as f:
            cookies = json.load(f)
        
        manager = SessionManager()
        encrypted = manager.encrypt_session(cookies)
        
        print(f"Encrypted session token:\n{encrypted}")
    
    elif command == 'decrypt':
        if len(sys.argv) < 3:
            print("Error: Please provide encrypted token")
            sys.exit(1)
        
        encrypted_token = sys.argv[2]
        
        manager = SessionManager()
        session_data = manager.decrypt_session(encrypted_token)
        
        print("Decrypted session data:")
        print(json.dumps(session_data, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == '__main__':
    main()
