/**
 * AI Agent for Autonomous Scammer Engagement
 * Generates human-like responses to extract intelligence
 */

const logger = require('../utils/logger');
const responseTemplates = require('../data/responseTemplates.json');
const personaConfig = require('../config/persona.json');

class AIAgent {
  constructor() {
    this.conversationMemory = new Map();
    this.maxContextLength = 10;
    this.responseStrategies = this.initializeStrategies();
  }

  /**
   * Initialize response strategies
   */
  initializeStrategies() {
    return {
      banking_fraud: {
        initial: ['confusion', 'concern', 'question'],
        middle: ['hesitation', 'request_clarification', 'ask_for_details'],
        late: ['reluctance', 'ask_for_proof', 'delay']
      },
      upi_fraud: {
        initial: ['curiosity', 'question'],
        middle: ['hesitation', 'technical_difficulty'],
        late: ['reluctance', 'ask_alternatives']
      },
      phishing: {
        initial: ['confusion', 'question'],
        middle: ['technical_issue', 'ask_why'],
        late: ['suspicion', 'ask_verification']
      },
      lottery_scam: {
        initial: ['surprise', 'excitement_cautious'],
        middle: ['question', 'ask_process'],
        late: ['ask_fee_details', 'hesitation']
      },
      job_scam: {
        initial: ['interest', 'question'],
        middle: ['ask_details', 'hesitation'],
        late: ['ask_official_process', 'reluctance']
      },
      kyc_fraud: {
        initial: ['concern', 'question'],
        middle: ['ask_official_channel', 'hesitation'],
        late: ['ask_branch_visit', 'delay']
      },
      default: {
        initial: ['neutral', 'question'],
        middle: ['hesitation', 'request_clarification'],
        late: ['reluctance', 'ask_for_proof']
      }
    };
  }

  /**
   * Generate response to scammer message
   * @param {Object} params - Generation parameters
   * @returns {Object} Generated response
   */
  async generateResponse(params) {
    try {
      const { message, conversationHistory, detectionResult, metadata } = params;
      
      // Get or initialize conversation context
      const context = this.getOrCreateContext(message, conversationHistory);
      
      // Determine conversation phase
      const phase = this.determinePhase(context.messageCount);
      
      // Select response strategy
      const strategy = this.selectStrategy(detectionResult.intent, phase);
      
      // Generate appropriate response
      const response = await this.buildResponse({
        message,
        context,
        strategy,
        detectionResult,
        metadata
      });

      // Update context
      this.updateContext(context, message, response);

      logger.info(`Generated response for intent: ${detectionResult.intent}, phase: ${phase}`);

      return {
        reply: response,
        strategy: strategy.type,
        phase,
        confidence: detectionResult.confidence
      };

    } catch (error) {
      logger.error('Error generating response:', error);
      return {
        reply: this.getFallbackResponse(),
        strategy: 'fallback',
        phase: 'error',
        confidence: 0
      };
    }
  }

  /**
   * Get or create conversation context
   */
  getOrCreateContext(message, conversationHistory) {
    // Use session ID from the last message or generate
    const sessionId = this.extractSessionId(conversationHistory);
    
    if (!this.conversationMemory.has(sessionId)) {
      this.conversationMemory.set(sessionId, {
        id: sessionId,
        messageCount: 0,
        scammerMessageCount: 0,
        topicsDiscussed: [],
        informationRevealed: [],
        scammerTactics: [],
        lastResponseType: null,
        emotionalState: 'neutral',
        trustLevel: 0.3
      });
    }

    return this.conversationMemory.get(sessionId);
  }

  /**
   * Extract session ID from conversation history
   */
  extractSessionId(conversationHistory) {
    // In real implementation, this would come from the session
    return 'session_' + Date.now();
  }

  /**
   * Determine conversation phase
   */
  determinePhase(messageCount) {
    if (messageCount <= 2) return 'initial';
    if (messageCount <= 6) return 'middle';
    return 'late';
  }

  /**
   * Select response strategy based on intent and phase
   */
  selectStrategy(intent, phase) {
    const strategySet = this.responseStrategies[intent] || this.responseStrategies.default;
    const types = strategySet[phase] || strategySet.middle;
    
    // Select strategy type (with some randomness for variety)
    const type = types[Math.floor(Math.random() * types.length)];
    
    return { type, types };
  }

  /**
   * Build the actual response
   */
  async buildResponse(params) {
    const { message, context, strategy, detectionResult, metadata } = params;
    
    // Get templates for the strategy
    const templates = responseTemplates[strategy.type] || responseTemplates.neutral;
    
    // Analyze scammer message for context
    const messageAnalysis = this.analyzeMessage(message);
    
    // Select appropriate template
    let template = this.selectTemplate(templates, messageAnalysis, context);
    
    // Personalize the response
    template = this.personalizeResponse(template, context, metadata);
    
    // Add natural variations
    template = this.addVariations(template);
    
    // Update context based on message analysis
    context.scammerTactics.push(...messageAnalysis.tactics);
    context.topicsDiscussed.push(...messageAnalysis.topics);
    context.messageCount++;
    if (messageAnalysis.isScammerMessage) {
      context.scammerMessageCount++;
    }

    return template;
  }

  /**
   * Analyze incoming message
   */
  analyzeMessage(message) {
    const text = message.toLowerCase();
    const analysis = {
      isScammerMessage: true,
      tactics: [],
      topics: [],
      urgency: 0,
      requestType: null
    };

    // Detect tactics
    if (text.includes('urgent') || text.includes('immediately')) {
      analysis.tactics.push('urgency');
      analysis.urgency += 1;
    }
    if (text.includes('block') || text.includes('suspend')) {
      analysis.tactics.push('threat');
    }
    if (text.includes('verify') || text.includes('confirm')) {
      analysis.tactics.push('verification_request');
    }
    if (text.includes('click') || text.includes('link')) {
      analysis.tactics.push('link_sharing');
    }
    if (text.includes('otp') || text.includes('password') || text.includes('pin')) {
      analysis.tactics.push('credential_harvesting');
      analysis.requestType = 'credentials';
    }
    if (text.includes('upi') || text.includes('payment') || text.includes('transfer')) {
      analysis.tactics.push('payment_request');
      analysis.requestType = 'payment';
    }

    // Detect topics
    if (text.includes('bank')) analysis.topics.push('banking');
    if (text.includes('account')) analysis.topics.push('account');
    if (text.includes('upi')) analysis.topics.push('upi');
    if (text.includes('kyc')) analysis.topics.push('kyc');
    if (text.includes('card')) analysis.topics.push('card');

    return analysis;
  }

  /**
   * Select appropriate template
   */
  selectTemplate(templates, messageAnalysis, context) {
    // Filter templates based on context
    let availableTemplates = templates;
    
    // If scammer is asking for credentials, use caution templates
    if (messageAnalysis.requestType === 'credentials') {
      availableTemplates = templates.filter(t => 
        t.includes('?') || t.includes('why') || t.includes('how')
      );
    }
    
    // If scammer is using threats, use concerned templates
    if (messageAnalysis.tactics.includes('threat')) {
      availableTemplates = templates.filter(t =>
        t.includes('worried') || t.includes('concern') || t.includes('what')
      );
    }

    // If no specific templates, use all
    if (availableTemplates.length === 0) {
      availableTemplates = templates;
    }

    // Select random template from available
    return availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
  }

  /**
   * Personalize response based on context
   */
  personalizeResponse(template, context, metadata) {
    let personalized = template;
    
    // Add persona-specific language
    if (personaConfig.dialect === 'indian_english') {
      // Add Indian English variations
      const indianPhrases = ['actually', 'only', 'itself', 'na', 'yaar'];
      if (Math.random() > 0.7) {
        const phrase = indianPhrases[Math.floor(Math.random() * indianPhrases.length)];
        personalized = personalized.replace(/\.$/, ` ${phrase}.`);
      }
    }

    // Adjust based on trust level
    if (context.trustLevel < 0.3) {
      // More hesitant language
      personalized = personalized.replace(/I will/g, 'I might');
      personalized = personalized.replace(/sure/g, 'not sure');
    }

    // Add time-based context
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      personalized = 'Sorry for the late hour. ' + personalized;
    }

    return personalized;
  }

  /**
   * Add natural variations to response
   */
  addVariations(template) {
    let varied = template;

    // Randomly add filler words
    const fillers = ['um', 'uh', 'well', 'so', 'actually'];
    if (Math.random() > 0.8) {
      const filler = fillers[Math.floor(Math.random() * fillers.length)];
      varied = `${filler}, ${varied.charAt(0).toLowerCase() + varied.slice(1)}`;
    }

    // Randomly vary punctuation
    if (Math.random() > 0.9) {
      varied = varied.replace(/\./, '...');
    }

    // Add occasional typo (very rare, for realism)
    if (Math.random() > 0.98) {
      const words = varied.split(' ');
      if (words.length > 3) {
        const idx = Math.floor(Math.random() * words.length);
        const word = words[idx];
        if (word.length > 4) {
          words[idx] = word.slice(0, -1) + word.slice(-2, -1) + word.slice(-1);
        }
      }
      varied = words.join(' ');
    }

    return varied;
  }

  /**
   * Update conversation context
   */
  updateContext(context, message, response) {
    context.lastResponseType = response.type;
    
    // Adjust trust level based on interaction
    if (response.includes('?')) {
      context.trustLevel -= 0.05; // Questions show skepticism
    }
    if (message.text.includes('please') || message.text.includes('sorry')) {
      context.trustLevel += 0.05; // Politeness increases trust slightly
    }
    
    context.trustLevel = Math.max(0, Math.min(1, context.trustLevel));

    // Clean up old contexts
    this.cleanupOldContexts();
  }

  /**
   * Clean up old conversation contexts
   */
  cleanupOldContexts() {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    
    for (const [id, context] of this.conversationMemory.entries()) {
      if (now - context.lastActivity > maxAge) {
        this.conversationMemory.delete(id);
      }
    }
  }

  /**
   * Get fallback response
   */
  getFallbackResponse() {
    const fallbacks = [
      "I'm not sure I understand. Can you explain more?",
      "Could you clarify that for me?",
      "I need to think about this. Can you give me a moment?",
      "Sorry, I'm a bit confused. What do you mean exactly?",
      "Can you tell me more details about this?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(sessionId) {
    const context = this.conversationMemory.get(sessionId);
    if (!context) return null;

    return {
      messageCount: context.messageCount,
      scammerMessageCount: context.scammerMessageCount,
      topicsDiscussed: [...new Set(context.topicsDiscussed)],
      tacticsUsed: [...new Set(context.scammerTactics)],
      trustLevel: context.trustLevel,
      informationRevealed: context.informationRevealed
    };
  }

  /**
   * Clear conversation context
   */
  clearContext(sessionId) {
    this.conversationMemory.delete(sessionId);
    logger.info(`Cleared context for session: ${sessionId}`);
  }
}

module.exports = AIAgent;
