export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        './node_modules/flowbite/lib/**/*.js',
    ],
    darkMode: 'selector',
    theme: {
        extend: {},
    },
    plugins: [
        require('flowbite/plugin'),
    ],
}