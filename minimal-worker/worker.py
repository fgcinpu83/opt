import asyncio
import json
import os
import random
import time
from datetime import datetime
from playwright.async_api import async_playwright
import redis.asyncio as aioredis
import requests

API_URL = os.getenv('API_URL', 'http://api:3001')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')
COOLDOWN_SECONDS = 60

# Browser sessions (account_id -> browser context)
sessions = {}

# Cooldown tracking: {cooldown_key: timestamp}
cooldown_state = {}


def send_result(type_name, data):
    """Send result to API backend"""
    try:
        requests.post(f'{API_URL}/api/worker/result', json={'type': type_name, 'data': data}, timeout=5)
    except Exception as e:
        print(f'Error sending result: {e}')


def round_stake(stake):
    """Round stake to nearest 0 or 5"""
    return round(stake / 5) * 5


async def login_worker(job_data):
    """Login to sportsbook site"""
    account_id = job_data['accountId']
    url = job_data['url']
    username = job_data['username']
    password = job_data['password']
    
    print(f'[LOGIN] Account {account_id}: Starting login to {url}')
    
    try:
        async with async_playwright() as p:
            # Launch browser with Cloudflare bypass settings
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            
            # Navigate to login page
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait for Cloudflare challenge (if any)
            await asyncio.sleep(5)
            
            # Mock login (replace with actual selectors)
            # await page.fill('#username', username)
            # await page.fill('#password', password)
            # await page.click('#login-button')
            
            # Simulate successful login
            await asyncio.sleep(2)
            
            # Mock balance
            balance = round(random.uniform(1000, 5000), 2)
            
            # Store session
            sessions[account_id] = {'context': context, 'page': page, 'browser': browser}
            
            print(f'[LOGIN] Account {account_id}: Login successful, balance: {balance}')
            
            send_result('login_success', {
                'accountId': account_id,
                'balance': balance
            })
            
            # Keep session alive
            asyncio.create_task(keep_alive(account_id, page))
            
    except Exception as e:
        print(f'[LOGIN] Account {account_id}: Login failed - {e}')
        send_result('login_failed', {'accountId': account_id, 'error': str(e)})


async def keep_alive(account_id, page):
    """Keep session alive by periodic checks"""
    while account_id in sessions:
        await asyncio.sleep(60)
        try:
            await page.evaluate('() => window.location.href')
            print(f'[KEEP-ALIVE] Account {account_id}: Session active')
        except Exception as e:
            print(f'[KEEP-ALIVE] Account {account_id}: Session lost - {e}')
            sessions.pop(account_id, None)
            break


async def scan_worker(job_data):
    """Scan for betting opportunities"""
    print('[SCAN] Starting scan...')
    
    # Mock scanning results
    matches = [
        {
            'match': 'Team A vs Team B',
            'market': 'FT HDP',
            'odds': 1.95,
            'time': 25,
            'live': True
        },
        {
            'match': 'Team C vs Team D',
            'market': 'FT O/U',
            'odds': 2.05,
            'time': 40,
            'live': True
        }
    ]
    
    # Filter: only positive odds
    positive_odds = [m for m in matches if m['odds'] > 1.0]
    
    print(f'[SCAN] Found {len(positive_odds)} opportunities with positive odds')
    
    send_result('scan_result', {
        'matches': positive_odds,
        'count': len(positive_odds),
        'timestamp': datetime.now().isoformat()
    })


async def execute_bet_pair(redis_client, pair_data):
    """Execute arbitrage bet pair with mandatory rules:
    1. Execute positive EV bet first
    2. Wait for acceptance
    3. Execute hedge bet only if positive bet accepted
    4. Enforce 60s cooldown after successful pair
    """
    arb_id = pair_data['arbId']
    positive_bet = pair_data['positiveBet']
    hedge_bet = pair_data['hedgeBet']
    
    whitelabel = pair_data.get('whitelabel')
    provider = pair_data.get('provider')
    account_id = positive_bet['accountId']
    
    cooldown_key = f"cooldown:{whitelabel}:{provider}:{account_id}"
    
    print(f'[ARB-{arb_id}] Starting arbitrage pair execution')
    print(f'[ARB-{arb_id}] Positive bet: {positive_bet["matchName"]} @ {positive_bet["odds"]}')
    print(f'[ARB-{arb_id}] Hedge bet: {hedge_bet["matchName"]} @ {hedge_bet["odds"]}')
    
    # Check cooldown
    if cooldown_key in cooldown_state:
        remaining = COOLDOWN_SECONDS - (time.time() - cooldown_state[cooldown_key])
        if remaining > 0:
            print(f'[ARB-{arb_id}] ❌ BLOCKED: Cooldown active ({remaining:.1f}s remaining)')
            send_result('arb_blocked', {
                'arbId': arb_id,
                'reason': 'cooldown',
                'remainingSeconds': remaining
            })
            return
    
    # Check session
    if account_id not in sessions:
        print(f'[ARB-{arb_id}] ❌ FAILED: Account {account_id} not logged in')
        send_result('arb_failed', {
            'arbId': arb_id,
            'reason': 'not_logged_in',
            'failedBet': 'positive'
        })
        return
    
    # STEP 1: Execute positive bet first
    print(f'[ARB-{arb_id}] ▶ STEP 1: Executing positive bet (ID: {positive_bet["betId"]})')
    positive_result = await execute_single_bet(positive_bet, account_id)
    
    if not positive_result['success'] or positive_result['status'] == 'rejected':
        print(f'[ARB-{arb_id}] ❌ POSITIVE BET FAILED/REJECTED - ABORTING HEDGE BET')
        print(f'[ARB-{arb_id}] Reason: {positive_result.get("error", "rejected")}')
        
        send_result('arb_failed', {
            'arbId': arb_id,
            'reason': 'positive_bet_rejected',
            'positiveBetResult': positive_result,
            'hedgeBetStatus': 'cancelled'
        })
        return
    
    # STEP 2: Positive bet accepted - proceed with hedge
    print(f'[ARB-{arb_id}] ✅ Positive bet ACCEPTED (ticket: {positive_result["ticketId"]})')
    print(f'[ARB-{arb_id}] ▶ STEP 2: Executing hedge bet (ID: {hedge_bet["betId"]})')
    
    hedge_result = await execute_single_bet(hedge_bet, hedge_bet['accountId'])
    
    if not hedge_result['success'] or hedge_result['status'] == 'rejected':
        print(f'[ARB-{arb_id}] ⚠️ CRITICAL: Hedge bet failed after positive bet accepted!')
        print(f'[ARB-{arb_id}] Positive: {positive_result["ticketId"]} | Hedge: FAILED')
        
        send_result('arb_emergency', {
            'arbId': arb_id,
            'severity': 'critical',
            'positiveBetResult': positive_result,
            'hedgeBetResult': hedge_result,
            'action_required': 'manual_hedge'
        })
        
        # Trigger cooldown anyway
        cooldown_state[cooldown_key] = time.time()
        await persist_cooldown(redis_client, cooldown_key)
        return
    
    # STEP 3: Both bets successful - enforce cooldown
    print(f'[ARB-{arb_id}] ✅ BOTH BETS EXECUTED SUCCESSFULLY')
    print(f'[ARB-{arb_id}] Positive ticket: {positive_result["ticketId"]}')
    print(f'[ARB-{arb_id}] Hedge ticket: {hedge_result["ticketId"]}')
    print(f'[ARB-{arb_id}] 🔒 Enforcing {COOLDOWN_SECONDS}s cooldown on {cooldown_key}')
    
    cooldown_state[cooldown_key] = time.time()
    await persist_cooldown(redis_client, cooldown_key)
    
    send_result('arb_success', {
        'arbId': arb_id,
        'positiveBetResult': positive_result,
        'hedgeBetResult': hedge_result,
        'cooldownKey': cooldown_key,
        'cooldownUntil': time.time() + COOLDOWN_SECONDS
    })


async def execute_single_bet(bet_data, account_id):
    """Execute a single bet and return result with status"""
    bet_id = bet_data['betId']
    match_name = bet_data['matchName']
    market_type = bet_data['marketType']
    odds = bet_data['odds']
    stake = bet_data['stake']
    
    print(f'[BET-{bet_id}] Placing: {match_name} | {market_type} @ {odds} | Stake: {stake}')
    
    if account_id not in sessions:
        return {
            'success': False,
            'betId': bet_id,
            'status': 'error',
            'error': 'Session not found'
        }
    
    try:
        page = sessions[account_id]['page']
        
        # Mock bet execution (replace with actual selectors)
        # await page.click(f'text={match_name}')
        # await page.fill('#stake-input', str(stake))
        # await page.click('#place-bet-button')
        # await page.wait_for_selector('.bet-confirmation')
        
        # Simulate bet placement with 90% success rate
        await asyncio.sleep(random.uniform(1.5, 3.0))
        
        is_accepted = random.random() > 0.1
        
        if is_accepted:
            ticket_id = f"TKT{int(time.time() * 1000)}{random.randint(100, 999)}"
            print(f'[BET-{bet_id}] ✅ ACCEPTED - Ticket: {ticket_id}')
            
            send_result('bet_executed', {
                'betId': bet_id,
                'accountId': account_id,
                'matchName': match_name,
                'stake': stake,
                'odds': odds,
                'ticketId': ticket_id,
                'status': 'accepted'
            })
            
            return {
                'success': True,
                'betId': bet_id,
                'ticketId': ticket_id,
                'status': 'accepted'
            }
        else:
            print(f'[BET-{bet_id}] ❌ REJECTED by bookmaker')
            
            send_result('bet_failed', {
                'betId': bet_id,
                'error': 'Rejected by bookmaker'
            })
            
            return {
                'success': False,
                'betId': bet_id,
                'status': 'rejected',
                'error': 'Rejected by bookmaker'
            }
        
    except Exception as e:
        print(f'[BET-{bet_id}] ❌ ERROR: {e}')
        
        send_result('bet_failed', {
            'betId': bet_id,
            'error': str(e)
        })
        
        return {
            'success': False,
            'betId': bet_id,
            'status': 'error',
            'error': str(e)
        }


async def persist_cooldown(redis_client, cooldown_key):
    """Persist cooldown state to Redis"""
    try:
        await redis_client.setex(
            cooldown_key,
            COOLDOWN_SECONDS,
            str(time.time())
        )
        print(f'[COOLDOWN] Persisted to Redis: {cooldown_key} ({COOLDOWN_SECONDS}s)')
    except Exception as e:
        print(f'[COOLDOWN] Failed to persist to Redis: {e}')


async def load_cooldowns(redis_client):
    """Load active cooldowns from Redis on startup"""
    try:
        cursor = 0
        while True:
            cursor, keys = await redis_client.scan(cursor, match='cooldown:*', count=100)
            for key in keys:
                value = await redis_client.get(key)
                if value:
                    cooldown_state[key] = float(value)
                    print(f'[COOLDOWN] Loaded: {key}')
            if cursor == 0:
                break
        print(f'[COOLDOWN] Loaded {len(cooldown_state)} active cooldowns')
    except Exception as e:
        print(f'[COOLDOWN] Failed to load from Redis: {e}')


async def process_queue():
    """Process jobs from Redis queues"""
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    
    print('[WORKER] Connected to Redis, processing queues...')
    
    # Load existing cooldowns from Redis
    await load_cooldowns(redis_client)
    
    while True:
        try:
            # Check login queue
            login_job = await redis_client.blpop('bull:login:wait', timeout=1)
            if login_job:
                job_data = json.loads(login_job[1])
                await login_worker(job_data.get('data', {}))
            
            # Check scan queue
            scan_job = await redis_client.blpop('bull:scan:wait', timeout=1)
            if scan_job:
                job_data = json.loads(scan_job[1])
                await scan_worker(job_data.get('data', {}))
            
            # Check arbitrage execution queue (bet pairs)
            arb_job = await redis_client.blpop('bull:arb-execute:wait', timeout=1)
            if arb_job:
                job_data = json.loads(arb_job[1])
                await execute_bet_pair(redis_client, job_data.get('data', {}))
            
        except Exception as e:
            print(f'[WORKER] Error processing queue: {e}')
            await asyncio.sleep(1)


if __name__ == '__main__':
    print('[WORKER] Starting minimal worker...')
    asyncio.run(process_queue())
