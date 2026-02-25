/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'romantic': ['Dancing Script', 'cursive'],
                'poppins': ['Poppins', 'sans-serif'],
                'outfit': ['Outfit', 'sans-serif'],
                'playfair': ['Playfair Display', 'serif'],
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'blink': 'blink 1s infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 129, 0.4)' },
                    '50%': { boxShadow: '0 0 40px rgba(255, 107, 129, 0.8)' },
                },
                blink: {
                    '0%, 50%': { opacity: '1' },
                    '51%, 100%': { opacity: '0' },
                },
            },
        },
    },
    plugins: [],
}
