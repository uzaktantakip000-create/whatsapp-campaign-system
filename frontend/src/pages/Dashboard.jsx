import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Contacts as ContactsIcon,
  Campaign as CampaignIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import MainLayout from '../components/layout/MainLayout';
import useAuthStore from '../store/authStore';
import consultantsAPI from '../api/consultants';

function Dashboard() {
  const { user } = useAuthStore();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch dashboard data with dynamic auto-refresh
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: consultantsAPI.getDashboard,
    refetchInterval: (data) => {
      // Check if there are any running campaigns
      const recentCampaigns = data?.data?.recentCampaigns || [];
      const hasRunningCampaigns = recentCampaigns.some(
        (campaign) => campaign.status === 'running'
      );
      // Refresh every 10 seconds if there are running campaigns, otherwise every 30 seconds
      return hasRunningCampaigns ? 10000 : 30000;
    },
  });

  // Update timestamp whenever data changes
  useEffect(() => {
    if (data) {
      setLastUpdate(new Date());
    }
  }, [data]);

  const handleManualRefresh = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <Box>
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load dashboard data: {error.message}
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  const consultant = data?.data?.consultant || {};
  const stats = data?.data?.stats || {};
  const warmup = stats?.warmupStatus || {};
  const recentCampaigns = data?.data?.recentCampaigns || [];
  const charts = data?.data?.charts || {};

  // Calculate warmup progress percentage
  const warmupProgress = warmup.currentDailyLimit > 0
    ? (warmup.messagesSentToday / warmup.currentDailyLimit) * 100
    : 0;

  const getStatusChip = (status) => {
    const statusColors = {
      draft: 'default',
      scheduled: 'info',
      running: 'warning',
      completed: 'success',
      paused: 'default',
      failed: 'error',
    };
    return (
      <Chip
        label={status}
        color={statusColors[status] || 'default'}
        size="small"
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  const getWhatsAppStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success.main';
      case 'pending':
        return 'warning.main';
      default:
        return 'error.main';
    }
  };

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Welcome back, {user?.name}!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Here's what's happening with your campaigns today.
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Tooltip title="Refresh data">
                <IconButton onClick={handleManualRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" display="block" color="text.secondary">
                Last updated: {format(lastUpdate, 'HH:mm:ss')}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WhatsAppIcon sx={{ fontSize: 40, color: getWhatsAppStatusColor(stats.whatsappStatus), mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.whatsappStatus || 'offline'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      WhatsApp
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ContactsIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.totalContacts || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contacts
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CampaignIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.totalCampaigns || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Campaigns
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MessageIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.messagesSentToday || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Today
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MessageIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.totalMessagesSent || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sent
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.readRate || 0}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Read Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Warmup Status Section */}
        {warmup && warmup.isActive && (
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Warmup Status
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Phase: <strong>{warmup.currentPhase || 'N/A'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days in Phase: {warmup.daysInPhase || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Daily Progress: {warmup.messagesSentToday || 0} / {warmup.currentDailyLimit || 0}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={warmupProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {warmup.messagesRemaining || 0} messages remaining today
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ bgcolor: 'info.light', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Next Phase Information
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {warmup.nextPhaseInfo || 'Continue sending messages to progress to the next phase.'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Grid container spacing={3}>
          {/* Recent Campaigns */}
          <Grid item xs={12} lg={7}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Campaigns
              </Typography>
              {recentCampaigns.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Recipients</TableCell>
                        <TableCell align="right">Sent</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentCampaigns.map((campaign) => (
                        <TableRow key={campaign.id} hover>
                          <TableCell>{campaign.name}</TableCell>
                          <TableCell>{getStatusChip(campaign.status)}</TableCell>
                          <TableCell align="right">{campaign.totalRecipients || 0}</TableCell>
                          <TableCell align="right">{campaign.messagesSent || 0}</TableCell>
                          <TableCell>
                            {campaign.createdAt ? format(new Date(campaign.createdAt), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No campaigns yet. Create your first campaign to get started!</Alert>
              )}
            </Paper>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} lg={5}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Messages Sent (Last 7 Days)
              </Typography>
              {charts.messagesPerDay && charts.messagesPerDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={charts.messagesPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="count" stroke="#25D366" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No data available yet.</Alert>
              )}
            </Paper>

            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Campaign Performance
              </Typography>
              {charts.campaignPerformance && charts.campaignPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={charts.campaignPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#25D366" />
                    <Bar dataKey="read" fill="#128C7E" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No campaign data available.</Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}

export default Dashboard;
