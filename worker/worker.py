#!/usr/bin/env python3
"""
Worker Bot - Arbitrage Bot System
Consumes jobs from Redis queue and executes them using Playwright
"""

import os
import sys
import time
import json
import logging
import signal
import uuid
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import redis
import websocket
from playwright.sync_api import sync_playwright, Browser, BrowserContext

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/worker.log')
    ]
)
logger = logging.getLogger(__name__)


class WorkerBot:
    """
    Main worker bot class that consumes and executes jobs
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.worker_id = config.get('worker_id', str(uuid.uuid4()))
        self.engine_url = config.get('engine_url')
        self.engine_ws_url = config.get('engine_ws_url')
        self.redis_url = config.get('redis_url')
        self.proxy_config = config.get('proxy', {})
        
        self.redis_client: Optional[redis.Redis] = None
        self.ws_client: Optional[websocket.WebSocket] = None
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.is_running = True
        
        logger.info(f"Worker initialized: {self.worker_id}")
    
    def start(self):
        """Start the worker bot"""
        logger.info(f"Starting worker {self.worker_id}")
        
        try:
            # Connect to Redis
            self._connect_redis()
            
            # Connect to Engine via WebSocket
            self._connect_engine()
            
            # Initialize browser
            self._init_browser()
            
            # Start consuming jobs
            self._consume_jobs()
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            self.shutdown()
        except Exception as e:
            logger.error(f"Worker startup failed: {e}", exc_info=True)
            self.shutdown()
            sys.exit(1)
    
    def _connect_redis(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            raise
    
    def _connect_engine(self):
        """Connect to Engine via WebSocket"""
        try:
            logger.info(f"Connecting to engine: {self.engine_ws_url}")
            
            # For now, just log - WebSocket will be implemented in Phase 2
            logger.info("WebSocket connection (stub) - to be implemented")
            
            # TODO: Implement WebSocket connection
            # self.ws_client = websocket.create_connection(self.engine_ws_url)
            # self._register_worker()
            
        except Exception as e:
            logger.warning(f"WebSocket connection failed (expected in Phase 1): {e}")
    
    def _register_worker(self):
        """Register worker with engine"""
        registration_msg = {
            'type': 'worker:register',
            'worker_id': self.worker_id,
            'proxy_info': self.proxy_config,
            'capabilities': ['test', 'place_bet', 'check_odds']
        }
        
        logger.info(f"Worker registration message: {registration_msg}")
        # TODO: Send via WebSocket when implemented
    
    def _init_browser(self):
        """Initialize Playwright browser"""
        try:
            logger.info("Initializing Playwright browser...")
            
            self.playwright = sync_playwright().start()
            
            # Browser launch options
            browser_args = {
                'headless': True,
                'args': [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu'
                ]
            }
            
            # Add proxy if configured
            if self.proxy_config.get('server'):
                browser_args['proxy'] = {
                    'server': self.proxy_config['server'],
                    'username': self.proxy_config.get('username'),
                    'password': self.proxy_config.get('password')
                }
            
            self.browser = self.playwright.chromium.launch(**browser_args)
            
            # Create browser context
            self.context = self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                locale='id-ID',
                timezone_id='Asia/Jakarta'
            )
            
            logger.info("Browser initialized successfully")
            
        except Exception as e:
            logger.error(f"Browser initialization failed: {e}")
            raise
    
    def _consume_jobs(self):
        """Main job consumption loop"""
        logger.info("Starting job consumption loop...")
        
        while self.is_running:
            try:
                # Blocking pop from Redis queue (5 second timeout)
                job_data = self.redis_client.blpop('jobs:queue', timeout=5)
                
                if job_data is None:
                    # No job available, continue
                    continue
                
                # Parse job data
                _, job_json = job_data
                job = json.loads(job_json)
                
                logger.info(f"Received job: {job.get('job_id')} type={job.get('type')}")
                
                # Execute job
                result = self._execute_job(job)
                
                # Report result
                self._report_result(job.get('job_id'), result)
                
            except Exception as e:
                logger.error(f"Job consumption error: {e}", exc_info=True)
                time.sleep(1)  # Brief pause before retry
    
    def _execute_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a job"""
        job_type = job.get('type')
        job_id = job.get('job_id')
        payload = job.get('payload', {})
        
        logger.info(f"Executing job {job_id} of type {job_type}")
        
        try:
            # Route to appropriate handler
            if job_type == 'test':
                return self._handle_test_job(payload)
            elif job_type == 'place_bet':
                return self._handle_place_bet(payload)
            elif job_type == 'check_odds':
                return self._handle_check_odds(payload)
            else:
                return {
                    'success': False,
                    'error': f'Unknown job type: {job_type}'
                }
        
        except Exception as e:
            logger.error(f"Job execution failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_test_job(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle test job"""
        logger.info(f"Test job payload: {payload}")
        
        # Simple test: open a page and take screenshot
        try:
            page = self.context.new_page()
            page.goto('https://example.com')
            page.wait_for_load_state('networkidle')
            
            screenshot_path = f'screenshots/test_{int(time.time())}.png'
            os.makedirs('screenshots', exist_ok=True)
            page.screenshot(path=screenshot_path)
            
            page.close()
            
            return {
                'success': True,
                'message': 'Test job completed',
                'screenshot': screenshot_path,
                'timestamp': time.time()
            }
        except Exception as e:
            logger.error(f"Test job failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_place_bet(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle place bet job (stub)"""
        logger.info(f"Place bet job (stub): {payload}")
        
        # TODO: Implement actual bet placement logic
        # This is a placeholder for Phase 3
        
        return {
            'success': True,
            'message': 'Bet placement (stub - not implemented)',
            'payload': payload,
            'note': 'Full implementation pending in Phase 3'
        }
    
    def _handle_check_odds(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle check odds job (stub)"""
        logger.info(f"Check odds job (stub): {payload}")
        
        # TODO: Implement actual odds checking logic
        # This is a placeholder for Phase 3
        
        return {
            'success': True,
            'message': 'Odds checking (stub - not implemented)',
            'payload': payload,
            'note': 'Full implementation pending in Phase 3'
        }
    
    def _report_result(self, job_id: str, result: Dict[str, Any]):
        """Report job result back to engine"""
        logger.info(f"Job {job_id} result: {result.get('success')}")
        
        # TODO: Send result via WebSocket or HTTP callback
        # For now, just log
        logger.info(f"Result for job {job_id}: {json.dumps(result, indent=2)}")
    
    def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down worker...")
        
        self.is_running = False
        
        # Close browser
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        
        # Close connections
        if self.redis_client:
            self.redis_client.close()
        if self.ws_client:
            self.ws_client.close()
        
        logger.info("Worker shutdown complete")


def load_config() -> Dict[str, Any]:
    """Load configuration from environment"""
    load_dotenv()
    
    return {
        'worker_id': os.getenv('WORKER_ID', str(uuid.uuid4())),
        'engine_url': os.getenv('ENGINE_URL', 'http://localhost:3000'),
        'engine_ws_url': os.getenv('ENGINE_WS_URL', 'ws://localhost:3001/ws'),
        'redis_url': os.getenv('REDIS_URL', 'redis://localhost:6379'),
        'proxy': {
            'server': os.getenv('PROXY_SERVER'),
            'username': os.getenv('PROXY_USERNAME'),
            'password': os.getenv('PROXY_PASSWORD')
        }
    }


def main():
    """Main entry point"""
    print("=" * 60)
    print("Arbitrage Bot System - Worker")
    print("=" * 60)
    print()
    
    # Load configuration
    config = load_config()
    
    # Create worker
    worker = WorkerBot(config)
    
    # Setup signal handlers
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}")
        worker.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start worker
    worker.start()


if __name__ == '__main__':
    main()
