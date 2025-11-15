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
  TableSortLabel,
  Checkbox,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  LinearProgress,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Sync as SyncIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import contactsAPI from '../api/contacts';

// Validation schema for contact form
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  whatsappNumber: z.string().optional(),
});

function Contacts() {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [selected, setSelected] = useState([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [syncProgress, setSyncProgress] = useState(false);

  // Form
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
      whatsappNumber: '',
    },
  });

  // Fetch contacts
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', page, rowsPerPage, search, orderBy, order],
    queryFn: () => contactsAPI.getContacts({
      page: page + 1,
      limit: rowsPerPage,
      search,
      sortBy: orderBy,
      sortOrder: order,
    }),
  });

  const contacts = data?.data?.contacts || [];
  const totalCount = data?.data?.total || 0;

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: contactsAPI.syncContacts,
    onMutate: () => setSyncProgress(true),
    onSuccess: (data) => {
      setSyncProgress(false);
      queryClient.invalidateQueries(['contacts']);
      toast.success(`Sync complete! ${data.data?.inserted || 0} new, ${data.data?.updated || 0} updated`);
    },
    onError: (error) => {
      setSyncProgress(false);
      toast.error(error.message || 'Sync failed');
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingContact) {
        return contactsAPI.updateContact(editingContact.id, data);
      }
      return contactsAPI.createContact(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setContactDialogOpen(false);
      setEditingContact(null);
      reset();
      toast.success(editingContact ? 'Contact updated' : 'Contact created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save contact');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => contactsAPI.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setDeleteDialogOpen(false);
      setEditingContact(null);
      toast.success('Contact deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete contact');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => contactsAPI.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setSelected([]);
      toast.success(`${selected.length} contacts deleted`);
    },
    onError: (error) => {
      toast.error(error.message || 'Bulk delete failed');
    },
  });

  // Handlers
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(contacts.map((c) => c.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    reset({ name: '', phone: '', whatsappNumber: '' });
    setContactDialogOpen(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setValue('name', contact.name);
    setValue('phone', contact.phone);
    setValue('whatsappNumber', contact.whatsappNumber || '');
    setContactDialogOpen(true);
    setAnchorEl(null);
  };

  const handleViewContact = (contact) => {
    setViewingContact(contact);
    setDetailsDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteContact = (contact) => {
    setEditingContact(contact);
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleBulkDelete = () => {
    if (selected.length > 0) {
      bulkDeleteMutation.mutate(selected);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await contactsAPI.exportContacts(selected);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Contacts exported successfully');
    } catch (error) {
      toast.error('Failed to export contacts');
    }
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const onSubmit = (data) => {
    saveMutation.mutate(data);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Contact Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your WhatsApp contacts
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={syncProgress ? <CircularProgress size={20} /> : <SyncIcon />}
                onClick={handleSync}
                disabled={syncProgress}
              >
                {syncProgress ? 'Syncing...' : 'Sync from WhatsApp'}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddContact}
              >
                Add Contact
              </Button>
            </Box>
          </Box>

          {syncProgress && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                Syncing contacts from WhatsApp...
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Search and Filters */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchInput('');
                          setSearch('');
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined" size="small" onClick={handleSearch}>
                  Search
                </Button>
                {selected.length > 0 && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      Delete ({selected.length})
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ExportIcon />}
                      onClick={handleExport}
                    >
                      Export ({selected.length})
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Contacts Table */}
        <Paper elevation={2}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              Failed to load contacts: {error.message}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : contacts.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No contacts found
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {search ? 'Try a different search term' : 'Click "Add Contact" or "Sync from WhatsApp" to get started'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selected.length > 0 && selected.length < contacts.length}
                          checked={contacts.length > 0 && selected.length === contacts.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'name'}
                          direction={orderBy === 'name' ? order : 'asc'}
                          onClick={() => handleSort('name')}
                        >
                          Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>WhatsApp</TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'lastMessageAt'}
                          direction={orderBy === 'lastMessageAt' ? order : 'asc'}
                          onClick={() => handleSort('lastMessageAt')}
                        >
                          Last Message
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contacts.map((contact) => {
                      const isItemSelected = isSelected(contact.id);
                      return (
                        <TableRow
                          key={contact.id}
                          hover
                          role="checkbox"
                          aria-checked={isItemSelected}
                          selected={isItemSelected}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isItemSelected}
                              onChange={() => handleSelect(contact.id)}
                            />
                          </TableCell>
                          <TableCell>{contact.name}</TableCell>
                          <TableCell>{contact.phone}</TableCell>
                          <TableCell>
                            {contact.whatsappNumber ? (
                              <Chip label={contact.whatsappNumber} size="small" color="success" />
                            ) : (
                              <Chip label="Not synced" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.lastMessageAt
                              ? format(new Date(contact.lastMessageAt), 'MMM dd, yyyy')
                              : 'Never'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => handleViewContact(contact)}>
                                <MoreVertIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleEditContact(contact)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteContact(contact)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

        {/* Add/Edit Contact Dialog */}
        <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <TextField
                fullWidth
                label="Name"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Phone Number"
                {...register('phone')}
                error={!!errors.phone}
                helperText={errors.phone?.message}
                margin="normal"
              />
              <TextField
                fullWidth
                label="WhatsApp Number (Optional)"
                {...register('whatsappNumber')}
                error={!!errors.whatsappNumber}
                helperText={errors.whatsappNumber?.message || 'Will be auto-populated from sync'}
                margin="normal"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setContactDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Contact Details Dialog */}
        <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Contact Details</DialogTitle>
          <DialogContent>
            {viewingContact && (
              <Box>
                <Typography variant="body1" paragraph>
                  <strong>Name:</strong> {viewingContact.name}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Phone:</strong> {viewingContact.phone}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>WhatsApp:</strong> {viewingContact.whatsappNumber || 'Not synced'}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Last Message:</strong>{' '}
                  {viewingContact.lastMessageAt
                    ? format(new Date(viewingContact.lastMessageAt), 'PPpp')
                    : 'Never'}
                </Typography>
                <Typography variant="body1">
                  <strong>Created:</strong> {format(new Date(viewingContact.createdAt), 'PPpp')}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            <Button
              variant="outlined"
              onClick={() => {
                handleEditContact(viewingContact);
                setDetailsDialogOpen(false);
              }}
            >
              Edit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Contact?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {editingContact?.name}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => deleteMutation.mutate(editingContact.id)}
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

export default Contacts;
