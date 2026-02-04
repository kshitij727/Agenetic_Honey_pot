/**
 * Session Manager
 * Manages conversation sessions and their lifecycle
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Session {
  constructor(id, metadata = {}) {
    this.id = id;
    this.metadata = metadata;
    this.messages = [];
    this.isAgentActive = false;
    this.scamDetected = false;
    this.intelligence = {
      bankAccounts: [],
      upiIds: [],
      phoneNumbers: [],
      phishingLinks: [],
      emails: [],
      cardNumbers: [],
      ifscCodes: [],
      suspiciousKeywords: [],
      credentialRequests: []
    };
    this.createdAt = new Date().toISOString();
    this.lastActivity = new Date().toISOString();
    this.endedAt = null;
    this.callbackSent = false;
  }

  addMessage(message) {
    this.messages.push({
      ...message,
      receivedAt: new Date().toISOString()
    });
    this.lastActivity = new Date().toISOString();
  }

  getMessages() {
    return this.messages;
  }

  getMessageCount() {
    return this.messages.length;
  }

  activateAgent() {
    this.isAgentActive = true;
    this.scamDetected = true;
    logger.info(`Agent activated for session: ${this.id}`);
  }

  updateIntelligence(newIntelligence) {
    // Merge new intelligence with existing
    Object.keys(newIntelligence).forEach(key => {
      if (Array.isArray(newIntelligence[key])) {
        this.intelligence[key] = [...new Set([
          ...this.intelligence[key],
          ...newIntelligence[key]
        ])];
      }
    });
  }

  end() {
    this.endedAt = new Date().toISOString();
    this.isAgentActive = false;
  }

  toJSON() {
    return {
      id: this.id,
      metadata: this.metadata,
      messages: this.messages,
      isAgentActive: this.isAgentActive,
      scamDetected: this.scamDetected,
      intelligence: this.intelligence,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      endedAt: this.endedAt,
      callbackSent: this.callbackSent
    };
  }
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessionAge = 30 * 60 * 1000; // 30 minutes
    this.maxSessions = 10000;
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Create a new session
   */
  createSession(sessionId, metadata = {}) {
    // Check if we've reached max sessions
    if (this.sessions.size >= this.maxSessions) {
      this.cleanupOldSessions();
    }

    const id = sessionId || uuidv4();
    
    if (this.sessions.has(id)) {
      logger.warn(`Session ${id} already exists`);
      return this.sessions.get(id);
    }

    const session = new Session(id, metadata);
    this.sessions.set(id, session);
    
    logger.info(`Created new session: ${id}`, { metadata });
    
    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId) {
    return this.sessions.has(sessionId);
  }

  /**
   * Update session
   */
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Cannot update - session ${sessionId} not found`);
      return null;
    }

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && session.hasOwnProperty(key)) {
        session[key] = updates[key];
      }
    });

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Close a session
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Cannot close - session ${sessionId} not found`);
      return false;
    }

    session.end();
    
    // Keep session for a while before removing (for analysis)
    setTimeout(() => {
      this.sessions.delete(sessionId);
      logger.info(`Session ${sessionId} removed from memory`);
    }, 60 * 60 * 1000); // Remove after 1 hour

    logger.info(`Session ${sessionId} closed`);
    return true;
  }

  /**
   * Delete a session immediately
   */
  deleteSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logger.info(`Session ${sessionId} deleted`);
    }
    return deleted;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    const active = [];
    for (const [id, session] of this.sessions.entries()) {
      if (!session.endedAt) {
        active.push({
          id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          messageCount: session.getMessageCount(),
          isAgentActive: session.isAgentActive
        });
      }
    }
    return active;
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    const sessions = [];
    for (const [id, session] of this.sessions.entries()) {
      sessions.push({
        id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        messageCount: session.getMessageCount(),
        isAgentActive: session.isAgentActive,
        scamDetected: session.scamDetected,
        endedAt: session.endedAt
      });
    }
    return sessions;
  }

  /**
   * Get session statistics
   */
  getStatistics() {
    const sessions = this.getAllSessions();
    const activeSessions = sessions.filter(s => !s.endedAt);
    const endedSessions = sessions.filter(s => s.endedAt);
    
    const scamDetectedSessions = sessions.filter(s => s.scamDetected);
    const agentActiveSessions = sessions.filter(s => s.isAgentActive);

    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const avgMessagesPerSession = sessions.length > 0 ? totalMessages / sessions.length : 0;

    return {
      total: sessions.length,
      active: activeSessions.length,
      ended: endedSessions.length,
      scamDetected: scamDetectedSessions.length,
      agentActive: agentActiveSessions.length,
      totalMessages,
      averageMessagesPerSession: Math.round(avgMessagesPerSession * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup old/inactive sessions
   */
  cleanupOldSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.lastActivity).getTime();
      const age = now - lastActivity;

      // Remove sessions inactive for too long
      if (age > this.maxSessionAge) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old sessions`);
    }

    return cleaned;
  }

  /**
   * Get sessions by status
   */
  getSessionsByStatus(status) {
    const sessions = [];
    for (const [id, session] of this.sessions.entries()) {
      if (status === 'active' && !session.endedAt) {
        sessions.push(session.toJSON());
      } else if (status === 'ended' && session.endedAt) {
        sessions.push(session.toJSON());
      } else if (status === 'scam' && session.scamDetected) {
        sessions.push(session.toJSON());
      }
    }
    return sessions;
  }

  /**
   * Export session data
   */
  exportSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      ...session.toJSON(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Export all sessions
   */
  exportAllSessions() {
    const exported = [];
    for (const [id, session] of this.sessions.entries()) {
      exported.push(this.exportSession(id));
    }
    return exported;
  }

  /**
   * Search sessions
   */
  searchSessions(criteria) {
    const results = [];
    
    for (const [id, session] of this.sessions.entries()) {
      let match = true;

      if (criteria.scamDetected !== undefined) {
        match = match && session.scamDetected === criteria.scamDetected;
      }

      if (criteria.isAgentActive !== undefined) {
        match = match && session.isAgentActive === criteria.isAgentActive;
      }

      if (criteria.channel) {
        match = match && session.metadata.channel === criteria.channel;
      }

      if (criteria.startDate) {
        const sessionDate = new Date(session.createdAt);
        match = match && sessionDate >= new Date(criteria.startDate);
      }

      if (criteria.endDate) {
        const sessionDate = new Date(session.createdAt);
        match = match && sessionDate <= new Date(criteria.endDate);
      }

      if (match) {
        results.push(session.toJSON());
      }
    }

    return results;
  }

  /**
   * Get session timeline
   */
  getSessionTimeline(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      createdAt: session.createdAt,
      agentActivatedAt: session.isAgentActive ? session.messages[0]?.receivedAt : null,
      messages: session.messages.map(m => ({
        sender: m.sender,
        timestamp: m.timestamp,
        textLength: m.text?.length
      })),
      endedAt: session.endedAt
    };
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all sessions (use with caution)
   */
  clearAllSessions() {
    const count = this.sessions.size;
    this.sessions.clear();
    logger.warn(`All ${count} sessions cleared`);
    return count;
  }
}

module.exports = SessionManager;
