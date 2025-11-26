import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Visibility,
  CheckCircle,
  Cancel,
  People,
  Campaign,
  Message,
  WhatsApp,
  Refresh,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import useAuthStore from '../store/authStore';
import adminAPI from '../api/admin';

function Admin() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Access control
  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <Box>
          <Alert severity="error">
            Access Denied: You do not have permission to view this page.
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  // Fetch system stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminAPI.getSystemStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Parse stats data - backend returns nested structure
  const rawStats = statsData?.data || {};
  const stats = {
    totalConsultants: rawStats.consultants?.total || 0,
    activeConsultants: rawStats.consultants?.active || 0,
    totalCampaigns: rawStats.campaigns?.total || 0,
    runningCampaigns: rawStats.campaigns?.running || 0,
    totalMessages: rawStats.messages?.sent_total || 0,
    messagesToday: rawStats.messages?.sent_today || 0,
    activeConnections: rawStats.whatsapp?.connected || 0, // Real WhatsApp connections
  };

  // Fetch consultants
  const { data: consultantsData, isLoading: consultantsLoading } = useQuery({
    queryKey: ['admin-consultants', page, rowsPerPage, search, statusFilter],
    queryFn: () =>
      adminAPI.getConsultants({
        page: page + 1,
        limit: rowsPerPage,
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  // Backend now returns camelCase - no mapping needed
  const consultants = (consultantsData?.data || []).map(consultant => ({
    ...consultant,
    whatsappStatus: consultant.status, // Rename status to whatsappStatus for clarity
    campaignCount: consultant.stats?.campaignsCount || 0,
    contactCount: consultant.stats?.contactsCount || 0,
    messageCount: consultant.stats?.totalMessages || 0,
    messagesToday: consultant.stats?.messagesSentToday || 0,
  }));
  const totalConsultants = consultantsData?.count || 0;

  // Update consultant status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      adminAPI.updateConsultantStatus(id, { isActive }),
    onSuccess: async () => {
      // Invalidate and refetch queries to get fresh data
      await queryClient.invalidateQueries({ queryKey: ['admin-consultants'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Consultant status updated');
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast.error('Failed to update consultant status');
    },
  });

  // Handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (consultant) => {
    setSelectedConsultant(consultant);
    setDetailsOpen(true);
  };

  const handleToggleStatus = (consultant) => {
    updateStatusMutation.mutate({
      id: consultant.id,
      isActive: !consultant.isActive,
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries(['admin-stats']);
    queryClient.invalidateQueries(['admin-consultants']);
    toast.success('Data refreshed');
  };

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Admin Panel
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage consultants and monitor system-wide statistics
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>

        {/* System Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {statsLoading ? '...' : stats.totalConsultants || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Consultants
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="success.main">
                  {stats.activeConsultants || 0} active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Campaign sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {statsLoading ? '...' : stats.totalCampaigns || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Campaigns
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="info.main">
                  {stats.runningCampaigns || 0} running
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Message sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {statsLoading ? '...' : stats.totalMessages?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Messages
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {stats.messagesToday || 0} today
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WhatsApp sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {statsLoading ? '...' : stats.activeConnections || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active WhatsApp
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Connections
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Consultants Management */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Consultants Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                placeholder="Search consultants..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="All"
                  color={statusFilter === 'all' ? 'primary' : 'default'}
                  onClick={() => {
                    setStatusFilter('all');
                    setPage(0);
                  }}
                />
                <Chip
                  label="Active"
                  color={statusFilter === 'active' ? 'primary' : 'default'}
                  onClick={() => {
                    setStatusFilter('active');
                    setPage(0);
                  }}
                />
                <Chip
                  label="Inactive"
                  color={statusFilter === 'inactive' ? 'primary' : 'default'}
                  onClick={() => {
                    setStatusFilter('inactive');
                    setPage(0);
                  }}
                />
              </Box>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>WhatsApp Status</TableCell>
                  <TableCell align="center">Campaigns</TableCell>
                  <TableCell align="center">Messages</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {consultantsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography>Loading...</Typography>
                    </TableCell>
                  </TableRow>
                ) : consultants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">
                        No consultants found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  consultants.map((consultant) => (
                    <TableRow key={consultant.id} hover>
                      <TableCell>{consultant.name}</TableCell>
                      <TableCell>{consultant.email}</TableCell>
                      <TableCell>
                        {consultant.whatsappStatus === 'active' ? (
                          <Chip
                            label="Connected"
                            color="success"
                            size="small"
                            icon={<CheckCircle />}
                          />
                        ) : consultant.whatsappStatus === 'pending' ? (
                          <Chip
                            label="Pending"
                            color="warning"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="Offline"
                            color="default"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {consultant.campaignCount || 0}
                      </TableCell>
                      <TableCell align="center">
                        {consultant.messageCount?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        {consultant.createdAt
                          ? format(new Date(consultant.createdAt), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={consultant.isActive}
                              onChange={() => handleToggleStatus(consultant)}
                              disabled={updateStatusMutation.isLoading}
                            />
                          }
                          label={consultant.isActive ? 'Active' : 'Inactive'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(consultant)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalConsultants}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Consultant Details Modal */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6">Consultant Details</Typography>
          </DialogTitle>
          <DialogContent dividers>
            {selectedConsultant && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedConsultant.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedConsultant.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Role
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedConsultant.role}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={selectedConsultant.isActive ? 'Active' : 'Inactive'}
                      color={selectedConsultant.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  WhatsApp Information
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Connection Status
                    </Typography>
                    <Chip
                      label={
                        selectedConsultant.whatsappStatus === 'active'
                          ? 'Connected'
                          : selectedConsultant.whatsappStatus === 'pending'
                          ? 'Pending'
                          : 'Offline'
                      }
                      color={
                        selectedConsultant.whatsappStatus === 'active'
                          ? 'success'
                          : selectedConsultant.whatsappStatus === 'pending'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      {selectedConsultant.whatsappPhone || 'Not connected'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Instance Name
                    </Typography>
                    <Typography variant="body1">
                      {selectedConsultant.whatsappInstance || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Connected At
                    </Typography>
                    <Typography variant="body1">
                      {selectedConsultant.whatsappConnectedAt
                        ? format(new Date(selectedConsultant.whatsappConnectedAt), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total Campaigns
                    </Typography>
                    <Typography variant="h5">
                      {selectedConsultant.campaignCount || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total Messages
                    </Typography>
                    <Typography variant="h5">
                      {selectedConsultant.messageCount?.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total Contacts
                    </Typography>
                    <Typography variant="h5">
                      {selectedConsultant.contactCount || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Member Since
                    </Typography>
                    <Typography variant="body1">
                      {selectedConsultant.createdAt
                        ? format(new Date(selectedConsultant.createdAt), 'MMMM dd, yyyy')
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}

export default Admin;
