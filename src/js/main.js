window.addEventListener('DOMContentLoaded', () => {
    console.log('Loaded Scripts')

    const player = new Plyr('#player');

    const swiper1 = new Swiper('.splide-1', {
        // Optional parameters
        direction: 'horizontal',
        slidesPerView: 3,
        spaceBetween: 24,
        // loop: true,

        // If we need pagination
        pagination: {
            el: '.swiper-pagination',
            renderBullet: function (index, className) {
                return '<span class="' + className + '">' + (index + 1) + '</span>'
            },
            dynamicBullets: true,
            clickable: true,
        },

        // Navigation arrows
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        // And if we need scrollbar
        scrollbar: {
            el: '.swiper-scrollbar',
        },

        breakpoints: {
            1280: {
                slidesPerView: 3,
            },

            1024: {
                slidesPerView: 2,
            },

            0: {
                slidesPerView: 1,
            }
        },
    })

    const swiper3 = new Swiper('.splide-3', {
        // Optional parameters
        slidesPerView: 'auto',
        spaceBetween: 24,

        // loop: true,

        // If we need pagination
        pagination: false,

        // Navigation arrows
        navigation: false,

        // And if we need scrollbar
        scrollbar: false,

        breakpoints: {
            1280: {
                slidesPerView: 3,
            },

            768: {
                slidesPerView: 2,
            },

            0: {
                slidesPerView: 'auto',
            },
        },
    })

    const swiper4 = new Swiper('.splide-4', {
        // Optional parameters
        slidesPerView: 'auto',
        spaceBetween: 24,

        // loop: true,

        // If we need pagination
        pagination: {
            el: '.swiper-pagination',
            renderBullet: function (index, className) {
                return '<span class="' + className + '">' + (index + 1) + '</span>'
            },
            dynamicBullets: true,
            clickable: true,
        },

        // Navigation arrows
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        // And if we need scrollbar
        scrollbar: {
            el: '.swiper-scrollbar',
        },

        breakpoints: {
            1280: {
                slidesPerView: 4,
            },

            1024: {
                slidesPerView: 3,
            },

            768: {
                slidesPerView: 2,
            },

            0: {
                slidesPerView: 'auto',
            }
        },
    })
})

let swiperInstance

function initSwiper() {
    if (window.innerWidth <= 768 && !swiperInstance) {
        swiperInstance = new Swiper('.splide-2', {
            // Optional parameters
            direction: 'horizontal',
            spaceBetween: 24,
            slidesPerView: 'auto',
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },

            // Navigation arrows
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        })
    } else if (window.innerWidth > 768 && swiperInstance) {
        swiperInstance.destroy(true, true)
        swiperInstance = null
    }
}

// Инициализировать при загрузке страницы
window.addEventListener('load', initSwiper)

// Проверять при изменении размера окна
window.addEventListener('resize', initSwiper)

const modal = document.getElementById('modal')
const openModalBtn = document.getElementById('openModal')
const closeModalElements = document.querySelectorAll('.close-modal')

if (modal && openModalBtn && closeModalElements) {
    const openModal = () => {
        modal.classList.remove('hidden')
    }

    const closeModal = () => {
        modal.classList.add('hidden')
    }

    openModalBtn.addEventListener('click', openModal)

    closeModalElements.forEach(el => {
        el.addEventListener('click', closeModal)
    })

    window.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal()
        }
    })
}

document.addEventListener('DOMContentLoaded', function () {
    const wishlistButtonOpen = document.querySelector('#wishlist-open')
    const wishlistBlock = document.querySelector('#wishlist')
    const wishlistCloseBtn = document.querySelector('#wishlist-close')
    const wishlistBg = document.querySelector('#wishlist-bg')

    if (wishlistButtonOpen) {
        wishlistButtonOpen.addEventListener('click', () => {
            wishlistBlock.classList.add('active')
            wishlistBg.classList.remove('hidden')
            document.body.classList.add('overflow-hidden')
        })
    }

    if (wishlistCloseBtn) {
        wishlistCloseBtn.addEventListener('click', () => {
            wishlistBlock.classList.remove('active')
            wishlistBg.classList.add('hidden')
            document.body.classList.remove('overflow-hidden')
        })
    }

    if (wishlistBg) {
        wishlistBg.addEventListener('click', () => {
            wishlistBlock.classList.remove('active')
            wishlistBg.classList.add('hidden')
            document.body.classList.remove('overflow-hidden')
        })
    }
})

// JavaScript to toggle the mega menu
const toggles = document.querySelectorAll('button[data-menu-target]')
let currentMenu = null
let currentButton = null

toggles.forEach(toggle => {
    toggle.addEventListener('click', function (event) {
        event.stopPropagation()
        const targetId = toggle.getAttribute('data-menu-target')
        const targetMenu = document.getElementById(targetId)

        if (currentMenu && currentMenu !== targetMenu) {
            currentMenu.classList.add('hidden')
            currentButton.classList.remove('active')
        }

        if (targetMenu.classList.contains('hidden')) {
            targetMenu.classList.remove('hidden')
            toggle.classList.add('active')
            currentMenu = targetMenu
            currentButton = toggle
        } else {
            targetMenu.classList.add('hidden')
            toggle.classList.remove('active')
            currentMenu = null
            currentButton = null
        }
    })
})

// Close the mega menu if clicking outside of it
document.addEventListener('click', function (event) {
    if (currentMenu && !currentMenu.contains(event.target)) {
        currentMenu.classList.add('hidden')
        if (currentButton) {
            currentButton.classList.remove('active')
        }
        currentMenu = null
        currentButton = null
    }
})

// Prevent menu closing when clicking inside the mega menu
document.querySelectorAll('.mega-menu').forEach(menu => {
    menu.addEventListener('click', function (event) {
        event.stopPropagation()
    })
})

document.addEventListener('DOMContentLoaded', function () {
    const burgerButton = document.getElementById('burger-button')
    const mobileMenu = document.getElementById('mobile-menu')

    if (burgerButton && mobileMenu) {
        burgerButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('active')
            document.body.classList.toggle('overflow-hidden')
        })
    }
})

// Закрываем подменю при клике вне меню
document.addEventListener('click', event => {
    const isClickInsideMenu = event.target.closest('nav')
    if (!isClickInsideMenu) {
        document.querySelectorAll('.submenu').forEach(submenu => {
            submenu.classList.add('hidden')
        })
    }
})

document.querySelectorAll('.product-card--favorites').forEach(icon => {
    icon.addEventListener('click', function (event) {
        event.preventDefault() // Предотвращаем переход по ссылке
        event.stopPropagation() // Предотвращаем всплытие события клика к ссылке

        const productId = this.getAttribute('data-product-id')
        const productElement = document.getElementById(productId)

        if (productElement.classList.contains('active')) {
            productElement.classList.remove('active')
            this.classList.remove('active')
        } else {
            productElement.classList.add('active')
            this.classList.add('active')
        }
    })
})

window.addEventListener('load', () => {
    const selectElements = document.querySelectorAll('.small-select')

    if (selectElements.length > 0) {
        selectElements.forEach(selectElement => {
            selectElement.addEventListener('mousedown', event => {
                event.stopPropagation()
                selectElement.classList.add('open')
            })

            selectElement.addEventListener('blur', () => {
                selectElement.classList.remove('open')
            })

            selectElement.addEventListener('change', () => {
                selectElement.classList.remove('open')
            })
        })

        document.addEventListener('click', () => {
            selectElements.forEach(selectElement => {
                selectElement.classList.remove('open')
            })
        })
    } else {
        console.warn('Элементы с классом .small-select не найдены в DOM.')
    }
})

document.addEventListener('DOMContentLoaded', function () {
    const headers = document.querySelectorAll('.accordion-header')

    headers.forEach(header => {
        header.addEventListener('click', function () {
            const content = header.nextElementSibling
            const icon = header.querySelector('.accordion-icon')

            if (content.classList.contains('show')) {
                content.style.maxHeight = content.scrollHeight + 'px'
                setTimeout(() => {
                    content.style.maxHeight = '0'
                }, 10)
                content.classList.remove('show')
                icon.classList.remove('active')
            } else {
                document.querySelectorAll('.accordion-content').forEach(item => {
                    if (item !== content) {
                        item.style.maxHeight = '0'
                        item.classList.remove('show')
                        item.previousElementSibling
                            .querySelector('.accordion-icon')
                            .classList.remove('active')
                    }
                })

                content.classList.add('show')
                content.style.maxHeight = content.scrollHeight + 'px'
                icon.classList.add('active')
            }
        })
    })
})

document.addEventListener('DOMContentLoaded', () => {
    const customSelect = document.querySelector('.custom-select')
    const selectBtn = document.querySelector('.select-button')
    const selectedValue = document.querySelector('.selected-value')
    const optionsList = document.querySelectorAll('.select-dropdown li')

    if (optionsList.length > 0) {
        selectedValue.textContent =
            optionsList[0].querySelector('label').textContent

        optionsList[0].querySelector('input').checked = true
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            customSelect.classList.toggle('active')

            selectBtn.setAttribute(
                'aria-expanded',
                selectBtn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
            )

            const dropdown = customSelect.querySelector('.select-dropdown')
            if (customSelect.classList.contains('active')) {
                dropdown.classList.remove('scale-y-0', 'opacity-0', 'invisible')
                dropdown.classList.add('scale-y-100', 'opacity-100', 'visible')
                selectBtn.querySelector('.arrow').classList.add('rotate-180')
            } else {
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
            }
        })
    }

    optionsList.forEach(option => {
        function handler(e) {
            if (e.type === 'click' && e.clientX !== 0 && e.clientY !== 0) {
                selectedValue.textContent = option.querySelector('label').textContent
                customSelect.classList.remove('active')

                const dropdown = customSelect.querySelector('.select-dropdown')
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
            }

            if (e.key === 'Enter') {
                selectedValue.textContent = option.querySelector('label').textContent
                customSelect.classList.remove('active')

                const dropdown = customSelect.querySelector('.select-dropdown')
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
            }
        }

        option.addEventListener('keyup', handler)
        option.addEventListener('click', handler)
    })

    document.addEventListener('click', event => {
        if (customSelect) {
            if (
                !customSelect.contains(event.target) &&
                customSelect.classList.contains('active')
            ) {
                customSelect.classList.remove('active')
                const dropdown = customSelect.querySelector('.select-dropdown')
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
                selectBtn.setAttribute('aria-expanded', 'false')
            }
        }
    })
})
