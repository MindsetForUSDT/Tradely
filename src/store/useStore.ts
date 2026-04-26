// ============================================================
// TradeumDiary — Глобальное состояние (Zustand)
// Управление пользователем, статистикой и UI-состоянием
// ============================================================

import { create } from 'zustand';
import type { Profile } from '@/types';

interface StatsState {
  totalBalance: number;
  dailyPnl: number;
  dailyTrades: number;
  isLoading: boolean;
  error: string | null;
}

interface UIState {
  isMobileMenuOpen: boolean;
  activeTab: string;
}

interface AppStore {
  // Пользователь
  user: Profile | null;
  setUser: (user: Profile | null) => void;

  // Статистика дашборда
  stats: StatsState;
  setStats: (stats: Partial<StatsState>) => void;
  resetStats: () => void;

  // UI
  ui: UIState;
  toggleMobileMenu: () => void;
  setActiveTab: (tab: string) => void;

  // Глобальная загрузка
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

const initialStats: StatsState = {
  totalBalance: 0,
  dailyPnl: 0,
  dailyTrades: 0,
  isLoading: false,
  error: null,
};

const initialUI: UIState = {
  isMobileMenuOpen: false,
  activeTab: 'overview',
};

export const useStore = create<AppStore>((set) => ({
  // Пользователь
  user: null,
  setUser: (user) => set({ user }),

  // Статистика
  stats: initialStats,
  setStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),
  resetStats: () => set({ stats: initialStats }),

  // UI
  ui: initialUI,
  toggleMobileMenu: () =>
    set((state) => ({
      ui: { ...state.ui, isMobileMenuOpen: !state.ui.isMobileMenuOpen },
    })),
  setActiveTab: (tab) =>
    set((state) => ({
      ui: { ...state.ui, activeTab: tab },
    })),

  // Глобальная загрузка
  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
}));