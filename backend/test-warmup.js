/**
 * Warm-up Strategy Test Script
 *
 * Tests the warm-up strategy service and integration with messages controller
 *
 * Test Scenarios:
 * 1. Warm-up service functions (calculateAccountAge, getDailyLimitForConsultant, etc.)
 * 2. Different account ages and their corresponding limits
 * 3. Warm-up status reporting
 * 4. Next phase calculations
 * 5. Database integration
 */

require('dotenv').config();
const WarmupStrategy = require('./src/services/warmup/strategy');
const db = require('./src/config/database');
const logger = require('./src/utils/logger');

// Test utilities
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 WARM-UP STRATEGY TEST SUITE');
  console.log('='.repeat(70) + '\n');

  for (const { name, fn } of tests) {
    try {
      console.log(`\n📝 Test: ${name}`);
      await fn();
      console.log(`✅ PASSED: ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed (${tests.length} total)`);
  console.log(`   Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(70) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Helper: Create date X days ago
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ==========================================
// UNIT TESTS: Warm-up Service Functions
// ==========================================

test('Test 1: calculateAccountAge - Week 1 (5 days ago)', () => {
  const connectedAt = daysAgo(5);
  const age = WarmupStrategy.calculateAccountAge(connectedAt);
  console.log(`   Connected: ${connectedAt.toISOString()}`);
  console.log(`   Account Age: ${age} week(s)`);

  if (age !== 1) {
    throw new Error(`Expected 1 week, got ${age}`);
  }
});

test('Test 2: calculateAccountAge - Week 2 (14 days ago)', () => {
  const connectedAt = daysAgo(14);
  const age = WarmupStrategy.calculateAccountAge(connectedAt);
  console.log(`   Connected: ${connectedAt.toISOString()}`);
  console.log(`   Account Age: ${age} week(s)`);

  if (age !== 2) {
    throw new Error(`Expected 2 weeks, got ${age}`);
  }
});

test('Test 3: calculateAccountAge - Week 5+ (40 days ago)', () => {
  const connectedAt = daysAgo(40);
  const age = WarmupStrategy.calculateAccountAge(connectedAt);
  console.log(`   Connected: ${connectedAt.toISOString()}`);
  console.log(`   Account Age: ${age} week(s)`);

  if (age < 5) {
    throw new Error(`Expected 5+ weeks, got ${age}`);
  }
});

test('Test 4: getDailyLimitForConsultant - Week 1 (20 msg/day)', () => {
  const connectedAt = daysAgo(5);
  const limitInfo = WarmupStrategy.getDailyLimitForConsultant(connectedAt);
  console.log(`   Limit: ${limitInfo.limit}`);
  console.log(`   Phase: ${limitInfo.phase} (${limitInfo.phaseName})`);
  console.log(`   Weeks: ${limitInfo.weeksSinceConnection}`);

  if (limitInfo.limit !== 20) {
    throw new Error(`Expected limit 20, got ${limitInfo.limit}`);
  }
  if (limitInfo.phase !== 'PHASE_1') {
    throw new Error(`Expected PHASE_1, got ${limitInfo.phase}`);
  }
});

test('Test 5: getDailyLimitForConsultant - Week 3 (100 msg/day)', () => {
  const connectedAt = daysAgo(21);
  const limitInfo = WarmupStrategy.getDailyLimitForConsultant(connectedAt);
  console.log(`   Limit: ${limitInfo.limit}`);
  console.log(`   Phase: ${limitInfo.phase} (${limitInfo.phaseName})`);
  console.log(`   Weeks: ${limitInfo.weeksSinceConnection}`);

  if (limitInfo.limit !== 100) {
    throw new Error(`Expected limit 100, got ${limitInfo.limit}`);
  }
  if (limitInfo.phase !== 'PHASE_3') {
    throw new Error(`Expected PHASE_3, got ${limitInfo.phase}`);
  }
});

test('Test 6: getDailyLimitForConsultant - Week 5+ (200 msg/day)', () => {
  const connectedAt = daysAgo(40);
  const limitInfo = WarmupStrategy.getDailyLimitForConsultant(connectedAt);
  console.log(`   Limit: ${limitInfo.limit}`);
  console.log(`   Phase: ${limitInfo.phase} (${limitInfo.phaseName})`);
  console.log(`   Weeks: ${limitInfo.weeksSinceConnection}`);

  if (limitInfo.limit !== 200) {
    throw new Error(`Expected limit 200, got ${limitInfo.limit}`);
  }
  if (limitInfo.phase !== 'PHASE_5') {
    throw new Error(`Expected PHASE_5, got ${limitInfo.phase}`);
  }
});

test('Test 7: getDailyLimitForConsultant - Custom limit (lower)', () => {
  const connectedAt = daysAgo(40); // Week 5+ (200 default)
  const customLimit = 150; // Custom limit lower than warm-up
  const limitInfo = WarmupStrategy.getDailyLimitForConsultant(connectedAt, customLimit);
  console.log(`   Warm-up Limit: ${limitInfo.warmupLimit}`);
  console.log(`   Custom Limit: ${limitInfo.customLimit}`);
  console.log(`   Final Limit: ${limitInfo.limit}`);
  console.log(`   Custom Applied: ${limitInfo.isCustomLimitApplied}`);

  if (limitInfo.limit !== 150) {
    throw new Error(`Expected limit 150 (custom), got ${limitInfo.limit}`);
  }
  if (!limitInfo.isCustomLimitApplied) {
    throw new Error('Expected custom limit to be applied');
  }
});

test('Test 8: getDailyLimitForConsultant - Not connected (null)', () => {
  const limitInfo = WarmupStrategy.getDailyLimitForConsultant(null);
  console.log(`   Limit: ${limitInfo.limit}`);
  console.log(`   Phase: ${limitInfo.phase}`);
  console.log(`   Reason: ${limitInfo.reason}`);

  if (limitInfo.limit !== 0) {
    throw new Error(`Expected limit 0, got ${limitInfo.limit}`);
  }
  if (limitInfo.phase !== 'NOT_CONNECTED') {
    throw new Error(`Expected NOT_CONNECTED, got ${limitInfo.phase}`);
  }
});

test('Test 9: getWarmupStatus - 50% usage', () => {
  const connectedAt = daysAgo(5); // Week 1, limit 20
  const currentDailyCount = 10; // 50% used
  const status = WarmupStrategy.getWarmupStatus(connectedAt, currentDailyCount);
  console.log(`   Status: ${status.status} (${status.statusName})`);
  console.log(`   Sent: ${status.sent}/${status.limit}`);
  console.log(`   Remaining: ${status.remaining}`);
  console.log(`   Percentage Used: ${status.percentageUsed}%`);
  console.log(`   Can Send: ${status.canSendMessage}`);

  if (status.percentageUsed !== 50.0) {
    throw new Error(`Expected 50% usage, got ${status.percentageUsed}%`);
  }
  if (!status.canSendMessage) {
    throw new Error('Expected canSendMessage to be true');
  }
});

test('Test 10: getWarmupStatus - Limit exceeded', () => {
  const connectedAt = daysAgo(5); // Week 1, limit 20
  const currentDailyCount = 25; // Over limit
  const status = WarmupStrategy.getWarmupStatus(connectedAt, currentDailyCount);
  console.log(`   Status: ${status.status} (${status.statusName})`);
  console.log(`   Sent: ${status.sent}/${status.limit}`);
  console.log(`   Remaining: ${status.remaining}`);
  console.log(`   Can Send: ${status.canSendMessage}`);

  if (status.canSendMessage) {
    throw new Error('Expected canSendMessage to be false (limit exceeded)');
  }
  if (status.remaining !== 0) {
    throw new Error(`Expected remaining 0, got ${status.remaining}`);
  }
});

test('Test 11: isWarmupComplete - Week 1 (not complete)', () => {
  const connectedAt = daysAgo(5);
  const isComplete = WarmupStrategy.isWarmupComplete(connectedAt);
  console.log(`   Connected: ${connectedAt.toISOString()}`);
  console.log(`   Warm-up Complete: ${isComplete}`);

  if (isComplete) {
    throw new Error('Expected warm-up to NOT be complete');
  }
});

test('Test 12: isWarmupComplete - Week 5+ (complete)', () => {
  const connectedAt = daysAgo(40);
  const isComplete = WarmupStrategy.isWarmupComplete(connectedAt);
  console.log(`   Connected: ${connectedAt.toISOString()}`);
  console.log(`   Warm-up Complete: ${isComplete}`);

  if (!isComplete) {
    throw new Error('Expected warm-up to be complete');
  }
});

test('Test 13: getDaysUntilNextPhase - Week 1', () => {
  const connectedAt = daysAgo(5);
  const phaseInfo = WarmupStrategy.getDaysUntilNextPhase(connectedAt);
  console.log(`   Current Phase: ${phaseInfo.currentPhase} (${phaseInfo.currentPhaseName})`);
  console.log(`   Current Limit: ${phaseInfo.currentLimit} msg/day`);
  console.log(`   Next Phase: ${phaseInfo.nextPhase} (${phaseInfo.nextPhaseName})`);
  console.log(`   Next Limit: ${phaseInfo.nextLimit} msg/day`);
  console.log(`   Days Until Next: ${phaseInfo.daysRemaining}`);

  if (phaseInfo.currentPhase !== 'PHASE_1') {
    throw new Error(`Expected PHASE_1, got ${phaseInfo.currentPhase}`);
  }
  if (phaseInfo.nextPhase !== 'PHASE_2') {
    throw new Error(`Expected next phase PHASE_2, got ${phaseInfo.nextPhase}`);
  }
});

test('Test 14: getDaysUntilNextPhase - Week 5+ (complete)', () => {
  const connectedAt = daysAgo(40);
  const phaseInfo = WarmupStrategy.getDaysUntilNextPhase(connectedAt);
  console.log(`   Current Phase: ${phaseInfo.currentPhase}`);
  console.log(`   Next Phase: ${phaseInfo.nextPhase || 'None'}`);
  console.log(`   Message: ${phaseInfo.message}`);

  if (phaseInfo.currentPhase !== 'PHASE_5') {
    throw new Error(`Expected PHASE_5, got ${phaseInfo.currentPhase}`);
  }
  if (phaseInfo.nextPhase !== null) {
    throw new Error('Expected no next phase (warm-up complete)');
  }
});

test('Test 15: getWarmupSchedule - All phases', () => {
  const schedule = WarmupStrategy.getWarmupSchedule();
  console.log(`   Total Weeks: ${schedule.totalWeeks}`);
  console.log(`   Description: ${schedule.description}`);
  console.log(`   Week 1: ${schedule.schedule.week1} msg/day`);
  console.log(`   Week 2: ${schedule.schedule.week2} msg/day`);
  console.log(`   Week 3: ${schedule.schedule.week3} msg/day`);
  console.log(`   Week 4: ${schedule.schedule.week4} msg/day`);
  console.log(`   Week 5+: ${schedule.schedule.week5} msg/day`);

  if (schedule.totalWeeks !== 5) {
    throw new Error(`Expected 5 weeks, got ${schedule.totalWeeks}`);
  }
  if (schedule.schedule.week1 !== 20) {
    throw new Error(`Expected week1 limit 20, got ${schedule.schedule.week1}`);
  }
});

// ==========================================
// INTEGRATION TEST: Database
// ==========================================

test('Test 16: Database - Update consultant connected_at', async () => {
  // Get first consultant
  const result = await db.query('SELECT id, name FROM consultants LIMIT 1');

  if (result.rows.length === 0) {
    console.log('   ⚠️ No consultants found, skipping database test');
    return;
  }

  const consultant = result.rows[0];
  const connectedAt = daysAgo(7); // Week 1

  // Update connected_at
  await db.query(
    'UPDATE consultants SET connected_at = $1 WHERE id = $2',
    [connectedAt, consultant.id]
  );

  // Verify
  const verify = await db.query('SELECT connected_at FROM consultants WHERE id = $1', [consultant.id]);
  console.log(`   Consultant ID: ${consultant.id}`);
  console.log(`   Consultant Name: ${consultant.name}`);
  console.log(`   Connected At: ${verify.rows[0].connected_at}`);

  if (!verify.rows[0].connected_at) {
    throw new Error('Failed to update connected_at');
  }
});

test('Test 17: Database - Verify warm-up limit calculation', async () => {
  // Get consultant with connected_at
  const result = await db.query(
    'SELECT id, name, connected_at, daily_limit FROM consultants WHERE connected_at IS NOT NULL LIMIT 1'
  );

  if (result.rows.length === 0) {
    console.log('   ⚠️ No consultants with connected_at found, skipping test');
    return;
  }

  const consultant = result.rows[0];
  const limitInfo = WarmupStrategy.getDailyLimitForConsultant(consultant.connected_at, consultant.daily_limit);

  console.log(`   Consultant: ${consultant.name}`);
  console.log(`   Connected At: ${consultant.connected_at}`);
  console.log(`   Custom Daily Limit: ${consultant.daily_limit}`);
  console.log(`   Warm-up Phase: ${limitInfo.phase} (${limitInfo.phaseName})`);
  console.log(`   Effective Limit: ${limitInfo.limit} msg/day`);
  console.log(`   Weeks Since Connection: ${limitInfo.weeksSinceConnection}`);

  if (!limitInfo.limit || limitInfo.limit < 0) {
    throw new Error('Invalid warm-up limit calculation');
  }
});

// ==========================================
// RUN ALL TESTS
// ==========================================

runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
