const db = require('../config/database');
const logger = require('../utils/logger');
const { parse } = require('fast-csv');
const { format } = require('@fast-csv/format');
const fs = require('fs');

/**
 * Contacts Controller
 * Handles all business logic for contact management
 */

// ==========================================
// GET ALL CONTACTS
// ==========================================

/**
 * Get all contacts with pagination and filtering
 * @route GET /api/contacts
 */
async function getAllContacts(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      segment,
      search,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let whereClause = [];
    let params = [];
    let paramCount = 1;

    // ALWAYS filter by authenticated consultant's ID
    const consultantId = req.user.id;
    whereClause.push(`c.consultant_id = $${paramCount}`);
    params.push(consultantId);
    paramCount++;

    // ALWAYS exclude deleted contacts (soft delete)
    whereClause.push(`(c.is_deleted = false OR c.is_deleted IS NULL)`);

    if (segment) {
      whereClause.push(`c.segment = $${paramCount}`);
      params.push(segment);
      paramCount++;
    }

    if (search) {
      whereClause.push(`(c.name ILIKE $${paramCount} OR c.number ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM contacts c ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get contacts with consultant info
    const dataQuery = `
      SELECT
        c.id, c.name, c.number, c.segment, c.is_my_contact,
        c.profile_pic_url, c.last_message_time, c.last_message_from_us,
        c.message_count, c.complaint_count, c.created_at, c.updated_at,
        cons.id as consultant_id, cons.name as consultant_name,
        cons.email as consultant_email
      FROM contacts c
      INNER JOIN consultants cons ON c.consultant_id = cons.id
      ${whereSQL}
      ORDER BY c.${sort} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    // Format response (camelCase)
    const contacts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.number,
      whatsappNumber: row.number,
      number: row.number,
      segment: row.segment,
      isMyContact: row.is_my_contact,
      profilePicUrl: row.profile_pic_url,
      lastMessageTime: row.last_message_time,
      lastMessageFromUs: row.last_message_from_us,
      lastMessageAt: row.last_message_from_us || row.last_message_time,
      messageCount: row.message_count,
      complaintCount: row.complaint_count,
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        email: row.consultant_email
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    logger.info(`[Contacts] Fetched ${contacts.length} contacts (page ${page})`);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Contacts] Error fetching contacts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts',
      message: error.message
    });
  }
}

// ==========================================
// GET SINGLE CONTACT
// ==========================================

/**
 * Get contact by ID
 * @route GET /api/contacts/:id
 */
async function getContactById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.id, c.name, c.number, c.segment, c.is_my_contact,
        c.profile_pic_url, c.last_message_time, c.last_message_from_us,
        c.message_count, c.complaint_count, c.created_at, c.updated_at,
        cons.id as consultant_id, cons.name as consultant_name,
        cons.email as consultant_email, cons.instance_name
      FROM contacts c
      INNER JOIN consultants cons ON c.consultant_id = cons.id
      WHERE c.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    const row = result.rows[0];

    // Get contact's message stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_messages,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_messages,
        COUNT(*) FILTER (WHERE status = 'read') as read_messages,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_messages,
        MAX(sent_at) as last_message_sent
      FROM messages
      WHERE contact_id = $1
    `;

    const statsResult = await db.query(statsQuery, [id]);

    const contact = {
      id: row.id,
      name: row.name,
      number: row.number,
      segment: row.segment,
      isMyContact: row.is_my_contact,
      profilePicUrl: row.profile_pic_url,
      lastMessageTime: row.last_message_time,
      lastMessageFromUs: row.last_message_from_us,
      messageCount: row.message_count,
      complaintCount: row.complaint_count,
      stats: {
        totalMessages: parseInt(statsResult.rows[0].total_messages) || 0,
        sentMessages: parseInt(statsResult.rows[0].sent_messages) || 0,
        deliveredMessages: parseInt(statsResult.rows[0].delivered_messages) || 0,
        readMessages: parseInt(statsResult.rows[0].read_messages) || 0,
        failedMessages: parseInt(statsResult.rows[0].failed_messages) || 0,
        lastMessageSent: statsResult.rows[0].last_message_sent
      },
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        email: row.consultant_email,
        instanceName: row.instance_name
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    logger.info(`[Contacts] Fetched contact ${id}`);

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    logger.error(`[Contacts] Error fetching contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact',
      message: error.message
    });
  }
}

// ==========================================
// CREATE CONTACT
// ==========================================

/**
 * Create new contact
 * @route POST /api/contacts
 */
async function createContact(req, res) {
  try {
    const {
      consultantId,
      name,
      number,
      segment = 'B',
      tags = []
    } = req.body;

    // Check if consultant exists
    const consultantCheck = await db.query(
      'SELECT id FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (consultantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    // Check if contact already exists for this consultant
    const contactCheck = await db.query(
      'SELECT id FROM contacts WHERE consultant_id = $1 AND number = $2',
      [consultantId, number]
    );

    if (contactCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Contact with this number already exists for this consultant'
      });
    }

    // Insert contact
    const insertQuery = `
      INSERT INTO contacts (
        consultant_id, name, number, segment
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, number, segment, created_at
    `;

    const result = await db.query(insertQuery, [
      consultantId,
      name,
      number,
      segment
    ]);

    const contact = result.rows[0];

    logger.info(`[Contacts] Created contact ${contact.id}: ${contact.name} (${contact.number})`);

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Contact created successfully'
    });

  } catch (error) {
    logger.error(`[Contacts] Error creating contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      message: error.message
    });
  }
}

// ==========================================
// UPDATE CONTACT
// ==========================================

/**
 * Update contact
 * @route PUT /api/contacts/:id
 */
async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      segment,
      tags
    } = req.body;

    // Check if contact exists
    const checkQuery = 'SELECT id FROM contacts WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (segment !== undefined) {
      updates.push(`segment = $${paramCount}`);
      params.push(segment);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    params.push(id);

    const updateQuery = `
      UPDATE contacts
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, number, segment, updated_at
    `;

    const result = await db.query(updateQuery, params);

    logger.info(`[Contacts] Updated contact ${id}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Contact updated successfully'
    });

  } catch (error) {
    logger.error(`[Contacts] Error updating contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact',
      message: error.message
    });
  }
}

// ==========================================
// DELETE CONTACT
// ==========================================

/**
 * Delete contact (will cascade delete messages)
 * @route DELETE /api/contacts/:id
 */
async function deleteContact(req, res) {
  try {
    const { id } = req.params;

    // Check if contact exists
    const checkQuery = 'SELECT id, name FROM contacts WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Delete contact (will cascade delete messages)
    const deleteQuery = 'DELETE FROM contacts WHERE id = $1';
    await db.query(deleteQuery, [id]);

    logger.info(`[Contacts] Deleted contact ${id}: ${checkResult.rows[0].name}`);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    logger.error(`[Contacts] Error deleting contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact',
      message: error.message
    });
  }
}

// ==========================================
// GET CONTACTS BY CONSULTANT
// ==========================================

/**
 * Get all contacts for a specific consultant
 * @route GET /api/consultants/:id/contacts
 */
async function getContactsByConsultant(req, res) {
  try {
    const { id } = req.params;
    const { segment, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if consultant exists
    const consultantCheck = await db.query(
      'SELECT id FROM consultants WHERE id = $1',
      [id]
    );

    if (consultantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    // Build query
    let whereClause = [`consultant_id = $1`];
    let params = [id];
    let paramCount = 2;

    if (segment) {
      whereClause.push(`segment = $${paramCount}`);
      params.push(segment);
      paramCount++;
    }

    if (search) {
      whereClause.push(`(name ILIKE $${paramCount} OR number ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = `WHERE ${whereClause.join(' AND ')}`;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM contacts c ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get contacts
    const dataQuery = `
      SELECT
        id, name, number, segment, is_my_contact,
        last_message_from_us, message_count, complaint_count,
        created_at, updated_at
      FROM contacts
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    logger.info(`[Contacts] Fetched ${result.rows.length} contacts for consultant ${id}`);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Contacts] Error fetching consultant contacts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts',
      message: error.message
    });
  }
}

// ==========================================
// IMPORT CONTACTS (CSV)
// ==========================================

/**
 * Import contacts from CSV file
 * @route POST /api/contacts/import
 * CSV Format: consultant_id,name,number,segment
 */
async function importContacts(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const contacts = [];
    const errors = [];
    let lineNumber = 0;

    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ headers: true, trim: true }))
        .on('data', (row) => {
          lineNumber++;

          // Validate required fields
          if (!row.consultant_id || !row.name || !row.number) {
            errors.push({
              line: lineNumber,
              error: 'Missing required fields (consultant_id, name, number)',
              data: row
            });
            return;
          }

          // Validate phone number format
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          if (!phoneRegex.test(row.number)) {
            errors.push({
              line: lineNumber,
              error: 'Invalid phone number format',
              data: row
            });
            return;
          }

          // Validate segment
          const segment = row.segment || 'B';
          if (!['A', 'B', 'C'].includes(segment)) {
            errors.push({
              line: lineNumber,
              error: 'Invalid segment (must be A, B, or C)',
              data: row
            });
            return;
          }

          contacts.push({
            consultant_id: parseInt(row.consultant_id),
            name: row.name,
            number: row.number,
            segment: segment
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Delete temp file
    fs.unlinkSync(filePath);

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid contacts to import',
        errors
      });
    }

    // Bulk insert contacts
    const insertedContacts = [];
    const duplicates = [];

    for (const contact of contacts) {
      try {
        // Check if consultant exists
        const consultantCheck = await db.query(
          'SELECT id FROM consultants WHERE id = $1',
          [contact.consultant_id]
        );

        if (consultantCheck.rows.length === 0) {
          errors.push({
            error: 'Consultant not found',
            data: contact
          });
          continue;
        }

        // Check for duplicates
        const duplicateCheck = await db.query(
          'SELECT id FROM contacts WHERE consultant_id = $1 AND number = $2',
          [contact.consultant_id, contact.number]
        );

        if (duplicateCheck.rows.length > 0) {
          duplicates.push(contact);
          continue;
        }

        // Insert contact
        const result = await db.query(
          `INSERT INTO contacts (consultant_id, name, number, segment)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, number, segment, created_at`,
          [contact.consultant_id, contact.name, contact.number, contact.segment]
        );

        insertedContacts.push(result.rows[0]);
      } catch (error) {
        errors.push({
          error: error.message,
          data: contact
        });
      }
    }

    logger.info(`[Contacts] Import completed: ${insertedContacts.length} inserted, ${duplicates.length} duplicates, ${errors.length} errors`);

    res.json({
      success: true,
      data: {
        imported: insertedContacts.length,
        duplicates: duplicates.length,
        errors: errors.length,
        total_processed: contacts.length
      },
      inserted_contacts: insertedContacts,
      duplicates: duplicates,
      errors: errors
    });

  } catch (error) {
    logger.error(`[Contacts] Error importing contacts: ${error.message}`);

    // Clean up temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to import contacts',
      message: error.message
    });
  }
}

// ==========================================
// EXPORT CONTACTS (CSV)
// ==========================================

/**
 * Export contacts to CSV
 * @route GET /api/contacts/export
 */
async function exportContacts(req, res) {
  try {
    const { consultantId, segment, search } = req.query;

    // Build query
    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (consultantId) {
      whereClause.push(`c.consultant_id = $${paramCount}`);
      params.push(consultantId);
      paramCount++;
    }

    if (segment) {
      whereClause.push(`c.segment = $${paramCount}`);
      params.push(segment);
      paramCount++;
    }

    if (search) {
      whereClause.push(`(c.name ILIKE $${paramCount} OR c.number ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get contacts
    const query = `
      SELECT
        c.consultant_id,
        cons.name as consultant_name,
        c.name,
        c.number,
        c.segment,
        c.is_my_contact,
        c.message_count,
        c.complaint_count,
        c.created_at,
        c.updated_at
      FROM contacts c
      INNER JOIN consultants cons ON c.consultant_id = cons.id
      ${whereSQL}
      ORDER BY c.created_at DESC
    `;

    const result = await db.query(query, params);

    logger.info(`[Contacts] Exporting ${result.rows.length} contacts`);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contacts_${Date.now()}.csv`);

    // Stream CSV
    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    result.rows.forEach(row => {
      csvStream.write({
        consultant_id: row.consultant_id,
        consultant_name: row.consultant_name,
        name: row.name,
        number: row.number,
        segment: row.segment,
        is_my_contact: row.is_my_contact,
        message_count: row.message_count,
        complaint_count: row.complaint_count,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    });

    csvStream.end();

  } catch (error) {
    logger.error(`[Contacts] Error exporting contacts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to export contacts',
      message: error.message
    });
  }
}

// ==========================================
// SYNC CONTACTS FROM WHATSAPP
// ==========================================

/**
 * Sync contacts from WhatsApp to database
 * @route POST /api/contacts/sync
 */
async function syncContactsFromWhatsApp(req, res) {
  try {
    // Get consultant from auth middleware (req.consultant)
    const consultant = req.consultant;

    if (!consultant) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Consultant not found in request'
      });
    }

    // Check if consultant is connected to WhatsApp
    if (consultant.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Not connected',
        message: 'WhatsApp is not connected. Please connect first.'
      });
    }

    if (!consultant.instance_name) {
      return res.status(400).json({
        success: false,
        error: 'No instance',
        message: 'Instance name not found. Please reconnect to WhatsApp.'
      });
    }

    logger.info(`[Contacts] Starting manual contact sync for consultant ${consultant.id}`);

    // Import contact sync service
    const { syncContacts } = require('../services/contactSync');

    // Perform sync
    const syncResult = await syncContacts(consultant.id, consultant.instance_name);

    logger.info(`[Contacts] Manual sync completed: ${JSON.stringify(syncResult)}`);

    return res.json({
      success: true,
      data: syncResult,
      message: `Contacts synced successfully. ${syncResult.inserted} new, ${syncResult.updated} updated.`
    });

  } catch (error) {
    logger.error(`[Contacts] Error syncing contacts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getContactsByConsultant,
  importContacts,
  exportContacts,
  syncContactsFromWhatsApp
};
