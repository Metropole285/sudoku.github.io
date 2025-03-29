// Получаем доступ к элементам
const button = document.getElementById('click-button');
const scoreDisplay = document.getElementById('score');
const popupContainer = document.getElementById('popup-container');

// Загружаем звук (убедитесь, что click.mp3 в той же папке)
const clickSound = new Audio('click.mp3');
clickSound.preload = 'auto'; // Начинаем загружать звук заранее

// Переменная для счета + загрузка из localStorage
// getItem вернет null, если ничего нет, || 0 установит 0 в этом случае
// parseInt нужен, так как localStorage хранит строки
let score = parseInt(localStorage.getItem('clickerScore')) || 0;

// Функция для отображения всплывающего "+1"
function showScorePopup() {
    const popup = document.createElement('div');
    popup.classList.add('score-popup');
    popup.textContent = '+1';
    popupContainer.appendChild(popup);

    // Удаляем элемент после завершения анимации
    popup.addEventListener('animationend', () => {
        popup.remove();
    });
}

// Функция обработки клика
function handleClick() {
    score++; // Увеличиваем счет

    // Сохраняем счет в localStorage
    localStorage.setItem('clickerScore', score);

    // Обновляем текст на странице
    scoreDisplay.textContent = score;

    // Воспроизводим звук клика
    clickSound.currentTime = 0; // Сбрасываем звук на начало (если кликать быстро)
    clickSound.play().catch(error => console.log("Ошибка воспроизведения звука:", error)); // Ловим возможные ошибки

    // Показываем всплывающий "+1"
    showScorePopup();

    // (Опционально) Вибрация при клике
    if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
}

// Назначаем обработчик на кнопку
button.addEventListener('click', handleClick);

// Инициализация Telegram Web App и начальное отображение счета
function initializeApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        // Можно раскомментировать, если хотите, чтобы окно всегда было максимального размера
        // window.Telegram.WebApp.expand();
        console.log("Telegram WebApp Ready!");
    } else {
        console.error("Telegram WebApp script not loaded!");
    }
    // Отображаем загруженный счет при старте
    scoreDisplay.textContent = score;
}

// Запускаем инициализацию после загрузки DOM
document.addEventListener('DOMContentLoaded', initializeApp);
