// Получаем доступ к элементам на странице
const button = document.getElementById('click-button');
const scoreDisplay = document.getElementById('score');

// Переменная для хранения счета
let score = 0;

// Функция, которая будет вызываться при клике
function handleClick() {
    score++; // Увеличиваем счет
    scoreDisplay.textContent = score; // Обновляем текст на странице

    // (Опционально) Вибрация при клике, если поддерживается
    if (window.navigator.vibrate) {
        window.navigator.vibrate(50); // Вибрация на 50 мс
    }

    // (Опционально, для продвинутых) Отправка счета в Telegram
    // Это требует более сложной настройки бота для приема данных
    // Telegram.WebApp.sendData(JSON.stringify({ score: score }));
}

// Назначаем функцию handleClick на событие 'click' кнопки
button.addEventListener('click', handleClick);

// Сообщаем Telegram, что веб-приложение готово (хорошая практика)
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();

    // (Опционально) Можно растянуть окно игры на весь экран
    // window.Telegram.WebApp.expand();
} else {
    console.error("Telegram WebApp script not loaded!");
}


// Начальная инициализация (если нужно)
scoreDisplay.textContent = score;