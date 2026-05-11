export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
        accent: {
          green: '#00FFA3',
          'green-dim': '#00CC82',
          red: '#FF3B5C',
          'red-dim': '#CC2F4A',
          yellow: '#FFD700',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0AEC0',
          muted: '#6B7280',
        },
        surface: {
          DEFAULT: '#0A0A0A',
          elevated: '#111111',
          overlay: '#1A1A1A',
          border: '#2A2A2A',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.15)',
        'glow-cyan-lg': '0 0 40px rgba(0, 245, 255, 0.25)',
        'glow-magenta': '0 0 20px rgba(255, 0, 255, 0.15)',
        'glow-green': '0 0 20px rgba(0, 255, 163, 0.15)',
        'glow-red': '0 0 20px rgba(255, 59, 92, 0.15)',
        'glow-yellow': '0 0 20px rgba(255, 215, 0, 0.15)',
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
