import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '../components/layout/MainLayout';

function Templates() {
  return (
    <MainLayout>
      <Box>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Message Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage message templates with variables
          </Typography>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Message Templates Page
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will allow you to create reusable message templates with dynamic variables.
            Coming soon!
          </Typography>
        </Paper>
      </Box>
    </MainLayout>
  );
}

export default Templates;
