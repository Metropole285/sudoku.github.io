document.addEventListener('DOMContentLoaded', () => {
    // --- Получение элементов DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');

    // --- Переменные состояния игры ---
    let currentPuzzle = null; // Строка с головоломкой (81 символ, '.' или '0' для пустых)
    let currentSolution = null; // Строка с полным решением
    let userGrid = []; // Массив 9x9 для хранения ввода пользователя
    let selectedCell = null; // Ссылка на выбранный DOM-элемент ячейки (<div>)
    let selectedRow = -1;    // Индекс строки выбранной ячейки
    let selectedCol = -1;    // Индекс колонки выбранной ячейки

    // --- Инициализация новой игры ---
    function initGame() {
        try {
            currentPuzzle = sudoku.generate("medium"); // Генерируем головоломку
            currentSolution = sudoku.solve(currentPuzzle); // Получаем решение

            if (!currentPuzzle || !currentSolution) {
                throw new Error("Не удалось сгенерировать или решить судоку!");
            }

            userGrid = boardStringToArray(currentPuzzle); // Преобразуем строку в массив
            renderBoard(); // Отрисовываем доску
            clearSelection(); // Снимаем выделение
            statusMessageElement.textContent = ''; // Очищаем статус
            statusMessageElement.className = '';
            console.log("Новая игра начата. Puzzle:", currentPuzzle);
            console.log("Solution:", currentSolution);

        } catch (error) {
            console.error("Ошибка инициализации игры:", error);
            statusMessageElement.textContent = "Ошибка генерации судоку!";
            statusMessageElement.className = 'incorrect-msg';
        }
    }

    // --- Отрисовка доски ---
    function renderBoard() {
        boardElement.innerHTML = ''; // Очищаем старое поле
        if (!userGrid || userGrid.length !== 9) {
             console.error("Некорректные данные для отрисовки доски (userGrid)");
             return;
        }

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                const value = userGrid[r][c]; // Значение из нашего массива

                // === ВАЖНО: Отображаем цифры и отмечаем начальные ===
                if (value !== 0) {
                    cell.textContent = value; // Показываем цифру
                    // Является ли эта цифра частью изначальной головоломки?
                    const puzzleChar = currentPuzzle[r * 9 + c];
                    if (puzzleChar !== '.' && puzzleChar !== '0') {
                        cell.classList.add('given'); // Добавляем класс для стилизации
                    }
                } else {
                    cell.textContent = ''; // Оставляем пустым, если значение 0
                }
                // =====================================================

                // === ВРЕМЕННО ЗАКОММЕНТИРОВАННЫЙ БЛОК ДЛЯ ГРАНИЦ ===
                // Пока не решим проблему с отображением границ
                /*
                cell.classList.remove('thick-border-bottom', 'thick-border-right');
                if ((c + 1) % 3 === 0 && c < 8) {
                    cell.classList.add('thick-border-right');
                }
                if ((r + 1) % 3 === 0 && r < 8) {
                    cell.classList.add('thick-border-bottom');
                }
                */
                // ==================================================

                boardElement.appendChild(cell); // Добавляем ячейку на доску
            }
        }
    }

    // --- Вспомогательные функции ---
    function boardStringToArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) {
            grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const char = boardString[r * 9 + c];
                grid[r][c] = (char === '.' || char === '0') ? 0 : parseInt(char);
            }
        }
        return grid;
    }

     function getSolutionValue(row, col) {
         if (!currentSolution) return null;
         const char = currentSolution[row * 9 + col];
         return (char === '.' || char === '0') ? 0 : parseInt(char);
     }

    // Снятие выделения с ячейки
    function clearSelection() {
         if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        selectedCell = null;
        selectedRow = -1;
        selectedCol = -1;
    }

    // Очистка сообщений и подсветки ошибок
    function clearErrors() {
        // Убираем красную подсветку
        boardElement.querySelectorAll('.cell.incorrect').forEach(cell => {
            cell.classList.remove('incorrect');
        });
        // Очищаем текстовое сообщение статуса
         statusMessageElement.textContent = '';
         statusMessageElement.className = '';
    }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки)
    boardElement.addEventListener('click', (event) => {
        const target = event.target;
        // Кликнули ли по ячейке И она не изначальная?
        if (target.classList.contains('cell') && !target.classList.contains('given')) {
            clearSelection(); // Снять старое выделение
            selectedCell = target; // Запомнить новую ячейку
            selectedRow = parseInt(target.dataset.row);
            selectedCol = parseInt(target.dataset.col);
            selectedCell.classList.add('selected'); // Добавить класс для подсветки
            clearErrors(); // Убрать подсветку ошибок при выборе
        } else {
            clearSelection(); // Кликнули мимо или на 'given' - просто снять выделение
        }
    });

    // Клик по цифровой панели (ввод цифры или стирание)
    numpad.addEventListener('click', (event) => {
        if (!selectedCell) return; // Ячейка не выбрана

        const button = event.target.closest('button');
        if (!button) return; // Клик мимо кнопки

        clearErrors(); // Убираем ошибки при попытке ввода

        if (button.id === 'erase-button') {
            // Стереть
            selectedCell.textContent = '';
            if(selectedRow !== -1 && selectedCol !== -1) userGrid[selectedRow][selectedCol] = 0;
        } else if (button.dataset.num) {
            // Ввести цифру
            const num = parseInt(button.dataset.num);
            selectedCell.textContent = num;
            if(selectedRow !== -1 && selectedCol !== -1) userGrid[selectedRow][selectedCol] = num;
            // Опционально: снять выделение после ввода
            // clearSelection();
        }
    });

     // Обработка клавиатуры (для удобства на ПК)
    document.addEventListener('keydown', (event) => {
        if (!selectedCell) return; // Ячейка не выбрана

        clearErrors(); // Убираем ошибки при попытке ввода

        if (event.key >= '1' && event.key <= '9') {
            const num = parseInt(event.key);
            selectedCell.textContent = num;
             if(selectedRow !== -1 && selectedCol !== -1) userGrid[selectedRow][selectedCol] = num;
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            selectedCell.textContent = '';
             if(selectedRow !== -1 && selectedCol !== -1) userGrid[selectedRow][selectedCol] = 0;
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
             // (Можно добавить навигацию по ячейкам стрелками)
             event.preventDefault(); // Предотвратить прокрутку страницы
             // TODO: Реализовать логику перемещения selectedCell
        }
    });

    // Клик по кнопке "Проверить"
    checkButton.addEventListener('click', () => {
        clearErrors(); // Начинаем с чистого листа
        if (!currentSolution || !userGrid) return; // Нет данных для проверки

        let allCorrect = true;
        let boardComplete = true;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const userValue = userGrid[r][c];
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue; // На всякий случай

                if (userValue === 0) {
                    boardComplete = false; // Нашли пустую
                } else if (!cellElement.classList.contains('given')) { // Проверяем только введенные
                    const solutionValue = getSolutionValue(r, c);
                    if (userValue !== solutionValue) {
                        cellElement.classList.add('incorrect'); // Подсветить ошибку
                        allCorrect = false;
                    }
                }
            }
        }

        // Вывод результата проверки
        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!";
            statusMessageElement.className = 'correct';
            clearSelection();
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg';
        } else { // allCorrect = true, но boardComplete = false
             statusMessageElement.textContent = "Пока все верно, но поле не заполнено.";
             statusMessageElement.className = '';
        }
    });

    // Клик по кнопке "Новая игра"
    newGameButton.addEventListener('click', () => {
        if (window.confirm("Начать новую игру? Текущий прогресс будет потерян.")) {
            initGame(); // Запускаем инициализацию заново
        }
    });

    // --- Инициализация Telegram Web App ---
     try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            console.log("Telegram WebApp Ready!");
        } else {
            console.log("Telegram WebApp script not loaded (running outside Telegram?).");
        }
     } catch (e) {
         console.error("Error initializing Telegram WebApp:", e);
     }

    // --- Первый запуск игры при загрузке страницы ---
    initGame();

}); // Конец document.addEventListener('DOMContentLoaded', ...);
