# Error Log & Solutions

## Session: 2025-11-15

### Error 1: Network Error on Frontend Login
**Symptom:** Frontend couldn't connect to backend API, receiving "Network Error"
**Root Cause:** CORS configuration didn't include frontend development server ports
**Location:** `backend/server.js:29-42`
**Solution:**
```javascript
corsOptions: {
  origin: [
    'http://localhost:5173',  // Added
    'http://localhost:5174',  // Added
    'http://localhost:5175',  // Added
  ]
}
```
**Status:** ✅ Fixed

---

### Error 2: Blank Dashboard Page
**Symptom:** Dashboard page showed completely white/blank after login
**Console Error:** `Uncaught Error: No QueryClient set, use QueryClientProvider to set one`
**Root Cause:** React Query's QueryClientProvider was missing from App.jsx
**Location:** `frontend/src/App.jsx`
**Solution:** Wrapped entire app with QueryClientProvider
```javascript
<QueryClientProvider client={queryClient}>
  <ThemeProvider theme={theme}>
    {/* app content */}
  </ThemeProvider>
</QueryClientProvider>
```
**Status:** ✅ Fixed

---

### Error 3: QR Code Not Displaying
**Symptom:** QR code didn't appear after clicking "Connect WhatsApp"
**Root Causes (Multiple):**
1. Consultant status stuck in 'pending' instead of 'offline'
2. Evolution API couldn't generate QR for existing instances
3. Instance deletion/recreation timing issue (403 "name already in use")
4. Backend response field mismatch (`qrcode` vs `qrCode`)

**Location:** `backend/src/controllers/whatsapp.js`
**Solutions:**
1. Reset database status to 'offline'
2. Added instance deletion before recreation
3. Added 3-second delay after deletion: `await new Promise(resolve => setTimeout(resolve, 3000))`
4. Changed response from `qrcode: {...}` to `qrCode: qrcodeResult.qrcode.base64`

**Status:** ✅ Fixed

---

### Error 4: WhatsApp Status Not Updating After Connection
**Symptom:** Frontend showed "Connecting..." even after successful WhatsApp connection
**Root Cause:** Webhook not configured when instance was created
**Location:** `backend/src/controllers/whatsapp.js`
**Solution:** Added automatic webhook configuration after instance creation
```javascript
await evolutionClient.setWebhook(instanceName, webhookUrl, [
  'QRCODE_UPDATED',
  'CONNECTION_UPDATE',
  'MESSAGES_UPSERT'
]);
```
**Status:** ✅ Fixed

---

### Error 5: Evolution API Webhook Rejection
**Symptom:** `400 Bad Request: Invalid "url" property`
**Root Cause:** Docker internal hostname `backend_api` not recognized by Evolution API
**Location:** `.env`
**Solution:** Changed webhook URL from `http://backend_api:3000` to `http://host.docker.internal:3000`
**Status:** ✅ Fixed

---

### Error 6: Webhook Payload Format Error
**Symptom:** `400 Bad Request: webhook.events[0] is not one of enum values`
**Root Cause:** Event names were lowercase, Evolution API v2 requires UPPERCASE
**Location:** `backend/src/services/evolution/client.js`
**Solution:**
- Changed event names: `qrcode.updated` → `QRCODE_UPDATED`
- Updated payload structure to use nested `webhook` object with `enabled: true`
**Status:** ✅ Fixed

---

### Error 7: Frontend Field Name Mismatch
**Symptom:** WhatsApp page showed "N/A" for phone number and connection time
**Root Cause:** Backend using snake_case, frontend expecting camelCase
**Location:** `backend/src/controllers/whatsapp.js:185-194`
**Solution:** Changed response format:
```javascript
// Before
{
  whatsapp_number: consultant.whatsapp_number,
  connected_at: consultant.connected_at,
  instance_name: instanceName
}

// After
{
  phoneNumber: consultant.whatsapp_number,
  connectedAt: consultant.connected_at,
  instanceName: instanceName
}
```
**Status:** ✅ Fixed

---

### Error 8: Dashboard API Failure
**Symptom:** `Failed to load dashboard data: Failed to fetch dashboard`
**Error Message:** `function pg_catalog.extract(unknown, integer) does not exist`
**Root Cause:** PostgreSQL DATE - DATE returns INTEGER, not INTERVAL. EXTRACT expects INTERVAL.
**Location:** `backend/src/services/warmup/warmupService.js:33`
**Solution:**
```sql
-- Before (WRONG)
EXTRACT(DAY FROM (CURRENT_DATE - warmup_start_date))

-- After (CORRECT)
(CURRENT_DATE - warmup_start_date)
```
**Technical Note:** In PostgreSQL:
- `DATE - DATE = INTEGER` (number of days)
- `TIMESTAMP - TIMESTAMP = INTERVAL`
- `EXTRACT()` works on INTERVAL, not INTEGER

**Status:** ✅ Fixed

---

## Summary Statistics
- **Total Errors:** 8
- **Errors Fixed:** 8 (100%)
- **Docker Rebuilds Required:** 6
- **Database Manual Updates:** 1
- **Configuration Files Modified:** 5

## Prevention Strategies
1. **Always validate API response formats** match frontend expectations
2. **Test Evolution API endpoints** with actual payloads before integration
3. **Use proper PostgreSQL date arithmetic** based on data types
4. **Configure webhooks during instance creation**, not as afterthought
5. **Add integration tests** for webhook flows
6. **Document Evolution API version-specific requirements** (v2.1.2 nuances)
