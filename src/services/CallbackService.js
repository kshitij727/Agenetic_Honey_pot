/**
 * Callback Service
 * Handles mandatory final result callback to GUVI evaluation endpoint
 */

const axios = require('axios');
const logger = require('../utils/logger');

class CallbackService {
  constructor() {
    this.callbackUrl = process.env.GUVI_CALLBACK_URL || 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult';
    this.timeout = parseInt(process.env.CALLBACK_TIMEOUT) || 5000;
    this.maxRetries = parseInt(process.env.CALLBACK_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.CALLBACK_RETRY_DELAY) || 1000;
  }

  /**
   * Send final callback to GUVI endpoint
   * @param {Object} payload - Callback payload
   * @returns {Object} Callback result
   */
  async sendCallback(payload) {
    logger.info(`Sending final callback for session: ${payload.sessionId}`);
    logger.debug('Callback payload:', payload);

    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(this.callbackUrl, payload, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AgenticHoneyPot/1.0'
          }
        });

        logger.info(`Callback sent successfully for session: ${payload.sessionId}`, {
          status: response.status,
          attempt
        });

        return {
          success: true,
          statusCode: response.status,
          data: response.data,
          attempts: attempt,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error;
        logger.warn(`Callback attempt ${attempt} failed for session: ${payload.sessionId}`, {
          error: error.message,
          code: error.code
        });

        if (attempt < this.maxRetries) {
          logger.info(`Retrying callback in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // All retries failed
    logger.error(`All callback attempts failed for session: ${payload.sessionId}`, {
      error: lastError.message,
      url: this.callbackUrl
    });

    return {
      success: false,
      error: lastError.message,
      code: lastError.code,
      attempts: this.maxRetries,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send callback with validation
   */
  async sendValidatedCallback(session) {
    // Validate session data
    const validation = this.validateSessionData(session);
    if (!validation.valid) {
      logger.error('Session validation failed:', validation.errors);
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors
      };
    }

    // Build payload
    const payload = this.buildPayload(session);

    // Send callback
    return await this.sendCallback(payload);
  }

  /**
   * Build callback payload from session
   */
  buildPayload(session) {
    return {
      sessionId: session.id,
      scamDetected: session.scamDetected || true,
      totalMessagesExchanged: session.getMessageCount(),
      extractedIntelligence: {
        bankAccounts: session.intelligence.bankAccounts || [],
        upiIds: session.intelligence.upiIds || [],
        phishingLinks: session.intelligence.phishingLinks || [],
        phoneNumbers: session.intelligence.phoneNumbers || [],
        suspiciousKeywords: session.intelligence.suspiciousKeywords || []
      },
      agentNotes: this.generateAgentNotes(session)
    };
  }

  /**
   * Validate session data for callback
   */
  validateSessionData(session) {
    const errors = [];

    if (!session.id) {
      errors.push('Session ID is required');
    }

    if (!session.scamDetected) {
      errors.push('Scam must be detected to send callback');
    }

    if (session.getMessageCount() === 0) {
      errors.push('Session must have at least one message');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate agent notes from session
   */
  generateAgentNotes(session) {
    const messages = session.getMessages();
    const scammerMessages = messages.filter(m => m.sender === 'scammer');
    
    const tactics = [];
    const allText = scammerMessages.map(m => m.text.toLowerCase()).join(' ');
    
    // Analyze tactics
    if (allText.includes('urgent') || allText.includes('immediately') || allText.includes('now')) {
      tactics.push('urgency tactics');
    }
    if (allText.includes('block') || allText.includes('suspend') || allText.includes('close')) {
      tactics.push('account threat');
    }
    if (allText.includes('verify') || allText.includes('confirm') || allText.includes('validate')) {
      tactics.push('verification fraud');
    }
    if (allText.includes('otp') || allText.includes('password') || allText.includes('pin')) {
      tactics.push('credential harvesting');
    }
    if (allText.includes('upi') || allText.includes('payment') || allText.includes('transfer')) {
      tactics.push('payment redirection');
    }
    if (allText.includes('click') || allText.includes('link')) {
      tactics.push('phishing link');
    }
    if (allText.includes('kyc') || allText.includes('update')) {
      tactics.push('KYC fraud');
    }
    if (allText.includes('win') || allText.includes('prize') || allText.includes('lottery')) {
      tactics.push('lottery scam');
    }

    const messageCount = session.getMessageCount();
    const engagementDuration = this.calculateEngagementDuration(session);
    
    let notes = `Scammer used ${tactics.join(', ') || 'social engineering tactics'}. `;
    notes += `Engagement lasted ${messageCount} messages over ${engagementDuration}. `;
    
    // Add intelligence summary
    const intel = session.intelligence;
    const intelCount = 
      intel.bankAccounts.length +
      intel.upiIds.length +
      intel.phoneNumbers.length +
      intel.phishingLinks.length;
    
    if (intelCount > 0) {
      notes += `Extracted ${intelCount} pieces of actionable intelligence.`;
    } else {
      notes += 'Limited intelligence extracted.';
    }

    return notes;
  }

  /**
   * Calculate engagement duration
   */
  calculateEngagementDuration(session) {
    if (session.messages.length < 2) return 'brief period';

    const firstMessage = new Date(session.messages[0].timestamp);
    const lastMessage = new Date(session.messages[session.messages.length - 1].timestamp);
    const durationMs = lastMessage - firstMessage;
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes} minutes`;
    }
    return 'seconds';
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test callback endpoint
   */
  async testEndpoint() {
    const testPayload = {
      sessionId: 'test-session-' + Date.now(),
      scamDetected: true,
      totalMessagesExchanged: 5,
      extractedIntelligence: {
        bankAccounts: ['XXXX-XXXX-1234'],
        upiIds: ['test@upi'],
        phishingLinks: ['http://test.example'],
        phoneNumbers: ['+919999999999'],
        suspiciousKeywords: ['test', 'urgent']
      },
      agentNotes: 'Test callback from Agentic Honey-Pot system'
    };

    try {
      const result = await this.sendCallback(testPayload);
      return {
        success: result.success,
        message: result.success ? 'Callback endpoint is working' : 'Callback endpoint test failed',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Callback endpoint test failed',
        error: error.message
      };
    }
  }

  /**
   * Get callback statistics
   */
  getCallbackStats() {
    // This would be implemented with a database in production
    return {
      totalCallbacks: 0,
      successfulCallbacks: 0,
      failedCallbacks: 0,
      averageResponseTime: 0,
      lastCallbackTime: null
    };
  }

  /**
   * Update callback configuration
   */
  updateConfig(config) {
    if (config.url) this.callbackUrl = config.url;
    if (config.timeout) this.timeout = config.timeout;
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
    
    logger.info('Callback configuration updated:', {
      url: this.callbackUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    });
  }
}

module.exports = CallbackService;
