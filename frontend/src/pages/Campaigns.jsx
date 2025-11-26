import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
  Grid,
  InputAdornment,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import campaignsAPI from '../api/campaigns';
import templatesAPI from '../api/templates';
import contactsAPI from '../api/contacts';
import useAuthStore from '../store/authStore';

// Validation schema
const campaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').or(z.literal('')).optional(),
  templateId: z.number().optional(),
  segmentFilter: z.string().optional(),
  selectedContacts: z.array(z.number()).optional(),
  scheduledFor: z.string().optional(),
}).refine(
  (data) => data.message || data.templateId,
  {
    message: 'Either message or template must be provided',
    path: ['message'],
  }
);

function Campaigns() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [viewingCampaign, setViewingCampaign] = useState(null);
  const [recipientType, setRecipientType] = useState('all'); // 'all', 'segment', 'specific'
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);

  // Form
  const { register, handleSubmit, formState: { errors }, reset, control, watch, setValue } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      message: '',
      templateId: undefined,
      segmentFilter: '',
      selectedContacts: [],
      scheduledFor: '',
    },
  });

  const watchTemplateId = watch('templateId');

  // Fetch campaigns with auto-refresh for running campaigns
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', page, rowsPerPage, search, statusFilter],
    queryFn: () => campaignsAPI.getCampaigns({
      page: page + 1,
      limit: rowsPerPage,
      search,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    refetchInterval: (data) => {
      // Check if there are any running campaigns
      const campaigns = data?.data?.campaigns || [];
      const hasRunningCampaigns = campaigns.some(
        (campaign) => campaign.status === 'running'
      );
      // Refresh every 5 seconds if there are running campaigns, otherwise every 30 seconds
      return hasRunningCampaigns ? 5000 : 30000;
    },
  });

  const campaigns = data?.data || [];
  const totalCount = data?.pagination?.total || 0;

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesAPI.getTemplates({ limit: 100, isActive: true }),
    enabled: campaignDialogOpen, // Only fetch when dialog is open
  });

  const templates = templatesData?.data || [];

  // Fetch contacts - load when dialog opens so they're ready when user selects "Specific Contacts"
  const { data: contactsData, isLoading: contactsLoading, error: contactsError } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      const result = await contactsAPI.getContacts({
        limit: 1000,
        consultantId: user?.id
      });
      return result;
    },
    enabled: campaignDialogOpen && !!user?.id, // Load contacts when dialog opens and user is logged in
  });

  const contacts = contactsData?.data || [];

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating campaign with data:', data);

      // Create campaign
      const response = await campaignsAPI.createCampaign(data);
      console.log('Campaign created:', response);

      // Add recipients if campaign created successfully
      if (response.success && response.data.id) {
        const recipientData = {};

        if (data.recipientType === 'segment' && data.selectedSegments?.length > 0) {
          recipientData.segmentFilter = data.selectedSegments.join(',');
        } else if (data.recipientType === 'specific' && data.selectedContacts?.length > 0) {
          recipientData.contactIds = data.selectedContacts;
        }
        // If 'all' or no specific type, send empty object to add all contacts

        console.log('Adding recipients:', recipientData);
        await campaignsAPI.addRecipients(response.data.id, recipientData);
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setCampaignDialogOpen(false);
      setEditingCampaign(null);
      reset();
      setRecipientType('all');
      setSelectedSegments([]);
      setSelectedContacts([]);
      toast.success('Campaign created and recipients added successfully');
    },
    onError: (error) => {
      console.error('Campaign creation error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create campaign';
      toast.error(errorMessage);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => campaignsAPI.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setDeleteDialogOpen(false);
      setEditingCampaign(null);
      toast.success('Campaign deleted');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete campaign';
      toast.error(errorMessage);
    },
  });

  // Start mutation
  const startMutation = useMutation({
    mutationFn: (id) => campaignsAPI.startCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast.success('Campaign started');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to start campaign';
      toast.error(errorMessage);
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (id) => campaignsAPI.pauseCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast.success('Campaign paused');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to pause campaign';
      toast.error(errorMessage);
    },
  });

  // Handlers
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleAddCampaign = () => {
    setEditingCampaign(null);
    reset({
      name: '',
      message: '',
      templateId: undefined,
      segmentFilter: '',
      selectedContacts: [],
      scheduledFor: ''
    });
    setRecipientType('all');
    setSelectedSegments([]);
    setSelectedContacts([]);
    setCampaignDialogOpen(true);
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    reset({
      name: campaign.name,
      message: campaign.messageTemplate || '',
      templateId: campaign.templateId || undefined,
      scheduledFor: campaign.scheduledFor || '',
    });

    // Set segment filter if exists
    if (campaign.segmentFilter) {
      const segments = campaign.segmentFilter.split(',').map(s => s.trim());
      setRecipientType('segment');
      setSelectedSegments(segments);
    } else {
      setRecipientType('all');
      setSelectedSegments([]);
    }

    setCampaignDialogOpen(true);
  };

  const handleViewCampaign = (campaign) => {
    setViewingCampaign(campaign);
    setDetailsDialogOpen(true);
  };

  const handleDeleteCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setDeleteDialogOpen(true);
  };

  const handleStartCampaign = (id) => {
    if (window.confirm('Are you sure you want to start this campaign?')) {
      startMutation.mutate(id);
    }
  };

  const handleStopCampaign = (id) => {
    if (window.confirm('Are you sure you want to stop this campaign?')) {
      stopMutation.mutate(id);
    }
  };

  const onSubmit = (formData) => {
    console.log('Form submitted:', formData);
    console.log('Recipient type:', recipientType);
    console.log('Selected segments:', selectedSegments);

    // Validate segment selection
    if (recipientType === 'segment' && selectedSegments.length === 0) {
      toast.error('Please select at least one segment');
      return;
    }

    // Validate specific contact selection
    if (recipientType === 'specific' && selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    // Prepare campaign data (backend expects snake_case)
    const campaignData = {
      consultant_id: user.id,
      name: formData.name,
      message_template: formData.message || '',
      template_id: formData.templateId || null,
      segment_filter: recipientType === 'segment' ? selectedSegments.join(',') : null,
      use_ai_variations: false,
      recipientType,
      selectedSegments,
      selectedContacts,
    };

    console.log('Submitting campaign data:', campaignData);

    // Trigger mutation
    saveMutation.mutate(campaignData);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', color: 'default' },
      scheduled: { label: 'Scheduled', color: 'info' },
      running: { label: 'Running', color: 'warning' },
      completed: { label: 'Completed', color: 'success' },
      paused: { label: 'Paused', color: 'default' },
      failed: { label: 'Failed', color: 'error' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getProgress = (campaign) => {
    if (!campaign.totalRecipients || campaign.totalRecipients === 0) return 0;
    return (campaign.messagesSent / campaign.totalRecipients) * 100;
  };

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Campaign Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create and manage your WhatsApp campaigns
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCampaign}
            >
              Create Campaign
            </Button>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Tabs
            value={statusFilter}
            onChange={(e, newValue) => {
              setStatusFilter(newValue);
              setPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All" value="all" />
            <Tab label="Draft" value="draft" />
            <Tab label="Running" value="running" />
            <Tab label="Paused" value="paused" />
            <Tab label="Completed" value="completed" />
            <Tab label="Failed" value="failed" />
          </Tabs>
        </Paper>

        {/* Search */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search campaigns..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button variant="outlined" fullWidth onClick={handleSearch}>
                Search
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Campaigns Table */}
        <Paper elevation={2}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              Failed to load campaigns: {error.message}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : campaigns.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No campaigns found
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {search ? 'Try a different search term' : 'Click "Create Campaign" to get started'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Recipients</TableCell>
                      <TableCell align="right">Sent</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id} hover>
                        <TableCell>{campaign.name}</TableCell>
                        <TableCell>{getStatusChip(campaign.status)}</TableCell>
                        <TableCell align="right">{campaign.totalRecipients || 0}</TableCell>
                        <TableCell align="right">{campaign.messagesSent || 0}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={getProgress(campaign)}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption">
                              {Math.round(getProgress(campaign))}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {campaign.createdAt ? format(new Date(campaign.createdAt), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewCampaign(campaign)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {campaign.status === 'draft' && (
                            <Tooltip title="Start">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleStartCampaign(campaign.id)}
                                disabled={startMutation.isPending}
                              >
                                <StartIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {campaign.status === 'running' && (
                            <Tooltip title="Stop">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleStopCampaign(campaign.id)}
                                disabled={stopMutation.isPending}
                              >
                                <StopIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEditCampaign(campaign)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCampaign(campaign)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </Paper>

        {/* Create/Edit Campaign Dialog */}
        <Dialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              {/* Campaign Name */}
              <TextField
                fullWidth
                label="Campaign Name"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                margin="normal"
              />

              {/* Template Selection */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Template (Optional)</InputLabel>
                <Controller
                  name="templateId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Template (Optional)"
                      value={field.value || ''}
                      onChange={(e) => {
                        const templateId = e.target.value || undefined;
                        field.onChange(templateId);
                        // Auto-fill message if template selected
                        if (templateId) {
                          const selectedTemplate = templates.find(t => t.id === Number(templateId));
                          if (selectedTemplate) {
                            setValue('message', selectedTemplate.content);
                          }
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>None (Write custom message)</em>
                      </MenuItem>
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                <FormHelperText>Select a template to auto-fill the message</FormHelperText>
              </FormControl>

              {/* Message */}
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message"
                {...register('message')}
                error={!!errors.message}
                helperText={errors.message?.message || 'Enter your message or select a template above'}
                margin="normal"
              />

              {/* Recipient Selection */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Send To</InputLabel>
                <Select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value)}
                  label="Send To"
                >
                  <MenuItem value="all">All Contacts</MenuItem>
                  <MenuItem value="segment">By Segment</MenuItem>
                  <MenuItem value="specific">Specific Contacts</MenuItem>
                </Select>
                <FormHelperText>Choose who will receive this campaign</FormHelperText>
              </FormControl>

              {/* Segment Selection */}
              {recipientType === 'segment' && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Select Segments</InputLabel>
                  <Select
                    multiple
                    value={selectedSegments}
                    onChange={(e) => setSelectedSegments(e.target.value)}
                    input={<OutlinedInput label="Select Segments" />}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    <MenuItem value="A">
                      <Checkbox checked={selectedSegments.indexOf('A') > -1} />
                      <ListItemText primary="Segment A (Hot)" />
                    </MenuItem>
                    <MenuItem value="B">
                      <Checkbox checked={selectedSegments.indexOf('B') > -1} />
                      <ListItemText primary="Segment B (Warm)" />
                    </MenuItem>
                    <MenuItem value="C">
                      <Checkbox checked={selectedSegments.indexOf('C') > -1} />
                      <ListItemText primary="Segment C (Cold)" />
                    </MenuItem>
                  </Select>
                  <FormHelperText>
                    {selectedSegments.length > 0
                      ? `Selected: ${selectedSegments.join(', ')}`
                      : 'Select at least one segment'}
                  </FormHelperText>
                </FormControl>
              )}

              {/* Specific Contact Selection */}
              {recipientType === 'specific' && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Select Contacts</InputLabel>
                  <Select
                    multiple
                    value={selectedContacts}
                    onChange={(e) => setSelectedContacts(e.target.value)}
                    input={<OutlinedInput label="Select Contacts" />}
                    disabled={contactsLoading}
                    renderValue={(selected) => {
                      if (contactsLoading) return 'Loading contacts...';
                      if (contacts.length === 0) return 'No contacts available';
                      const selectedNames = contacts
                        .filter(c => selected.includes(c.id))
                        .map(c => c.name);
                      return selectedNames.length > 0 ? selectedNames.join(', ') : 'Select contacts';
                    }}
                  >
                    {contactsLoading ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 2 }} />
                        Loading contacts...
                      </MenuItem>
                    ) : contacts.length === 0 ? (
                      <MenuItem disabled>
                        No contacts available
                      </MenuItem>
                    ) : (
                      contacts.map((contact) => (
                        <MenuItem key={contact.id} value={contact.id}>
                          <Checkbox checked={selectedContacts.indexOf(contact.id) > -1} />
                          <ListItemText
                            primary={contact.name}
                            secondary={contact.number}
                          />
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  <FormHelperText>
                    {contactsLoading ? (
                      'Loading contacts...'
                    ) : contacts.length === 0 ? (
                      'No contacts found. Please add contacts first.'
                    ) : selectedContacts.length > 0 ? (
                      `${selectedContacts.length} contact(s) selected`
                    ) : (
                      'Select at least one contact'
                    )}
                  </FormHelperText>
                </FormControl>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Campaign Details Dialog */}
        <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Campaign Details</DialogTitle>
          <DialogContent>
            {viewingCampaign && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {viewingCampaign.name}
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{getStatusChip(viewingCampaign.status)}</Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Recipients
                    </Typography>
                    <Typography variant="body1">{viewingCampaign.totalRecipients || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Messages Sent
                    </Typography>
                    <Typography variant="body1">{viewingCampaign.messagesSent || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {viewingCampaign.createdAt ? format(new Date(viewingCampaign.createdAt), 'PPpp') : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Full campaign details (message list, statistics) coming soon in Phase 4 completion!
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Campaign?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{editingCampaign?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => deleteMutation.mutate(editingCampaign.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}

export default Campaigns;
