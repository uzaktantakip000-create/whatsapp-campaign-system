import { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Button,
  Chip,
} from '@mui/material';
import {
  Notifications,
  CheckCircle,
  Error,
  Info,
  Warning,
  DeleteSweep,
  DoneAll,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import useNotificationStore from '../../store/notificationStore';

function NotificationMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const { notifications, markAsRead, markAllAsRead, clearAll, getUnreadCount } =
    useNotificationStore();

  const unreadCount = getUnreadCount();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAll();
    handleClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      case 'warning':
        return <Warning color="warning" fontSize="small" />;
      case 'info':
      default:
        return <Info color="info" fontSize="small" />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} sx={{ mr: 1 }}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} new`} color="error" size="small" />
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    borderLeft: notification.read ? 'none' : '4px solid',
                    borderLeftColor: notification.read ? 'transparent' : 'primary.main',
                  }}
                >
                  <ListItemIcon>{getIcon(notification.type)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                </MenuItem>
              ))}
            </Box>

            <Divider />

            {/* Actions */}
            <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<DoneAll />}
                  onClick={handleMarkAllAsRead}
                  fullWidth
                >
                  Mark all as read
                </Button>
              )}
              <Button
                size="small"
                startIcon={<DeleteSweep />}
                onClick={handleClearAll}
                color="error"
                fullWidth
              >
                Clear all
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}

export default NotificationMenu;
