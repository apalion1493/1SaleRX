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
            sans: ['Poppins', 'sans-serif'],
        },
        fontSize: {
            none: ['0px', '0px'],
            base: '1rem', //16px
            body8: ['12px', '120%'],
            body7: ['14px', '140%'],
            body6: ['14px', '120%'],
            body5: ['16px', '120%'],
            body4: ['16px', '130%'],
            body3: ['16px', '140%'],
            body2: ['18px', '140%'],
            body: ['18px', '150%'],
            button: ['18px', '120%'],
            t2: ['20px', '120%'],
            tt: ['22px', '150%'],
            h3Mob: ['28px', '120%'],
            h3: ['38px', '120%'],
            h1Mob: ['40px', '120%'],
            h1: ['64px', '120%'],
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
                'shadow-1': '0px 0px 18px -1px rgba(86, 85, 92, 0.15)',
                'shadow-2':
                    '0px 1px 4px 0px rgba(25, 24, 27, 0.08), 0px 5px 10px 0px rgba(25, 24, 27, 0.05)',
                'shadow-3': '0px 4px 14px 0px rgba(25, 24, 27, 0.05);',
                'shadow-4':
                    '0px 1px 7px 0px rgba(0, 0, 0, 0.02), 0px 4px 14px 0px rgba(25, 24, 27, 0.05)',
                'shadow-5': '0px 3px 20px -2px rgba(25, 24, 27, 0.15)',
            },
            colors: {
                transparent: 'transparent',
                primary: '#19181B',
                secondary: 'rgba(25, 24, 27, 0.05)',
                'grey-1': 'rgba(25, 24, 27, 0.60)',
                'grey-2': 'rgba(255, 255, 255, 0.50)',
                'border-1': 'rgba(255, 255, 255, 0.30)',
                'border-2': 'rgba(25, 24, 27, 0.30)',
                'border-3': 'rgba(25, 24, 27, 0.10)',
                white: '#ffffff',
                purple: '#3f3cbb',
                midnight: '#121063',
                metal: '#565584',
                tahiti: '#3ab7bf',
                silver: '#ecebff',
                'bubble-gum': '#ff77e9',
                danger: '#FF3F56',
                bermuda: '#78dcca',
            },
            letterSpacing: {
                '-032': '-0.032px',
                '0-5': '0.5px',
                '1-6': '1.6px',
                base: '1px',
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
            },
        },
    },
    plugins: plugins,
}
