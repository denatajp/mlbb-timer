/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: '#0f1724',
                card: '#111827',
                accent: '#10b981'
            }
        },
    },
    plugins: [],
}