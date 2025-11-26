import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  LinearProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import MainLayout from '../components/layout/MainLayout';
import whatsappAPI from '../api/whatsapp';
import { toast } from 'react-toastify';

function WhatsApp() {
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // Fetch WhatsApp status with polling when pending
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: whatsappAPI.getStatus,
    refetchInterval: (data) => {
      // Poll every 3 seconds if status is pending, otherwise every 10 seconds
      const status = data?.data?.status;
      return status === 'pending' ? 3000 : 10000;
    },
  });

  const status = statusData?.data?.status || 'offline';
  const phoneNumber = statusData?.data?.phoneNumber;
  const connectedAt = statusData?.data?.connectedAt;
  const instanceName = statusData?.data?.instanceName;

  // Connect mutation - Request QR code
  const connectMutation = useMutation({
    mutationFn: whatsappAPI.connect,
    onSuccess: (data) => {
      if (data.data?.qrCode) {
        setQrCode(data.data.qrCode);
        setCountdown(45);
        toast.success('QR code generated. Please scan with your phone.');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate QR code');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: whatsappAPI.disconnect,
    onSuccess: () => {
      setQrCode(null);
      setShowDisconnectDialog(false);
      queryClient.invalidateQueries(['whatsapp-status']);
      toast.success('WhatsApp disconnected successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect WhatsApp');
    },
  });

  // Countdown timer for QR code
  useEffect(() => {
    if (qrCode && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (countdown === 0 && qrCode) {
      // Auto-refresh QR code when expired
      connectMutation.mutate();
    }
  }, [qrCode, countdown]);

  // Clear QR code when connected
  useEffect(() => {
    if (status === 'active') {
      setQrCode(null);
      setCountdown(45);
    }
  }, [status]);

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    setShowDisconnectDialog(true);
  };

  const confirmDisconnect = () => {
    disconnectMutation.mutate();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />;
      case 'pending':
        return <WarningIcon sx={{ fontSize: 60, color: 'warning.main' }} />;
      default:
        return <CancelIcon sx={{ fontSize: 60, color: 'error.main' }} />;
    }
  };

  const getStatusChip = () => {
    const statusConfig = {
      active: { label: 'Connected', color: 'success' },
      pending: { label: 'Connecting...', color: 'warning' },
      offline: { label: 'Disconnected', color: 'error' },
    };
    const config = statusConfig[status] || statusConfig.offline;
    return <Chip label={config.label} color={config.color} size="large" />;
  };

  if (statusLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            WhatsApp Connection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect your WhatsApp account to start sending campaigns
          </Typography>
        </Paper>

        {/* Status Card */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                {getStatusIcon()}
              </Box>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {getStatusChip()}
              </Box>

              {status === 'active' && (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="caption" color="text.secondary">
                              Phone Number
                            </Typography>
                          </Box>
                          <Typography variant="h6">{phoneNumber || 'N/A'}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="caption" color="text.secondary">
                              Connected At
                            </Typography>
                          </Box>
                          <Typography variant="body1">
                            {connectedAt ? format(new Date(connectedAt), 'PPpp') : 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    {instanceName && (
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Instance Name
                            </Typography>
                            <Typography variant="body1">{instanceName}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>

                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                    sx={{ mt: 3 }}
                  >
                    {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect WhatsApp'}
                  </Button>
                </Box>
              )}

              {status === 'pending' && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {qrCode
                        ? 'Waiting for WhatsApp connection. Please scan the QR code with your phone.'
                        : 'Connection pending but no QR code available. Please retry connection.'}
                    </Typography>
                  </Alert>
                  <LinearProgress sx={{ mb: 2 }} />
                  {!qrCode && (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                      size="large"
                    >
                      {connectMutation.isPending ? 'Generating QR Code...' : 'Retry Connection'}
                    </Button>
                  )}
                </Box>
              )}

              {status === 'offline' && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      You are not connected to WhatsApp. Click the button below to connect.
                    </Typography>
                  </Alert>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleConnect}
                    disabled={connectMutation.isPending}
                    size="large"
                  >
                    {connectMutation.isPending ? 'Generating QR Code...' : 'Connect WhatsApp'}
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* QR Code Display */}
          <Grid item xs={12} md={6}>
            {qrCode && status !== 'active' && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Scan QR Code
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph align="center">
                  Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 2,
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                  }}
                >
                  <img
                    src={qrCode}
                    alt="QR Code"
                    style={{ maxWidth: '100%', height: 'auto', maxHeight: 400 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      QR Code expires in:
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color={countdown < 10 ? 'error' : 'primary'}>
                      {countdown}s
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(countdown / 45) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    The QR code will automatically refresh when it expires.
                  </Typography>
                </Alert>

                <Button variant="outlined" fullWidth onClick={handleConnect} disabled={connectMutation.isPending}>
                  Refresh QR Code
                </Button>
              </Paper>
            )}

            {!qrCode && status === 'offline' && (
              <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  How to Connect
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  1. Click "Connect WhatsApp" button
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  2. Open WhatsApp on your phone
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  3. Go to Settings → Linked Devices
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  4. Tap "Link a Device"
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  5. Scan the QR code that appears
                </Typography>
              </Paper>
            )}

            {status === 'active' && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Alert severity="success">
                  <Typography variant="h6" gutterBottom>
                    Successfully Connected!
                  </Typography>
                  <Typography variant="body2">
                    Your WhatsApp is now connected and ready to send campaigns.
                  </Typography>
                </Alert>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>What's next?</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Sync your contacts from the Contacts page
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Create message templates
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Start your first campaign
                  </Typography>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Disconnect Confirmation Dialog */}
        <Dialog open={showDisconnectDialog} onClose={() => setShowDisconnectDialog(false)}>
          <DialogTitle>Disconnect WhatsApp?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to disconnect your WhatsApp account? You will need to scan the QR code
              again to reconnect.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDisconnectDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmDisconnect} color="error" variant="contained" autoFocus>
              Disconnect
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}

export default WhatsApp;
