# 🛡️ Agentic Honey-Pot - Project Summary

## National-Level Cybersecurity Project for Scam Detection & Intelligence Extraction

---

## 📋 Project Overview

This project implements an **Agentic Honey-Pot System** that autonomously detects scam messages, engages scammers in multi-turn conversations, and extracts actionable intelligence without revealing detection.

### Key Requirements Fulfilled

✅ **REST API** with authentication (x-api-key)  
✅ **Scam Detection** using ML/NLP techniques  
✅ **AI Agent** for autonomous engagement  
✅ **Multi-turn Conversations** with context  
✅ **Intelligence Extraction** (bank accounts, UPI IDs, phishing links, phone numbers)  
✅ **Structured JSON** responses  
✅ **Mandatory Callback** to GUVI evaluation endpoint  
✅ **Comprehensive JSON** configuration files  

---

## 📁 Project Structure

```
scam-detection-honeypot/
├── server.js                          # Main server entry point
├── package.json                       # Dependencies and scripts
├── .env.example                       # Environment variables template
├── .gitignore                         # Git ignore rules
├── Dockerfile                         # Docker container config
├── docker-compose.yml                 # Docker Compose setup
├── jest.config.js                     # Test configuration
├── LICENSE                            # MIT License
├── README.md                          # Project documentation
├── PROJECT_SUMMARY.md                 # This file
│
├── src/
│   ├── core/                          # Core system components
│   │   ├── ScamDetectionEngine.js     # ML/NLP scam detection
│   │   ├── AIAgent.js                 # Autonomous AI agent
│   │   ├── IntelligenceExtractor.js   # Intelligence extraction
│   │   └── SessionManager.js          # Session management
│   │
│   ├── middleware/                    # Express middleware
│   │   ├── auth.js                    # API key authentication
│   │   └── validation.js              # Request validation
│   │
│   ├── services/                      # External services
│   │   └── CallbackService.js         # GUVI callback service
│   │
│   ├── utils/                         # Utilities
│   │   └── logger.js                  # Winston logger
│   │
│   ├── data/                          # JSON Data files
│   │   ├── scamPatterns.json          # Scam patterns & training data
│   │   ├── intentPatterns.json        # Intent classification patterns
│   │   └── responseTemplates.json     # AI agent response templates
│   │
│   ├── config/                        # Configuration files
│   │   └── persona.json               # AI agent persona config
│   │
│   └── docs/                          # Documentation
│       ├── swagger.yaml               # Swagger/OpenAPI spec
│       └── api-schema.json            # Complete API schema
│
├── tests/
│   └── api.test.js                    # API test suite
│
├── scripts/
│   └── test-api.sh                    # API testing script
│
└── dashboard/
    └── index.html                     # Monitoring dashboard
```

---

## 🔌 API Endpoints

### Main Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/v1/process-message` | Process scam message | Yes |
| GET | `/api/v1/session/:sessionId` | Get session status | Yes |
| POST | `/api/v1/session/:sessionId/end` | End session & callback | Yes |
| GET | `/api/v1/statistics` | Get system stats | Yes |
| POST | `/api/v1/batch-process` | Batch process | Yes |

### Authentication

```
Header: x-api-key: YOUR_SECRET_API_KEY
Content-Type: application/json
```

---

## 📦 JSON Configuration Files

### 1. `src/data/scamPatterns.json`
- **15+ scam detection patterns** with regex and weights
- **30+ scam examples** for training
- **20+ legitimate examples** for comparison
- Covers: Banking fraud, UPI fraud, phishing, lottery, job scams, KYC fraud, etc.

### 2. `src/data/intentPatterns.json`
- **15 scam intent types** with detailed classification
- Keywords and patterns for each intent
- Severity levels (critical, high, medium, low)
- Action recommendations per severity

### 3. `src/data/responseTemplates.json`
- **25+ response strategies** for AI agent
- Categories: confusion, concern, question, hesitation, reluctance, etc.
- 5-10 templates per strategy
- Human-like variations

### 4. `src/config/persona.json`
- AI agent persona configuration
- Demographics, traits, communication style
- Background and behavior patterns
- Regional variations (Indian English)

### 5. `src/docs/api-schema.json`
- Complete OpenAPI 3.0 schema
- All request/response definitions
- Component schemas for reuse

---

## 🤖 Core Components

### 1. ScamDetectionEngine.js
```javascript
// Multi-layered detection
- Pattern Matching (regex-based)
- NLP Analysis (compromise.js)
- ML Classification (Bayesian)
- Context Analysis (conversation history)

// Output
{
  isScam: true/false,
  confidence: 0.0-1.0,
  intent: "banking_fraud",
  indicators: ["urgency", "threat"]
}
```

### 2. AIAgent.js
```javascript
// Autonomous engagement
- Conversation phase detection (initial/middle/late)
- Strategy selection based on intent
- Response personalization
- Context maintenance
- Natural language variations

// Output
{
  reply: "Why is my account being suspended?",
  strategy: "question",
  phase: "initial"
}
```

### 3. IntelligenceExtractor.js
```javascript
// Extracts actionable intelligence
- Bank Account Numbers (masked)
- UPI IDs
- Phone Numbers
- Phishing URLs
- Email Addresses
- Card Numbers (masked)
- IFSC Codes
- Suspicious Keywords
- Credential Requests

// Output
{
  bankAccounts: ["XXXX-XXXX-1234"],
  upiIds: ["scammer@upi"],
  phishingLinks: ["http://malicious.com"],
  phoneNumbers: ["+919999999999"],
  riskScore: 85
}
```

### 4. SessionManager.js
```javascript
// Session lifecycle management
- Create/retrieve sessions
- Message history tracking
- Intelligence accumulation
- Auto-cleanup of old sessions
- Statistics generation
```

### 5. CallbackService.js
```javascript
// Mandatory GUVI callback
POST https://hackathon.guvi.in/api/updateHoneyPotFinalResult

// Payload
{
  sessionId: "abc-123",
  scamDetected: true,
  totalMessagesExchanged: 18,
  extractedIntelligence: { ... },
  agentNotes: "Scammer used urgency tactics..."
}
```

---

## 🚀 Quick Start

### Installation
```bash
cd scam-detection-honeypot
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

### Test API
```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/process-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key-12345" \
  -d '{
    "sessionId": "test-123",
    "message": {
      "sender": "scammer",
      "text": "Your bank account will be blocked today. Verify immediately.",
      "timestamp": "2026-01-21T10:15:30Z"
    },
    "conversationHistory": [],
    "metadata": { "channel": "SMS", "language": "English", "locale": "IN" }
  }'

# Using test script
./scripts/test-api.sh dev-api-key-12345 http://localhost:3000
```

### Access Dashboard
```
http://localhost:3000/dashboard
```

---

## 📊 Scam Types Detected

| Scam Type | Detection Method | Severity |
|-----------|-----------------|----------|
| Banking Fraud | Pattern + NLP | HIGH |
| UPI Fraud | Pattern + Context | HIGH |
| Phishing | URL + Keywords | HIGH |
| Lottery Scam | Keywords | MEDIUM |
| Job Scam | Keywords | MEDIUM |
| KYC Fraud | Pattern | HIGH |
| OTP Theft | Direct Request | CRITICAL |
| Card Fraud | Pattern | HIGH |
| Tax Refund | Keywords | MEDIUM |
| Insurance | Keywords | MEDIUM |
| Customer Care Impersonation | Pattern | HIGH |
| EMI Default Threat | Keywords | MEDIUM |
| Cashback Reward | Keywords | LOW |
| SIM Swap | Keywords | HIGH |
| Investment | Keywords | MEDIUM |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint

# Test API endpoints
./scripts/test-api.sh
```

---

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f honeypot

# Scale (if needed)
docker-compose up -d --scale honeypot=3
```

---

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Statistics
```bash
curl -H "x-api-key: dev-api-key-12345" \
  http://localhost:3000/api/v1/statistics
```

### Dashboard
Access at: `http://localhost:3000/dashboard`

---

## 🔒 Security Features

- ✅ API Key Authentication (x-api-key header)
- ✅ Rate Limiting (configurable)
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Input validation (Joi)
- ✅ Request sanitization
- ✅ Sensitive data masking
- ✅ No credential storage

---

## 📚 Documentation

- **README.md** - Complete project documentation
- **src/docs/swagger.yaml** - OpenAPI/Swagger specification
- **src/docs/api-schema.json** - Complete API schema
- **PROJECT_SUMMARY.md** - This summary document

---

## 🎯 Evaluation Criteria Coverage

| Criteria | Implementation |
|----------|----------------|
| Scam Detection Accuracy | Multi-layered detection with 65%+ confidence threshold |
| Quality of Agentic Engagement | 25+ response strategies, human-like persona |
| Intelligence Extraction | 9+ data types extracted with risk scoring |
| API Stability | Rate limiting, error handling, validation |
| Ethical Behavior | No impersonation, responsible data handling |

---

## 📞 Support

For questions or issues:
- Email: security@gov.in
- Documentation: `/api-docs` (when running)
- Dashboard: `/dashboard`

---

## 🏆 Project Status

**Status:** ✅ COMPLETE AND READY FOR DEPLOYMENT

All requirements from the hackathon PDF have been implemented:
- ✅ REST API with authentication
- ✅ Scam detection engine
- ✅ AI agent for engagement
- ✅ Multi-turn conversations
- ✅ Intelligence extraction
- ✅ Mandatory callback to GUVI
- ✅ Comprehensive JSON files
- ✅ Documentation and tests
- ✅ Monitoring dashboard

---

<p align="center">
  <strong>Built for National Cybersecurity 🛡️</strong>
</p>
