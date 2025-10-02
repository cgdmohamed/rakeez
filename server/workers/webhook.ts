import { redisService } from '../services/redis';
import { processMoyasarWebhook, processTabbyWebhook } from '../utils/webhook';
import { WEBHOOK_CONSTANTS } from '../utils/constants';

class WebhookWorker {
  private isProcessing: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the webhook processing worker
   */
  start(): void {
    console.log('Starting webhook worker...');
    
    if (this.intervalId) {
      console.warn('Webhook worker is already running');
      return;
    }

    this.intervalId = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds

    console.log('Webhook worker started');
  }

  /**
   * Stop the webhook processing worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Webhook worker stopped');
    }
  }

  /**
   * Process webhook events from Redis queue
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      // Process Moyasar webhooks
      await this.processProviderQueue('moyasar');
      
      // Process Tabby webhooks
      await this.processProviderQueue('tabby');
      
    } catch (error) {
      console.error('Error processing webhook queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process webhooks for a specific provider
   */
  private async processProviderQueue(provider: 'moyasar' | 'tabby'): Promise<void> {
    try {
      const event = await redisService.dequeueWebhookEvent(provider);
      if (!event) {
        return; // No events in queue
      }

      console.log(`Processing ${provider} webhook event:`, event.id || event.event_id);

      let success = false;
      let error: string | null = null;

      try {
        if (provider === 'moyasar') {
          await processMoyasarWebhook(event);
        } else if (provider === 'tabby') {
          await processTabbyWebhook(event);
        }
        
        success = true;
        console.log(`Successfully processed ${provider} webhook:`, event.id || event.event_id);
        
      } catch (processingError) {
        error = processingError.message;
        console.error(`Error processing ${provider} webhook:`, processingError);
        
        // Check if we should retry
        const shouldRetry = await this.shouldRetryWebhook(event, processingError);
        
        if (shouldRetry) {
          console.log(`Retrying ${provider} webhook:`, event.id || event.event_id);
          
          // Add delay before retrying
          await this.delay(this.getRetryDelay(event.retry_count || 0));
          
          // Re-queue the event with incremented retry count
          await redisService.queueWebhookEvent(provider, {
            ...event,
            retry_count: (event.retry_count || 0) + 1,
            last_error: error,
            last_retry_at: new Date().toISOString(),
          });
        }
      }

      // Log the webhook processing result
      await this.logWebhookResult(provider, event, success, error);

    } catch (error) {
      console.error(`Error processing ${provider} webhook queue:`, error);
    }
  }

  /**
   * Determine if a webhook should be retried
   */
  private async shouldRetryWebhook(event: any, error: any): Promise<boolean> {
    const retryCount = event.retry_count || 0;
    
    // Don't retry if max attempts reached
    if (retryCount >= WEBHOOK_CONSTANTS.MAX_RETRY_ATTEMPTS) {
      return false;
    }

    // Don't retry for certain types of errors (e.g., validation errors)
    const nonRetryableErrors = [
      'invalid payload',
      'validation error',
      'malformed json',
      'invalid signature',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    if (nonRetryableErrors.some(nonRetryable => errorMessage.includes(nonRetryable))) {
      return false;
    }

    return true;
  }

  /**
   * Get retry delay based on attempt number (exponential backoff)
   */
  private getRetryDelay(retryCount: number): number {
    const delays = WEBHOOK_CONSTANTS.RETRY_DELAY_SECONDS;
    const delayIndex = Math.min(retryCount, delays.length - 1);
    return delays[delayIndex] * 1000; // Convert to milliseconds
  }

  /**
   * Add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log webhook processing result
   */
  private async logWebhookResult(
    provider: string, 
    event: any, 
    success: boolean, 
    error: string | null
  ): Promise<void> {
    try {
      const logEntry = {
        provider,
        event_id: event.id || event.event_id,
        event_type: event.type || event.event_type,
        success,
        error,
        retry_count: event.retry_count || 0,
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - (event.queued_at || Date.now()),
      };

      // Store in Redis for webhook history (with TTL)
      const historyKey = `webhook_history:${provider}:${event.id || event.event_id}`;
      await redisService.set(historyKey, logEntry, WEBHOOK_CONSTANTS.WEBHOOK_RETENTION_DAYS * 24 * 3600);

      // You could also store this in the database for permanent logging
      // await storage.createWebhookLog(logEntry);

    } catch (logError) {
      console.error('Error logging webhook result:', logError);
    }
  }

  /**
   * Get webhook processing statistics
   */
  async getStatistics(): Promise<{
    total_processed: number;
    successful: number;
    failed: number;
    retry_count: number;
    queue_sizes: Record<string, number>;
  }> {
    try {
      // Get queue sizes
      const moyasarQueueSize = await redisService.llen('webhooks:moyasar');
      const tabbyQueueSize = await redisService.llen('webhooks:tabby');

      return {
        total_processed: 0, // This would come from persistent storage
        successful: 0,
        failed: 0,
        retry_count: 0,
        queue_sizes: {
          moyasar: moyasarQueueSize,
          tabby: tabbyQueueSize,
        },
      };
    } catch (error) {
      console.error('Error getting webhook statistics:', error);
      return {
        total_processed: 0,
        successful: 0,
        failed: 0,
        retry_count: 0,
        queue_sizes: { moyasar: 0, tabby: 0 },
      };
    }
  }

  /**
   * Clear webhook queues (for maintenance)
   */
  async clearQueues(provider?: 'moyasar' | 'tabby'): Promise<void> {
    try {
      if (provider) {
        await redisService.del(`webhooks:${provider}`);
        console.log(`Cleared ${provider} webhook queue`);
      } else {
        await redisService.del('webhooks:moyasar');
        await redisService.del('webhooks:tabby');
        console.log('Cleared all webhook queues');
      }
    } catch (error) {
      console.error('Error clearing webhook queues:', error);
    }
  }

  /**
   * Manually process a specific webhook event
   */
  async processSpecificEvent(provider: 'moyasar' | 'tabby', event: any): Promise<boolean> {
    try {
      console.log(`Manually processing ${provider} webhook:`, event.id);

      if (provider === 'moyasar') {
        await processMoyasarWebhook(event);
      } else if (provider === 'tabby') {
        await processTabbyWebhook(event);
      }

      await this.logWebhookResult(provider, event, true, null);
      return true;

    } catch (error) {
      console.error(`Error manually processing ${provider} webhook:`, error);
      await this.logWebhookResult(provider, event, false, error.message);
      return false;
    }
  }

  /**
   * Health check for the webhook worker
   */
  isHealthy(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get worker status
   */
  getStatus(): {
    running: boolean;
    processing: boolean;
    uptime: number;
  } {
    return {
      running: this.intervalId !== null,
      processing: this.isProcessing,
      uptime: process.uptime(),
    };
  }
}

// Create singleton instance
export const webhookWorker = new WebhookWorker();

// Auto-start worker if running as main process
if (require.main === module) {
  console.log('Starting webhook worker as standalone process...');
  
  webhookWorker.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down webhook worker...');
    webhookWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down webhook worker...');
    webhookWorker.stop();
    process.exit(0);
  });
}
