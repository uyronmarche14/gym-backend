import crypto from 'crypto';
import { sendLoginCredentials, sendOAuthSuccessEmail } from './emailService.js';

// Generate unique webhook ID
const generateWebhookId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generate webhook URL
const generateWebhookUrl = (webhookId, type = 'general') => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  return `${baseUrl}/webhook/${type}/${webhookId}`;
};

// Store active webhooks (in production, use Redis or database)
const activeWebhooks = new Map();

// Register webhook
const registerWebhook = (webhookId, config) => {
  activeWebhooks.set(webhookId, {
    ...config,
    createdAt: new Date(),
    lastUsed: null,
    useCount: 0
  });
  return webhookId;
};

// Get webhook configuration
const getWebhookConfig = (webhookId) => {
  return activeWebhooks.get(webhookId);
};

// Process webhook event
const processWebhookEvent = async (webhookId, eventType, eventData) => {
  try {
    const config = getWebhookConfig(webhookId);
    if (!config) {
      throw new Error('Webhook not found');
    }

    // Update webhook usage
    config.lastUsed = new Date();
    config.useCount += 1;

    console.log(`Processing webhook event: ${eventType}`, {
      webhookId,
      eventType,
      eventData: { ...eventData, password: eventData.password ? '[REDACTED]' : undefined }
    });

    // Handle different event types
    switch (eventType) {
      case 'user.created':
        await handleUserCreatedEvent(eventData);
        break;
      case 'oauth.success':
        await handleOAuthSuccessEvent(eventData);
        break;
      case 'login.credentials':
        await handleLoginCredentialsEvent(eventData);
        break;
      default:
        console.log(`Unknown event type: ${eventType}`);
    }

    return { success: true, processed: true };
  } catch (error) {
    console.error('Error processing webhook event:', error);
    throw error;
  }
};

// Handle user created event
const handleUserCreatedEvent = async (eventData) => {
  const { user, credentials, loginUrl } = eventData;
  
  if (credentials && credentials.username && credentials.password) {
    await sendLoginCredentials({
      email: user.email,
      firstName: user.firstName || 'User',
      lastName: user.lastName || '',
      username: credentials.username,
      password: credentials.password,
      loginUrl: loginUrl || `${process.env.FRONTEND_URL}/login`
    });
  }
};

// Handle OAuth success event
const handleOAuthSuccessEvent = async (eventData) => {
  const { user, provider, loginUrl } = eventData;
  
  await sendOAuthSuccessEmail({
    email: user.email,
    firstName: user.firstName || user.name || 'User',
    lastName: user.lastName || '',
    provider: provider || 'Google',
    loginUrl: loginUrl || `${process.env.FRONTEND_URL}/dashboard`
  });
};

// Handle login credentials event
const handleLoginCredentialsEvent = async (eventData) => {
  const { user, credentials, loginUrl } = eventData;
  
  await sendLoginCredentials({
    email: user.email,
    firstName: user.firstName || 'User',
    lastName: user.lastName || '',
    username: credentials.username,
    password: credentials.password,
    loginUrl: loginUrl || `${process.env.FRONTEND_URL}/login`
  });
};

// Trigger webhook event
const triggerWebhookEvent = async (eventType, eventData, webhookId = null) => {
  try {
    // If no specific webhook ID, create a temporary one
    if (!webhookId) {
      webhookId = generateWebhookId();
      registerWebhook(webhookId, {
        type: 'temporary',
        eventTypes: [eventType]
      });
    }

    // Process the event immediately (real-time)
    await processWebhookEvent(webhookId, eventType, eventData);

    // In a real-world scenario, you might also:
    // 1. Send HTTP POST to external webhook URLs
    // 2. Emit WebSocket events for real-time UI updates
    // 3. Queue events for retry mechanisms
    
    return { success: true, webhookId, eventType };
  } catch (error) {
    console.error('Error triggering webhook event:', error);
    throw error;
  }
};

// Clean up old webhooks (call periodically)
const cleanupOldWebhooks = () => {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [webhookId, config] of activeWebhooks.entries()) {
    if (now - config.createdAt > maxAge) {
      activeWebhooks.delete(webhookId);
    }
  }
};

// Get webhook statistics
const getWebhookStats = () => {
  const stats = {
    totalWebhooks: activeWebhooks.size,
    webhooks: []
  };

  for (const [webhookId, config] of activeWebhooks.entries()) {
    stats.webhooks.push({
      id: webhookId,
      type: config.type,
      createdAt: config.createdAt,
      lastUsed: config.lastUsed,
      useCount: config.useCount
    });
  }

  return stats;
};

export {
  generateWebhookId,
  generateWebhookUrl,
  registerWebhook,
  getWebhookConfig,
  processWebhookEvent,
  triggerWebhookEvent,
  cleanupOldWebhooks,
  getWebhookStats
};