"""
Base handler class for job execution
"""

import logging
from typing import Dict, Any
from abc import ABC, abstractmethod
from playwright.sync_api import BrowserContext

logger = logging.getLogger(__name__)


class BaseHandler(ABC):
    """
    Abstract base class for job handlers
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    def execute(self, payload: Dict[str, Any], context: BrowserContext) -> Dict[str, Any]:
        """
        Execute the job
        
        Args:
            payload: Job payload data
            context: Playwright browser context
        
        Returns:
            Dictionary with 'success' boolean and result data
        """
        pass
    
    def validate_payload(self, payload: Dict[str, Any], required_fields: list) -> bool:
        """
        Validate that required fields are present in payload
        
        Args:
            payload: Job payload
            required_fields: List of required field names
        
        Returns:
            True if valid, raises ValueError if not
        """
        missing = [field for field in required_fields if field not in payload]
        
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        return True
    
    def log_execution(self, job_type: str, payload: Dict[str, Any]):
        """Log job execution start"""
        self.logger.info(f"Executing {job_type} job with payload: {payload}")
    
    def log_success(self, result: Dict[str, Any]):
        """Log successful execution"""
        self.logger.info(f"Job completed successfully: {result}")
    
    def log_error(self, error: Exception):
        """Log execution error"""
        self.logger.error(f"Job execution failed: {error}", exc_info=True)
