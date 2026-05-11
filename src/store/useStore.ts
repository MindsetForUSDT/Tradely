// store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// Типы
type SubscriptionTier = 'free' | 'pro' | 'enterprise';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at?: string; // ✅ Добавлено
  avatar_url?: string;
  created_at?: string;
}

interface StatsState {
  totalBalance: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  totalTrades: number;
  winRate: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface UIState {
  isMobileMenuOpen: boolean;
  activeTab: string;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
}

interface FilterState {
  dateRange: '7d' | '30d' | '90d' | '1y' | 'all';
  selectedWallets: string[];
  selectedChains: string[];
  tradeType: 'all' | 'buy' | 'sell';
}

interface AppStore {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;

  stats: StatsState;
  setStats: (stats: Partial<StatsState>) => void;
  loadStats: () => Promise<void>;
  resetStats: () => void;

  ui: UIState;
  toggleMobileMenu: () => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;

  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

const initialStats: StatsState = {
  totalBalance: 0,
  dailyPnl: 0,
  weeklyPnl: 0,
  monthlyPnl: 0,
  totalTrades: 0,
  winRate: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const initialUI: UIState = {
  isMobileMenuOpen: false,
  activeTab: 'overview',
  sidebarCollapsed: false,
  theme: 'dark',
};

const initialFilters: FilterState = {
  dateRange: '30d',
  selectedWallets: [],
  selectedChains: [],
  tradeType: 'all',
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Пользователь
      user: null,

      setUser: (user) => {
        set({ user });
        if (user) {
          get().loadStats();
        } else {
          get().resetStats();
        }
      },

      logout: () => {
        set({
          user: null,
          stats: initialStats,
          filters: initialFilters,
        });
        localStorage.removeItem('sb-token');
      },

      // Статистика
      stats: initialStats,

      setStats: (newStats) =>
        set((state) => ({
          stats: {
            ...state.stats,
            ...newStats,
            lastUpdated: new Date().toISOString(),
          },
        })),

      loadStats: async () => {
        const { user } = get();
        if (!user) return;

        set((s) => ({ stats: { ...s.stats, isLoading: true, error: null } }));

        try {
          const { data: trades, error } = await supabase
            .from('trades')
            .select('pnl_realized, side, timestamp')
            .eq('user_id', user.id);

          if (error) throw error;

          const now = new Date();
          const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          const dailyTrades = (trades || []).filter((t) => new Date(t.timestamp) >= dayAgo);
          const winners = (trades || []).filter((t) => (t.pnl_realized || 0) > 0);

          set({
            stats: {
              totalBalance: 0,
              dailyPnl: dailyTrades.reduce((s, t) => s + (t.pnl_realized || 0), 0),
              weeklyPnl: (trades || [])
                .filter((t) => new Date(t.timestamp) >= weekAgo)
                .reduce((s, t) => s + (t.pnl_realized || 0), 0),
              monthlyPnl: (trades || [])
                .filter((t) => new Date(t.timestamp) >= monthAgo)
                .reduce((s, t) => s + (t.pnl_realized || 0), 0),
              totalTrades: trades?.length || 0,
              winRate: trades?.length ? +((winners.length / trades.length) * 100).toFixed(1) : 0,
              isLoading: false,
              error: null,
              lastUpdated: new Date().toISOString(),
            },
          });
        } catch (e: any) {
          set((s) => ({
            stats: { ...s.stats, isLoading: false, error: e.message },
          }));
        }
      },

      resetStats: () => set({ stats: initialStats }),

      // UI
      ui: initialUI,

      toggleMobileMenu: () =>
        set((s) => ({
          ui: { ...s.ui, isMobileMenuOpen: !s.ui.isMobileMenuOpen },
        })),

      setActiveTab: (tab) => set((s) => ({ ui: { ...s.ui, activeTab: tab } })),

      toggleSidebar: () =>
        set((s) => ({ ui: { ...s.ui, sidebarCollapsed: !s.ui.sidebarCollapsed } })),

      setTheme: (theme) => {
        set((s) => ({ ui: { ...s.ui, theme } }));
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      // Фильтры
      filters: initialFilters,

      setFilters: (newFilters) =>
        set((s) => ({
          filters: { ...s.filters, ...newFilters },
        })),

      // Глобальные
      isGlobalLoading: false,
      setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

      isOnline: true,
      setOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: 'tradeumdiary-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ui: { theme: state.ui.theme, sidebarCollapsed: state.ui.sidebarCollapsed },
        filters: state.filters,
      }),
    }
  )
);
