import { create } from 'zustand';

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
  user: {
    id: string;
    username: string;
    subscription_tier: 'free' | 'pro';
  } | null;
  setUser: (user: AppStore['user']) => void;

  stats: StatsState;
  setStats: (stats: Partial<StatsState>) => void;
  resetStats: () => void;

  ui: UIState;
  toggleMobileMenu: () => void;
  setActiveTab: (tab: string) => void;

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
  user: null,
  setUser: (user) => set({ user }),

  stats: initialStats,
  setStats: (newStats) => set((state) => ({ stats: { ...state.stats, ...newStats } })),
  resetStats: () => set({ stats: initialStats }),

  ui: initialUI,
  toggleMobileMenu: () =>
    set((state) => ({ ui: { ...state.ui, isMobileMenuOpen: !state.ui.isMobileMenuOpen } })),
  setActiveTab: (tab) => set((state) => ({ ui: { ...state.ui, activeTab: tab } })),

  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
}));
