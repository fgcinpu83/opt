// src/websocket/opportunities.ws.js - WebSocket server for live arbitrage opportunities
const WebSocket = require('ws');
const logger = require('../config/logger');

let wss = null;
let clients = new Set();

/**
 * Initialize WebSocket server for opportunities
 * @param {http.Server} server - HTTP server instance
 */
function initializeWebSocket(server) {
  // Create WebSocket server on /ws/opportunities path
  wss = new WebSocket.Server({ 
    server,
    path: '/ws/opportunities'
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info(`WebSocket client connected from ${clientIp}`);
    
    // Add client to the set
    clients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to arbitrage opportunities feed',
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.debug('WebSocket message received:', data);
        
        // Handle ping/pong for keep-alive
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        logger.error('WebSocket message parse error:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      logger.info(`WebSocket client disconnected from ${clientIp}`);
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  logger.info('WebSocket server initialized on path /ws/opportunities');
  
  return wss;
}

/**
 * Broadcast opportunity to all connected clients
 * @param {Object} opportunity - The arbitrage opportunity to broadcast
 */
function broadcastOpportunity(opportunity) {
  if (!wss || clients.size === 0) {
    return;
  }

  const payload = transformOpportunity(opportunity);
  const message = JSON.stringify({
    type: 'opportunity',
    data: payload,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let failCount = 0;

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        logger.error('Error sending to WebSocket client:', error);
        failCount++;
        clients.delete(client);
      }
    } else {
      clients.delete(client);
    }
  });

  if (successCount > 0) {
    logger.debug(`Broadcasted opportunity to ${successCount} clients`);
  }
  if (failCount > 0) {
    logger.warn(`Failed to broadcast to ${failCount} clients`);
  }
}

/**
 * Transform opportunity to match-based payload with normalized odds and rounded stakes
 * @param {Object} opportunity - Raw opportunity data
 * @returns {Object} Transformed payload
 */
function transformOpportunity(opportunity) {
  const { bet1, bet2, profit, roi } = opportunity;

  // CRITICAL: Stake rounding - last digit MUST be 0 or 5
  const roundStake = (raw) => {
    const rounded = Math.round(raw);
    const lastDigit = rounded % 10;
    
    // If last digit is 1-4, round down to 0
    if (lastDigit >= 1 && lastDigit <= 4) {
      return rounded - lastDigit;
    }
    // If last digit is 6-9, round up to next 5 or 10
    if (lastDigit >= 6 && lastDigit <= 9) {
      return rounded + (10 - lastDigit);
    }
    // Last digit is already 0 or 5
    return rounded;
  };

  // Normalize odds to Hongkong format (decimal - 1)
  const normalizeOdds = (decimalOdds) => {
    const decimal = parseFloat(decimalOdds);
    return {
      decimal: decimal,
      hk_odds: parseFloat((decimal - 1).toFixed(2)) // Hongkong odds
    };
  };

  return {
    match_id: bet1.match_id,
    sport: bet1.sport || 'unknown',
    league: bet1.league || 'unknown',
    home_team: bet1.home_team,
    away_team: bet1.away_team,
    match_time: bet1.match_time,
    bet1: {
      bookmaker: bet1.bookmaker,
      market: bet1.market,
      selection: bet1.selection,
      odds: normalizeOdds(bet1.odds),
      stake: {
        raw: bet1.stake,
        rounded: roundStake(bet1.stake)
      }
    },
    bet2: {
      bookmaker: bet2.bookmaker,
      market: bet2.market,
      selection: bet2.selection,
      odds: normalizeOdds(bet2.odds),
      stake: {
        raw: bet2.stake,
        rounded: roundStake(bet2.stake)
      }
    },
    profit: parseFloat(profit.toFixed(2)),
    roi: parseFloat(roi.toFixed(2))
  };
}

/**
 * Broadcast multiple opportunities
 * @param {Array} opportunities - Array of opportunities
 */
function broadcastOpportunities(opportunities) {
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return;
  }

  opportunities.forEach(opportunity => {
    broadcastOpportunity(opportunity);
  });
}

/**
 * Get connected clients count
 * @returns {number}
 */
function getClientsCount() {
  return clients.size;
}

/**
 * Close WebSocket server
 */
function closeWebSocket() {
  if (wss) {
    logger.info('Closing WebSocket server...');
    
    // Close all client connections
    clients.forEach((client) => {
      try {
        client.close(1000, 'Server shutting down');
      } catch (error) {
        logger.error('Error closing client connection:', error);
      }
    });
    
    clients.clear();
    
    // Close the WebSocket server
    wss.close(() => {
      logger.info('WebSocket server closed');
    });
    
    wss = null;
  }
}

module.exports = {
  initializeWebSocket,
  broadcastOpportunity,
  broadcastOpportunities,
  getClientsCount,
  closeWebSocket
};
