import express from 'express';
import { 
  processWebhookEvent, 
  getWebhookConfig, 
  getWebhookStats,
  generateWebhookId,
  registerWebhook,
  generateWebhookUrl
} from '../services/webhookService.js';

const router = express.Router();

// General webhook endpoint
router.post('/general/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { eventType, eventData } = req.body;

    if (!eventType || !eventData) {
      return res.status(400).json({ 
        error: 'Missing eventType or eventData' 
      });
    }

    const result = await processWebhookEvent(webhookId, eventType, eventData);
    
    res.json({
      success: true,
      webhookId,
      eventType,
      result
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
});

// Email-specific webhook endpoint
router.post('/email/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { eventType, eventData } = req.body;

    // Validate email-specific event types
    const validEmailEvents = ['user.created', 'oauth.success', 'login.credentials'];
    if (!validEmailEvents.includes(eventType)) {
      return res.status(400).json({ 
        error: 'Invalid email event type',
        validEvents: validEmailEvents
      });
    }

    const result = await processWebhookEvent(webhookId, eventType, eventData);
    
    res.json({
      success: true,
      webhookId,
      eventType,
      result,
      emailSent: true
    });
  } catch (error) {
    console.error('Email webhook processing error:', error);
    res.status(500).json({ 
      error: 'Email webhook processing failed',
      message: error.message 
    });
  }
});

// Create new webhook
router.post('/create', (req, res) => {
  try {
    const { type = 'general', eventTypes = [], description } = req.body;
    
    const webhookId = generateWebhookId();
    const webhookUrl = generateWebhookUrl(webhookId, type);
    
    registerWebhook(webhookId, {
      type,
      eventTypes,
      description,
      url: webhookUrl
    });

    res.json({
      success: true,
      webhook: {
        id: webhookId,
        url: webhookUrl,
        type,
        eventTypes,
        description
      }
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ 
      error: 'Failed to create webhook',
      message: error.message 
    });
  }
});

// Get webhook information
router.get('/:webhookId', (req, res) => {
  try {
    const { webhookId } = req.params;
    const config = getWebhookConfig(webhookId);
    
    if (!config) {
      return res.status(404).json({ 
        error: 'Webhook not found' 
      });
    }

    res.json({
      success: true,
      webhook: {
        id: webhookId,
        ...config
      }
    });
  } catch (error) {
    console.error('Error getting webhook:', error);
    res.status(500).json({ 
      error: 'Failed to get webhook',
      message: error.message 
    });
  }
});

// Get webhook statistics
router.get('/stats/all', (req, res) => {
  try {
    const stats = getWebhookStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting webhook stats:', error);
    res.status(500).json({ 
      error: 'Failed to get webhook stats',
      message: error.message 
    });
  }
});

// Test webhook endpoint (for development)
router.post('/test/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    // Test event data
    const testEventData = {
      user: {
        id: 999,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      },
      credentials: {
        username: 'testuser_123',
        password: 'temp_password_456'
      },
      loginUrl: `${process.env.FRONTEND_URL}/login`
    };

    const result = await processWebhookEvent(webhookId, 'user.created', testEventData);
    
    res.json({
      success: true,
      message: 'Test webhook processed',
      webhookId,
      result
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ 
      error: 'Test webhook failed',
      message: error.message 
    });
  }
});

export default router;