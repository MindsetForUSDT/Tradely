export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Фон - строгий, приглушённый
        bg: {
          DEFAULT: '#0a0a0f',
          secondary: '#111318',
          tertiary: '#161920',
        },
        // Поверхности
        surface: {
          DEFAULT: '#161920',
          elevated: '#1c1f26',
          overlay: '#232730',
          border: '#2a2e39',
          borderHover: '#3a3f4d',
        },
        // Текст - высокий контраст для читаемости
        text: {
          primary: '#e6e6e8',
          secondary: '#8a8f98',
          tertiary: '#6b707a',
          muted: '#5a5f68',
        },
        // Акценты - приглушённые, не кричащие
        accent: {
          indigo: '#6366f1',
          indigoLight: '#818cf8',
          emerald: '#10b981',
          emeraldLight: '#34d399',
          green: '#00FFA3',
          'green-dim': '#00CC82',
          red: '#ef4444',
          redLight: '#f87171',
          yellow: '#f59e0b',
        },
        // Сохраняем старую палитру для обратной совместимости
        cyber: {
          950: '#0A0A0F',
          900: '#0F0F1A',
          800: '#1A1A2E',
          750: '#1F1F35',
          700: '#2A2A40',
          600: '#3A3A50',
        },
        neon: {
          cyan: '#00F5FF',
          'cyan-dim': '#00C7D4',
          magenta: '#FF00FF',
          'magenta-dim': '#D400D4',
          yellow: '#FFD700',
          'yellow-dim': '#D4B200',
          green: '#00FFA3',
          'green-dim': '#00CC82',
        },
      },
      spacing: {
        'btn-gap': '0.75rem',
        'card-gap': '1.5rem',
        'section-pad': '3rem',
        touch: '2.75rem',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '18px', fontWeight: '400' }],
        sm: ['13px', { lineHeight: '20px', fontWeight: '400' }],
        base: ['14px', { lineHeight: '22px', fontWeight: '400' }],
        lg: ['16px', { lineHeight: '24px', fontWeight: '500' }],
        xl: ['18px', { lineHeight: '28px', fontWeight: '500' }],
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        '3xl': ['30px', { lineHeight: '38px', fontWeight: '600' }],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.15)',
        'glow-cyan-lg': '0 0 40px rgba(0, 245, 255, 0.25)',
        'glow-magenta': '0 0 20px rgba(255, 0, 255, 0.15)',
        'glow-green': '0 0 20px rgba(0, 255, 163, 0.15)',
        'glow-red': '0 0 20px rgba(255, 59, 92, 0.15)',
        'glow-yellow': '0 0 20px rgba(255, 215, 0, 0.15)',
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
      },
      animation: {
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
