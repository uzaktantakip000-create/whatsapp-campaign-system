const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const CONSULTANT_ID = 59;

async function testFlow() {
  console.log('🚀 Starting Template & Message Flow Test\n');

  try {
    // STEP 1: Create a template
    console.log('📝 STEP 1: Creating template...');
    const templateData = {
      consultant_id: CONSULTANT_ID,
      name: 'Welcome Message',
      content: 'Merhaba {{name}}! Hizmetlerimiz hakkında bilgi almak ister misiniz?',
      category: 'greeting',
      is_active: true
    };

    const templateResponse = await axios.post(`${API_URL}/templates`, templateData);
    console.log('✅ Template created:', {
      id: templateResponse.data.data.id,
      name: templateResponse.data.data.name
    });

    const templateId = templateResponse.data.data.id;

    // STEP 2: Get existing campaign
    console.log('\n📋 STEP 2: Checking existing campaign...');
    const campaignsResponse = await axios.get(`${API_URL}/campaigns`, {
      params: { consultant_id: CONSULTANT_ID, limit: 1 }
    });

    if (campaignsResponse.data.data.length === 0) {
      console.log('❌ No campaign found. Please create a campaign first.');
      return;
    }

    const campaign = campaignsResponse.data.data[0];
    console.log('✅ Found campaign:', {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.totalRecipients
    });

    // STEP 3: Update campaign with template
    console.log('\n🔄 STEP 3: Updating campaign with template...');
    await axios.put(`${API_URL}/campaigns/${campaign.id}`, {
      message_template: templateData.content,
      template_id: templateId
    });
    console.log('✅ Campaign updated with template');

    // STEP 4: Check campaign status
    console.log('\n📊 STEP 4: Checking campaign details...');
    const updatedCampaign = await axios.get(`${API_URL}/campaigns/${campaign.id}`);
    console.log('Campaign details:', {
      id: updatedCampaign.data.data.id,
      name: updatedCampaign.data.data.name,
      status: updatedCampaign.data.data.status,
      templateId: updatedCampaign.data.data.templateId,
      messageTemplate: updatedCampaign.data.data.messageTemplate.substring(0, 50) + '...'
    });

    // STEP 5: Get recipients
    console.log('\n👥 STEP 5: Getting campaign recipients...');
    const recipientsResponse = await axios.get(`${API_URL}/campaigns/${campaign.id}/recipients`, {
      params: { limit: 5 }
    });
    console.log(`✅ Found ${recipientsResponse.data.data.length} recipients (showing first 5)`);
    recipientsResponse.data.data.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name} - ${r.number} - ${r.status}`);
    });

    // STEP 6: Check if we can start the campaign
    console.log('\n🚦 STEP 6: Checking if campaign can be started...');
    console.log('Campaign status:', campaign.status);

    if (campaign.status === 'draft') {
      console.log('⚠️  Campaign is in draft status');
      console.log('💡 To start campaign:');
      console.log('   1. Consultant must be "active" (WhatsApp connected)');
      console.log('   2. Campaign must have recipients');
      console.log('   3. Call: POST /api/campaigns/' + campaign.id + '/start');
    } else if (campaign.status === 'running') {
      console.log('✅ Campaign is already running!');
    }

    // STEP 7: Check messages
    console.log('\n📨 STEP 7: Checking messages...');
    const messagesResponse = await axios.get(`${API_URL}/messages`, {
      params: { campaign_id: campaign.id, limit: 5 }
    });
    console.log(`Messages sent: ${messagesResponse.data.data.length}`);

    if (messagesResponse.data.data.length > 0) {
      console.log('Recent messages:');
      messagesResponse.data.data.forEach((m, i) => {
        console.log(`   ${i + 1}. To: ${m.contact_name} - Status: ${m.status} - ${m.sent_at || 'Not sent'}`);
      });
    } else {
      console.log('No messages sent yet');
    }

    // STEP 8: Get message stats
    console.log('\n📊 STEP 8: Getting message statistics...');
    const statsResponse = await axios.get(`${API_URL}/messages/stats`, {
      params: { campaign_id: campaign.id }
    });
    console.log('Message Stats:', statsResponse.data.data);

    console.log('\n✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testFlow();
