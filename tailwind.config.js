module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      colors: {
        surface: '#fff8f4',
        'surface-low': '#fff1e6',
        'surface-high': '#f1e0cf',
        'warm-cream': '#F4E2D1',
        'vibrant-peach': '#F59B7C',
        'peach-dark': '#924a31',
        'dark-accent': '#392f23',
        'on-surface': '#231a10'
      },
      fontFamily: {
        display: ['Shrikhand', 'serif'],
        body: ['Outfit', 'sans-serif']
      },
      lineHeight: {
        'relaxed-plus': '1.75',
        'tight-plus': '1.1'
      },
      borderRadius: {
        '4xl': '3rem',
        '5xl': '4rem'
      }
    }
  }
}
