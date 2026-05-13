import { create } from 'zustand';
import { User } from '@/types';
import { ApiError, authApi, tokenStore } from '@/lib/api';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
};

let loadUserPromise: Promise<void> | null = null;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: 'GUEST' | 'HOST'
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  completeOAuthLogin: (accessToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    try {
      const response = await authApi.login({ email, password });
      tokenStore.set(response.data.accessToken);
      set({ user: response.data.user as User, isAuthenticated: true, isLoading: false });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  register: async (name, email, password, role) => {
    try {
      await authApi.register({ name, email, password, role });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStore.clear();
      set({ user: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },

  loadUser: async () => {
    if (loadUserPromise) return loadUserPromise;

    loadUserPromise = (async () => {
      try {
        const response = await authApi.refresh();
        tokenStore.set(response.data.accessToken);

        const meResponse = await authApi.me();
        set({
          user: meResponse.data as User,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        tokenStore.clear();
        set({ user: null, isAuthenticated: false, isLoading: false });
      } finally {
        loadUserPromise = null;
      }
    })();

    return loadUserPromise;
  },

  completeOAuthLogin: async (accessToken) => {
    try {
      tokenStore.set(accessToken);
      const response = await authApi.me();
      set({
        user: response.data as User,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      tokenStore.clear();
      set({ user: null, isAuthenticated: false, isLoading: false });
      throw new Error(getErrorMessage(error));
    }
  },
}));
