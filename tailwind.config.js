export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0A0A0A',
          elevated: '#111111',
          overlay: '#1A1A1A',
          border: '#2A2A2A',
        },
        accent: {
          green: '#00FFA3',
          'green-dim': '#00CC82',
          red: '#FF3B5C',
          'red-dim': '#CC2F4A',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0AEC0',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow-green': '0 0 20px rgba(0, 255, 163, 0.15)',
        'glow-red': '0 0 20px rgba(255, 59, 92, 0.15)',
      },
      animation: {
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
