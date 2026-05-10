export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0A0A0F',
          elevated: '#0F0F18',
          overlay: '#151520',
          border: '#1A1A2E',
          highlight: '#1E1E32',
        },
        neon: {
          cyan: '#00F5FF',
          magenta: '#FF00FF',
          yellow: '#FFE600',
          green: '#00FFA3',
          red: '#FF3B5C',
        },
        text: {
          primary: '#E8E8F0',
          secondary: '#8888A0',
          muted: '#555570',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        hud: '0 0 0 1px rgba(0, 245, 255, 0.2), 0 0 20px rgba(0, 245, 255, 0.1)',
        'hud-strong': '0 0 0 1px rgba(0, 245, 255, 0.4), 0 0 40px rgba(0, 245, 255, 0.2)',
        magenta: '0 0 0 1px rgba(255, 0, 255, 0.2), 0 0 20px rgba(255, 0, 255, 0.1)',
        card: '0 4px 24px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'scan-line': 'scanLine 8s linear infinite',
        glitch: 'glitch 0.3s ease-in-out infinite',
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'hud-fade': 'hudFade 0.6s ease-out',
      },
      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(2px, -1px)' },
          '60%': { transform: 'translate(-1px, -1px)' },
          '80%': { transform: 'translate(1px, 1px)' },
        },
        neonPulse: {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 5px rgba(0, 245, 255, 0.3)' },
          '50%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)' },
        },
        hudFade: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'hud-grid':
          'linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)',
        'scan-line':
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
      },
      backgroundSize: {
        'hud-grid': '40px 40px',
        'scan-line': '100% 4px',
      },
      borderRadius: {
        terminal: '0px',
        hud: '4px',
        card: '2px',
      },
    },
  },
  plugins: [],
};
