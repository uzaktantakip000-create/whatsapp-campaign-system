import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Notification Store
 * Manages in-app notifications with persistence
 */
const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],

      /**
       * Add a new notification
       * @param {Object} notification - { type, title, message }
       */
      addNotification: (notification) => {
        const newNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: notification.type || 'info', // success, error, info, warning
          title: notification.title,
          message: notification.message,
          read: false,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep max 50 notifications
        }));
      },

      /**
       * Mark notification as read
       * @param {string} id - Notification ID
       */
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif.id === id ? { ...notif, read: true } : notif
          ),
        }));
      },

      /**
       * Mark all notifications as read
       */
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notif) => ({
            ...notif,
            read: true,
          })),
        }));
      },

      /**
       * Remove notification
       * @param {string} id - Notification ID
       */
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((notif) => notif.id !== id),
        }));
      },

      /**
       * Clear all notifications
       */
      clearAll: () => {
        set({ notifications: [] });
      },

      /**
       * Get unread count
       */
      getUnreadCount: () => {
        return get().notifications.filter((notif) => !notif.read).length;
      },
    }),
    {
      name: 'notification-storage', // LocalStorage key
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 20), // Persist only last 20
      }),
    }
  )
);

export default useNotificationStore;
