const options = require('./config') //options from config.js

const allPlugins = {
    typography: require('@tailwindcss/typography'),
    forms: require('@tailwindcss/forms'),
    containerQueries: require('@tailwindcss/container-queries'),
}

const plugins = Object.keys(allPlugins)
    .filter(k => options.plugins[k])
    .map(k => {
        if (k in options.plugins && options.plugins[k]) {
            return allPlugins[k]
        }
    })

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,js,php}'],
    darkMode: 'class',
    theme: {
        backgroundSize: {
            auto: 'auto',
            cover: 'cover',
            contain: 'contain',
            '100%': '100%',
            '100-auto': '100% auto',
        },
        fontFamily: {
            sans: ['Sora', 'sans-serif'],
        },
        fontSize: {
            none: ['0px', '0px'],
            base: ['16px', '140%'],
            'display-1': ['50px', '100%'],
            'display-2': ['35px', '100%'],
            H1: ['40px', '70%'],
            H1Mob: ['30px', '70%'],
            topTitle: ['24px', '120%'],
            H2: ['20px', '120%'],
            Body: ['18px', '120%'],
            Body3: ['16px', '140%'],
            Body4: ['16px', '120%'],
            Body5: ['14px', '130%'],
            Body6: ['14px', '140%'],
            Body7: ['12px', '140%'],
            Body8: ['12px', '120%'],
        },
        screens: {
            xl: {max: '1345px'},
            lg: {max: '1023px'},
            md: {max: '767px'},
            sm: {max: '639px'},
            sm2: {max: '480px'},

            minsm: {min: '640px'},
            minmd: {min: '768px'},
            minlg: {min: '1024px'},
            minxl: {min: '1346px'},
        },
        container: {
            center: true,
            padding: {
                sm: '2rem',
                lg: '4rem',
                xl: '5rem',
                '2xl': '6rem',
            },
        },
        extend: {
            boxShadow: {
                'color-1': '0px 0px 25px 0px rgba(0, 0, 0, 0.15);'
            },
            colors: {
                transparent: 'transparent',
                primary: '#2E3436',
                dark: '#2E3436',
                grey: '#AAAAAA',
                'light-grey': '#C4C4C4',
                'super-light-grey': '#E5E5E5',
                'grey-2': '#F6F6F6',
                'grey-3': 'rgba(47, 52, 54, 0.30)',
                secondary: 'rgba(25, 24, 27, 0.05)',
                white: '#ffffff',
                purple: '#3f3cbb',
                midnight: '#121063',
                metal: '#565584',
                tahiti: '#3ab7bf',
                silver: '#ecebff',
                red: '#E52A47',
                bermuda: '#78dcca',
                yellow: '#F5CA35',
                'yellow-hover': '#dfb730',
                beige: '#FAF7EE',
            },
            letterSpacing: {

            },
            padding: {
                '1/4': '25%',
                '3/4': '75%',
                '1/5': '20%',
                '2/5': '40%',
                '3/5': '60%',
                '4/5': '80%',
                '1/6': '16.666667%',
                '5/6': '83.333333%',
                '1/24': '4.166667%',
                '2/24': '8.333333%',
                '3/24': '12.5%',
                '4/24': '16.666667%',
                '5/24': '20.833333%',
                '6/24': '25%',
                '7/24': '29.166667%',
                '8/24': '33.333333%',
                '2.5': '10px',
            },
        },
    },
    plugins: plugins,
}
