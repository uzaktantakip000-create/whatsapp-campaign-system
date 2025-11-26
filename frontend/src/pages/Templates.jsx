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
  Grid,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import templatesAPI from '../api/templates';
import useAuthStore from '../store/authStore';

// Validation schema
const templateSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

function Templates() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);

  // Form
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      content: '',
      category: '',
      isActive: true,
    },
  });

  // Fetch templates
  const { data, isLoading, error } = useQuery({
    queryKey: ['templates', page, rowsPerPage, search, categoryFilter, activeFilter],
    queryFn: () => templatesAPI.getTemplates({
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      isActive: activeFilter !== 'all' ? activeFilter === 'active' : undefined,
    }),
  });

  const templates = data?.data || [];
  const totalCount = data?.pagination?.total || 0;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        consultantId: user.id,
        isActive: data.isActive,
      };

      if (editingTemplate) {
        return await templatesAPI.updateTemplate(editingTemplate.id, payload);
      } else {
        return await templatesAPI.createTemplate(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      reset();
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save template';
      toast.error(errorMessage);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => templatesAPI.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setDeleteDialogOpen(false);
      setEditingTemplate(null);
      toast.success('Template deleted');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete template';
      toast.error(errorMessage);
    },
  });

  // Handlers
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    reset({
      name: '',
      content: '',
      category: '',
      isActive: true,
    });
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    reset({
      name: template.name,
      content: template.content,
      category: template.category || '',
      isActive: template.isActive,
    });
    setTemplateDialogOpen(true);
  };

  const handlePreviewTemplate = (template) => {
    setPreviewingTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleDeleteTemplate = (template) => {
    setEditingTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleCopyTemplate = (template) => {
    navigator.clipboard.writeText(template.content);
    toast.success('Template copied to clipboard');
  };

  const onSubmit = (formData) => {
    saveMutation.mutate(formData);
  };

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Message Templates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create and manage reusable message templates
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTemplate}
            >
              Create Template
            </Button>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search templates..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="greeting">Greeting</MenuItem>
                  <MenuItem value="follow-up">Follow-up</MenuItem>
                  <MenuItem value="offer">Offer</MenuItem>
                  <MenuItem value="reminder">Reminder</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="outlined" onClick={handleSearch}>
                Search
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Templates Table */}
        <Paper elevation={2}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading templates: {error.message}
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
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Content Preview</TableCell>
                      <TableCell>Usage</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {template.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {template.category && (
                            <Chip label={template.category} size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {template.content.substring(0, 60)}...
                          </Typography>
                        </TableCell>
                        <TableCell>{template.usageCount || 0}</TableCell>
                        <TableCell>
                          <Chip
                            label={template.isActive ? 'Active' : 'Inactive'}
                            color={template.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(template.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Preview">
                            <IconButton size="small" onClick={() => handlePreviewTemplate(template)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy">
                            <IconButton size="small" onClick={() => handleCopyTemplate(template)}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeleteTemplate(template)}>
                              <DeleteIcon fontSize="small" />
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

        {/* Create/Edit Dialog */}
        <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <TextField
                fullWidth
                label="Template Name"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select {...register('category')} label="Category" defaultValue="">
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="greeting">Greeting</MenuItem>
                  <MenuItem value="follow-up">Follow-up</MenuItem>
                  <MenuItem value="offer">Offer</MenuItem>
                  <MenuItem value="reminder">Reminder</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Template Content"
                {...register('content')}
                error={!!errors.content}
                helperText={errors.content?.message || 'Use {{variable}} for dynamic content (e.g., {{name}}, {{date}})'}
                margin="normal"
              />

              <FormControlLabel
                control={<Switch {...register('isActive')} defaultChecked />}
                label="Active"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Template'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogContent>
            {previewingTemplate && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {previewingTemplate.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Category: {previewingTemplate.category || 'None'}
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                    {previewingTemplate.content}
                  </Typography>
                </Paper>
                {previewingTemplate.variables && previewingTemplate.variables.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Variables: {previewingTemplate.variables.join(', ')}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Used {previewingTemplate.usage_count || 0} times
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Template</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this template? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editingTemplate && deleteMutation.mutate(editingTemplate.id)}
              color="error"
              variant="contained"
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

export default Templates;
