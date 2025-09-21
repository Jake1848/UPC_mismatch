#!/usr/bin/env node

/**
 * Performance Benchmarking Script for UPC Conflict Resolver
 * Measures and reports performance metrics for critical operations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      benchmarks: {}
    };
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
  }

  async runAllBenchmarks() {
    console.log('🚀 Starting performance benchmarks...');
    console.log(`Environment: ${this.results.environment}`);
    console.log(`API Base URL: ${this.apiBaseUrl}`);
    console.log('');

    try {
      await this.benchmarkApiResponses();
      await this.benchmarkDatabaseQueries();
      await this.benchmarkFileProcessing();
      await this.benchmarkMemoryUsage();
      await this.benchmarkConcurrentUsers();

      this.generateReport();
      this.saveResults();
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  }

  async benchmarkApiResponses() {
    console.log('📡 Benchmarking API response times...');

    const endpoints = [
      { name: 'Health Check', path: '/health', iterations: 100 },
      { name: 'Deep Health Check', path: '/health/deep', iterations: 50 },
      { name: 'Metrics', path: '/health/metrics', iterations: 50 },
      { name: 'API Docs', path: '/api/docs.json', iterations: 20 },
    ];

    this.results.benchmarks.api = {};

    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.name}...`);

      const times = [];
      for (let i = 0; i < endpoint.iterations; i++) {
        const start = process.hrtime.bigint();

        try {
          execSync(`curl -sf "${this.apiBaseUrl}${endpoint.path}" > /dev/null`, {
            stdio: 'pipe',
            timeout: 10000
          });

          const end = process.hrtime.bigint();
          times.push(Number(end - start) / 1000000); // Convert to milliseconds
        } catch (error) {
          console.warn(`    Request ${i + 1} failed: ${error.message}`);
        }
      }

      if (times.length > 0) {
        this.results.benchmarks.api[endpoint.name] = {
          avgResponseTime: this.calculateAverage(times),
          minResponseTime: Math.min(...times),
          maxResponseTime: Math.max(...times),
          p95ResponseTime: this.calculatePercentile(times, 95),
          p99ResponseTime: this.calculatePercentile(times, 99),
          successfulRequests: times.length,
          totalRequests: endpoint.iterations,
          successRate: (times.length / endpoint.iterations) * 100
        };
      }
    }
  }

  async benchmarkDatabaseQueries() {
    console.log('🗄️ Benchmarking database operations...');

    const queries = [
      {
        name: 'Simple Count Query',
        sql: 'SELECT COUNT(*) FROM users',
        iterations: 100
      },
      {
        name: 'Complex Join Query',
        sql: `SELECT u.id, u.email, o.name as org_name, COUNT(a.id) as analysis_count
              FROM users u
              LEFT JOIN organizations o ON u.organization_id = o.id
              LEFT JOIN analyses a ON a.created_by_id = u.id
              GROUP BY u.id, u.email, o.name
              LIMIT 10`,
        iterations: 50
      },
      {
        name: 'Aggregation Query',
        sql: `SELECT
                COUNT(*) as total_conflicts,
                AVG(CASE WHEN resolved_at IS NOT NULL THEN
                  EXTRACT(EPOCH FROM (resolved_at - created_at))/3600
                END) as avg_resolution_hours
              FROM conflicts`,
        iterations: 30
      }
    ];

    this.results.benchmarks.database = {};

    for (const query of queries) {
      console.log(`  Testing ${query.name}...`);

      const times = [];
      for (let i = 0; i < query.iterations; i++) {
        const start = process.hrtime.bigint();

        try {
          // Use psql to execute query (assumes DATABASE_URL is set)
          execSync(`echo "${query.sql}" | psql "${process.env.DATABASE_URL}" > /dev/null`, {
            stdio: 'pipe',
            timeout: 10000
          });

          const end = process.hrtime.bigint();
          times.push(Number(end - start) / 1000000);
        } catch (error) {
          console.warn(`    Query ${i + 1} failed: ${error.message}`);
        }
      }

      if (times.length > 0) {
        this.results.benchmarks.database[query.name] = {
          avgQueryTime: this.calculateAverage(times),
          minQueryTime: Math.min(...times),
          maxQueryTime: Math.max(...times),
          p95QueryTime: this.calculatePercentile(times, 95),
          successfulQueries: times.length,
          totalQueries: query.iterations
        };
      }
    }
  }

  async benchmarkFileProcessing() {
    console.log('📁 Benchmarking file processing...');

    // Create test files of different sizes
    const testFiles = [
      { name: 'Small CSV (1K rows)', size: 1000 },
      { name: 'Medium CSV (10K rows)', size: 10000 },
      { name: 'Large CSV (100K rows)', size: 100000 }
    ];

    this.results.benchmarks.fileProcessing = {};

    for (const testFile of testFiles) {
      console.log(`  Testing ${testFile.name}...`);

      try {
        // Generate test CSV
        const csvContent = this.generateTestCSV(testFile.size);
        const tempFile = `/tmp/test_${testFile.size}_rows.csv`;
        fs.writeFileSync(tempFile, csvContent);

        const start = process.hrtime.bigint();

        // Simulate file processing by reading and parsing
        const content = fs.readFileSync(tempFile, 'utf8');
        const lines = content.split('\n');
        const parsed = lines.map(line => line.split(','));

        const end = process.hrtime.bigint();
        const processingTime = Number(end - start) / 1000000;

        this.results.benchmarks.fileProcessing[testFile.name] = {
          processingTime,
          rowsPerSecond: testFile.size / (processingTime / 1000),
          fileSizeKB: Buffer.byteLength(csvContent, 'utf8') / 1024,
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
        };

        // Clean up
        fs.unlinkSync(tempFile);
      } catch (error) {
        console.warn(`    File processing test failed: ${error.message}`);
      }
    }
  }

  async benchmarkMemoryUsage() {
    console.log('💾 Benchmarking memory usage patterns...');

    const tests = [
      { name: 'Baseline', action: () => {} },
      { name: 'Large Array Creation', action: () => new Array(1000000).fill(0) },
      { name: 'Object Creation', action: () => Array.from({length: 10000}, (_, i) => ({id: i, data: `item_${i}`})) },
      { name: 'String Operations', action: () => 'test'.repeat(100000) }
    ];

    this.results.benchmarks.memory = {};

    for (const test of tests) {
      console.log(`  Testing ${test.name}...`);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const beforeMemory = process.memoryUsage();
      const start = process.hrtime.bigint();

      test.action();

      const end = process.hrtime.bigint();
      const afterMemory = process.memoryUsage();

      this.results.benchmarks.memory[test.name] = {
        executionTime: Number(end - start) / 1000000,
        memoryDeltaMB: {
          rss: (afterMemory.rss - beforeMemory.rss) / 1024 / 1024,
          heapUsed: (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024,
          heapTotal: (afterMemory.heapTotal - beforeMemory.heapTotal) / 1024 / 1024
        },
        finalMemoryMB: {
          rss: afterMemory.rss / 1024 / 1024,
          heapUsed: afterMemory.heapUsed / 1024 / 1024,
          heapTotal: afterMemory.heapTotal / 1024 / 1024
        }
      };
    }
  }

  async benchmarkConcurrentUsers() {
    console.log('👥 Benchmarking concurrent user scenarios...');

    const scenarios = [
      { name: '10 Concurrent Users', users: 10, requests: 5 },
      { name: '50 Concurrent Users', users: 50, requests: 3 },
      { name: '100 Concurrent Users', users: 100, requests: 2 }
    ];

    this.results.benchmarks.concurrency = {};

    for (const scenario of scenarios) {
      console.log(`  Testing ${scenario.name}...`);

      try {
        const start = process.hrtime.bigint();

        // Simulate concurrent requests using curl
        const curlCommands = [];
        for (let i = 0; i < scenario.users; i++) {
          for (let j = 0; j < scenario.requests; j++) {
            curlCommands.push(`curl -sf "${this.apiBaseUrl}/health" > /dev/null`);
          }
        }

        // Execute all commands concurrently (limited by system)
        const command = curlCommands.join(' & ') + ' & wait';
        execSync(command, { stdio: 'pipe', timeout: 30000 });

        const end = process.hrtime.bigint();
        const totalTime = Number(end - start) / 1000000;

        this.results.benchmarks.concurrency[scenario.name] = {
          totalTime,
          totalRequests: scenario.users * scenario.requests,
          requestsPerSecond: (scenario.users * scenario.requests) / (totalTime / 1000),
          avgTimePerRequest: totalTime / (scenario.users * scenario.requests)
        };
      } catch (error) {
        console.warn(`    Concurrency test failed: ${error.message}`);
      }
    }
  }

  generateTestCSV(rows) {
    const headers = 'upc,product_id,product_name,brand,category\n';
    let content = headers;

    for (let i = 1; i <= rows; i++) {
      content += `${this.generateUPC()},P${i.toString().padStart(6, '0')},Product ${i},Brand ${i % 100},Category ${i % 10}\n`;
    }

    return content;
  }

  generateUPC() {
    return Math.floor(Math.random() * 900000000000) + 100000000000;
  }

  calculateAverage(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  calculatePercentile(numbers, percentile) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport() {
    console.log('\n📊 Performance Benchmark Report');
    console.log('================================');
    console.log(`Timestamp: ${this.results.timestamp}`);
    console.log(`Environment: ${this.results.environment}`);
    console.log(`Version: ${this.results.version}`);
    console.log('');

    // API Benchmarks
    if (this.results.benchmarks.api) {
      console.log('🌐 API Response Times:');
      Object.entries(this.results.benchmarks.api).forEach(([name, metrics]) => {
        console.log(`  ${name}:`);
        console.log(`    Average: ${metrics.avgResponseTime.toFixed(2)}ms`);
        console.log(`    95th percentile: ${metrics.p95ResponseTime.toFixed(2)}ms`);
        console.log(`    Success rate: ${metrics.successRate.toFixed(1)}%`);
      });
      console.log('');
    }

    // Database Benchmarks
    if (this.results.benchmarks.database) {
      console.log('🗄️ Database Query Performance:');
      Object.entries(this.results.benchmarks.database).forEach(([name, metrics]) => {
        console.log(`  ${name}:`);
        console.log(`    Average: ${metrics.avgQueryTime.toFixed(2)}ms`);
        console.log(`    95th percentile: ${metrics.p95QueryTime.toFixed(2)}ms`);
      });
      console.log('');
    }

    // File Processing Benchmarks
    if (this.results.benchmarks.fileProcessing) {
      console.log('📁 File Processing Performance:');
      Object.entries(this.results.benchmarks.fileProcessing).forEach(([name, metrics]) => {
        console.log(`  ${name}:`);
        console.log(`    Processing time: ${metrics.processingTime.toFixed(2)}ms`);
        console.log(`    Rows/second: ${metrics.rowsPerSecond.toFixed(0)}`);
        console.log(`    Memory usage: ${metrics.memoryUsageMB.toFixed(1)}MB`);
      });
      console.log('');
    }

    // Performance Summary
    console.log('📈 Performance Summary:');

    if (this.results.benchmarks.api) {
      const avgApiResponse = Object.values(this.results.benchmarks.api)
        .reduce((sum, metric) => sum + metric.avgResponseTime, 0) /
        Object.keys(this.results.benchmarks.api).length;
      console.log(`  Average API Response Time: ${avgApiResponse.toFixed(2)}ms`);
    }

    if (this.results.benchmarks.database) {
      const avgDbQuery = Object.values(this.results.benchmarks.database)
        .reduce((sum, metric) => sum + metric.avgQueryTime, 0) /
        Object.keys(this.results.benchmarks.database).length;
      console.log(`  Average Database Query Time: ${avgDbQuery.toFixed(2)}ms`);
    }

    console.log('');
    console.log('✅ Benchmark completed successfully!');
  }

  saveResults() {
    const resultsDir = path.join(process.cwd(), 'benchmarks');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filename = `benchmark_${this.results.timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`📁 Results saved to: ${filepath}`);

    // Also save as latest.json for CI/CD
    const latestPath = path.join(resultsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(this.results, null, 2));
    console.log(`📁 Latest results: ${latestPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAllBenchmarks().catch(error => {
    console.error('Failed to run benchmarks:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBenchmark;