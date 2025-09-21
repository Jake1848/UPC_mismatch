# Disaster Recovery Procedures

## Overview

This document outlines the disaster recovery procedures for the UPC Conflict Resolver production environment. It covers various failure scenarios and step-by-step recovery processes.

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

- **RTO (Recovery Time Objective)**: 4 hours maximum downtime
- **RPO (Recovery Point Objective)**: 1 hour maximum data loss
- **Backup Frequency**: Every 6 hours + transaction log backups every 15 minutes

## Emergency Contacts

### Primary Team
- **DevOps Lead**: [Your Contact]
- **Database Admin**: [Your Contact]
- **Security Lead**: [Your Contact]
- **Product Owner**: [Your Contact]

### External Contacts
- **AWS Support**: +1-206-266-4064
- **Hosting Provider**: [Provider Contact]
- **CDN Support**: [CDN Contact]

## Disaster Scenarios

### 1. Complete Infrastructure Failure

**Symptoms:**
- All services unreachable
- Database connection failures
- Application completely down

**Recovery Procedure:**

1. **Assess Damage** (5 minutes)
   ```bash
   # Check service status
   ./scripts/health-check.sh production

   # Check infrastructure
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Activate Backup Infrastructure** (30 minutes)
   ```bash
   # Switch to backup region/provider
   export BACKUP_REGION=us-west-2

   # Deploy to backup infrastructure
   ./scripts/deploy-advanced.sh production --force
   ```

3. **Restore Latest Database Backup** (45 minutes)
   ```bash
   # Find latest backup
   ./scripts/restore-database.sh --list

   # Restore from latest backup
   ./scripts/restore-database.sh --from-s3 --yes latest_backup.sql.gz
   ```

4. **Update DNS Records** (15 minutes)
   - Point production domain to backup infrastructure
   - Update health check endpoints
   - Verify SSL certificates

5. **Validate Recovery** (15 minutes)
   ```bash
   # Run comprehensive health checks
   curl -sf https://api.upcresolver.com/health/deep

   # Run critical functionality tests
   ./scripts/post-deployment-tests.sh
   ```

**Total Estimated Recovery Time: 2 hours**

### 2. Database Corruption/Failure

**Symptoms:**
- Database connection errors
- Data inconsistency
- Transaction failures

**Recovery Procedure:**

1. **Stop Application Traffic** (5 minutes)
   ```bash
   # Enable maintenance mode
   docker-compose -f docker-compose.prod.yml stop api
   ```

2. **Assess Database Damage** (10 minutes)
   ```bash
   # Check database status
   psql $DATABASE_URL -c "\l"

   # Check for corruption
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_database;"
   ```

3. **Restore from Backup** (30 minutes)
   ```bash
   # Create emergency backup of current state
   ./scripts/backup-database.sh

   # Restore from latest known good backup
   ./scripts/restore-database.sh --yes latest_good_backup.sql.gz
   ```

4. **Validate Data Integrity** (15 minutes)
   ```bash
   # Run data validation queries
   psql $DATABASE_URL -f scripts/validate-data-integrity.sql
   ```

5. **Restart Services** (10 minutes)
   ```bash
   # Start application services
   docker-compose -f docker-compose.prod.yml up -d

   # Verify health
   curl -sf https://api.upcresolver.com/health
   ```

**Total Estimated Recovery Time: 1 hour 10 minutes**

### 3. Security Breach

**Symptoms:**
- Unauthorized access detected
- Suspicious database queries
- Data exfiltration alerts

**Recovery Procedure:**

1. **Immediate Response** (10 minutes)
   ```bash
   # Stop all services immediately
   docker-compose -f docker-compose.prod.yml down

   # Block suspicious IPs at firewall level
   # Document the incident
   ```

2. **Secure Environment** (30 minutes)
   ```bash
   # Rotate all secrets and API keys
   # Update all passwords
   # Revoke all JWT tokens
   # Update security groups/firewall rules
   ```

3. **Investigate Breach** (60 minutes)
   ```bash
   # Analyze logs
   grep -i "suspicious_pattern" logs/audit-*.log

   # Check for data compromise
   # Document findings
   ```

4. **Clean Deployment** (45 minutes)
   ```bash
   # Deploy fresh infrastructure
   ./scripts/deploy-advanced.sh production --force

   # Restore data from pre-breach backup
   ./scripts/restore-database.sh pre_breach_backup.sql.gz
   ```

5. **Security Hardening** (30 minutes)
   ```bash
   # Apply additional security measures
   # Update WAF rules
   # Enable additional monitoring
   ```

**Total Estimated Recovery Time: 3 hours 15 minutes**

### 4. Data Center Outage

**Symptoms:**
- Regional service unavailability
- Network connectivity issues
- Infrastructure provider alerts

**Recovery Procedure:**

1. **Activate DR Site** (15 minutes)
   ```bash
   # Switch to disaster recovery region
   export AWS_REGION=us-west-2

   # Update configuration for DR site
   cp .env.production.dr .env.production
   ```

2. **Deploy to DR Infrastructure** (45 minutes)
   ```bash
   # Deploy full stack to DR region
   ./scripts/deploy-advanced.sh production --force
   ```

3. **Restore Data** (60 minutes)
   ```bash
   # Restore from latest cross-region backup
   ./scripts/restore-database.sh --from-s3 \
     s3://upc-resolver-dr-backups/latest.sql.gz
   ```

4. **Update DNS and Load Balancers** (20 minutes)
   - Update Route53 records
   - Failover load balancer configuration
   - Update CDN origin servers

5. **Validate Full Functionality** (20 minutes)
   ```bash
   # Run full test suite
   npm run test:e2e:production

   # Validate critical user journeys
   ```

**Total Estimated Recovery Time: 2 hours 40 minutes**

## Backup Verification

### Daily Backup Verification
```bash
# Automated verification script
#!/bin/bash
LATEST_BACKUP=$(aws s3 ls s3://upc-resolver-backups/database-backups/ | sort | tail -1 | awk '{print $4}')

# Download and verify backup
aws s3 cp "s3://upc-resolver-backups/database-backups/$LATEST_BACKUP" /tmp/
gunzip -t "/tmp/$LATEST_BACKUP"

if [ $? -eq 0 ]; then
    echo "✅ Backup verification successful: $LATEST_BACKUP"
else
    echo "❌ Backup verification failed: $LATEST_BACKUP"
    # Send alert
fi
```

### Weekly Recovery Testing
```bash
# Test restore to staging environment
./scripts/restore-database.sh --environment staging latest_production_backup.sql.gz

# Run data integrity checks
./scripts/validate-data-integrity.sh staging

# Generate recovery test report
./scripts/generate-recovery-report.sh
```

## Communication Plan

### Internal Communication
1. **Immediate Notification** (0-5 minutes)
   - Slack: #incidents channel
   - PagerDuty alerts
   - Email to on-call team

2. **Status Updates** (Every 15 minutes)
   - Slack updates with current status
   - Estimated time to resolution
   - Actions being taken

3. **Resolution Notification**
   - Services restored confirmation
   - Post-incident review scheduled

### External Communication
1. **Status Page Updates**
   - Update status.upcresolver.com
   - Twitter/social media updates
   - Email to enterprise customers

2. **Customer Notifications**
   - In-app notification when services restored
   - Email summary of incident
   - Credit/compensation if applicable

## Post-Incident Procedures

### 1. Post-Mortem (Within 24 hours)
- Timeline reconstruction
- Root cause analysis
- Impact assessment
- Lessons learned

### 2. Action Items
- Technical improvements
- Process improvements
- Training needs
- Tool enhancements

### 3. Documentation Updates
- Update runbooks
- Improve monitoring
- Enhance alerting
- Update disaster recovery procedures

## Testing Schedule

### Monthly
- Backup restoration test
- Failover procedure test
- Security incident simulation

### Quarterly
- Full disaster recovery drill
- Cross-region failover test
- Complete infrastructure rebuild

### Annually
- Disaster recovery plan review
- Update emergency contacts
- Review and update RTOs/RPOs
- Vendor disaster recovery capability review

## Monitoring and Alerting

### Critical Alerts
- Database connection failures
- Service unavailability (> 2 minutes)
- High error rates (> 5%)
- Disk space critical (< 10%)
- Memory usage critical (> 90%)

### Warning Alerts
- Response time degradation
- Database slow queries
- Certificate expiration (< 30 days)
- Backup failures

## Vendor Contacts and SLAs

### AWS Support
- **Business Support**: 4-hour response time
- **Enterprise Support**: 1-hour response time for production issues

### Database Provider
- **Support Level**: 24/7 premium support
- **Response Time**: 30 minutes for critical issues

### CDN Provider
- **Support Level**: 24/7 support
- **Response Time**: 1 hour for traffic issues

## Compliance Considerations

### Data Protection
- GDPR compliance during recovery
- Data residency requirements
- Encryption requirements during backup/restore

### Audit Requirements
- Maintain audit logs during incidents
- Document all recovery actions
- Preserve evidence for compliance reporting

## Review and Updates

This disaster recovery plan should be reviewed and updated:
- After any major incident
- Quarterly as part of business continuity planning
- When infrastructure changes significantly
- When team composition changes

**Last Updated**: [Current Date]
**Next Review Date**: [Quarterly Review Date]
**Document Owner**: DevOps Team