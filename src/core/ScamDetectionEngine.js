/**
 * Scam Detection Engine
 * Uses NLP, pattern matching, and ML techniques to detect scam intent
 */

const natural = require('natural');
const nlp = require('compromise');
const logger = require('../utils/logger');
const scamPatterns = require('../data/scamPatterns.json');
const intentPatterns = require('../data/intentPatterns.json');

class ScamDetectionEngine {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    this.confidenceThreshold = 0.65;
    this.initialized = false;
    this.initializeClassifier();
  }

  /**
   * Initialize the classifier with training data
   */
  initializeClassifier() {
    try {
      // Add scam examples
      scamPatterns.scamExamples.forEach(example => {
        this.classifier.addDocument(example.text, 'scam');
      });

      // Add legitimate examples
      scamPatterns.legitimateExamples.forEach(example => {
        this.classifier.addDocument(example.text, 'legitimate');
      });

      this.classifier.train();
      this.initialized = true;
      logger.info('Scam Detection Engine initialized successfully');
    } catch (error) {
      logger.error('Error initializing classifier:', error);
    }
  }

  /**
   * Analyze message for scam intent
   * @param {string} text - Message text to analyze
   * @param {Array} conversationHistory - Previous messages in conversation
   * @returns {Object} Detection result with confidence and intent
   */
  async analyze(text, conversationHistory = []) {
    try {
      if (!text || typeof text !== 'string') {
        return this.createResult(false, 0, 'invalid_input', []);
      }

      const normalizedText = text.toLowerCase().trim();
      
      // Run multiple detection methods
      const patternResult = this.detectByPatterns(normalizedText);
      const nlpResult = this.detectByNLP(normalizedText);
      const mlResult = this.detectByML(normalizedText);
      const contextResult = this.analyzeContext(normalizedText, conversationHistory);
      
      // Combine results with weighted scoring
      const combinedScore = this.calculateCombinedScore({
        pattern: patternResult,
        nlp: nlpResult,
        ml: mlResult,
        context: contextResult
      });

      const isScam = combinedScore.score >= this.confidenceThreshold;
      
      // Determine intent type
      const intent = this.determineIntent(normalizedText, combinedScore.indicators);

      logger.debug(`Analysis result:`, {
        score: combinedScore.score,
        isScam,
        intent,
        indicators: combinedScore.indicators
      });

      return this.createResult(
        isScam,
        combinedScore.score,
        intent,
        combinedScore.indicators
      );

    } catch (error) {
      logger.error('Error in scam analysis:', error);
      return this.createResult(false, 0, 'error', ['analysis_failed']);
    }
  }

  /**
   * Detect scam by pattern matching
   */
  detectByPatterns(text) {
    const indicators = [];
    let score = 0;

    // Check against known scam patterns
    scamPatterns.patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex, 'i');
      if (regex.test(text)) {
        score += pattern.weight;
        indicators.push(pattern.name);
      }
    });

    // Check for urgency indicators
    const urgencyCount = (text.match(/urgent|immediately|now|today|asap|hurry|quick|fast/gi) || []).length;
    if (urgencyCount > 0) {
      score += urgencyCount * 0.15;
      indicators.push('urgency_language');
    }

    // Check for threat indicators
    const threatCount = (text.match(/block|suspend|close|terminate|disable|deactivate/gi) || []).length;
    if (threatCount > 0) {
      score += threatCount * 0.2;
      indicators.push('threat_language');
    }

    // Check for financial terms
    const financialTerms = ['bank', 'account', 'upi', 'otp', 'pin', 'password', 'card', 'payment', 'transfer'];
    const foundFinancial = financialTerms.filter(term => text.includes(term));
    if (foundFinancial.length > 0) {
      score += foundFinancial.length * 0.1;
      indicators.push('financial_terms');
    }

    // Check for suspicious URLs
    const urlPattern = /(http|https):\/\/[^\s]+|www\.[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+/gi;
    const urls = text.match(urlPattern) || [];
    if (urls.length > 0) {
      score += urls.length * 0.25;
      indicators.push('suspicious_urls');
    }

    // Check for phone numbers
    const phonePattern = /(\+91[\s-]?)?[0]?[6789]\d{9}/g;
    const phones = text.match(phonePattern) || [];
    if (phones.length > 0) {
      score += phones.length * 0.15;
      indicators.push('phone_numbers');
    }

    return { score: Math.min(score, 1), indicators };
  }

  /**
   * Detect scam using NLP techniques
   */
  detectByNLP(text) {
    const doc = nlp(text);
    const indicators = [];
    let score = 0;

    // Check for imperative verbs (commands)
    const imperatives = doc.verbs().isImperative().out('array');
    if (imperatives.length > 0) {
      score += imperatives.length * 0.1;
      indicators.push('imperative_commands');
    }

    // Check for negative sentiment words
    const negativeWords = doc.match('#Negative').out('array');
    if (negativeWords.length > 2) {
      score += 0.15;
      indicators.push('negative_sentiment');
    }

    // Check for personal information requests
    const personalInfoTerms = ['name', 'address', 'number', 'id', 'details', 'information'];
    const hasPersonalRequest = personalInfoTerms.some(term => text.includes(term));
    if (hasPersonalRequest) {
      score += 0.2;
      indicators.push('personal_info_request');
    }

    // Analyze sentence structure
    const sentences = doc.sentences().json();
    const shortSentences = sentences.filter(s => s.terms.length < 5);
    if (shortSentences.length > 1) {
      score += 0.1;
      indicators.push('choppy_sentences');
    }

    return { score: Math.min(score, 1), indicators };
  }

  /**
   * Detect scam using ML classifier
   */
  detectByML(text) {
    if (!this.initialized) {
      return { score: 0, indicators: [] };
    }

    try {
      const classifications = this.classifier.getClassifications(text);
      const scamClassification = classifications.find(c => c.label === 'scam');
      
      if (scamClassification) {
        return {
          score: scamClassification.value,
          indicators: scamClassification.value > 0.5 ? ['ml_classification'] : []
        };
      }

      return { score: 0, indicators: [] };
    } catch (error) {
      logger.error('ML classification error:', error);
      return { score: 0, indicators: [] };
    }
  }

  /**
   * Analyze conversation context
   */
  analyzeContext(text, conversationHistory) {
    const indicators = [];
    let score = 0;

    if (!conversationHistory || conversationHistory.length === 0) {
      return { score: 0, indicators };
    }

    // Check if previous messages were flagged as scam
    const previousScamFlags = conversationHistory.filter(
      msg => msg.scamDetected === true
    ).length;
    
    if (previousScamFlags > 0) {
      score += previousScamFlags * 0.1;
      indicators.push('previous_scam_context');
    }

    // Check for escalation in language
    const allText = conversationHistory.map(m => m.text).join(' ') + ' ' + text;
    const escalationTerms = ['immediately', 'now', 'urgent', 'last chance', 'final warning'];
    const escalationCount = escalationTerms.filter(term => 
      allText.toLowerCase().includes(term)
    ).length;
    
    if (escalationCount > 2) {
      score += 0.2;
      indicators.push('escalating_pressure');
    }

    // Check conversation length (scams often persist)
    if (conversationHistory.length > 5) {
      score += 0.1;
      indicators.push('persistent_contact');
    }

    return { score: Math.min(score, 1), indicators };
  }

  /**
   * Calculate combined score from all detection methods
   */
  calculateCombinedScore(results) {
    const weights = {
      pattern: 0.35,
      nlp: 0.25,
      ml: 0.25,
      context: 0.15
    };

    const weightedScore = 
      results.pattern.score * weights.pattern +
      results.nlp.score * weights.nlp +
      results.ml.score * weights.ml +
      results.context.score * weights.context;

    const allIndicators = [
      ...results.pattern.indicators,
      ...results.nlp.indicators,
      ...results.ml.indicators,
      ...results.context.indicators
    ];

    // Remove duplicates
    const uniqueIndicators = [...new Set(allIndicators)];

    return {
      score: Math.min(weightedScore, 1),
      indicators: uniqueIndicators
    };
  }

  /**
   * Determine the type of scam intent
   */
  determineIntent(text, indicators) {
    const text_lower = text.toLowerCase();

    // Check for specific scam types
    if (text_lower.includes('bank') && (text_lower.includes('block') || text_lower.includes('suspend'))) {
      return 'banking_fraud';
    }
    if (text_lower.includes('upi') || text_lower.includes('payment')) {
      return 'upi_fraud';
    }
    if (text_lower.includes('otp') || text_lower.includes('password') || text_lower.includes('pin')) {
      return 'phishing';
    }
    if (text_lower.includes('win') || text_lower.includes('prize') || text_lower.includes('lottery')) {
      return 'lottery_scam';
    }
    if (text_lower.includes('job') || text_lower.includes('employment') || text_lower.includes('work from home')) {
      return 'job_scam';
    }
    if (text_lower.includes('kyc') || text_lower.includes('verify') || text_lower.includes('update')) {
      return 'kyc_fraud';
    }
    if (indicators.includes('suspicious_urls')) {
      return 'phishing';
    }

    return 'suspicious';
  }

  /**
   * Create standardized result object
   */
  createResult(isScam, confidence, intent, indicators) {
    return {
      isScam,
      confidence: parseFloat(confidence.toFixed(4)),
      intent,
      indicators,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add new training example
   */
  addTrainingExample(text, label) {
    this.classifier.addDocument(text, label);
    this.classifier.train();
    logger.info(`Added new training example: ${label}`);
  }

  /**
   * Save classifier to file
   */
  saveClassifier(filepath) {
    this.classifier.save(filepath, (err) => {
      if (err) {
        logger.error('Error saving classifier:', err);
      } else {
        logger.info('Classifier saved successfully');
      }
    });
  }

  /**
   * Load classifier from file
   */
  loadClassifier(filepath) {
    natural.BayesClassifier.load(filepath, null, (err, classifier) => {
      if (err) {
        logger.error('Error loading classifier:', err);
      } else {
        this.classifier = classifier;
        logger.info('Classifier loaded successfully');
      }
    });
  }
}

module.exports = ScamDetectionEngine;
