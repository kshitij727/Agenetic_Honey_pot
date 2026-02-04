/**
 * API Test Suite
 * Tests for the Agentic Honey-Pot API endpoints
 */

const request = require('supertest');
const app = require('../server');

const API_KEY = 'dev-api-key-12345';

describe('Agentic Honey-Pot API Tests', () => {
  
  // Health check endpoint
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);
      
      expect(res.body.status).toBe('healthy');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // Authentication tests
  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const res = await request(app)
        .post('/api/v1/process-message')
        .send({})
        .expect(401);
      
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('API key is required');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', 'invalid-key')
        .send({})
        .expect(403);
      
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Invalid API key');
    });
  });

  // Process message endpoint
  describe('POST /api/v1/process-message', () => {
    const validMessage = {
      sessionId: 'test-session-123',
      message: {
        sender: 'scammer',
        text: 'Your bank account will be blocked today. Verify immediately.',
        timestamp: new Date().toISOString()
      },
      conversationHistory: [],
      metadata: {
        channel: 'SMS',
        language: 'English',
        locale: 'IN'
      }
    };

    it('should detect scam in banking fraud message', async () => {
      const res = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send(validMessage)
        .expect(200);
      
      expect(res.body.status).toBe('success');
      expect(res.body.scamDetected).toBe(true);
      expect(res.body.confidence).toBeGreaterThan(0.5);
      expect(res.body.reply).toBeDefined();
    });

    it('should detect UPI fraud', async () => {
      const upiMessage = {
        ...validMessage,
        message: {
          sender: 'scammer',
          text: 'Send money to this UPI ID: scammer@upi to complete verification',
          timestamp: new Date().toISOString()
        }
      };

      const res = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send(upiMessage)
        .expect(200);
      
      expect(res.body.scamDetected).toBe(true);
      expect(res.body.intent).toBe('upi_fraud');
    });

    it('should detect lottery scam', async () => {
      const lotteryMessage = {
        ...validMessage,
        message: {
          sender: 'scammer',
          text: 'Congratulations! You have won Rs. 25,00,000 in lucky draw. Call to claim.',
          timestamp: new Date().toISOString()
        }
      };

      const res = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send(lotteryMessage)
        .expect(200);
      
      expect(res.body.scamDetected).toBe(true);
      expect(res.body.intent).toBe('lottery_scam');
    });

    it('should not detect scam in legitimate message', async () => {
      const legitimateMessage = {
        ...validMessage,
        message: {
          sender: 'scammer',
          text: 'Your transaction of Rs. 500 was successful. Reference: 123456.',
          timestamp: new Date().toISOString()
        }
      };

      const res = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send(legitimateMessage)
        .expect(200);
      
      expect(res.body.scamDetected).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send({})
        .expect(400);
      
      expect(res.body.status).toBe('error');
      expect(res.body.errors).toBeDefined();
    });

    it('should handle multi-turn conversation', async () => {
      const sessionId = 'test-multi-turn-' + Date.now();
      
      // First message
      const msg1 = {
        sessionId,
        message: {
          sender: 'scammer',
          text: 'Your account will be blocked.',
          timestamp: new Date().toISOString()
        },
        conversationHistory: []
      };

      const res1 = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send(msg1)
        .expect(200);

      expect(res1.body.scamDetected).toBe(true);

      // Second message with history
      const msg2 = {
        sessionId,
        message: {
          sender: 'scammer',
          text: 'Share your UPI ID to avoid suspension.',
          timestamp: new Date().toISOString()
        },
        conversationHistory: [
          {
            sender: 'scammer',
            text: 'Your account will be blocked.',
            timestamp: new Date().toISOString()
          },
          {
            sender: 'user',
            text: res1.body.reply,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res2 = await request(app)
        .post('/api/v1/process-message')
        .set('x-api-key', API_KEY)
        .send(msg2)
        .expect(200);

      expect(res2.body.scamDetected).toBe(true);
      expect(res2.body.reply).toBeDefined();
    });
  });

  // Statistics endpoint
  describe('GET /api/v1/statistics', () => {
    it('should return system statistics', async () => {
      const res = await request(app)
        .get('/api/v1/statistics')
        .set('x-api-key', API_KEY)
        .expect(200);
      
      expect(res.body.status).toBe('success');
      expect(res.body.statistics).toBeDefined();
      expect(typeof res.body.statistics.total).toBe('number');
      expect(typeof res.body.statistics.scamDetected).toBe('number');
    });
  });

  // Batch process endpoint
  describe('POST /api/v1/batch-process', () => {
    it('should process multiple messages', async () => {
      const batchRequest = {
        messages: [
          { id: '1', text: 'Your bank account will be blocked today.' },
          { id: '2', text: 'Congratulations! You have won a prize.' },
          { id: '3', text: 'Your transaction was successful.' }
        ]
      };

      const res = await request(app)
        .post('/api/v1/batch-process')
        .set('x-api-key', API_KEY)
        .send(batchRequest)
        .expect(200);
      
      expect(res.body.status).toBe('success');
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].scamDetected).toBe(true);
      expect(res.body.results[1].scamDetected).toBe(true);
      expect(res.body.results[2].scamDetected).toBe(false);
    });

    it('should validate batch request', async () => {
      const res = await request(app)
        .post('/api/v1/batch-process')
        .set('x-api-key', API_KEY)
        .send({ messages: [] })
        .expect(400);
      
      expect(res.body.status).toBe('error');
    });
  });

  // Session endpoints
  describe('Session Management', () => {
    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/v1/session/non-existent-session')
        .set('x-api-key', API_KEY)
        .expect(404);
      
      expect(res.body.status).toBe('error');
    });
  });

  // 404 handler
  describe('404 Handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/unknown-endpoint')
        .set('x-api-key', API_KEY)
        .expect(404);
      
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('not found');
    });
  });
});
