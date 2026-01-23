import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neonYellow: '#CCFF00',
        darkBg: '#000000',
      },
    },
  },
  plugins: [],
};
export default config;
