import asyncio
import json
import time
import os
from typing import Dict, Optional
from datetime import datetime, timedelta
import sys

sys.path.append('/app')

try:
    from csport_parser_final_fixed import CSportOddsParser
except:
    CSportOddsParser = None

try:
    import websockets
except:
    websockets = None


class SessionManager:
    """Manage login session"""
    
    def __init__(self, session_file: str = '/app/session_backup.json'):
        self.session_file = session_file
        self.memory_session = {}
        self.session_ttl = 300
    
    def save_session(self, cookies: Dict):
        self.memory_session = {
            'cookies': cookies,
            'saved_at': time.time(),
            'expire_at': time.time() + self.session_ttl
        }
        
        try:
            backup = {
                'cookies': cookies,
                'saved_at': datetime.now().isoformat(),
                'expire_at': (datetime.now() + timedelta(seconds=self.session_ttl)).isoformat()
            }
            with open(self.session_file, 'w') as f:
                json.dump(backup, f, indent=2)
        except:
            pass
    
    def load_session(self) -> Optional[Dict]:
        if self.memory_session:
            if time.time() < self.memory_session.get('expire_at', 0):
                return self.memory_session
        
        try:
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r') as f:
                    backup = json.load(f)
                expire_at = datetime.fromisoformat(backup['expire_at']).timestamp()
                if time.time() < expire_at:
                    self.memory_session = {
                        'cookies': backup['cookies'],
                        'saved_at': time.time(),
                        'expire_at': expire_at
                    }
                    return self.memory_session
        except:
            pass
        
        return None
    
    def is_valid(self) -> bool:
        return self.load_session() is not None


class WorkerWebSocket:
    """Worker dengan WebSocket + Mock fallback"""
    
    def __init__(self, provider: str = "C-Sport", backend_url: str = "ws://localhost:8000/ws"):
        self.provider = provider
        self.backend_url = backend_url
        self.session_manager = SessionManager()
        self.parser = None
        self.ws = None
        self.connected = False
        self.msg_count = 0
        self.mode = "mock"  # websocket atau mock
        
        self._init_parser()
    
    def _init_parser(self):
        try:
            from csport_parser_final_fixed import CSportOddsParser
            self.parser = CSportOddsParser()
            print("[✓] Parser loaded")
        except Exception as e:
            print(f"[!] Parser load failed: {str(e)}")
    
    async def connect_websocket(self) -> bool:
        """Connect ke backend WebSocket"""
        if not websockets:
            print("[!] websockets module not available - using mock mode")
            return False
        
        try:
            print(f"[🔗] Connecting to {self.backend_url}...")
            self.ws = await websockets.connect(self.backend_url, ping_interval=None)
            self.connected = True
            self.mode = "websocket"
            print(f"[✓] WebSocket connected")
            return True
        except Exception as e:
            print(f"[!] WebSocket failed: {str(e)}")
            print(f"[!] Fallback to mock mode (save to file)")
            self.connected = False
            self.mode = "mock"
            return False
    
    async def disconnect_websocket(self):
        if self.ws:
            try:
                await self.ws.close()
                self.connected = False
            except:
                pass
    
    async def send_message(self, message: Dict) -> bool:
        """Send message ke backend atau save to file"""
        
        try:
            if self.mode == "websocket" and self.connected and self.ws:
                # Send via WebSocket
                await self.ws.send(json.dumps(message))
            else:
                # Mock: save to file
                timestamp = int(time.time() * 1000)
                filename = f'/app/odds_sent_{self.provider.lower()}_{timestamp}.json'
                with open(filename, 'w') as f:
                    json.dump(message, f, indent=2)
            
            self.msg_count += 1
            print(f"[{self.msg_count:02d}] [{self.mode.upper()}] Sent {message['total_matches']} matches")
            return True
        
        except Exception as e:
            print(f"[✗] Send failed: {str(e)}")
            return False
    
    async def login_and_save_session(self, credentials: Dict) -> bool:
        try:
            import hashlib
            mock_cookies = {
                'PHPSESSID': 'session_' + hashlib.md5(str(time.time()).encode()).hexdigest()[:16],
                'user_token': 'token_' + hashlib.md5(credentials.get('username', '').encode()).hexdigest()[:16],
            }
            self.session_manager.save_session(mock_cookies)
            return True
        except Exception as e:
            print(f"[✗] Login failed: {str(e)}")
            return False
    
    async def poll_and_send(self) -> bool:
        """Poll odds dan send"""
        
        if not self.session_manager.is_valid():
            print("[✗] Session invalid - need re-login")
            return False
        
        try:
            # Mock API response (real: akan dari API C-Sport)
            api_response = {
                'data': [
                    [23230149, 0, 0, 64991, "Soccer", "00995000", 0, "1", "2", 0, 
                     0.25, 0, 6.25, 0, -999, "4.5/5", -999, -999, -999, -999, -999, -999, -999, 1, 0, 1, 0, 0, 0, 0,
                     "1", "00000000", "639008818800000000", 1, "a1409798", "", ["00995000"], 
                     "ESOCCER BATTLE - 8 MINS PLAY", "Chelsea (hotShot)", "Tottenham Hotspur (GianniKid)",
                     0.72, 0.98, 0.95, 0.65, -999, -999, -999, -999, -999, -999, 0, "S", "Live", "1H 3"],
                    [23230014, 0, 0, 155529, "Soccer", "00998000", 0, "0", "0", 0, 
                     0.25, 0, 3.75, 0, -999, "4.5/5", -999, -999, -999, -999, -999, -999, -999, 1, 0, 1, 0, 0, 0, 0,
                     "1", "00000000", "639008820000000000", 1, "e232c9dc", "", ["00998000"], 
                     "ESOCCER GT LEAGUES - 12 MINS PLAY", "Galatasaray (Professor)", "Sporting Lisbon (Jetli)",
                     0.82, 0.88, 0.95, 0.65, -999, -999, -999, -999, 0.95, 0.95, 0, "S", "Live", "1H 1"]
                ]
            }
            
            # Parse
            if self.parser:
                odds = self.parser.parse_response(api_response)
                
                # Build message
                message = {
                    'type': 'odds_update',
                    'provider': self.provider,
                    'ping': 18,
                    'healthy': True,
                    'timestamp': int(time.time()),
                    'total_matches': odds['total_matches'],
                    'matches': odds['matches']
                }
                
                return await self.send_message(message)
        
        except Exception as e:
            print(f"[✗] Poll/send failed: {str(e)}")
            return False
    
    async def run(self, duration: int = 10, poll_interval: float = 2.5):
        """Run worker"""
        
        print("\n[PHASE 1] Login")
        print("-"*60)
        await self.login_and_save_session({'username': 'gt1888'})
        print("[✓] Session saved (TTL: 5 min)")
        
        print("\n[PHASE 2] Connect Backend")
        print("-"*60)
        await self.connect_websocket()
        
        print(f"\n[PHASE 3] Polling (Mode: {self.mode.upper()})")
        print("-"*60)
        
        start_time = time.time()
        cycles = 0
        
        while time.time() - start_time < duration:
            cycles += 1
            print(f"\n[Cycle {cycles}] {datetime.now().strftime('%H:%M:%S')}")
            await self.poll_and_send()
            await asyncio.sleep(poll_interval)
        
        await self.disconnect_websocket()
        
        print(f"\n[SUMMARY]")
        print("-"*60)
        print(f"Mode: {self.mode.upper()}")
        print(f"Cycles: {cycles}")
        print(f"Messages sent: {self.msg_count}")
        print(f"Session valid: {self.session_manager.is_valid()}")


async def main():
    print("\n" + "="*70)
    print("[WORKER WEBSOCKET V2 - WITH MOCK FALLBACK]")
    print("="*70)
    
    worker = WorkerWebSocket(
        provider="C-Sport",
        backend_url="ws://localhost:8000/ws"
    )
    
    await worker.run(duration=15, poll_interval=2.5)
    
    print("\n" + "="*70)
    print("✅ TEST COMPLETE")
    print("="*70 + "\n")


if __name__ == '__main__':
    asyncio.run(main())
