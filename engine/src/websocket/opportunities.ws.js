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
    return; // No clients connected
  }

  const message = JSON.stringify({
    type: 'opportunity',
    data: opportunity,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let failCount = 0;

  // Broadcast to all connected clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        logger.error('Error sending to WebSocket client:', error);
        failCount++;
        // Remove dead clients
        clients.delete(client);
      }
    } else {
      // Remove clients that are not open
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
