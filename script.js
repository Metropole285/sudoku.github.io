document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');

    let currentPuzzle = null; // Строка с головоломкой (81 символ, '.' или '0' для пустых)
    let currentSolution = null; // Строка с полным решением
    let userGrid = []; // Массив 9x9 для хранения ввода пользователя
    let selectedCell = null; // Ссылка на выбранный DOM-элемент ячейки
    let selectedRow = -1;
    let selectedCol = -1;

    // --- Инициализация игры ---
    function initGame() {
        // Генерируем головоломку средней сложности (можно 'easy', 'medium', 'hard', 'very-hard', etc.)
        // Библиотека sudoku.js использует формат строки
        currentPuzzle = sudoku.generate("medium");
        currentSolution = sudoku.solve(currentPuzzle); // Получаем решение

        if (!currentSolution) {
            console.error("Не удалось сгенерировать или решить судоку!");
            statusMessageElement.textContent = "Ошибка генерации!";
            statusMessageElement.className = 'incorrect-msg';
            return; // Выход, если что-то пошло не так
        }

        // Преобразуем строку в массив 9x9 для удобства
        userGrid = boardStringToArray(currentPuzzle);

        renderBoard();
        clearSelection();
        statusMessageElement.textContent = '';
        statusMessageElement.className = '';
        console.log("Puzzle:", currentPuzzle);
        console.log("Solution:", currentSolution);
    }

    // --- Отрисовка поля ---
    function renderBoard() {
        boardElement.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                // ... (код для установки значения и класса 'given') ...

                /* === ВРЕМЕННО УДАЛИТЕ ИЛИ ЗАКОММЕНТИРУЙТЕ ЭТОТ БЛОК ===
                // cell.classList.remove('thick-border-bottom', 'thick-border-right');
                // if ((c + 1) % 3 === 0 && c < 8) {
                //     cell.classList.add('thick-border-right');
                // }
                // if ((r + 1) % 3 === 0 && r < 8) {
                //     cell.classList.add('thick-border-bottom');
                // }
                */ // ====================================================

                boardElement.appendChild(cell);
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

    function clearSelection() {
         if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        selectedCell = null;
        selectedRow = -1;
        selectedCol = -1;
    }

    function clearErrors() {
        boardElement.querySelectorAll('.cell.incorrect').forEach(cell => {
            cell.classList.remove('incorrect');
        });
         statusMessageElement.textContent = '';
         statusMessageElement.className = '';
    }

    // --- Обработчики событий ---
    boardElement.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('cell') && !target.classList.contains('given')) {
            clearSelection();
            selectedCell = target;
            selectedRow = parseInt(target.dataset.row);
            selectedCol = parseInt(target.dataset.col);
            selectedCell.classList.add('selected');
            clearErrors(); // Убираем ошибки при выборе новой ячейки
        } else if (target.classList.contains('given')) {
             clearSelection(); // Сбрасываем выделение если кликнули на данную ячейку
        }
    });

    numpad.addEventListener('click', (event) => {
        if (!selectedCell) return; // Ничего не делать если ячейка не выбрана

        const button = event.target.closest('button'); // Ищем нажатую кнопку
        if (!button) return;

        if (button.id === 'erase-button') {
            // Стереть
            selectedCell.textContent = '';
            userGrid[selectedRow][selectedCol] = 0;
            clearErrors();
        } else if (button.dataset.num) {
            // Ввести цифру
            const num = parseInt(button.dataset.num);
            selectedCell.textContent = num;
            userGrid[selectedRow][selectedCol] = num;
            clearErrors();
             // (Опционально) Убрать выделение после ввода
             // clearSelection();
        }
    });

     // Обработка клавиатуры (опционально, для десктопа)
    document.addEventListener('keydown', (event) => {
        if (!selectedCell) return;

        if (event.key >= '1' && event.key <= '9') {
            const num = parseInt(event.key);
            selectedCell.textContent = num;
            userGrid[selectedRow][selectedCol] = num;
            clearErrors();
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            selectedCell.textContent = '';
            userGrid[selectedRow][selectedCol] = 0;
            clearErrors();
        }
    });

    checkButton.addEventListener('click', () => {
        clearErrors();
        let allCorrect = true;
        let boardComplete = true;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const userValue = userGrid[r][c];
                 const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);

                if (userValue === 0) {
                    boardComplete = false; // Нашли пустую ячейку
                } else if (!cellElement.classList.contains('given')) { // Проверяем только введенные пользователем
                    const solutionValue = getSolutionValue(r, c);
                    if (userValue !== solutionValue) {
                        cellElement.classList.add('incorrect');
                        allCorrect = false;
                    }
                }
            }
        }

        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!";
            statusMessageElement.className = 'correct';
            clearSelection(); // Убираем выделение при успехе
             // Опционально: сделать все ячейки .given чтобы нельзя было менять
             // boardElement.querySelectorAll('.cell:not(.given)').forEach(c => c.classList.add('given'));
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg';
        } else { // allCorrect = true, но boardComplete = false
             statusMessageElement.textContent = "Поле заполнено не до конца.";
             statusMessageElement.className = '';
        }
    });

    newGameButton.addEventListener('click', () => {
        // Спросить подтверждение? (Например, с window.confirm)
        if (window.confirm("Начать новую игру? Текущий прогресс будет потерян.")) {
            initGame();
        }
    });

    // --- Инициализация Telegram Web App ---
     try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            // window.Telegram.WebApp.expand(); // Растянуть на весь экран
            console.log("Telegram WebApp Ready!");
        } else {
            console.log("Telegram WebApp script not loaded (running outside Telegram?).");
        }
     } catch (e) {
         console.error("Error initializing Telegram WebApp:", e);
     }


    // --- Первый запуск ---
    initGame();
});
