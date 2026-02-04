/**
 * Agentic Honey-Pot for Scam Detection & Intelligence Extraction
 * National-Level Cybersecurity Project
 * 
 * This system detects scam intent and autonomously engages scammers
 * to extract useful intelligence without revealing detection.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
require('dotenv').config();

const logger = require('./src/utils/logger');
const { authenticateApiKey } = require('./src/middleware/auth');
const { validateMessageRequest } = require('./src/middleware/validation');
const ScamDetectionEngine = require('./src/core/ScamDetectionEngine');
const AIAgent = require('./src/core/AIAgent');
const IntelligenceExtractor = require('./src/core/IntelligenceExtractor');
const SessionManager = require('./src/core/SessionManager');
const CallbackService = require('./src/services/CallbackService');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';

// Initialize core components
const detectionEngine = new ScamDetectionEngine();
const aiAgent = new AIAgent();
const intelligenceExtractor = new IntelligenceExtractor();
const sessionManager = new SessionManager();
const callbackService = new CallbackService();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, './src/docs/swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// ============================================
// MAIN API ENDPOINT - Process Message
// ============================================
app.post(`/api/${API_VERSION}/process-message`, authenticateApiKey, validateMessageRequest, async (req, res) => {
  try {
    const { sessionId, message, conversationHistory = [], metadata = {} } = req.body;
    
    logger.info(`Processing message for session: ${sessionId}`, {
      sender: message.sender,
      channel: metadata.channel,
      textLength: message.text?.length
    });

    // Get or create session
    let session = sessionManager.getSession(sessionId);
    if (!session) {
      session = sessionManager.createSession(sessionId, metadata);
    }

    // Update session with new message
    session.addMessage(message);

    // Step 1: Detect scam intent
    const detectionResult = await detectionEngine.analyze(message.text, conversationHistory);
    logger.info(`Scam detection result for ${sessionId}:`, detectionResult);

    // If scam detected and not already in agent mode, activate AI agent
    if (detectionResult.isScam && !session.isAgentActive) {
      session.activateAgent();
      logger.info(`AI Agent activated for session: ${sessionId}`);
    }

    let response;

    // Step 2: If agent is active, generate response
    if (session.isAgentActive) {
      const agentResponse = await aiAgent.generateResponse({
        message: message.text,
        conversationHistory: session.getMessages(),
        detectionResult,
        metadata
      });

      // Add agent response to session
      session.addMessage({
        sender: 'user',
        text: agentResponse.reply,
        timestamp: new Date().toISOString()
      });

      // Extract intelligence from the conversation
      const extractedIntel = intelligenceExtractor.extract(session.getMessages());
      session.updateIntelligence(extractedIntel);

      response = {
        status: 'success',
        reply: agentResponse.reply,
        scamDetected: true,
        confidence: detectionResult.confidence,
        intent: detectionResult.intent
      };

      // Check if conversation should end and send callback
      if (shouldEndConversation(session, detectionResult)) {
        await sendFinalCallback(session);
        sessionManager.closeSession(sessionId);
      }
    } else {
      // Not a scam - return neutral response or pass-through
      response = {
        status: 'success',
        reply: null,
        scamDetected: false,
        confidence: detectionResult.confidence,
        message: 'No scam detected - message can be passed through'
      };
    }

    res.json(response);

  } catch (error) {
    logger.error('Error processing message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// GET SESSION STATUS
// ============================================
app.get(`/api/${API_VERSION}/session/:sessionId`, authenticateApiKey, (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    res.json({
      status: 'success',
      session: {
        sessionId: session.id,
        isAgentActive: session.isAgentActive,
        messageCount: session.getMessageCount(),
        scamDetected: session.scamDetected,
        intelligence: session.intelligence,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    });
  } catch (error) {
    logger.error('Error getting session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ============================================
// FORCE END SESSION & SEND CALLBACK
// ============================================
app.post(`/api/${API_VERSION}/session/:sessionId/end`, authenticateApiKey, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    // Send final callback
    const callbackResult = await sendFinalCallback(session);
    
    // Close session
    sessionManager.closeSession(sessionId);

    res.json({
      status: 'success',
      message: 'Session ended and callback sent',
      callbackResult
    });
  } catch (error) {
    logger.error('Error ending session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ============================================
// GET STATISTICS
// ============================================
app.get(`/api/${API_VERSION}/statistics`, authenticateApiKey, (req, res) => {
  try {
    const stats = sessionManager.getStatistics();
    res.json({
      status: 'success',
      statistics: stats
    });
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ============================================
// BATCH PROCESS MESSAGES
// ============================================
app.post(`/api/${API_VERSION}/batch-process`, authenticateApiKey, async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Messages array is required'
      });
    }

    const results = await Promise.all(
      messages.map(async (msg) => {
        const detectionResult = await detectionEngine.analyze(msg.text, []);
        return {
          messageId: msg.id,
          scamDetected: detectionResult.isScam,
          confidence: detectionResult.confidence,
          intent: detectionResult.intent
        };
      })
    );

    res.json({
      status: 'success',
      results
    });
  } catch (error) {
    logger.error('Error in batch processing:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function shouldEndConversation(session, detectionResult) {
  // End conversation conditions:
  // 1. Max messages reached (20)
  // 2. Sufficient intelligence extracted
  // 3. Scammer revealed critical info
  // 4. Conversation timeout
  
  const messageCount = session.getMessageCount();
  const intel = session.intelligence;
  
  if (messageCount >= 20) return true;
  
  // If we have good intelligence, end the conversation
  const hasGoodIntel = (
    intel.bankAccounts.length > 0 ||
    intel.upiIds.length > 0 ||
    intel.phishingLinks.length > 0 ||
    intel.phoneNumbers.length > 1
  );
  
  if (hasGoodIntel && messageCount >= 8) return true;
  
  // Check for conversation timeout (30 minutes)
  const lastActivity = new Date(session.lastActivity);
  const now = new Date();
  const diffMinutes = (now - lastActivity) / (1000 * 60);
  
  if (diffMinutes > 30) return true;
  
  return false;
}

async function sendFinalCallback(session) {
  try {
    const payload = {
      sessionId: session.id,
      scamDetected: true,
      totalMessagesExchanged: session.getMessageCount(),
      extractedIntelligence: session.intelligence,
      agentNotes: generateAgentNotes(session)
    };

    const result = await callbackService.sendCallback(payload);
    logger.info(`Final callback sent for session ${session.id}:`, result);
    return result;
  } catch (error) {
    logger.error(`Failed to send callback for session ${session.id}:`, error);
    throw error;
  }
}

function generateAgentNotes(session) {
  const messages = session.getMessages();
  const scammerMessages = messages.filter(m => m.sender === 'scammer');
  
  const tactics = [];
  const allText = scammerMessages.map(m => m.text.toLowerCase()).join(' ');
  
  if (allText.includes('urgent') || allText.includes('immediately')) {
    tactics.push('urgency tactics');
  }
  if (allText.includes('verify') || allText.includes('confirm')) {
    tactics.push('verification fraud');
  }
  if (allText.includes('block') || allText.includes('suspend')) {
    tactics.push('account threat');
  }
  if (allText.includes('otp') || allText.includes('password')) {
    tactics.push('credential harvesting');
  }
  if (allText.includes('upi') || allText.includes('payment')) {
    tactics.push('payment redirection');
  }
  
  return `Scammer used ${tactics.join(', ') || 'social engineering tactics'}. Engagement lasted ${session.getMessageCount()} messages.`;
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.info(`=================================`);
  logger.info(`Agentic Honey-Pot System Started`);
  logger.info(`=================================`);
  logger.info(`Server running on port: ${PORT}`);
  logger.info(`API Version: ${API_VERSION}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`=================================`);
});

module.exports = app;
