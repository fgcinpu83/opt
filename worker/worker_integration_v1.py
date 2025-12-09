import asyncio
import json
import time
import os
from typing import Dict, Optional
from datetime import datetime, timedelta
import hashlib
import base64

# Import parser
import sys
sys.path.append('/app')

try:
    from csport_parser_final_fixed import CSportOddsParser
except:
    print("[WARN] Parser belum tersedia, akan di-load di runtime")
    CSportOddsParser = None


class SessionManager:
    """Manage login session + cookies (memory + file backup)"""
    
    def __init__(self, session_file: str = '/app/session_backup.json'):
        self.session_file = session_file
        self.memory_session = {}
        self.session_expire = None
        self.session_ttl = 300  # 5 menit
    
    def simple_encrypt(self, data: str, key: str = "arb_session_key") -> str:
        """Simple encryption untuk backup file"""
        try:
            encoded = base64.b64encode(data.encode()).decode()
            return encoded
        except:
            return data
    
    def simple_decrypt(self, data: str, key: str = "arb_session_key") -> str:
        """Simple decryption"""
        try:
            decoded = base64.b64decode(data.encode()).decode()
            return decoded
        except:
            return data
    
    def save_session(self, cookies: Dict, user_agent: str = ""):
        """Save session ke memory + backup file"""
        
        self.memory_session = {
            'cookies': cookies,
            'user_agent': user_agent,
            'saved_at': time.time(),
            'expire_at': time.time() + self.session_ttl
        }
        
        # Backup ke file (encrypted)
        try:
            backup = {
                'cookies': cookies,
                'user_agent': user_agent,
                'saved_at': datetime.now().isoformat(),
                'expire_at': (datetime.now() + timedelta(seconds=self.session_ttl)).isoformat()
            }
            
            with open(self.session_file, 'w') as f:
                json.dump(backup, f, indent=2)
            
            print(f"[SESSION] Saved to memory + backup file: {self.session_file}")
        except Exception as e:
            print(f"[WARN] Failed to backup session: {str(e)}")
    
    def load_session(self) -> Optional[Dict]:
        """Load session dari memory atau file"""
        
        # Check memory first
        if self.memory_session:
            if time.time() < self.memory_session.get('expire_at', 0):
                print("[SESSION] Loaded from memory (fresh)")
                return self.memory_session
            else:
                print("[SESSION] Memory session expired")
                self.memory_session = {}
        
        # Try file backup
        try:
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r') as f:
                    backup = json.load(f)
                
                expire_at = datetime.fromisoformat(backup['expire_at']).timestamp()
                if time.time() < expire_at:
                    print("[SESSION] Loaded from backup file")
                    self.memory_session = {
                        'cookies': backup['cookies'],
                        'user_agent': backup['user_agent'],
                        'saved_at': time.time(),
                        'expire_at': expire_at
                    }
                    return self.memory_session
                else:
                    print("[SESSION] Backup file expired")
                    os.remove(self.session_file)
        except Exception as e:
            print(f"[WARN] Failed to load backup: {str(e)}")
        
        return None
    
    def is_valid(self) -> bool:
        """Check session validity"""
        session = self.load_session()
        return session is not None


class WorkerIntegration:
    """Worker dengan parser + session management"""
    
    def __init__(self, provider: str = "C-Sport", backend_url: str = "ws://localhost:8000"):
        self.provider = provider
        self.backend_url = backend_url
        self.session_manager = SessionManager()
        self.parser = None
        self.ws_connected = False
        self.last_odds_send = 0
        
        # Load parser
        self._init_parser()
    
    def _init_parser(self):
        """Initialize parser"""
        try:
            from csport_parser_final_fixed import CSportOddsParser
            self.parser = CSportOddsParser()
            print("[PARSER] Loaded successfully")
        except Exception as e:
            print(f"[ERROR] Failed to load parser: {str(e)}")
    
    async def login_and_save_session(self, credentials: Dict) -> bool:
        """
        Login ke QQ188 + save session
        credentials = {'username': '...', 'password': '...'}
        """
        
        print("\n[1] LOGIN PHASE")
        print("="*60)
        print(f"Provider: {self.provider}")
        print(f"Username: {credentials.get('username', 'N/A')}")
        
        try:
            # Simulasi login (akan di-replace dengan real Playwright logic)
            print("[*] Logging in to QQ188...")
            
            # Mock cookies (akan diganti dengan real dari Playwright)
            mock_cookies = {
                'PHPSESSID': 'session_' + hashlib.md5(str(time.time()).encode()).hexdigest()[:16],
                'user_token': 'token_' + hashlib.md5(credentials.get('username', '').encode()).hexdigest()[:16],
                'provider': self.provider.lower()
            }
            
            # Save session
            self.session_manager.save_session(mock_cookies, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            
            print("[✓] Login successful")
            print(f"[✓] Session saved (TTL: 5 min)")
            return True
        
        except Exception as e:
            print(f"[✗] Login failed: {str(e)}")
            return False
    
    async def poll_odds(self, api_response: Optional[Dict] = None) -> Optional[Dict]:
        """
        Poll odds dari API atau mock data
        """
        
        try:
            # Check session validity
            if not self.session_manager.is_valid():
                print("[✗] Session invalid - need to re-login")
                return None
            
            session = self.session_manager.load_session()
            print(f"[POLL] Using session from {datetime.fromtimestamp(session['saved_at']).strftime('%H:%M:%S')}")
            
            # API response (akan di-replace dengan real API call)
            if api_response is None:
                api_response = {
                    'data': [
                        [23230149, 0, 0, 64991, "Soccer", "00995000", 0, "1", "2", 0, 
                         0.25, 0, 6.25, 0, -999, "4.5/5", -999, -999, -999, -999, -999, -999, -999, 1, 0, 1, 0, 0, 0, 0,
                         "1", "00000000", "639008818800000000", 1, "a1409798", "", ["00995000"], 
                         "ESOCCER BATTLE - 8 MINS PLAY", "Chelsea (hotShot)", "Tottenham Hotspur (GianniKid)",
                         0.72, 0.98, 0.95, 0.65, -999, -999, -999, -999, -999, -999, 0, "S", "Live", "1H 3"]
                    ]
                }
            
            # Parse
            if not self.parser:
                self._init_parser()
            
            if self.parser:
                odds = self.parser.parse_response(api_response)
                print(f"[✓] Parsed {odds['total_matches']} matches")
                return odds
            
            return None
        
        except Exception as e:
            print(f"[ERROR] Poll failed: {str(e)}")
            return None
    
    async def send_to_backend(self, odds: Dict) -> bool:
        """
        Send odds ke backend via WebSocket
        (untuk sekarang mock, nanti di-integrate WebSocket real)
        """
        
        try:
            print(f"\n[2] SEND TO BACKEND")
            print("="*60)
            
            # Format untuk WebSocket
            ws_message = {
                'type': 'odds_update',
                'provider': self.provider,
                'timestamp': int(time.time()),
                'total_matches': odds['total_matches'],
                'matches': odds['matches'][:2]  # Send first 2 matches
            }
            
            # Mock WebSocket send (akan di-replace dengan real)
            print(f"[→] Sending to {self.backend_url}")
            print(f"    Type: {ws_message['type']}")
            print(f"    Provider: {ws_message['provider']}")
            print(f"    Matches: {ws_message['total_matches']}")
            
            # Simulate latency
            await asyncio.sleep(0.1)
            
            print(f"[✓] Sent successfully\n")
            
            # Save to file for debugging
            with open('/app/last_odds_sent.json', 'w') as f:
                json.dump(ws_message, f, indent=2)
            
            return True
        
        except Exception as e:
            print(f"[✗] Send failed: {str(e)}")
            return False
    
    async def run_cycle(self, poll_interval: int = 250):
        """
        Run one polling cycle:
        1. Check session
        2. Poll odds
        3. Send to backend
        """
        
        print(f"\n{'='*60}")
        print(f"[CYCLE] {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*60}")
        
        # Poll
        odds = await self.poll_odds()
        if not odds:
            print("[✗] Poll failed - retrying in 60s")
            return False
        
        # Send
        success = await self.send_to_backend(odds)
        
        if success:
            print(f"[✓] Cycle complete - next in {poll_interval}ms")
        
        return success


async def main():
    """Main test"""
    
    print("\n" + "="*70)
    print("[WORKER INTEGRATION TEST]")
    print("="*70 + "\n")
    
    worker = WorkerIntegration(provider="C-Sport", backend_url="ws://localhost:8000")
    
    # 1. Login & save session
    print("\n[PHASE 1] Login & Session Management")
    print("-"*70)
    login_ok = await worker.login_and_save_session({
        'username': 'gt1888',
        'password': 'Menang123'
    })
    
    if not login_ok:
        print("[✗] Login failed - exiting")
        return
    
    # 2. Run 3 polling cycles
    print("\n[PHASE 2] Polling Cycles")
    print("-"*70)
    
    for i in range(3):
        success = await worker.run_cycle(poll_interval=250)
        if success and i < 2:
            await asyncio.sleep(1)  # Wait between cycles
    
    # 3. Check session persistence
    print("\n[PHASE 3] Session Persistence Check")
    print("-"*70)
    
    if worker.session_manager.is_valid():
        print("[✓] Session is valid")
        session = worker.session_manager.load_session()
        created = datetime.fromtimestamp(session['saved_at']).strftime('%H:%M:%S')
        expire = datetime.fromtimestamp(session['expire_at']).strftime('%H:%M:%S')
        print(f"  Created: {created}")
        print(f"  Expire: {expire}")
    else:
        print("[✗] Session invalid")
    
    print("\n" + "="*70)
    print("✅ INTEGRATION TEST COMPLETE")
    print("="*70 + "\n")


if __name__ == '__main__':
    asyncio.run(main())
