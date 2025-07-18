#!/usr/bin/env node

// scripts/deploy-monitoring.js
const fs = require('fs').promises;
const path = require('path');

class DeploymentMonitor {
    constructor() {
        this.config = {
            dataDir: path.join(__dirname, '../src/data'),
            cacheDir: path.join(__dirname, '../src/data/cache'),
            logsDir: path.join(__dirname, '../logs'),
            maxCacheSize: 100 * 1024 * 1024, // 100MB
            maxLogSize: 50 * 1024 * 1024, // 50MB
            retentionDays: 30
        };
    }
    
    async setupDirectories() {
        console.log('Setting up monitoring directories...');
        
        const directories = [
            this.config.dataDir,
            this.config.cacheDir,
            this.config.logsDir,
            path.join(this.config.dataDir, 'cache'),
            path.join(this.config.logsDir, 'errors'),
            path.join(this.config.logsDir, 'api'),
            path.join(this.config.logsDir, 'performance')
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            } catch (error) {
                console.log(`Directory already exists: ${dir}`);
            }
        }
    }
    
    async createEnvironmentConfig() {
        console.log('Creating environment configuration...');
        
        const envConfig = {
            NODE_ENV: 'production',
            PORT: process.env.PORT || 3001,
            LOG_LEVEL: 'info',
            CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
            MAX_RETRIES: 3,
            RATE_LIMIT_WINDOW: 60000, // 1 minute
            ERROR_RETENTION_DAYS: 30,
            MONITORING_INTERVAL: 300000, // 5 minutes
            HEALTH_CHECK_INTERVAL: 60000 // 1 minute
        };
        
        const envContent = Object.entries(envConfig)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        try {
            await fs.writeFile(path.join(__dirname, '../.env.production'), envContent);
            console.log('Created production environment config');
        } catch (error) {
            console.error('Failed to create environment config:', error.message);
        }
    }
    
    async createMonitoringConfig() {
        console.log('Creating monitoring configuration...');
        
        const monitoringConfig = {
            apiLimits: {
                huggingface: {
                    requestsPerMinute: 60,
                    dailyLimit: 1000,
                    costPerRequest: 0.0001
                },
                groq: {
                    requestsPerMinute: 120,
                    dailyLimit: 5000,
                    costPerRequest: 0.0002
                },
                youtube: {
                    requestsPerMinute: 100,
                    dailyLimit: 10000,
                    costPerRequest: 0.0001
                },
                ollama: {
                    requestsPerMinute: 200,
                    dailyLimit: 10000,
                    costPerRequest: 0.00005
                }
            },
            cacheConfig: {
                maxSize: this.config.maxCacheSize,
                defaultTTL: 24 * 60 * 60 * 1000,
                cleanupInterval: 60 * 60 * 1000
            },
            errorConfig: {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 30000,
                retentionDays: this.config.retentionDays
            },
            healthThresholds: {
                errorRate: 0.1,
                responseTime: 5000,
                cacheHitRate: 0.3,
                apiUtilization: 0.8
            }
        };
        
        try {
            await fs.writeFile(
                path.join(this.config.dataDir, 'monitoring_config.json'),
                JSON.stringify(monitoringConfig, null, 2)
            );
            console.log('Created monitoring configuration');
        } catch (error) {
            console.error('Failed to create monitoring config:', error.message);
        }
    }
    
    async createLogRotationScript() {
        console.log('Creating log rotation script...');
        
        const logRotationScript = `#!/bin/bash
# Log rotation script for production monitoring

LOG_DIR="${this.config.logsDir}"
RETENTION_DAYS=${this.config.retentionDays}
MAX_LOG_SIZE=${this.config.maxLogSize}

# Rotate logs if they exceed size limit
for log_file in $LOG_DIR/*.log; do
    if [ -f "$log_file" ]; then
        file_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null)
        if [ $file_size -gt $MAX_LOG_SIZE ]; then
            mv "$log_file" "$log_file.$(date +%Y%m%d_%H%M%S)"
            touch "$log_file"
            echo "Rotated $log_file"
        fi
    fi
done

# Remove old log files
find $LOG_DIR -name "*.log.*" -mtime +$RETENTION_DAYS -delete

# Remove old cache files
find ${this.config.cacheDir} -name "*.json" -mtime +$RETENTION_DAYS -delete

echo "Log rotation completed at $(date)"
`;
        
        try {
            const scriptPath = path.join(__dirname, '../scripts/rotate-logs.sh');
            await fs.writeFile(scriptPath, logRotationScript);
            await fs.chmod(scriptPath, '755');
            console.log('Created log rotation script');
        } catch (error) {
            console.error('Failed to create log rotation script:', error.message);
        }
    }
    
    async createHealthCheckScript() {
        console.log('Creating health check script...');
        
        const healthCheckScript = `#!/bin/bash
# Health check script for production monitoring

API_URL="http://localhost:${process.env.PORT || 3001}"
HEALTH_ENDPOINT="/api/monitoring/health"
STATUS_ENDPOINT="/api/monitoring/status"

# Check if the application is running
if ! curl -f -s "$API_URL$HEALTH_ENDPOINT" > /dev/null; then
    echo "❌ Application is not responding"
    exit 1
fi

# Get health status
HEALTH_RESPONSE=$(curl -s "$API_URL$HEALTH_ENDPOINT")
STATUS_RESPONSE=$(curl -s "$API_URL$STATUS_ENDPOINT")

# Parse health status
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Application is healthy"
    exit 0
elif [ "$HEALTH_STATUS" = "degraded" ]; then
    echo "⚠️ Application is degraded"
    exit 1
else
    echo "❌ Application is unhealthy"
    exit 2
fi
`;
        
        try {
            const scriptPath = path.join(__dirname, '../scripts/health-check.sh');
            await fs.writeFile(scriptPath, healthCheckScript);
            await fs.chmod(scriptPath, '755');
            console.log('Created health check script');
        } catch (error) {
            console.error('Failed to create health check script:', error.message);
        }
    }
    
    async createPM2Config() {
        console.log('Creating PM2 configuration...');
        
        const pm2Config = {
            apps: [{
                name: 'sentiment-analyzer',
                script: 'server.js',
                instances: 'max',
                exec_mode: 'cluster',
                env: {
                    NODE_ENV: 'production',
                    PORT: process.env.PORT || 3001
                },
                env_production: {
                    NODE_ENV: 'production',
                    PORT: process.env.PORT || 3001
                },
                error_file: path.join(this.config.logsDir, 'error.log'),
                out_file: path.join(this.config.logsDir, 'out.log'),
                log_file: path.join(this.config.logsDir, 'combined.log'),
                time: true,
                max_memory_restart: '1G',
                node_args: '--max-old-space-size=1024',
                watch: false,
                ignore_watch: ['node_modules', 'logs', 'data'],
                max_restarts: 10,
                min_uptime: '10s'
            }]
        };
        
        try {
            await fs.writeFile(
                path.join(__dirname, '../ecosystem.config.js'),
                `module.exports = ${JSON.stringify(pm2Config, null, 2)}`
            );
            console.log('Created PM2 configuration');
        } catch (error) {
            console.error('Failed to create PM2 config:', error.message);
        }
    }
    
    async createDockerConfig() {
        console.log('Creating Docker configuration...');
        
        const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install dependencies
RUN npm ci --only=production
RUN cd dashboard && npm ci --only=production

# Copy application code
COPY . .

# Build React app
RUN cd dashboard && npm run build

# Create necessary directories
RUN mkdir -p /app/src/data/cache /app/logs

# Expose port
EXPOSE ${process.env.PORT || 3001}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${process.env.PORT || 3001}/api/monitoring/health || exit 1

# Start the application
CMD ["npm", "start"]
`;
        
        const dockerCompose = `version: '3.8'

services:
  sentiment-analyzer:
    build: .
    ports:
      - "${process.env.PORT || 3001}:${process.env.PORT || 3001}"
    environment:
      - NODE_ENV=production
      - PORT=${process.env.PORT || 3001}
    volumes:
      - ./src/data:/app/src/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${process.env.PORT || 3001}/api/monitoring/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;
        
        try {
            await fs.writeFile(path.join(__dirname, '../Dockerfile'), dockerfile);
            await fs.writeFile(path.join(__dirname, '../docker-compose.yml'), dockerCompose);
            console.log('Created Docker configuration');
        } catch (error) {
            console.error('Failed to create Docker config:', error.message);
        }
    }
    
    async createDeploymentScript() {
        console.log('Creating deployment script...');
        
        const deployScript = `#!/bin/bash
# Production deployment script

set -e

echo "🚀 Starting production deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build React app
echo "🔨 Building React application..."
npm run build

# Set up monitoring
echo "📊 Setting up monitoring..."
node scripts/deploy-monitoring.js

# Create log rotation cron job
echo "📝 Setting up log rotation..."
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/rotate-logs.sh") | crontab -

# Start the application
echo "🚀 Starting application..."
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to start application..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
else
    echo "Using npm to start application..."
    npm start
fi

echo "✅ Deployment completed successfully!"
echo "📊 Monitor your application at: http://localhost:${process.env.PORT || 3001}/api/monitoring/health"
`;
        
        try {
            const scriptPath = path.join(__dirname, '../scripts/deploy.sh');
            await fs.writeFile(scriptPath, deployScript);
            await fs.chmod(scriptPath, '755');
            console.log('Created deployment script');
        } catch (error) {
            console.error('Failed to create deployment script:', error.message);
        }
    }
    
    async run() {
        console.log('Starting production monitoring setup...');
        
        try {
            await this.setupDirectories();
            await this.createEnvironmentConfig();
            await this.createMonitoringConfig();
            await this.createLogRotationScript();
            await this.createHealthCheckScript();
            await this.createPM2Config();
            await this.createDockerConfig();
            await this.createDeploymentScript();
            
            console.log('Production monitoring setup completed successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Review and customize the configuration files');
            console.log('2. Set up your environment variables in .env.production');
            console.log('3. Run: chmod +x scripts/deploy.sh');
            console.log('4. Run: ./scripts/deploy.sh');
            console.log('5. Monitor your application at: http://localhost:3001/api/monitoring/health');
            
        } catch (error) {
            console.error('Setup failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the deployment setup
if (require.main === module) {
    const deployer = new DeploymentMonitor();
    deployer.run();
}

module.exports = DeploymentMonitor; 