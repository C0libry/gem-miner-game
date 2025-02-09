import colors from 'tailwindcss/colors';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,vue}'],
  theme: {
    extend: {
      colors: {
        primary: colors.orange
      }
    }
  },
  plugins: []
};
