# Worker Modular Architecture

## Overview
This directory contains the refactored modular Node.js worker for the arbitrage bot system. The worker has been reorganized from a monolithic structure into clean, maintainable modules.

## Directory Structure

```
worker/
├── index.js                    # Main entry point (orchestration only)
├── package.json                # Node.js dependencies
├── config/
│   └── constants.js            # All configuration and constants
├── utils/
│   ├── logger.js               # Centralized logging with timestamps
│   ├── validators.js           # Data validation functions
│   └── formatters.js           # Data formatting and transformation
├── services/
│   ├── browserService.js       # Playwright browser operations
│   ├── proxyService.js         # Proxy rotation and management
│   └── oddsService.js          # Odds fetching and arbitrage calculations
├── sessions/
│   └── sessionManager.js       # Session and authentication management
└── scrapers/
    └── .gitkeep                # Placeholder for future provider scrapers
```

## Module Descriptions

### Entry Point
- **index.js**: Main orchestration file. Imports all modules and runs the main worker loop. No business logic, only coordination.

### Configuration
- **config/constants.js**: All hardcoded values, timeouts, URLs, retry settings, browser options, etc.

### Utilities
- **utils/logger.js**: Centralized logging with timestamps and log levels (debug, info, warn, error)
- **utils/validators.js**: All validation logic for providers, odds, URLs, credentials, sessions, etc.
- **utils/formatters.js**: Data transformation functions (dates, odds, currency, percentages, etc.)

### Services
- **services/browserService.js**: All Playwright operations (launch, navigate, screenshot, selectors, etc.)
- **services/proxyService.js**: Proxy list management, rotation, failure tracking, statistics
- **services/oddsService.js**: Fetch odds from APIs, parse odds, calculate arbitrage opportunities

### Sessions
- **sessions/sessionManager.js**: Manage browser sessions, authentication, login logic, session lifecycle

### Scrapers
- **scrapers/**: Directory for future provider-specific scraping modules (e.g., sboProvider.js)

## Installation

```bash
cd worker
npm install
```

## Configuration

Create a `.env` file in the worker directory:

```env
# API URLs
BOT_URL=http://localhost:3001
ENGINE_URL=http://localhost:3000

# Proxy Configuration
PROXY_LIST=http://proxy1.com:8080,http://proxy2.com:8080
# Or single proxy with auth
PROXY_SERVER=http://proxy.example.com:8080
PROXY_USERNAME=user
PROXY_PASSWORD=pass

# Worker Settings
WORKER_ID=worker-1
```

## Usage

### Start Worker
```bash
npm start
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Run with Custom Environment
```bash
NODE_ENV=production npm start
```

## Adding a New Provider Scraper

1. Create a new file in `scrapers/` directory (e.g., `sboProvider.js`)
2. Export scraping functions for that provider
3. Import and use in `index.js`

Example:
```javascript
// scrapers/sboProvider.js
const browserService = require('../services/browserService');
const logger = require('../utils/logger');

async function scrapeSBO(page) {
  logger.info('Scraping SBO odds...');
  // Scraping logic here
}

module.exports = { scrapeSBO };
```

## Key Features

### Modular Architecture
- Each module has a single responsibility
- Easy to test and maintain
- Clear separation of concerns

### Centralized Configuration
- All constants in one place
- Easy to modify timeouts and settings
- Environment-based configuration

### Robust Error Handling
- Comprehensive logging at all levels
- Validation before operations
- Graceful degradation

### Session Management
- Automatic session creation and cleanup
- Session reuse for efficiency
- Inactive session cleanup

### Proxy Support
- Automatic proxy rotation
- Failure tracking
- Performance statistics

### Arbitrage Detection
- 2-way and 3-way arbitrage calculations
- Odds comparison across providers
- Profit percentage calculations

## Future Enhancements

1. **Provider Scrapers**: Add specific scrapers for each bookmaker in `scrapers/`
2. **Redis Integration**: Queue-based job processing
3. **WebSocket Support**: Real-time communication with engine
4. **Metrics**: Performance and success rate tracking
5. **Testing**: Unit and integration tests
6. **Docker**: Containerization for easy deployment

## Migration Notes

This refactor maintains the same functionality as the original worker but with better organization:
- **No business logic changes**: Same behavior, better code structure
- **All modules use `module.exports`**: Standard Node.js pattern
- **Relative imports**: Uses `require('./utils/logger')` etc.
- **Backward compatible**: Can run alongside existing Python worker

## Troubleshooting

### Module Not Found
- Verify file paths are correct (must be relative from index.js)
- Check all `require()` statements

### Undefined Variables
- Likely missing imports
- Check that all dependencies are imported at the top of files

### Browser Launch Fails
- Ensure Playwright is installed: `npx playwright install`
- Check proxy configuration if using proxies

## Support

For issues or questions, refer to the main project documentation or create an issue in the repository.
