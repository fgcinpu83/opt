/**
 * Browser Service
 * Handles all Playwright browser operations
 */

const { chromium } = require('playwright');
const logger = require('../utils/logger');
const { BROWSER_OPTIONS, CONTEXT_OPTIONS, TIMEOUTS } = require('../config/constants');

const browserService = {
  /**
   * Launch a new browser instance
   * @param {Object} proxyConfig - Optional proxy configuration
   * @returns {Promise<Browser>} Browser instance
   */
  async launchBrowser(proxyConfig = null) {
    try {
      logger.info('Launching browser...');
      
      const launchOptions = { ...BROWSER_OPTIONS };
      
      // Add proxy if provided
      if (proxyConfig && proxyConfig.server) {
        launchOptions.proxy = {
          server: proxyConfig.server,
          username: proxyConfig.username,
          password: proxyConfig.password,
        };
        logger.info(`Browser launching with proxy: ${proxyConfig.server}`);
      }
      
      const browser = await chromium.launch(launchOptions);
      logger.info('Browser launched successfully');
      
      return browser;
    } catch (error) {
      logger.error('Failed to launch browser', error);
      throw error;
    }
  },

  /**
   * Create a new browser context
   * @param {Browser} browser - Browser instance
   * @param {Object} options - Optional context options
   * @returns {Promise<BrowserContext>} Browser context
   */
  async createContext(browser, options = {}) {
    try {
      logger.debug('Creating browser context...');
      
      const contextOptions = { ...CONTEXT_OPTIONS, ...options };
      const context = await browser.newContext(contextOptions);
      
      logger.debug('Browser context created');
      return context;
    } catch (error) {
      logger.error('Failed to create browser context', error);
      throw error;
    }
  },

  /**
   * Create a new page in the browser context
   * @param {BrowserContext} context - Browser context
   * @returns {Promise<Page>} New page instance
   */
  async createPage(context) {
    try {
      logger.debug('Creating new page...');
      const page = await context.newPage();
      logger.debug('New page created');
      return page;
    } catch (error) {
      logger.error('Failed to create page', error);
      throw error;
    }
  },

  /**
   * Navigate to a URL
   * @param {Page} page - Page instance
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Promise<Response>} Response object
   */
  async goto(page, url, options = {}) {
    try {
      logger.info(`Navigating to: ${url}`);
      
      const gotoOptions = {
        waitUntil: 'networkidle',
        timeout: TIMEOUTS.NAVIGATION,
        ...options,
      };
      
      const response = await page.goto(url, gotoOptions);
      logger.info(`Navigation completed: ${url}`);
      
      return response;
    } catch (error) {
      logger.error(`Navigation failed: ${url}`, error);
      throw error;
    }
  },

  /**
   * Take a screenshot of the page
   * @param {Page} page - Page instance
   * @param {string} filename - Screenshot filename/path
   * @param {Object} options - Screenshot options
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async screenshot(page, filename, options = {}) {
    try {
      logger.debug(`Taking screenshot: ${filename}`);
      
      const screenshotOptions = {
        path: filename,
        fullPage: false,
        timeout: TIMEOUTS.SCREENSHOT,
        ...options,
      };
      
      const buffer = await page.screenshot(screenshotOptions);
      logger.debug(`Screenshot saved: ${filename}`);
      
      return buffer;
    } catch (error) {
      logger.error(`Screenshot failed: ${filename}`, error);
      throw error;
    }
  },

  /**
   * Wait for a selector to appear
   * @param {Page} page - Page instance
   * @param {string} selector - CSS selector
   * @param {Object} options - Wait options
   * @returns {Promise<ElementHandle>} Element handle
   */
  async waitForSelector(page, selector, options = {}) {
    try {
      logger.debug(`Waiting for selector: ${selector}`);
      
      const waitOptions = {
        timeout: TIMEOUTS.DEFAULT,
        ...options,
      };
      
      const element = await page.waitForSelector(selector, waitOptions);
      logger.debug(`Selector found: ${selector}`);
      
      return element;
    } catch (error) {
      logger.error(`Selector wait failed: ${selector}`, error);
      throw error;
    }
  },

  /**
   * Click an element
   * @param {Page} page - Page instance
   * @param {string} selector - CSS selector
   * @param {Object} options - Click options
   * @returns {Promise<void>}
   */
  async click(page, selector, options = {}) {
    try {
      logger.debug(`Clicking element: ${selector}`);
      await page.click(selector, options);
      logger.debug(`Element clicked: ${selector}`);
    } catch (error) {
      logger.error(`Click failed: ${selector}`, error);
      throw error;
    }
  },

  /**
   * Fill a form field
   * @param {Page} page - Page instance
   * @param {string} selector - CSS selector
   * @param {string} value - Value to fill
   * @param {Object} options - Fill options
   * @returns {Promise<void>}
   */
  async fill(page, selector, value, options = {}) {
    try {
      logger.debug(`Filling field: ${selector}`);
      await page.fill(selector, value, options);
      logger.debug(`Field filled: ${selector}`);
    } catch (error) {
      logger.error(`Fill failed: ${selector}`, error);
      throw error;
    }
  },

  /**
   * Evaluate JavaScript in page context
   * @param {Page} page - Page instance
   * @param {Function|string} script - JavaScript code to evaluate
   * @param {*} args - Arguments to pass to the script
   * @returns {Promise<*>} Evaluation result
   */
  async evaluate(page, script, ...args) {
    try {
      logger.debug('Evaluating script in page context');
      const result = await page.evaluate(script, ...args);
      return result;
    } catch (error) {
      logger.error('Script evaluation failed', error);
      throw error;
    }
  },

  /**
   * Close a page
   * @param {Page} page - Page instance
   * @returns {Promise<void>}
   */
  async closePage(page) {
    try {
      if (page && !page.isClosed()) {
        logger.debug('Closing page...');
        await page.close();
        logger.debug('Page closed');
      }
    } catch (error) {
      logger.error('Failed to close page', error);
      throw error;
    }
  },

  /**
   * Close a browser context
   * @param {BrowserContext} context - Browser context
   * @returns {Promise<void>}
   */
  async closeContext(context) {
    try {
      if (context) {
        logger.debug('Closing browser context...');
        await context.close();
        logger.debug('Browser context closed');
      }
    } catch (error) {
      logger.error('Failed to close context', error);
      throw error;
    }
  },

  /**
   * Close a browser instance
   * @param {Browser} browser - Browser instance
   * @returns {Promise<void>}
   */
  async closeBrowser(browser) {
    try {
      if (browser && browser.isConnected()) {
        logger.info('Closing browser...');
        await browser.close();
        logger.info('Browser closed');
      }
    } catch (error) {
      logger.error('Failed to close browser', error);
      throw error;
    }
  },

  /**
   * Wait for page load state
   * @param {Page} page - Page instance
   * @param {string} state - Load state ('load', 'domcontentloaded', 'networkidle')
   * @param {Object} options - Wait options
   * @returns {Promise<void>}
   */
  async waitForLoadState(page, state = 'networkidle', options = {}) {
    try {
      logger.debug(`Waiting for load state: ${state}`);
      
      const waitOptions = {
        timeout: TIMEOUTS.NETWORK_IDLE,
        ...options,
      };
      
      await page.waitForLoadState(state, waitOptions);
      logger.debug(`Load state reached: ${state}`);
    } catch (error) {
      logger.error(`Wait for load state failed: ${state}`, error);
      throw error;
    }
  },

  /**
   * Get page content (HTML)
   * @param {Page} page - Page instance
   * @returns {Promise<string>} Page HTML content
   */
  async getContent(page) {
    try {
      logger.debug('Getting page content...');
      const content = await page.content();
      return content;
    } catch (error) {
      logger.error('Failed to get page content', error);
      throw error;
    }
  },

  /**
   * Get page title
   * @param {Page} page - Page instance
   * @returns {Promise<string>} Page title
   */
  async getTitle(page) {
    try {
      const title = await page.title();
      return title;
    } catch (error) {
      logger.error('Failed to get page title', error);
      throw error;
    }
  },
};

module.exports = browserService;
