# 🚀 Deployment Guide - Agentic Honey-Pot

## Quick Deployment Options

### Option 1: Local Development

```bash
# 1. Navigate to project
cd scam-detection-honeypot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set your API keys

# 4. Start server
npm start

# Server running at http://localhost:3000
```

### Option 2: Docker Deployment

```bash
# 1. Build and run
docker-compose up -d

# 2. Check logs
docker-compose logs -f honeypot

# 3. Stop
docker-compose down
```

### Option 3: Cloud Deployment (Render/Railway)

1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

---

## Environment Variables

Create a `.env` file:

```env
# Server
NODE_ENV=production
PORT=3000

# Security
API_KEYS=your-secret-api-key-1,your-secret-api-key-2

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# GUVI Callback (MANDATORY)
GUVI_CALLBACK_URL=https://hackathon.guvi.in/api/updateHoneyPotFinalResult
CALLBACK_TIMEOUT=5000
CALLBACK_MAX_RETRIES=3
CALLBACK_RETRY_DELAY=1000

# Session
SESSION_MAX_AGE=1800000
```

---

## API Testing

### Test with curl

```bash
# Health check
curl http://localhost:3000/health

# Process scam message
curl -X POST http://localhost:3000/api/v1/process-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "sessionId": "test-session-123",
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
  }'
```

### Test with script

```bash
./scripts/test-api.sh your-api-key http://localhost:3000
```

---

## Verification Checklist

- [ ] Server starts without errors
- [ ] Health check returns 200
- [ ] API key authentication works
- [ ] Scam detection returns correct results
- [ ] AI agent generates responses
- [ ] Intelligence is extracted
- [ ] Callback is sent to GUVI endpoint
- [ ] Dashboard is accessible
- [ ] Statistics endpoint works

---

## Production Considerations

1. **Use strong API keys** (32+ characters)
2. **Enable HTTPS** in production
3. **Set up monitoring** (logs, metrics)
4. **Configure rate limiting** appropriately
5. **Use environment variables** for secrets
6. **Enable CORS** only for trusted origins

---

## Troubleshooting

### Port already in use
```bash
# Change port in .env
PORT=3001
```

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Callback failing
```bash
# Check CALLBACK_TIMEOUT in .env
# Verify network connectivity to GUVI endpoint
```

---

## Support

For issues, check:
1. Logs in `logs/` directory
2. Health endpoint response
3. API key configuration
4. Environment variables
