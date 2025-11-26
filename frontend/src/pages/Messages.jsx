import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
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
  Button,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Search as SearchIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Send as SentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import MainLayout from '../components/layout/MainLayout';
import messagesAPI from '../api/messages';
import campaignsAPI from '../api/campaigns';

function Messages() {
  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Fetch campaigns for filter
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.getCampaigns({ limit: 100 }),
  });

  const campaigns = campaignsData?.data || [];

  // Fetch messages
  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', page, rowsPerPage, statusFilter, campaignFilter, dateFrom, dateTo],
    queryFn: () => messagesAPI.getMessages({
      page: page + 1,
      limit: rowsPerPage,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      campaignId: campaignFilter !== 'all' ? campaignFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['messageStats', campaignFilter, dateFrom, dateTo],
    queryFn: () => messagesAPI.getMessageStats({
      campaignId: campaignFilter !== 'all' ? campaignFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  const messages = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const stats = statsData?.data || {
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
  };

  const handleViewMessage = (message) => {
    setSelectedMessage(message);
    setDetailsDialogOpen(true);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'default', icon: <PendingIcon fontSize="small" /> },
      sent: { label: 'Sent', color: 'primary', icon: <SentIcon fontSize="small" /> },
      delivered: { label: 'Delivered', color: 'success', icon: <SuccessIcon fontSize="small" /> },
      read: { label: 'Read', color: 'info', icon: <SuccessIcon fontSize="small" /> },
      failed: { label: 'Failed', color: 'error', icon: <ErrorIcon fontSize="small" /> },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
  };

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Message History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and track all sent messages
          </Typography>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Messages
                </Typography>
                <Typography variant="h4">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Sent
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.sent}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Delivered
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.delivered}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Failed
                </Typography>
                <Typography variant="h4" color="error">
                  {stats.failed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Pending
                </Typography>
                <Typography variant="h4">{stats.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Campaign</InputLabel>
                <Select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  label="Campaign"
                >
                  <MenuItem value="all">All Campaigns</MenuItem>
                  {campaigns.map((campaign) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Messages Table */}
        <Paper elevation={2}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading messages: {error.message}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Campaign</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Sent At</TableCell>
                      <TableCell>Delivered At</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id} hover>
                        <TableCell>
                          <Typography variant="body2">{message.campaign_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {message.contact_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {message.contact_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {message.messageText?.substring(0, 50)}...
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusChip(message.status)}</TableCell>
                        <TableCell>
                          {message.sentAt
                            ? format(new Date(message.sentAt), 'MMM dd, yyyy HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {message.deliveredAt
                            ? format(new Date(message.deliveredAt), 'MMM dd, yyyy HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewMessage(message)}>
                              <ViewIcon fontSize="small" />
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

        {/* Message Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Message Details</DialogTitle>
          <DialogContent>
            {selectedMessage && (
              <Box>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Campaign
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedMessage.campaign_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedMessage.status)}</Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Contact Name
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedMessage.contact_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Contact Number
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedMessage.contact_number}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Sent At
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedMessage.sentAt
                        ? format(new Date(selectedMessage.sentAt), 'MMM dd, yyyy HH:mm:ss')
                        : 'Not sent yet'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Delivered At
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedMessage.deliveredAt
                        ? format(new Date(selectedMessage.deliveredAt), 'MMM dd, yyyy HH:mm:ss')
                        : 'Not delivered yet'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Message Content
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedMessage.messageText}
                      </Typography>
                    </Paper>
                  </Grid>

                  {selectedMessage.errorMessage && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="error" gutterBottom>
                        Error Message
                      </Typography>
                      <Alert severity="error">{selectedMessage.errorMessage}</Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}

export default Messages;
