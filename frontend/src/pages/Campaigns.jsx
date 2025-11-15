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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import campaignsAPI from '../api/campaigns';

// Validation schema
const campaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  scheduledFor: z.string().optional(),
});

function Campaigns() {
  const queryClient = useQueryClient();

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

  // Form
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      message: '',
      scheduledFor: '',
    },
  });

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

  const campaigns = data?.data?.campaigns || [];
  const totalCount = data?.data?.total || 0;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCampaign) {
        return campaignsAPI.updateCampaign(editingCampaign.id, data);
      }
      return campaignsAPI.createCampaign(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setCampaignDialogOpen(false);
      setEditingCampaign(null);
      reset();
      toast.success(editingCampaign ? 'Campaign updated' : 'Campaign created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save campaign');
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
      toast.error(error.message || 'Failed to delete campaign');
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
      toast.error(error.message || 'Failed to start campaign');
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (id) => campaignsAPI.stopCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast.success('Campaign stopped');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to stop campaign');
    },
  });

  // Handlers
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleAddCampaign = () => {
    setEditingCampaign(null);
    reset({ name: '', message: '', scheduledFor: '' });
    setCampaignDialogOpen(true);
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    reset({
      name: campaign.name,
      message: campaign.message || '',
      scheduledFor: campaign.scheduledFor || '',
    });
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

  const onSubmit = (data) => {
    saveMutation.mutate(data);
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
            <Tab label="Scheduled" value="scheduled" />
            <Tab label="Running" value="running" />
            <Tab label="Completed" value="completed" />
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
              <Alert severity="info" sx={{ mb: 2 }}>
                Simplified campaign creation. Full features (recipient selection, template editor, scheduling) coming soon!
              </Alert>
              <TextField
                fullWidth
                label="Campaign Name"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                margin="normal"
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message"
                {...register('message')}
                error={!!errors.message}
                helperText={errors.message?.message || 'Placeholder for now. Template editor coming soon.'}
                margin="normal"
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="Schedule For (Optional)"
                {...register('scheduledFor')}
                error={!!errors.scheduledFor}
                helperText={errors.scheduledFor?.message || 'Leave empty to save as draft'}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingCampaign ? 'Update' : 'Create'}
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
