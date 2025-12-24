// src/capture/endpoint-capture.service.js - Auto-capture API and WebSocket endpoints

const logger = require('../config/logger');
const redis = require('../config/redis');

/**
 * Capture REST API and WebSocket endpoints from browser session
 * @param {object} page - Playwright page instance
 * @param {string} whitelabel - Whitelabel identifier (A or B)
 * @param {string} provider - Provider name (e.g., SBOBET, NOVA)
 * @returns {Promise<object>} Captured endpoint profile
 */
async function captureEndpoints(page, whitelabel, provider) {
  logger.info(`Starting endpoint capture for ${whitelabel}:${provider}`);

  const endpoints = {
    rest: {
      public: [],
      private: []
    },
    websocket: {
      public: [],
      private: []
    }
  };

  const capturedData = {
    baseUrl: null,
    headers: {},
    authToken: null,
    wsUrl: null,
    wsSubscribePayload: null
  };

  // Capture HTTP/XHR requests
  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();

    // Only capture API calls (filter out static assets)
    if (
      url.includes('/api/') ||
      url.includes('/v1/') ||
      url.includes('/odds') ||
      url.includes('/match') ||
      url.includes('/bet')
    ) {
      const endpointInfo = {
        url,
        method,
        baseUrl: extractBaseUrl(url),
        headers: sanitizeHeaders(headers),
        timestamp: new Date().toISOString()
      };

      // Capture auth token
      if (headers.authorization) {
        capturedData.authToken = headers.authorization;
      }

      // Categorize as public or private
      const isPublic = url.includes('/public') || url.includes('/odds') || !headers.authorization;
      const category = isPublic ? 'public' : 'private';

      endpoints.rest[category].push(endpointInfo);

      // Capture base URL
      if (!capturedData.baseUrl) {
        capturedData.baseUrl = extractBaseUrl(url);
      }

      logger.debug(`Captured REST ${category} endpoint: ${method} ${url}`);
    }
  });

  // Capture WebSocket connections
  page.on('websocket', (ws) => {
    const wsUrl = ws.url();
    logger.info(`WebSocket connection detected: ${wsUrl}`);

    capturedData.wsUrl = wsUrl;

    // Capture sent frames (subscribe payload)
    ws.on('framesent', (event) => {
      try {
        const payload = event.payload;
        const parsed = JSON.parse(payload.toString());

        if (parsed.type === 'subscribe' || parsed.event === 'subscribe' || parsed.action === 'subscribe') {
          capturedData.wsSubscribePayload = parsed;
          logger.info('Captured WebSocket subscribe payload', { payload: parsed });
        }
      } catch (err) {
        // Ignore non-JSON frames
      }
    });

    // Capture received frames
    ws.on('framereceived', (event) => {
      try {
        const payload = event.payload;
        const parsed = JSON.parse(payload.toString());

        // Detect odds updates or match data
        if (parsed.odds || parsed.match || parsed.event === 'odds_update') {
          endpoints.websocket.private.push({
            url: wsUrl,
            samplePayload: parsed,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        // Ignore non-JSON frames
      }
    });
  });

  // Wait for page to load and capture endpoints
  await page.waitForTimeout(5000);

  // Build endpoint profile
  const profile = {
    whitelabel,
    provider,
    baseUrl: capturedData.baseUrl,
    authToken: capturedData.authToken,
    headers: capturedData.headers,
    endpoints: {
      rest: {
        public: endpoints.rest.public[0] || null,
        private: endpoints.rest.private[0] || null
      },
      websocket: {
        url: capturedData.wsUrl,
        subscribePayload: capturedData.wsSubscribePayload
      }
    },
    capturedAt: new Date().toISOString()
  };

  // Save to Redis
  await saveEndpointProfile(whitelabel, provider, profile);

  logger.info(`Endpoint capture completed for ${whitelabel}:${provider}`, { profile });

  return profile;
}

/**
 * Save endpoint profile to Redis
 * @param {string} whitelabel - Whitelabel identifier
 * @param {string} provider - Provider name
 * @param {object} profile - Endpoint profile
 */
async function saveEndpointProfile(whitelabel, provider, profile) {
  // Save REST endpoints
  if (profile.endpoints.rest.public) {
    const publicKey = `endpoint_profile:${whitelabel}:${provider}:PUBLIC`;
    await redis.set(publicKey, JSON.stringify(profile.endpoints.rest.public), 'EX', 86400);
    logger.info(`Saved PUBLIC endpoint to Redis: ${publicKey}`);
  }

  if (profile.endpoints.rest.private) {
    const privateKey = `endpoint_profile:${whitelabel}:${provider}:PRIVATE`;
    await redis.set(privateKey, JSON.stringify(profile.endpoints.rest.private), 'EX', 86400);
    logger.info(`Saved PRIVATE endpoint to Redis: ${privateKey}`);
  }

  // Save WebSocket endpoint
  if (profile.endpoints.websocket.url) {
    const wsKey = `endpoint_profile:${whitelabel}:${provider}:WEBSOCKET`;
    await redis.set(wsKey, JSON.stringify(profile.endpoints.websocket), 'EX', 86400);
    logger.info(`Saved WEBSOCKET endpoint to Redis: ${wsKey}`);
  }

  // Save complete profile
  const completeKey = `endpoint_profile:${whitelabel}:${provider}:COMPLETE`;
  await redis.set(completeKey, JSON.stringify(profile), 'EX', 86400);
  logger.info(`Saved COMPLETE profile to Redis: ${completeKey}`);
}

/**
 * Extract base URL from full URL
 * @param {string} url - Full URL
 * @returns {string} Base URL
 */
function extractBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (err) {
    return null;
  }
}

/**
 * Sanitize headers (remove sensitive data)
 * @param {object} headers - Request headers
 * @returns {object} Sanitized headers
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };

  // Keep important headers only
  const keepHeaders = [
    'accept',
    'content-type',
    'user-agent',
    'authorization'
  ];

  return Object.keys(sanitized)
    .filter(key => keepHeaders.includes(key.toLowerCase()))
    .reduce((obj, key) => {
      obj[key] = sanitized[key];
      return obj;
    }, {});
}

/**
 * Get endpoint profile from Redis
 * @param {string} whitelabel - Whitelabel identifier
 * @param {string} provider - Provider name
 * @param {string} type - Endpoint type (PUBLIC, PRIVATE, WEBSOCKET, COMPLETE)
 * @returns {Promise<object|null>} Endpoint profile
 */
async function getEndpointProfile(whitelabel, provider, type = 'COMPLETE') {
  const key = `endpoint_profile:${whitelabel}:${provider}:${type}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch (err) {
    logger.error('Failed to parse endpoint profile from Redis', { key, error: err.message });
    return null;
  }
}

/**
 * Validate endpoint profile
 * @param {string} whitelabel - Whitelabel identifier
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>} True if valid
 */
async function validateEndpointProfile(whitelabel, provider) {
  const profile = await getEndpointProfile(whitelabel, provider, 'COMPLETE');

  if (!profile) {
    return false;
  }

  // Check required fields
  const hasBaseUrl = !!profile.baseUrl;
  const hasRestEndpoint = !!profile.endpoints.rest.public || !!profile.endpoints.rest.private;
  const hasWebSocket = !!profile.endpoints.websocket.url;

  return hasBaseUrl && (hasRestEndpoint || hasWebSocket);
}

module.exports = {
  captureEndpoints,
  saveEndpointProfile,
  getEndpointProfile,
  validateEndpointProfile
};
