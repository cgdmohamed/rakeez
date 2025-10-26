/**
 * Performance Monitoring Utility
 * Tracks request timing, slow queries, and system performance metrics
 */

import type { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  timestamp: Date;
  method: string;
  path: string;
  duration: number;
  statusCode: number;
  userId?: string;
  ip?: string;
}

// Store recent slow requests for monitoring
const slowRequests: PerformanceMetrics[] = [];
const MAX_SLOW_REQUESTS = 100;

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  FAST: 100,        // Requests under 100ms are fast
  ACCEPTABLE: 500,  // Requests under 500ms are acceptable
  SLOW: 1000,       // Requests over 1s are slow
  CRITICAL: 3000,   // Requests over 3s are critical
};

/**
 * Request timing middleware
 * Logs slow requests and tracks performance metrics
 */
export function requestTimingMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startHrTime = process.hrtime();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture timing
  res.end = function(this: Response, chunk?: any, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void): any {
    // Calculate duration
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime(startHrTime);
    const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;
    
    // Create performance metric
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      duration: Math.round(durationMs),
      statusCode: res.statusCode,
      userId: req.user?.id,
      ip: req.ip,
    };
    
    // Log slow requests
    if (durationMs > PERFORMANCE_THRESHOLDS.SLOW) {
      logSlowRequest(metric);
    }
    
    // Add timing header for debugging
    res.setHeader('X-Response-Time', `${Math.round(durationMs)}ms`);
    
    // Call original end function with proper arguments
    if (typeof encodingOrCb === 'function') {
      return originalEnd.call(this, chunk, encodingOrCb);
    } else {
      return originalEnd.call(this, chunk, encodingOrCb as BufferEncoding, cb);
    }
  };
  
  next();
}

/**
 * Log slow requests for monitoring
 */
function logSlowRequest(metric: PerformanceMetrics) {
  const severity = metric.duration > PERFORMANCE_THRESHOLDS.CRITICAL 
    ? 'CRITICAL' 
    : 'SLOW';
  
  console.warn(`⚠️  ${severity} REQUEST: ${metric.method} ${metric.path} took ${metric.duration}ms`);
  
  // Store in slow requests array
  slowRequests.push(metric);
  
  // Keep only last MAX_SLOW_REQUESTS
  if (slowRequests.length > MAX_SLOW_REQUESTS) {
    slowRequests.shift();
  }
}

/**
 * Get recent slow requests for monitoring
 */
export function getSlowRequests(): PerformanceMetrics[] {
  return [...slowRequests];
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const now = Date.now();
  const last5Minutes = slowRequests.filter(
    req => now - req.timestamp.getTime() < 5 * 60 * 1000
  );
  const last15Minutes = slowRequests.filter(
    req => now - req.timestamp.getTime() < 15 * 60 * 1000
  );
  
  return {
    slow_requests_total: slowRequests.length,
    slow_requests_last_5min: last5Minutes.length,
    slow_requests_last_15min: last15Minutes.length,
    slowest_endpoints: getEndpointStats(slowRequests),
    thresholds: PERFORMANCE_THRESHOLDS,
  };
}

/**
 * Get endpoint statistics
 */
function getEndpointStats(requests: PerformanceMetrics[]) {
  const stats: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};
  
  requests.forEach(req => {
    const key = `${req.method} ${req.path}`;
    if (!stats[key]) {
      stats[key] = { count: 0, avgDuration: 0, maxDuration: 0 };
    }
    
    stats[key].count++;
    stats[key].avgDuration = (stats[key].avgDuration * (stats[key].count - 1) + req.duration) / stats[key].count;
    stats[key].maxDuration = Math.max(stats[key].maxDuration, req.duration);
  });
  
  // Return top 10 slowest endpoints
  return Object.entries(stats)
    .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
    .slice(0, 10)
    .map(([endpoint, data]) => ({
      endpoint,
      ...data,
      avgDuration: Math.round(data.avgDuration),
    }));
}

/**
 * Clear slow requests history
 */
export function clearSlowRequests() {
  slowRequests.length = 0;
}

/**
 * Memory usage tracking
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  
  return {
    rss: formatBytes(usage.rss),           // Resident Set Size
    heapTotal: formatBytes(usage.heapTotal), // Total heap allocated
    heapUsed: formatBytes(usage.heapUsed),   // Heap actually used
    external: formatBytes(usage.external),   // C++ objects bound to JS
    arrayBuffers: formatBytes(usage.arrayBuffers), // ArrayBuffers and SharedArrayBuffers
    heapUsedPercentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
  };
}

/**
 * CPU usage tracking (approximate)
 */
export function getCPUUsage() {
  const usage = process.cpuUsage();
  
  return {
    user: Math.round(usage.user / 1000), // Microseconds to milliseconds
    system: Math.round(usage.system / 1000),
    total: Math.round((usage.user + usage.system) / 1000),
  };
}

/**
 * System health check
 */
export function getSystemHealth() {
  return {
    uptime: Math.round(process.uptime()),
    memory: getMemoryUsage(),
    performance: getPerformanceSummary(),
    node_version: process.version,
    platform: process.platform,
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Database query timing helper
 */
export function measureQueryTime<T>(queryFn: () => Promise<T>, queryName: string): Promise<T> {
  const start = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - start;
      
      if (duration > PERFORMANCE_THRESHOLDS.SLOW) {
        console.warn(`⚠️  SLOW QUERY: ${queryName} took ${duration}ms`);
      }
      
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      console.error(`❌ FAILED QUERY: ${queryName} failed after ${duration}ms`, error);
      throw error;
    });
}
