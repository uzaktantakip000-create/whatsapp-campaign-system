const db = require('../config/database');
const logger = require('../utils/logger');
const evolutionClient = require('./evolution/client');

/**
 * Contact Sync Service
 * Handles synchronization of WhatsApp contacts to database
 */

/**
 * Sync contacts from WhatsApp to database
 * @param {number} consultantId - Consultant ID
 * @param {string} instanceName - Evolution instance name
 * @returns {Promise<Object>} Sync statistics
 */
async function syncContacts(consultantId, instanceName) {
  try {
    logger.info(`[ContactSync] Starting sync for consultant ${consultantId} (${instanceName})`);
    const startTime = Date.now();

    // 1. Fetch contacts from Evolution API
    const whatsappContacts = await evolutionClient.fetchContacts(instanceName);
    logger.info(`[ContactSync] Fetched ${whatsappContacts.length} contacts from WhatsApp`);

    // 2. Get existing contacts from database
    const existingResult = await db.query(
      'SELECT number, id, name, profile_pic_url FROM contacts WHERE consultant_id = $1',
      [consultantId]
    );

    // Create a map for quick lookup
    const existingContactsMap = new Map();
    existingResult.rows.forEach(contact => {
      existingContactsMap.set(contact.number, contact);
    });

    logger.debug(`[ContactSync] Found ${existingContactsMap.size} existing contacts in database`);

    // 3. Separate new and existing contacts
    const newContacts = [];
    const updateContacts = [];

    for (const whatsappContact of whatsappContacts) {
      const existingContact = existingContactsMap.get(whatsappContact.number);

      if (!existingContact) {
        // New contact
        newContacts.push(whatsappContact);
      } else {
        // Check if name or profile pic changed
        if (
          existingContact.name !== whatsappContact.name ||
          existingContact.profile_pic_url !== whatsappContact.profilePicUrl
        ) {
          updateContacts.push({
            id: existingContact.id,
            name: whatsappContact.name,
            profilePicUrl: whatsappContact.profilePicUrl
          });
        }
      }
    }

    logger.info(`[ContactSync] New: ${newContacts.length}, Update: ${updateContacts.length}`);

    // 4. Bulk insert new contacts
    let insertedCount = 0;
    if (newContacts.length > 0) {
      insertedCount = await bulkInsertContacts(consultantId, newContacts);
    }

    // 5. Bulk update existing contacts
    let updatedCount = 0;
    if (updateContacts.length > 0) {
      updatedCount = await bulkUpdateContacts(updateContacts);
    }

    const duration = Date.now() - startTime;
    logger.info(`[ContactSync] Sync completed in ${duration}ms: ${insertedCount} inserted, ${updatedCount} updated`);

    return {
      total: whatsappContacts.length,
      inserted: insertedCount,
      updated: updatedCount,
      duration: duration
    };

  } catch (error) {
    logger.error(`[ContactSync] Sync failed for consultant ${consultantId}: ${error.message}`);
    throw new Error(`Contact sync failed: ${error.message}`);
  }
}

/**
 * Bulk insert new contacts
 * @param {number} consultantId - Consultant ID
 * @param {Array} contacts - Array of contacts to insert
 * @returns {Promise<number>} Number of inserted contacts
 */
async function bulkInsertContacts(consultantId, contacts) {
  if (contacts.length === 0) return 0;

  try {
    logger.debug(`[ContactSync] Bulk inserting ${contacts.length} contacts`);

    // Build parameterized query for bulk insert
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`
      );
      values.push(
        consultantId,
        contact.name || 'Unknown',
        contact.number,
        contact.profilePicUrl || null,
        'B' // Default segment
      );
      paramIndex += 5;
    }

    const query = `
      INSERT INTO contacts (consultant_id, name, number, profile_pic_url, segment)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (consultant_id, number) DO NOTHING
    `;

    await db.query(query, values);
    logger.info(`[ContactSync] Successfully inserted ${contacts.length} contacts`);

    return contacts.length;

  } catch (error) {
    logger.error(`[ContactSync] Bulk insert failed: ${error.message}`);
    throw error;
  }
}

/**
 * Bulk update existing contacts
 * @param {Array} contacts - Array of contacts to update
 * @returns {Promise<number>} Number of updated contacts
 */
async function bulkUpdateContacts(contacts) {
  if (contacts.length === 0) return 0;

  try {
    logger.debug(`[ContactSync] Bulk updating ${contacts.length} contacts`);

    // Update each contact individually (PostgreSQL doesn't have great bulk update support)
    // For better performance in production, consider using a temp table approach
    let updatedCount = 0;

    for (const contact of contacts) {
      const result = await db.query(
        `UPDATE contacts
         SET name = $1, profile_pic_url = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [contact.name, contact.profilePicUrl, contact.id]
      );

      if (result.rowCount > 0) {
        updatedCount++;
      }
    }

    logger.info(`[ContactSync] Successfully updated ${updatedCount} contacts`);
    return updatedCount;

  } catch (error) {
    logger.error(`[ContactSync] Bulk update failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get last sync time for a consultant
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Date|null>} Last sync time or null
 */
async function getLastSyncTime(consultantId) {
  try {
    const result = await db.query(
      'SELECT MAX(updated_at) as last_sync FROM contacts WHERE consultant_id = $1',
      [consultantId]
    );

    return result.rows[0]?.last_sync || null;
  } catch (error) {
    logger.error(`[ContactSync] Failed to get last sync time: ${error.message}`);
    return null;
  }
}

module.exports = {
  syncContacts,
  bulkInsertContacts,
  bulkUpdateContacts,
  getLastSyncTime
};
