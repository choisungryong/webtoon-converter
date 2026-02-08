import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neonYellow: '#CCFF00',
        darkBg: '#000000',
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        tab: '12px',
      },
      boxShadow: {
        accent: '0 4px 15px var(--accent-glow)',
      },
    },
  },
  plugins: [],
};
export default config;
