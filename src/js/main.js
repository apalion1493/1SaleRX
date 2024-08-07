window.addEventListener('DOMContentLoaded', () => {
    console.log('Loaded Scripts')

    const swiper = new Swiper(".mySwiper", {
        spaceBetween: 16,
        slidesPerView: 3,
        watchSlidesProgress: true,
    });
    const swiper2 = new Swiper(".mySwiper2", {
        spaceBetween: 16,
        navigation: null,
        thumbs: {
            swiper: swiper,
        },
    });

    const splide = new Splide('.splide', {
        grid: {
            rows: 2,
            cols: 3,
            gap: {
                row: '2rem',
                col: '2rem',
            },
        },
        breakpoints: {
            1024: {
                grid: {
                    rows: 2,
                    cols: 2,
                },
            },
            768: {
                grid: {
                    rows: 3,
                    cols: 1,
                },
            }
        },
    });

    splide.on('pagination:mounted', function (data) {
        // Вы можете добавить свой класс к UL элементу
        data.list.classList.add('splide__pagination--custom');

        function updatePagination() {
            const totalPages = data.items.length;
            const activePage = splide.index; // текущая активная страница

            // Скрываем все элементы пагинации
            data.items.forEach(item => {
                item.li.style.display = 'none';
            });

            // Удаляем все существующие элементы троеточий
            const existingDots = document.querySelectorAll('.splide__pagination-dots');
            existingDots.forEach(dot => dot.remove());

            if (totalPages > 4) {
                if (activePage < 3) {
                    // Отображаем первые 3 элемента пагинации
                    for (let i = 0; i < 3; i++) {
                        data.items[i].li.style.display = 'inline-block';
                    }
                    // Добавляем "..." между 3-м и последним элементом пагинации
                    const dots = document.createElement('li');
                    dots.textContent = '...';
                    dots.classList.add('splide__pagination-dots');
                    data.list.insertBefore(dots, data.items[totalPages - 1].li);
                } else {
                    // Добавляем "..." перед 2-й активной страницей
                    if (activePage > 1) {
                        const dotsBefore = document.createElement('li');
                        dotsBefore.textContent = '...';
                        dotsBefore.classList.add('splide__pagination-dots');
                        data.list.insertBefore(dotsBefore, data.items[1].li);
                    }

                    // Отображаем текущую активную страницу, 1 страницу перед ней и 1 после нее
                    for (let i = Math.max(activePage - 1, 0); i <= Math.min(activePage + 1, totalPages - 1); i++) {
                        data.items[i].li.style.display = 'inline-block';
                    }

                    // Добавляем "..." перед последним элементом пагинации
                    if (activePage < totalPages - 2) {
                        const dotsAfter = document.createElement('li');
                        dotsAfter.textContent = '...';
                        dotsAfter.classList.add('splide__pagination-dots');
                        data.list.insertBefore(dotsAfter, data.items[totalPages - 1].li);
                    }
                }
                // Отображаем последний элемент пагинации
                data.items[totalPages - 1].li.style.display = 'inline-block';
            } else {
                // Если страниц 3 или меньше, отображаем все элементы пагинации
                data.items.forEach(item => {
                    item.li.style.display = 'inline-block';
                });
            }
        }

        // `items` содержит все элементы точек
        data.items.forEach(function (item) {
            item.button.textContent = String(item.page + 1);
        });

        // Первоначальное обновление пагинации
        updatePagination();

        // Обновление пагинации при смене слайда
        splide.on('move', updatePagination);
    });

    splide.mount(window.splide.Extensions);


})

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
    const burgerButton = document.getElementById('burger-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.querySelector('.close-mob-menu');
    const menuOverlay = document.querySelector('.menu-overlay');

    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('overflow-hidden');
    };

    if (burgerButton && mobileMenu && closeMenuBtn && menuOverlay) {
        burgerButton.addEventListener('click', toggleMenu);
        closeMenuBtn.addEventListener('click', toggleMenu);
        menuOverlay.addEventListener('click', toggleMenu);
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
