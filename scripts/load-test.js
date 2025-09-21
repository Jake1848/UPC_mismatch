import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const authFailures = new Counter('auth_failures');
const websocketConnections = new Counter('websocket_connections');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 50 },   // Ramp up to 50 users over 5 minutes
    { duration: '10m', target: 100 }, // Ramp up to 100 users over 10 minutes

    // Stay at peak
    { duration: '15m', target: 100 }, // Stay at 100 users for 15 minutes

    // Ramp down
    { duration: '5m', target: 50 },   // Ramp down to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // HTTP errors should be less than 1%
    errors: ['rate<0.01'],

    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of requests should be below 1000ms
    'http_req_duration{status:200}': ['p(99)<1000'],

    // Authentication failures should be less than 0.1%
    auth_failures: ['count<10'],

    // Average response time should be below 200ms
    response_time: ['avg<200'],
  ],
};

// Environment configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!' },
];

// Authentication helper
function authenticate() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const authSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response has token': (r) => JSON.parse(r.body).token !== undefined,
  });

  if (!authSuccess) {
    authFailures.add(1);
    return null;
  }

  const { token } = JSON.parse(loginResponse.body);
  return {
    token,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

// Main test scenarios
export default function () {
  const auth = authenticate();

  if (!auth) {
    errorRate.add(1);
    return;
  }

  // Test different API endpoints
  group('API Load Tests', () => {
    // Health check
    group('Health Check', () => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}/health`);
      const duration = Date.now() - start;

      responseTime.add(duration);

      const success = check(response, {
        'health check status is 200': (r) => r.status === 200,
        'health check response time < 100ms': () => duration < 100,
        'health check has status field': (r) => JSON.parse(r.body).status === 'healthy',
      });

      if (!success) errorRate.add(1);
    });

    // User profile
    group('User Profile', () => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}/api/v1/auth/profile`, {
        headers: auth.headers,
      });
      const duration = Date.now() - start;

      responseTime.add(duration);

      const success = check(response, {
        'profile fetch status is 200': (r) => r.status === 200,
        'profile response time < 200ms': () => duration < 200,
        'profile has user data': (r) => JSON.parse(r.body).user !== undefined,
      });

      if (!success) errorRate.add(1);
    });

    // Organizations list
    group('Organizations', () => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}/api/v1/organizations`, {
        headers: auth.headers,
      });
      const duration = Date.now() - start;

      responseTime.add(duration);

      const success = check(response, {
        'organizations fetch status is 200': (r) => r.status === 200,
        'organizations response time < 300ms': () => duration < 300,
      });

      if (!success) errorRate.add(1);
    });

    // Analyses list
    group('Analyses', () => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}/api/v1/analyses?page=1&limit=20`, {
        headers: auth.headers,
      });
      const duration = Date.now() - start;

      responseTime.add(duration);

      const success = check(response, {
        'analyses fetch status is 200': (r) => r.status === 200,
        'analyses response time < 500ms': () => duration < 500,
        'analyses has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
      });

      if (!success) errorRate.add(1);
    });

    // Conflicts list
    group('Conflicts', () => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}/api/v1/conflicts?page=1&limit=20`, {
        headers: auth.headers,
      });
      const duration = Date.now() - start;

      responseTime.add(duration);

      const success = check(response, {
        'conflicts fetch status is 200': (r) => r.status === 200,
        'conflicts response time < 500ms': () => duration < 500,
      });

      if (!success) errorRate.add(1);
    });

    // Detailed health check (more intensive)
    if (Math.random() < 0.1) { // Only 10% of users hit this endpoint
      group('Detailed Health Check', () => {
        const start = Date.now();
        const response = http.get(`${BASE_URL}/health/detailed`);
        const duration = Date.now() - start;

        responseTime.add(duration);

        const success = check(response, {
          'detailed health status is 200 or 503': (r) => r.status === 200 || r.status === 503,
          'detailed health response time < 1000ms': () => duration < 1000,
        });

        if (!success) errorRate.add(1);
      });
    }
  });

  // WebSocket connection test (5% of users)
  if (Math.random() < 0.05) {
    group('WebSocket Connection', () => {
      const wsUrl = BASE_URL.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket';

      const response = ws.connect(wsUrl, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      }, function (socket) {
        websocketConnections.add(1);

        socket.on('open', () => {
          console.log('WebSocket connected');
        });

        socket.on('message', (data) => {
          console.log('WebSocket message received:', data);
        });

        socket.on('error', (e) => {
          console.log('WebSocket error:', e);
          errorRate.add(1);
        });

        // Keep connection open for 30 seconds
        sleep(30);

        socket.close();
      });

      check(response, {
        'websocket connection successful': (r) => r && r.status === 101,
      });
    });
  }

  // Random think time between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

// Setup function to prepare test data
export function setup() {
  console.log('Setting up load test...');

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API not accessible. Health check returned ${healthCheck.status}`);
  }

  console.log('API health check passed');

  // Create test users if they don't exist
  for (const user of testUsers) {
    const registerResponse = http.post(`${BASE_URL}/api/v1/auth/register`, {
      email: user.email,
      password: user.password,
      firstName: 'Load',
      lastName: 'Test',
      organizationName: 'Load Test Org',
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // User might already exist, that's okay
    if (registerResponse.status === 201 || registerResponse.status === 400) {
      console.log(`Test user ${user.email} ready`);
    } else {
      console.warn(`Failed to create test user ${user.email}: ${registerResponse.status}`);
    }
  }

  return { baseUrl: BASE_URL };
}

// Teardown function to clean up
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Base URL: ${data.baseUrl}`);

  // Log summary metrics
  console.log('Test completed. Check the k6 summary for detailed results.');
}

// Stress test scenario
export const stressTest = {
  executor: 'ramping-arrival-rate',
  startRate: 10,
  timeUnit: '1s',
  preAllocatedVUs: 50,
  maxVUs: 200,
  stages: [
    { target: 50, duration: '5m' },
    { target: 100, duration: '10m' },
    { target: 200, duration: '5m' },
    { target: 0, duration: '5m' },
  ],
};

// Spike test scenario
export const spikeTest = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 20 },   // Normal load
    { duration: '1m', target: 200 },  // Spike
    { duration: '2m', target: 20 },   // Back to normal
    { duration: '1m', target: 0 },    // Scale down
  ],
};

// Soak test scenario (for long-running stability)
export const soakTest = {
  executor: 'constant-vus',
  vus: 50,
  duration: '2h',
};