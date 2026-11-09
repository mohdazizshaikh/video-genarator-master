/**
 * UI Store - Zustand state management for UI state
 */

import { create } from "zustand";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

export interface UIState {
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Sidebar / Navigation
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Theme
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;

  // Loading
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Modal
  modals: Record<string, Record<string, unknown>>;
  openModal: (name: string, data?: Record<string, unknown>) => void;
  closeModal: (name: string) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Notifications
  notifications: [],
  addNotification: (notification) =>
    set((state) => {
      const id = `${Date.now()}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
      const newNotification = { id, ...notification };
      const duration = notification.duration ?? 5000;

      if (notification.autoClose !== false) {
        setTimeout(() => {
          set((s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
          }));
        }, duration);
      }

      return {
        notifications: [...state.notifications, newNotification],
      };
    }),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // Sidebar / Navigation
  sidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Theme
  theme: ("light" as const),
  setTheme: (theme) => set({ theme }),

  // Loading
  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  // Modal
  modals: {},
  openModal: (name, data) =>
    set((state) => ({
      modals: {
        ...state.modals,
        [name]: data ?? {},
      },
    })),

  closeModal: (name) =>
    set((state) => {
      const newModals = { ...state.modals };
      delete newModals[name];
      return { modals: newModals };
    }),

  closeAllModals: () => set({ modals: {} }),
}));

/**
 * Helper hook for adding notifications
 */
export const useNotification = () => {
  const { addNotification } = useUIStore();

  return {
    success: (message: string, duration?: number) =>
      addNotification({
        type: "success",
        message,
        duration,
        autoClose: true,
      }),
    error: (message: string, duration?: number) =>
      addNotification({
        type: "error",
        message,
        duration,
        autoClose: true,
      }),
    info: (message: string, duration?: number) =>
      addNotification({
        type: "info",
        message,
        duration,
        autoClose: true,
      }),
    warning: (message: string, duration?: number) =>
      addNotification({
        type: "warning",
        message,
        duration,
        autoClose: true,
      }),
  };
};

export default useUIStore;
