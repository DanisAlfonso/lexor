/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Kanagawa Paper color palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe', 
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#7FB4CA', // springBlue
          500: '#7E9CD8', // crystalBlue
          600: '#957FB8', // oniViolet
          700: '#938AA9', // springViolet1
          800: '#223249', // waveBlue1
          900: '#2D4F67', // waveBlue2
        },
        
        // Kanagawa Paper background colors
        kanagawa: {
          'ink0': '#16161D', // sumiInk0 - darkest
          'ink1': '#181820', // sumiInk1
          'ink2': '#1a1a22', // sumiInk2  
          'ink3': '#1F1F28', // sumiInk3 - default bg
          'ink4': '#2A2A37', // sumiInk4 - lighter bg
          'ink5': '#363646', // sumiInk5 - cursorline
          'ink6': '#54546D', // sumiInk6 - line numbers
          'white': '#DCD7BA', // fujiWhite - default fg
          'oldwhite': '#C8C093', // oldWhite - dark fg
          'gray': '#727169', // fujiGray
        },

        // Kanagawa Paper accent colors
        accent: {
          'blue': '#7E9CD8', // crystalBlue
          'spring-blue': '#7FB4CA', // springBlue
          'violet': '#957FB8', // oniViolet
          'violet2': '#b8b4d0', // oniViolet2
          'green': '#98BB6C', // springGreen
          'yellow': '#E6C384', // carpYellow
          'yellow2': '#C0A36E', // boatYellow2
          'pink': '#D27E99', // sakuraPink
          'red': '#E46876', // waveRed
          'peach': '#FF5D62', // peachRed
          'orange': '#FFA066', // surimiOrange
        },

        // Standard grays for light mode compatibility
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb', 
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        // Focus mode colors
        focus: {
          dim: 'rgba(31, 31, 40, 0.3)', // kanagawa-ink3 with opacity
          active: '#DCD7BA', // kanagawa-white
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      lineHeight: {
        '12': '3rem',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.700'),
            lineHeight: '1.6',
            fontSize: '16px',
            fontFamily: theme('fontFamily.sans').join(', '),
            '::selection': {
              backgroundColor: theme('colors.primary.200'),
            },
            'h1, h2, h3, h4, h5, h6': {
              fontWeight: '600',
              color: theme('colors.gray.900'),
            },
            'code': {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontFamily: theme('fontFamily.mono').join(', '),
            },
            'pre': {
              backgroundColor: theme('colors.gray.900'),
              color: theme('colors.gray.100'),
              fontFamily: theme('fontFamily.mono').join(', '),
            },
            'blockquote': {
              borderLeftColor: theme('colors.primary.500'),
              borderLeftWidth: '4px',
              paddingLeft: '1rem',
              fontStyle: 'italic',
            },
          },
        },
        dark: {
          css: {
            color: theme('colors.gray.300'),
            'h1, h2, h3, h4, h5, h6': {
              color: theme('colors.gray.100'),
            },
            'code': {
              backgroundColor: theme('colors.gray.800'),
              color: theme('colors.gray.200'),
            },
            'blockquote': {
              borderLeftColor: theme('colors.primary.400'),
              color: theme('colors.gray.400'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  darkMode: 'class',
};