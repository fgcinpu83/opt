// src/utils/metrics.js - Prometheus metrics
const client = require('prom-client');

const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const jobSubmittedTotal = new client.Counter({
  name: 'job_submitted_total',
  help: 'Total number of jobs submitted',
  labelNames: ['type']
});

const jobCompletedTotal = new client.Counter({
  name: 'job_completed_total',
  help: 'Total number of jobs completed',
  labelNames: ['type', 'status']
});

const jobDuration = new client.Histogram({
  name: 'job_duration_seconds',
  help: 'Job execution duration in seconds',
  labelNames: ['type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300]
});

const jobQueueLength = new client.Gauge({
  name: 'job_queue_length',
  help: 'Current number of jobs in queue'
});

const workerActiveCount = new client.Gauge({
  name: 'worker_active_count',
  help: 'Number of active workers'
});

const workerDisconnectedTotal = new client.Counter({
  name: 'worker_disconnected_total',
  help: 'Total number of worker disconnections'
});

const workerSessionExpiredTotal = new client.Counter({
  name: 'worker_session_expired_total',
  help: 'Total number of worker session expiration events',
  labelNames: ['worker_id']
});

function initializeMetrics() {
  register.registerMetric(httpRequestDuration);
  register.registerMetric(httpRequestTotal);
  register.registerMetric(jobSubmittedTotal);
  register.registerMetric(jobCompletedTotal);
  register.registerMetric(jobDuration);
  register.registerMetric(jobQueueLength);
  register.registerMetric(workerActiveCount);
  register.registerMetric(workerDisconnectedTotal);
  register.registerMetric(workerSessionExpiredTotal);
}

module.exports = {
  register,
  initializeMetrics,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    jobSubmittedTotal,
    jobCompletedTotal,
    jobDuration,
    jobQueueLength,
    workerActiveCount,
    workerDisconnectedTotal,
    workerSessionExpiredTotal
  }
};
