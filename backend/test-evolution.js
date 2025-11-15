require('dotenv').config({ path: '../.env' });
const evolutionClient = require('./src/services/evolution/client');
const logger = require('./src/utils/logger');

/**
 * Test Evolution API Client
 */
async function testEvolutionAPI() {
  logger.info('='.repeat(50));
  logger.info('Testing Evolution API Client');
  logger.info('='.repeat(50));

  try {
    // Test 1: Connection Test
    logger.info('\n[Test 1] Testing API connection...');
    const isConnected = await evolutionClient.testConnection();
    logger.info(`Connection test result: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

    if (!isConnected) {
      logger.error('Evolution API is not accessible. Please check if Evolution API is running.');
      process.exit(1);
    }

    logger.info('\n✅ All tests passed!');
    logger.info('='.repeat(50));
    process.exit(0);

  } catch (error) {
    logger.error(`\n❌ Test failed: ${error.message}`);
    logger.error('='.repeat(50));
    process.exit(1);
  }
}

// Run tests
testEvolutionAPI();
