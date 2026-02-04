# 🛡️ Agentic Honey-Pot for Scam Detection & Intelligence Extraction

> **National-Level Cybersecurity Project**  
> An AI-powered system that detects scam intent and autonomously engages scammers to extract actionable intelligence without revealing detection.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![API](https://img.shields.io/badge/API-REST-orange.svg)](src/docs/swagger.yaml)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

Online scams such as bank fraud, UPI fraud, phishing, and fake offers are becoming increasingly adaptive. Scammers change their tactics based on user responses, making traditional detection systems ineffective.

This project implements an **Agentic Honey-Pot** — an AI-powered system that:
- 🔍 Detects scam or fraudulent messages using ML/NLP
- 🤖 Activates an autonomous AI Agent to engage scammers
- 🎭 Maintains a believable human-like persona
- 💬 Handles multi-turn conversations
- 📊 Extracts scam-related intelligence
- 📡 Returns structured results via REST API
- 📤 Sends mandatory final callback to evaluation endpoint

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Scam Detection** | Multi-layered detection using patterns, NLP, and ML classification |
| **AI Agent** | Autonomous engagement with human-like responses |
| **Intelligence Extraction** | Extracts bank accounts, UPI IDs, phishing links, phone numbers |
| **Multi-turn Conversations** | Maintains context across conversation sessions |
| **REST API** | Secure, rate-limited API with authentication |
| **Real-time Dashboard** | Monitor sessions and extracted intelligence |
| **Callback Service** | Mandatory final result reporting to GUVI endpoint |

### Scam Types Detected

- 🏦 Banking Fraud
- 💳 UPI/Payment Fraud
- 🎣 Phishing Attempts
- 🎰 Lottery Scams
- 💼 Job Scams
- 🆔 KYC Fraud
- 💳 Card Fraud
- 📱 SIM Swap Scams
- 💰 Investment Scams

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                            │
│  POST /api/v1/process-message                                    │
│  Headers: x-api-key: YOUR_SECRET_KEY                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                        │
│  • API Key Validation                                            │
│  • Rate Limiting                                                 │
│  • Request Validation (Joi)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SCAM DETECTION ENGINE                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pattern   │  │    NLP      │  │    ML Classifier        │  │
│  │   Matching  │  │  Analysis   │  │  (Bayesian)             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    Combined Confidence Score                     │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   SCAM DETECTED │           │  NO SCAM        │
    │   (Score > 0.65)│           │  (Pass-through) │
    └────────┬────────┘           └─────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AI AGENT                                  │
│  • Generates human-like responses                                │
│  • Maintains conversation context                                │
│  • Adapts strategy based on scam type                            │
│  • Extracts intelligence from responses                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INTELLIGENCE EXTRACTOR                          │
│  • Bank Account Numbers                                          │
│  • UPI IDs                                                       │
│  • Phone Numbers                                                 │
│  • Phishing URLs                                                 │
│  • Email Addresses                                               │
│  • Card Numbers                                                  │
│  • IFSC Codes                                                    │
│  • Suspicious Keywords                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CALLBACK SERVICE                              │
│  POST https://hackathon.guvi.in/api/updateHoneyPotFinalResult  │
│  (Mandatory for evaluation)                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/agentic-honeypot.git
cd agentic-honeypot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start

# Or start in development mode
npm run dev
```

The server will start on `http://localhost:3000`

---

## 📚 API Documentation

### Authentication

All API endpoints require an API key in the header:

```
x-api-key: YOUR_SECRET_API_KEY
Content-Type: application/json
```

### Main Endpoints

#### 1. Process Message

```http
POST /api/v1/process-message
```

**Request Body:**

```json
{
  "sessionId": "abc-123-session",
  "message": {
    "sender": "scammer",
    "text": "Your bank account will be blocked today. Verify immediately.",
    "timestamp": "2026-01-21T10:15:30Z"
  },
  "conversationHistory": [],
  "metadata": {
    "channel": "SMS",
    "language": "English",
    "locale": "IN"
  }
}
```

**Response:**

```json
{
  "status": "success",
  "reply": "Why is my account being suspended?",
  "scamDetected": true,
  "confidence": 0.85,
  "intent": "banking_fraud"
}
```

#### 2. Get Statistics

```http
GET /api/v1/statistics
```

**Response:**

```json
{
  "status": "success",
  "statistics": {
    "total": 150,
    "active": 12,
    "ended": 138,
    "scamDetected": 142,
    "agentActive": 12,
    "totalMessages": 1847,
    "averageMessagesPerSession": 12.31,
    "timestamp": "2026-01-21T10:15:30Z"
  }
}
```

#### 3. Batch Process

```http
POST /api/v1/batch-process
```

**Request Body:**

```json
{
  "messages": [
    { "id": "1", "text": "Your account will be blocked." },
    { "id": "2", "text": "You have won a prize!" }
  ]
}
```

### API Documentation (Swagger)

Access interactive API documentation at:

```
http://localhost:3000/api-docs
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `API_KEYS` | Comma-separated API keys | - |
| `LOG_LEVEL` | Logging level | info |
| `GUVI_CALLBACK_URL` | Final callback endpoint | https://hackathon.guvi.in/api/updateHoneyPotFinalResult |
| `CALLBACK_TIMEOUT` | Callback timeout (ms) | 5000 |
| `CALLBACK_MAX_RETRIES` | Max callback retries | 3 |
| `SCAM_CONFIDENCE_THRESHOLD` | Scam detection threshold | 0.65 |

### JSON Configuration Files

| File | Purpose |
|------|---------|
| `src/data/scamPatterns.json` | Scam detection patterns and training data |
| `src/data/intentPatterns.json` | Intent classification patterns |
| `src/data/responseTemplates.json` | AI agent response templates |
| `src/config/persona.json` | AI agent persona configuration |

---

## 💡 Usage

### Basic Usage

```javascript
const axios = require('axios');

const API_KEY = 'your-api-key';
const API_URL = 'http://localhost:3000/api/v1';

async function detectScam(message) {
  const response = await axios.post(
    `${API_URL}/process-message`,
    {
      sessionId: `session-${Date.now()}`,
      message: {
        sender: 'scammer',
        text: message,
        timestamp: new Date().toISOString()
      },
      conversationHistory: [],
      metadata: {
        channel: 'SMS',
        language: 'English',
        locale: 'IN'
      }
    },
    {
      headers: {
        'x-api-key': API_KEY
      }
    }
  );

  return response.data;
}

// Example usage
detectScam('Your bank account will be blocked today. Verify immediately.')
  .then(result => {
    console.log('Scam detected:', result.scamDetected);
    console.log('AI Response:', result.reply);
  });
```

### Dashboard

Access the monitoring dashboard at:

```
http://localhost:3000/dashboard
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

### Test Coverage

- ✅ Authentication & Authorization
- ✅ Scam Detection Engine
- ✅ AI Agent Response Generation
- ✅ Intelligence Extraction
- ✅ API Endpoints
- ✅ Session Management
- ✅ Callback Service

---

## 🚢 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t agentic-honeypot .
docker run -p 3000:3000 --env-file .env agentic-honeypot
```

### Cloud Deployment

#### AWS Elastic Beanstalk

```bash
eb init -p node.js agentic-honeypot
eb create production
eb open
```

#### Heroku

```bash
heroku create agentic-honeypot
git push heroku main
```

---

## 📊 Monitoring

### Health Check

```http
GET /health
```

### Statistics

```http
GET /api/v1/statistics
```

### Logs

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- GUVI Hackathon for the challenge
- National Cyber Security Team
- Open source community for NLP/ML libraries

---

## 📞 Support

For support, email security@gov.in or join our Slack channel.

---

<p align="center">
  <strong>Built with ❤️ for National Cybersecurity</strong>
</p>
