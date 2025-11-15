import { Box, Typography, Paper, Grid, Avatar, Divider } from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import useAuthStore from '../store/authStore';

function Profile() {
  const { user } = useAuthStore();

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <MainLayout>
      <Box>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage your account information
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  margin: '0 auto',
                  bgcolor: 'primary.main',
                  fontSize: 48,
                  mb: 2,
                }}
              >
                {getInitials(user?.name)}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {user?.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textTransform: 'capitalize',
                  bgcolor: user?.role === 'admin' ? 'error.light' : 'primary.light',
                  color: user?.role === 'admin' ? 'error.dark' : 'primary.dark',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'inline-block',
                }}
              >
                {user?.role}
              </Typography>
            </Paper>
          </Grid>

          {/* Details Card */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Account Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">{user?.name}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email Address
                    </Typography>
                    <Typography variant="body1">{user?.email}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1">{user?.phone || 'Not provided'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BadgeIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Role
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {user?.role}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" align="center">
                Profile editing features will be added soon!
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}

export default Profile;
