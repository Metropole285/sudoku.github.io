// Убедитесь, что файл sudoku.js (или sudoku.min.js, если вы его так назвали)
// подключен в index.html ПЕРЕД этим скриптом.
// <script src="sudoku.js"></script> или <script src="sudoku.min.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');

    // --- Переменные для хранения состояния игры ---
    let currentPuzzle = null; // Головоломка в виде строки (81 символ, '.' или '0' для пустых)
    let currentSolution = null; // Решение головоломки в виде строки
    let userGrid = []; // Текущее состояние доски пользователя (массив 9x9)
    let selectedCell = null; // Ссылка на выбранный DOM-элемент ячейки (<div>)
    let selectedRow = -1;    // Индекс строки выбранной ячейки
    let selectedCol = -1;    // Индекс колонки выбранной ячейки

    // --- Инициализация новой игры ---
    function initGame() {
        console.log("Запуск initGame...");
        try {
            // Проверка наличия библиотеки sudoku.js
            if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                throw new Error("Библиотека sudoku.js не загружена или неисправна.");
            }
            console.log("Библиотека sudoku найдена.");

            // Генерация головоломки (уровень можно менять: 'easy', 'medium', 'hard', ...)
            console.log("Генерация головоломки (medium)...");
            currentPuzzle = sudoku.generate("medium");
            console.log("Сгенерировано:", currentPuzzle);

            if (!currentPuzzle) {
                 throw new Error("Генерация не удалась (generate вернул null/пусто)");
            }

            // Получение решения для сгенерированной головоломки
            console.log("Получение решения...");
            currentSolution = sudoku.solve(currentPuzzle);
            console.log("Решение:", currentSolution);

            if (!currentSolution) {
                // Это не должно происходить для головоломок, сгенерированных этой же библиотекой
                throw new Error("Не удалось найти решение для сгенерированной головоломки.");
            }

            console.log("Преобразование в массив...");
            userGrid = boardStringToArray(currentPuzzle); // Заполняем userGrid начальными данными

            console.log("Отрисовка доски...");
            renderBoard(); // Отображаем доску на странице

            clearSelection(); // Снимаем любое предыдущее выделение
            statusMessageElement.textContent = ''; // Очищаем статусное сообщение
            statusMessageElement.className = '';
            console.log("Новая игра успешно инициализирована.");

        } catch (error) {
            console.error("ОШИБКА в initGame:", error);
            // Выводим сообщение об ошибке пользователю
            statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
            statusMessageElement.className = 'incorrect-msg';
            // Очищаем доску, если генерация не удалась
            boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
        }
    }

    // --- Отрисовка доски на основе userGrid ---
    function renderBoard() {
        boardElement.innerHTML = ''; // Очищаем предыдущее состояние доски
        if (!userGrid || userGrid.length !== 9) {
             console.error("Некорректные данные для отрисовки доски (userGrid)");
             boardElement.innerHTML = '<p style="color: red;">Ошибка данных доски.</p>';
             return;
        }

        // Создаем 81 ячейку (9 рядов по 9 колонок)
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                // Сохраняем координаты в data-атрибутах для легкого доступа
                cell.dataset.row = r;
                cell.dataset.col = c;

                const value = userGrid[r][c]; // Берем значение из нашего массива

                // Отображаем цифру, если она не 0
                if (value !== 0) {
                    cell.textContent = value;
                    // Проверяем, была ли эта цифра в изначальной головоломке
                    const puzzleChar = currentPuzzle[r * 9 + c];
                    if (puzzleChar !== '.' && puzzleChar !== '0') {
                        // Если да, добавляем класс 'given', чтобы сделать ее некликабельной и стилизовать
                        cell.classList.add('given');
                    }
                } else {
                    cell.textContent = ''; // Оставляем пустым
                }

                // === Добавляем классы для толстых границ блоков 3x3 ===
                // Сначала убираем классы от возможной предыдущей отрисовки
                cell.classList.remove('thick-border-bottom', 'thick-border-right');
                // Добавляем класс для толстой правой границы (после 3 и 6 колонки)
                if ((c + 1) % 3 === 0 && c < 8) { // c < 8 чтобы не трогать внешнюю границу доски
                    cell.classList.add('thick-border-right');
                }
                // Добавляем класс для толстой нижней границы (после 3 и 6 ряда)
                if ((r + 1) % 3 === 0 && r < 8) { // r < 8 чтобы не трогать внешнюю границу доски
                    cell.classList.add('thick-border-bottom');
                }
                // ========================================================

                boardElement.appendChild(cell); // Добавляем созданную ячейку на доску
            }
        }
    }

    // --- Вспомогательные функции ---

    // Преобразование строки головоломки (81 символ) в массив 9x9
    function boardStringToArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) {
            grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const char = boardString[r * 9 + c];
                // Пустые ячейки ('.') или '0' преобразуем в число 0
                grid[r][c] = (char === '.' || char === '0') ? 0 : parseInt(char);
            }
        }
        return grid;
    }

    // Получение правильного значения для ячейки из строки-решения
     function getSolutionValue(row, col) {
         if (!currentSolution) return null; // На всякий случай
         const char = currentSolution[row * 9 + col];
         return (char === '.' || char === '0') ? 0 : parseInt(char);
     }

    // Снятие выделения с текущей выбранной ячейки
    function clearSelection() {
         if (selectedCell) {
            selectedCell.classList.remove('selected'); // Убираем класс подсветки
        }
        // Сбрасываем переменные состояния
        selectedCell = null;
        selectedRow = -1;
        selectedCol = -1;
    }

    // Очистка подсветки ошибок и статусного сообщения
    function clearErrors() {
        // Убираем класс 'incorrect' со всех ячеек
        boardElement.querySelectorAll('.cell.incorrect').forEach(cell => {
            cell.classList.remove('incorrect');
        });
        // Очищаем текстовое сообщение
         statusMessageElement.textContent = '';
         statusMessageElement.className = '';
    }

    // --- Обработчики событий ---

    // Клик по доске Судоку (для выбора ячейки)
    boardElement.addEventListener('click', (event) => {
        const target = event.target; // Элемент, по которому кликнули

        // Проверяем, что клик был по ячейке (.cell) и она не изначальная (.given)
        if (target.classList.contains('cell') && !target.classList.contains('given')) {
            clearSelection(); // Снять выделение с предыдущей
            // Запомнить новую ячейку и ее координаты
            selectedCell = target;
            selectedRow = parseInt(target.dataset.row);
            selectedCol = parseInt(target.dataset.col);
            selectedCell.classList.add('selected'); // Добавить класс для CSS-стиля выделения
            clearErrors(); // Убрать подсветку ошибок, если она была
        } else {
            // Если кликнули мимо изменяемой ячейки (на рамку, фон, .given)
            clearSelection(); // Просто снять выделение
        }
    });

    // Клик по цифровой панели (ввод цифры или стирание)
    numpad.addEventListener('click', (event) => {
        // Игнорируем клик, если ни одна ячейка не выбрана
        if (!selectedCell) {
             console.log("Клик по numpad, но ячейка не выбрана.");
             return;
        }

        // Находим кнопку, по которой кликнули (даже если клик был по тексту внутри)
        const button = event.target.closest('button');
        if (!button) return; // Клик мимо кнопки

        clearErrors(); // Убираем подсветку ошибок при вводе/стирании

        if (button.id === 'erase-button') {
            // --- Нажата кнопка "Стереть" ---
            selectedCell.textContent = ''; // Очищаем видимое содержимое ячейки
            // Обновляем наш внутренний массив, записывая 0
            if(selectedRow !== -1 && selectedCol !== -1) {
                 userGrid[selectedRow][selectedCol] = 0;
                 console.log(`Стёрто значение в [${selectedRow}, ${selectedCol}]`);
            }
        } else if (button.dataset.num) {
            // --- Нажата кнопка с цифрой (у нее есть атрибут data-num) ---
            const num = parseInt(button.dataset.num); // Получаем цифру

            // Записываем цифру в ячейку на экране
            selectedCell.textContent = num;
            // Обновляем наш внутренний массив
            if(selectedRow !== -1 && selectedCol !== -1) {
                 userGrid[selectedRow][selectedCol] = num;
                 console.log(`Введено ${num} в [${selectedRow}, ${selectedCol}]`);
            }
            // Опционально: снять выделение после ввода?
            // clearSelection();
        }
    });

     // Обработка нажатий клавиш (для удобства на десктопе)
    document.addEventListener('keydown', (event) => {
        // Игнорируем, если ячейка не выбрана
        if (!selectedCell) return;

        clearErrors(); // Убираем ошибки при вводе

        // Если нажата цифра от 1 до 9
        if (event.key >= '1' && event.key <= '9') {
            const num = parseInt(event.key);
            selectedCell.textContent = num;
            if(selectedRow !== -1 && selectedCol !== -1) userGrid[selectedRow][selectedCol] = num;
            console.log(`Введено ${num} с клавиатуры в [${selectedRow}, ${selectedCol}]`);
        }
        // Если нажат Backspace или Delete
        else if (event.key === 'Backspace' || event.key === 'Delete') {
            selectedCell.textContent = '';
            if(selectedRow !== -1 && selectedCol !== -1) userGrid[selectedRow][selectedCol] = 0;
             console.log(`Стёрто значение в [${selectedRow}, ${selectedCol}] с клавиатуры`);
        }
        // Можно добавить обработку стрелок для навигации (опционально)
        // else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        //     event.preventDefault(); // Чтобы страница не скроллилась
        //     // TODO: Реализовать перемещение selectedCell
        // }
    });

    // Клик по кнопке "Проверить"
    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors(); // Сначала убираем старую подсветку ошибок
        if (!currentSolution || !userGrid) {
             console.error("Нет данных для проверки!");
             statusMessageElement.textContent = "Ошибка: нет данных для проверки.";
             statusMessageElement.className = 'incorrect-msg';
             return;
        }

        let allCorrect = true; // Флаг: все ли заполненные ячейки верны
        let boardComplete = true; // Флаг: все ли ячейки заполнены

        // Проходим по всем ячейкам доски
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const userValue = userGrid[r][c]; // Значение, введенное пользователем
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue; // Пропускаем, если элемент не найден (не должно быть)

                if (userValue === 0) {
                    boardComplete = false; // Нашли пустую ячейку - доска не завершена
                } else if (!cellElement.classList.contains('given')) {
                    // Если ячейка заполнена пользователем (не изначальная)
                    const solutionValue = getSolutionValue(r, c); // Получаем правильное значение
                    if (userValue !== solutionValue) {
                        // Если значения не совпадают - это ошибка
                        cellElement.classList.add('incorrect'); // Подсвечиваем ячейку
                        allCorrect = false; // Ставим флаг, что есть ошибки
                    }
                }
            }
        }

        // Формируем сообщение для пользователя по результатам проверки
        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!";
            statusMessageElement.className = 'correct'; // Зеленый цвет
            clearSelection(); // Снимаем выделение при полном успехе
            // Можно добавить "замораживание" доски здесь
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg'; // Красный цвет
        } else { // allCorrect = true, но boardComplete = false
             statusMessageElement.textContent = "Пока все верно, но поле не заполнено до конца.";
             statusMessageElement.className = ''; // Обычный цвет
        }
    });

    // Клик по кнопке "Новая игра"
    newGameButton.addEventListener('click', () => {
        // Спрашиваем подтверждение у пользователя
        if (window.confirm("Начать новую игру? Текущий прогресс будет потерян.")) {
            console.log("Нажата кнопка 'Новая игра'");
            initGame(); // Запускаем инициализацию заново
        } else {
            console.log("Новая игра отменена пользователем.");
        }
    });

    // --- Инициализация Telegram Web App (если используется) ---
     try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready(); // Сообщаем Telegram, что приложение готово
            // window.Telegram.WebApp.expand(); // Раскомментируйте, если хотите развернуть на весь экран
            console.log("Telegram WebApp SDK инициализирован.");
        } else {
            // Это нормально, если вы запускаете не внутри Telegram
            console.log("Telegram WebApp SDK не найден (запуск вне Telegram?).");
        }
     } catch (e) {
         // Обработка возможных ошибок инициализации SDK
         console.error("Ошибка инициализации Telegram WebApp SDK:", e);
     }

    // --- Первый запуск игры при загрузке страницы ---
    initGame();

}); // Конец обработчика 'DOMContentLoaded'
