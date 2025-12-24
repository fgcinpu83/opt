// src/services/endpoint-capture.service.js - Auto-capture API & WebSocket endpoints
const logger = require('../config/logger');
const redis = require('../config/redis');

/**
 * Capture REST API and WebSocket endpoints from Playwright browser session
 * @param {Page} page - Playwright page instance
 * @param {Object} options - Capture options
 * @returns {Promise<Object>} Captured endpoint profile
 */
async function captureEndpoints(page, options = {}) {
  const {
    whitelabel,
    provider,
    timeout = 30000
  } = options;

  logger.info('Starting endpoint capture', { whitelabel, provider });

  const capturedData = {
    rest_api: {
      base_url: null,
      headers: {},
      auth_token: null,
      endpoints: []
    },
    websocket: {
      url: null,
      protocols: [],
      subscribe_payload: null,
      headers: {}
    }
  };

  const capturedRequests = new Set();
  const capturedWebSockets = new Set();

  // Capture REST API requests
  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    
    // Filter relevant API requests (skip static assets)
    if (method !== 'GET' && method !== 'POST') return;
    if (url.includes('.js') || url.includes('.css') || url.includes('.png')) return;
    
    // Capture API endpoints
    if (url.includes('/api/') || url.includes('/v1/') || url.includes('/bet/')) {
      try {
        const headers = request.headers();
        const urlObj = new URL(url);
        
        // Extract base URL
        if (!capturedData.rest_api.base_url) {
          capturedData.rest_api.base_url = `${urlObj.protocol}//${urlObj.host}`;
        }

        // Extract auth token from headers
        if (headers['authorization'] && !capturedData.rest_api.auth_token) {
          capturedData.rest_api.auth_token = headers['authorization'];
        }
        if (headers['x-auth-token'] && !capturedData.rest_api.auth_token) {
          capturedData.rest_api.auth_token = headers['x-auth-token'];
        }

        // Store important headers
        ['authorization', 'x-auth-token', 'cookie', 'user-agent'].forEach(key => {
          if (headers[key] && !capturedData.rest_api.headers[key]) {
            capturedData.rest_api.headers[key] = headers[key];
          }
        });

        // Store endpoint
        const endpoint = {
          method,
          path: urlObj.pathname,
          query: urlObj.search,
          timestamp: new Date().toISOString()
        };

        const endpointKey = `${method}:${urlObj.pathname}`;
        if (!capturedRequests.has(endpointKey)) {
          capturedData.rest_api.endpoints.push(endpoint);
          capturedRequests.add(endpointKey);
          logger.debug('Captured REST endpoint', endpoint);
        }
      } catch (error) {
        logger.error('Error capturing request', { error: error.message, url });
      }
    }
  });

  // Capture WebSocket connections
  page.on('websocket', (ws) => {
    const url = ws.url();
    
    if (!capturedWebSockets.has(url)) {
      logger.info('WebSocket connection detected', { url });
      
      capturedData.websocket.url = url;
      capturedWebSockets.add(url);

      // Capture sent frames (subscribe payload)
      ws.on('framesent', (frame) => {
        try {
          const payload = frame.payload;
          if (payload && !capturedData.websocket.subscribe_payload) {
            capturedData.websocket.subscribe_payload = payload.toString();
            logger.debug('Captured WebSocket subscribe payload', { payload: payload.toString() });
          }
        } catch (error) {
          logger.error('Error capturing WebSocket frame', { error: error.message });
        }
      });

      // Capture received frames for protocol analysis
      ws.on('framereceived', (frame) => {
        try {
          // Just log for debugging
          logger.debug('WebSocket frame received', { size: frame.payload?.length });
        } catch (error) {
          logger.error('Error processing WebSocket frame', { error: error.message });
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket closed', { url });
      });
    }
  });

  // Wait for network activity to settle
  logger.info('Waiting for network activity to capture endpoints...');
  
  // Wait for initial page load and network stabilization
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    logger.warn('Network idle timeout, proceeding with captured data');
  });

  // Give additional time for WebSocket connections
  await page.waitForTimeout(5000);

  logger.info('Endpoint capture complete', {
    rest_endpoints: capturedData.rest_api.endpoints.length,
    has_websocket: !!capturedData.websocket.url,
    base_url: capturedData.rest_api.base_url
  });

  return capturedData;
}

/**
 * Save captured endpoints to Redis
 * @param {string} whitelabel - Whitelabel identifier
 * @param {string} provider - Provider name
 * @param {string} type - PUBLIC or PRIVATE
 * @param {Object} endpointData - Captured endpoint data
 */
async function saveEndpointProfile(whitelabel, provider, type, endpointData) {
  const key = `endpoint_profile:${whitelabel}:${provider}:${type}`;
  
  try {
    const profile = {
      whitelabel,
      provider,
      type,
      ...endpointData,
      captured_at: new Date().toISOString(),
      version: '1.0'
    };

    await redis.set(key, JSON.stringify(profile), 'EX', 86400 * 7); // 7 days expiry
    logger.info('Endpoint profile saved to Redis', { key });
    
    return profile;
  } catch (error) {
    logger.error('Failed to save endpoint profile', { error: error.message, key });
    throw error;
  }
}

/**
 * Load endpoint profile from Redis
 * @param {string} whitelabel - Whitelabel identifier
 * @param {string} provider - Provider name
 * @param {string} type - PUBLIC or PRIVATE
 * @returns {Promise<Object|null>} Endpoint profile or null
 */
async function loadEndpointProfile(whitelabel, provider, type) {
  const key = `endpoint_profile:${whitelabel}:${provider}:${type}`;
  
  try {
    const data = await redis.get(key);
    if (!data) {
      logger.warn('Endpoint profile not found', { key });
      return null;
    }

    const profile = JSON.parse(data);
    logger.info('Endpoint profile loaded from Redis', { key });
    
    return profile;
  } catch (error) {
    logger.error('Failed to load endpoint profile', { error: error.message, key });
    return null;
  }
}

/**
 * Validate endpoint profile
 * @param {Object} profile - Endpoint profile to validate
 * @returns {boolean} True if valid
 */
function validateEndpointProfile(profile) {
  if (!profile) return false;

  const hasRestApi = profile.rest_api?.base_url && profile.rest_api?.auth_token;
  const hasWebSocket = profile.websocket?.url;

  if (!hasRestApi && !hasWebSocket) {
    logger.error('Invalid endpoint profile: missing both REST API and WebSocket');
    return false;
  }

  logger.info('Endpoint profile validation result', {
    has_rest_api: hasRestApi,
    has_websocket: hasWebSocket,
    valid: true
  });

  return true;
}

module.exports = {
  captureEndpoints,
  saveEndpointProfile,
  loadEndpointProfile,
  validateEndpointProfile
};
