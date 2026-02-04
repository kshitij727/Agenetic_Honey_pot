/**
 * Intelligence Extraction System
 * Extracts actionable intelligence from scammer conversations
 */

const logger = require('../utils/logger');

class IntelligenceExtractor {
  constructor() {
    this.extractionPatterns = this.initializePatterns();
  }

  /**
   * Initialize extraction patterns
   */
  initializePatterns() {
    return {
      // Bank account patterns
      bankAccount: [
        /\b\d{9,18}\b/g, // Generic account numbers
        /account\s*(?:number|no|#)?[:\s]*([\d\s-]{9,18})/gi,
        /a\/c\s*(?:number|no|#)?[:\s]*([\d\s-]{9,18})/gi,
        /(?:savings|current|account)\s*(?:number|no)?[:\s]*([0-9\s-]+)/gi,
        /(?:a\/c|account)\s*(?:details?)?:?\s*([\d\s]+)/gi
      ],

      // UPI ID patterns
      upiId: [
        /[\w.-]+@[\w]+/g, // Generic UPI pattern
        /upi\s*(?:id)?[:\s]*([\w.-]+@[\w]+)/gi,
        /(?:googlepay|phonepe|paytm|bhim)\s*[:\s]*([\w@.]+)/gi,
        /(?:send|transfer)\s+(?:money|payment)?\s*(?:to)?[:\s]*([\w.-]+@[\w]+)/gi,
        /upi\s*(?:address|handle)[:\s]*([\w@.]+)/gi
      ],

      // Phone number patterns (Indian format)
      phoneNumber: [
        /(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
        /(?:\+91)?[\s-]?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}/g,
        /(?:call|contact|phone|mobile|reach)\s*(?:me|us|at)?[:\s]*([\d\s+-]{10,})/gi,
        /(?:number|no)\.?[:\s]*([6-9]\d{9})/gi
      ],

      // URL/Link patterns
      url: [
        /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
        /www\.[^\s<>"{}|\\^`\[\]]+/gi,
        /bit\.ly\/\w+/gi,
        /tinyurl\.com\/\w+/gi,
        /t\.co\/\w+/gi,
        /goo\.gl\/\w+/gi,
        /short\.link\/\w+/gi,
        /(?:click|visit|open|go\s*to)[:\s]*([\w.-]+\.[\w.-]+)/gi
      ],

      // Email patterns
      email: [
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      ],

      // OTP/Password/PIN requests
      credentialRequest: [
        /(?:otp|password|pin|cvv|cvv2)[:\s]*([\d]{3,6})/gi,
        /(?:share|send|provide|enter|give)\s+(?:me|us)?\s*(?:your)?\s*(?:otp|password|pin|cvv)/gi,
        /(?:verification|confirm|validate)\s*(?:code|otp|pin)/gi
      ],

      // Card numbers
      cardNumber: [
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        /(?:card|credit|debit|atm)\s*(?:number|no)?[:\s]*([\d\s-]{12,19})/gi
      ],

      // IFSC codes
      ifscCode: [
        /[A-Z]{4}0[A-Z0-9]{6}/g,
        /ifsc\s*(?:code)?[:\s]*([A-Z]{4}0[A-Z0-9]{6})/gi
      ],

      // Suspicious keywords
      suspiciousKeywords: [
        'urgent', 'immediately', 'now', 'today', 'asap', 'hurry', 'quick',
        'verify', 'verification', 'confirm', 'validate', 'update',
        'block', 'suspend', 'close', 'terminate', 'deactivate',
        'account', 'bank', 'upi', 'payment', 'transfer',
        'otp', 'password', 'pin', 'cvv', 'card details',
        'kyc', 'pan', 'aadhaar', 'document',
        'win', 'winner', 'prize', 'lottery', 'lucky',
        'free', 'offer', 'discount', 'cashback', 'reward',
        'click', 'link', 'website', 'portal', 'login',
        'download', 'install', 'app', 'apk',
        'customer care', 'helpline', 'support', 'service center'
      ]
    };
  }

  /**
   * Extract intelligence from conversation messages
   * @param {Array} messages - Array of conversation messages
   * @returns {Object} Extracted intelligence
   */
  extract(messages) {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        return this.getEmptyIntelligence();
      }

      const allText = messages
        .filter(m => m.sender === 'scammer')
        .map(m => m.text)
        .join(' ');

      if (!allText) {
        return this.getEmptyIntelligence();
      }

      logger.info(`Extracting intelligence from ${messages.length} messages`);

      const intelligence = {
        bankAccounts: this.extractBankAccounts(allText),
        upiIds: this.extractUPIIds(allText),
        phoneNumbers: this.extractPhoneNumbers(allText),
        phishingLinks: this.extractURLs(allText),
        emails: this.extractEmails(allText),
        cardNumbers: this.extractCardNumbers(allText),
        ifscCodes: this.extractIFSCCodes(allText),
        suspiciousKeywords: this.extractSuspiciousKeywords(allText),
        credentialRequests: this.detectCredentialRequests(allText),
        extractedAt: new Date().toISOString()
      };

      // Calculate risk score
      intelligence.riskScore = this.calculateRiskScore(intelligence);

      logger.info(`Intelligence extraction complete. Risk score: ${intelligence.riskScore}`);

      return intelligence;

    } catch (error) {
      logger.error('Error extracting intelligence:', error);
      return this.getEmptyIntelligence();
    }
  }

  /**
   * Extract bank account numbers
   */
  extractBankAccounts(text) {
    const accounts = new Set();
    
    this.extractionPatterns.bankAccount.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const account = (match[1] || match[0]).replace(/\s/g, '');
        // Validate length (9-18 digits)
        if (/^\d{9,18}$/.test(account)) {
          accounts.add(this.maskSensitiveData(account, 'account'));
        }
      }
    });

    return Array.from(accounts);
  }

  /**
   * Extract UPI IDs
   */
  extractUPIIds(text) {
    const upiIds = new Set();
    
    this.extractionPatterns.upiId.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const upi = (match[1] || match[0]).toLowerCase().trim();
        // Validate UPI format
        if (/^[\w.-]+@[\w]+$/.test(upi)) {
          upiIds.add(upi);
        }
      }
    });

    return Array.from(upiIds);
  }

  /**
   * Extract phone numbers
   */
  extractPhoneNumbers(text) {
    const phones = new Set();
    
    this.extractionPatterns.phoneNumber.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const phone = (match[1] || match[0]).replace(/[\s-]/g, '');
        // Validate Indian phone number
        if (/^(\+91)?[6-9]\d{9}$/.test(phone)) {
          phones.add(phone.startsWith('+91') ? phone : '+91' + phone);
        }
      }
    });

    return Array.from(phones);
  }

  /**
   * Extract URLs/phishing links
   */
  extractURLs(text) {
    const urls = new Set();
    
    this.extractionPatterns.url.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const url = (match[1] || match[0]).toLowerCase().trim();
        // Basic URL validation
        if (this.isValidURL(url)) {
          urls.add(url);
        }
      }
    });

    return Array.from(urls);
  }

  /**
   * Extract email addresses
   */
  extractEmails(text) {
    const emails = new Set();
    
    this.extractionPatterns.email.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(email => emails.add(email.toLowerCase()));
      }
    });

    return Array.from(emails);
  }

  /**
   * Extract card numbers
   */
  extractCardNumbers(text) {
    const cards = new Set();
    
    this.extractionPatterns.cardNumber.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const card = (match[1] || match[0]).replace(/[\s-]/g, '');
        // Validate using Luhn algorithm
        if (this.validateLuhn(card)) {
          cards.add(this.maskSensitiveData(card, 'card'));
        }
      }
    });

    return Array.from(cards);
  }

  /**
   * Extract IFSC codes
   */
  extractIFSCCodes(text) {
    const ifscCodes = new Set();
    
    this.extractionPatterns.ifscCode.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ifsc = (match[1] || match[0]).toUpperCase();
        ifscCodes.add(ifsc);
      }
    });

    return Array.from(ifscCodes);
  }

  /**
   * Extract suspicious keywords
   */
  extractSuspiciousKeywords(text) {
    const text_lower = text.toLowerCase();
    const found = [];
    
    this.extractionPatterns.suspiciousKeywords.forEach(keyword => {
      if (text_lower.includes(keyword)) {
        found.push(keyword);
      }
    });

    return [...new Set(found)];
  }

  /**
   * Detect credential requests
   */
  detectCredentialRequests(text) {
    const requests = [];
    const text_lower = text.toLowerCase();

    const credentialTypes = [
      { type: 'otp', patterns: ['otp', 'one time password', 'verification code'] },
      { type: 'password', patterns: ['password', 'login password', 'net banking password'] },
      { type: 'pin', patterns: ['pin', 'atm pin', 'card pin'] },
      { type: 'cvv', patterns: ['cvv', 'cvv2', 'card verification'] },
      { type: 'card_number', patterns: ['card number', 'debit card', 'credit card number'] }
    ];

    credentialTypes.forEach(({ type, patterns }) => {
      if (patterns.some(p => text_lower.includes(p))) {
        requests.push(type);
      }
    });

    return [...new Set(requests)];
  }

  /**
   * Calculate risk score based on extracted intelligence
   */
  calculateRiskScore(intelligence) {
    let score = 0;
    const weights = {
      bankAccounts: 0.15,
      upiIds: 0.15,
      phoneNumbers: 0.1,
      phishingLinks: 0.2,
      emails: 0.05,
      cardNumbers: 0.2,
      ifscCodes: 0.1,
      suspiciousKeywords: 0.05,
      credentialRequests: 0.25
    };

    Object.keys(weights).forEach(key => {
      const items = intelligence[key];
      if (Array.isArray(items) && items.length > 0) {
        score += Math.min(items.length * weights[key], weights[key] * 3);
      }
    });

    return Math.min(Math.round(score * 100), 100);
  }

  /**
   * Validate URL format
   */
  isValidURL(string) {
    try {
      new URL(string.startsWith('http') ? string : 'https://' + string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Validate using Luhn algorithm
   */
  validateLuhn(cardNumber) {
    if (!/^\d{13,19}$/.test(cardNumber)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Mask sensitive data
   */
  maskSensitiveData(data, type) {
    if (type === 'account') {
      // Show only last 4 digits
      return 'XXXX-XXXX-' + data.slice(-4);
    }
    if (type === 'card') {
      // Show only last 4 digits
      return 'XXXX-XXXX-XXXX-' + data.slice(-4);
    }
    return data;
  }

  /**
   * Get empty intelligence structure
   */
  getEmptyIntelligence() {
    return {
      bankAccounts: [],
      upiIds: [],
      phoneNumbers: [],
      phishingLinks: [],
      emails: [],
      cardNumbers: [],
      ifscCodes: [],
      suspiciousKeywords: [],
      credentialRequests: [],
      riskScore: 0,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Merge intelligence from multiple sources
   */
  mergeIntelligence(intelligenceArray) {
    const merged = this.getEmptyIntelligence();
    
    intelligenceArray.forEach(intel => {
      merged.bankAccounts.push(...intel.bankAccounts);
      merged.upiIds.push(...intel.upiIds);
      merged.phoneNumbers.push(...intel.phoneNumbers);
      merged.phishingLinks.push(...intel.phishingLinks);
      merged.emails.push(...intel.emails);
      merged.cardNumbers.push(...intel.cardNumbers);
      merged.ifscCodes.push(...intel.ifscCodes);
      merged.suspiciousKeywords.push(...intel.suspiciousKeywords);
      merged.credentialRequests.push(...intel.credentialRequests);
    });

    // Remove duplicates
    merged.bankAccounts = [...new Set(merged.bankAccounts)];
    merged.upiIds = [...new Set(merged.upiIds)];
    merged.phoneNumbers = [...new Set(merged.phoneNumbers)];
    merged.phishingLinks = [...new Set(merged.phishingLinks)];
    merged.emails = [...new Set(merged.emails)];
    merged.cardNumbers = [...new Set(merged.cardNumbers)];
    merged.ifscCodes = [...new Set(merged.ifscCodes)];
    merged.suspiciousKeywords = [...new Set(merged.suspiciousKeywords)];
    merged.credentialRequests = [...new Set(merged.credentialRequests)];

    merged.riskScore = this.calculateRiskScore(merged);

    return merged;
  }

  /**
   * Format intelligence for reporting
   */
  formatForReport(intelligence) {
    return {
      ...intelligence,
      summary: {
        totalIndicators: 
          intelligence.bankAccounts.length +
          intelligence.upiIds.length +
          intelligence.phoneNumbers.length +
          intelligence.phishingLinks.length +
          intelligence.cardNumbers.length,
        severity: intelligence.riskScore > 70 ? 'HIGH' : 
                  intelligence.riskScore > 40 ? 'MEDIUM' : 'LOW',
        primaryThreat: this.identifyPrimaryThreat(intelligence)
      }
    };
  }

  /**
   * Identify primary threat type
   */
  identifyPrimaryThreat(intelligence) {
    if (intelligence.phishingLinks.length > 0) return 'PHISHING';
    if (intelligence.cardNumbers.length > 0) return 'CARD_FRAUD';
    if (intelligence.upiIds.length > 0) return 'UPI_FRAUD';
    if (intelligence.bankAccounts.length > 0) return 'BANKING_FRAUD';
    if (intelligence.credentialRequests.length > 0) return 'CREDENTIAL_HARVESTING';
    return 'GENERAL_SCAM';
  }
}

module.exports = IntelligenceExtractor;
