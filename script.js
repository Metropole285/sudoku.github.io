// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.
// <script src="sudoku.js"></script> или <script src="sudoku.min.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    const noteToggleButton = document.getElementById('note-toggle-button'); // Убедитесь, что кнопка в HTML имеет id="note-toggle-button"
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal ? difficultyModal.querySelector('.modal-buttons') : null;
    const timerElement = document.getElementById('timer'); // Получаем элемент таймера

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = [];
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;
    let timerInterval = null; // ID интервала для таймера
    let secondsElapsed = 0;   // Счетчик секунд для таймера

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium") {
        console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`);
        try {
            if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                throw new Error("Библиотека sudoku.js не загружена или неисправна.");
            }
            console.log("Библиотека sudoku найдена.");
            currentPuzzle = sudoku.generate(difficulty);
            if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`);
            console.log("Сгенерировано:", currentPuzzle);
            currentSolution = sudoku.solve(currentPuzzle);
            if (!currentSolution) throw new Error("Не удалось найти решение");
            console.log("Решение:", currentSolution);

            userGrid = boardStringToObjectArray(currentPuzzle);
            renderBoard();
            clearSelection();
            statusMessageElement.textContent = '';
            statusMessageElement.className = '';
            isNoteMode = false;
            updateNoteToggleButtonState();

            // --- Управление таймером при старте игры ---
            stopTimer(); // Остановить предыдущий, если был
            secondsElapsed = 0; // Сбросить счетчик
            updateTimerDisplay(); // Показать 00:00
            startTimer(); // Запустить новый
            // ------------------------------------------

            console.log("Новая игра успешно инициализирована.");
        } catch (error) {
            console.error("ОШИБКА в initGame:", error);
            statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
            statusMessageElement.className = 'incorrect-msg';
            boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
            stopTimer(); // Остановить таймер и при ошибке
        }
    }

    // --- Функции для модального окна ---
    function showDifficultyModal() {
        if (modalOverlay && difficultyModal) {
            modalOverlay.style.display = 'block'; difficultyModal.style.display = 'block';
            requestAnimationFrame(() => { modalOverlay.classList.add('visible'); difficultyModal.classList.add('visible'); });
            console.log("Модальное окно показано.");
        } else { console.error("Элементы модального окна не найдены!"); }
    }
    function hideDifficultyModal() {
         if (modalOverlay && difficultyModal) {
            modalOverlay.classList.remove('visible'); difficultyModal.classList.remove('visible');
            setTimeout(() => { modalOverlay.style.display = 'none'; difficultyModal.style.display = 'none'; }, 300);
            console.log("Модальное окно скрыто.");
         }
    }

    // --- Функции для таймера ---
    function startTimer() {
        if(timerInterval) return; // Не запускать, если уже запущен
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
         console.log("Таймер запущен.");
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("Таймер остановлен.");
        }
    }

    function updateTimerDisplay() {
        if (!timerElement) return;
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        timerElement.textContent = `Время: ${formattedMinutes}:${formattedSeconds}`;
    }

    // --- Преобразование строки головоломки в массив объектов ячеек ---
    function boardStringToObjectArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const char = boardString[r * 9 + c]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() {
        boardElement.innerHTML = '';
        if (!userGrid || userGrid.length !== 9) { console.error("renderBoard: Некорректные данные userGrid"); return; }
        for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) { const cellElement = createCellElement(r, c); boardElement.appendChild(cellElement); } }
        console.log("Доска перерисована (renderBoard).");
    }

    // --- Создание DOM-элемента для ОДНОЙ ячейки ---
    function createCellElement(r, c) {
        const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c;
        const cellData = userGrid[r][c];
        const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container');
        const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container');

        if (cellData.value !== 0) { // Показываем основное значение
            valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none';
            const puzzleChar = currentPuzzle[r * 9 + c]; if (puzzleChar !== '.' && puzzleChar !== '0') { cell.classList.add('given'); }
        } else if (cellData.notes.size > 0) { // Показываем заметки
            valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = '';
            for (let n = 1; n <= 9; n++) { const noteDigit = document.createElement('div'); noteDigit.classList.add('note-digit'); noteDigit.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(noteDigit); }
        } else { // Ячейка пустая
            valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none';
        }

        cell.appendChild(valueContainer); cell.appendChild(notesContainer);
        cell.classList.remove('thick-border-bottom', 'thick-border-right');
        if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right');
        if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom');
        return cell;
    }

    // --- Перерисовка ОДНОЙ ячейки ---
    function renderCell(r, c) {
        const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
        if (oldCell) {
            const newCell = createCellElement(r, c);
            if (oldCell.classList.contains('selected')) newCell.classList.add('selected');
            if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect');
            if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted');
            if (selectedRow === r && selectedCol === c) { selectedCell = newCell; }
            oldCell.replaceWith(newCell);
        } else { console.warn(`renderCell: Ячейка [${r}, ${c}] не найдена.`); }
    }

    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const char = currentSolution[row * 9 + col]; return (char === '.' || char === '0') ? 0 : parseInt(char); }

    // Снятие выделения ячейки и подсветки
    function clearSelection() {
        if (selectedCell) { selectedCell.classList.remove('selected'); }
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => { cell.classList.remove('highlighted'); });
        selectedCell = null; selectedRow = -1; selectedCol = -1;
         console.log("Selection cleared.");
    }

    // Очистка подсветки ошибок и статуса
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => { cell.classList.remove('incorrect'); }); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }

    // Обновление вида кнопки режима заметок
    function updateNoteToggleButtonState() {
        if (noteToggleButton) {
            if (isNoteMode) { noteToggleButton.classList.add('active'); noteToggleButton.title = "Режим заметок (ВКЛ)"; }
            else { noteToggleButton.classList.remove('active'); noteToggleButton.title = "Режим заметок (ВЫКЛ)"; }
            console.log(`Note mode toggled: ${isNoteMode}`);
        } else { console.warn("Кнопка режима заметок не найдена."); }
    }

    // Новая функция для подсветки связанных ячеек
    function highlightRelatedCells(row, col) {
        boardElement.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row); const cellCol = parseInt(cell.dataset.col);
            if (cellRow === row || cellCol === col) { cell.classList.add('highlighted'); }
        });
        console.log("Related cells highlighted.");
    }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки + подсветка)
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) { console.log("Клик мимо ячейки."); return; }
        const r = parseInt(target.dataset.row); const c = parseInt(target.dataset.col);
        if (target === selectedCell) { clearSelection(); } // Повторный клик - снять выделение
        else { // Клик на другую ячейку
            clearSelection();
            selectedCell = target; selectedRow = r; selectedCol = c;
            console.log(`Selected cell [${r}, ${c}]`);
            if (!selectedCell.classList.contains('given')) { selectedCell.classList.add('selected'); }
            highlightRelatedCells(r, c);
        }
        clearErrors();
    });

    // Клик по цифровой панели (ввод/стирание/заметки)
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) { console.log("Numpad click ignored: cell not selected or is given."); return; }
        clearErrors();
        const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false;

        if (button.id === 'erase-button') { // Стирание
            if (cellData.value !== 0) { cellData.value = 0; needsRender = true; console.log(`Erased value at [${selectedRow}, ${selectedCol}], notes preserved.`); }
            else if (cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; console.log(`Cleared notes at [${selectedRow}, ${selectedCol}]`); }
        } else if (button.dataset.num) { // Ввод цифры/заметки
            const num = parseInt(button.dataset.num);
            if (isNoteMode) { // Режим заметок
                if (cellData.value === 0) { if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; }
                else { console.log("Cannot add note to a cell with a value."); }
            } else { // Режим ввода цифры
                if (cellData.value !== num) { cellData.value = num; needsRender = true; } // Заметки НЕ стираем
                else { cellData.value = 0; needsRender = true; } // Повторный клик - стирание
            }
        }
        if (needsRender) { renderCell(selectedRow, selectedCol); }
    });

     // Обработка нажатий клавиш клавиатуры
    document.addEventListener('keydown', (event) => {
        if ((event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') && !(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) return;
        const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false;

        if (event.key >= '1' && event.key <= '9') { // Ввод цифр
            clearErrors(); const num = parseInt(event.key);
            if (isNoteMode) { if (cellData.value === 0) { if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; } }
            else { if (cellData.value !== num) { cellData.value = num; needsRender = true; } else { cellData.value = 0; needsRender = true; } } // Заметки НЕ стираем
            event.preventDefault();
        } else if (event.key === 'Backspace' || event.key === 'Delete') { // Стирание
            clearErrors();
            if (cellData.value !== 0) { cellData.value = 0; needsRender = true; console.log(`Key: Erased value at [${selectedRow}, ${selectedCol}], notes preserved.`); }
            else if (cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; console.log(`Key: Cleared notes at [${selectedRow}, ${selectedCol}]`); }
            event.preventDefault();
        }
        if (needsRender) { renderCell(selectedRow, selectedCol); }
    });

    // Клик по кнопке "Проверить"
    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors(); if (!currentSolution || !userGrid) return;
        let allCorrect = true; let boardComplete = true;
        for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) {
                const cellData = userGrid[r][c]; const userValue = cellData.value;
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue;
                if (userValue === 0) { boardComplete = false; }
                else if (!cellElement.classList.contains('given')) { const solutionValue = getSolutionValue(r, c); if (userValue !== solutionValue) { cellElement.classList.add('incorrect'); allCorrect = false; } }
        }}
        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct';
            stopTimer(); // Останавливаем таймер при успехе
            clearSelection();
        } else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены."; statusMessageElement.className = 'incorrect-msg'; }
        else { statusMessageElement.textContent = "Пока все верно, но поле не заполнено."; statusMessageElement.className = ''; }
    });

    // Клик по кнопке "Новая игра"
    newGameButton.addEventListener('click', () => { console.log("Нажата кнопка 'Новая игра'"); showDifficultyModal(); });

    // Обработка кликов внутри модального окна выбора сложности
    if(modalButtonsContainer) {
        modalButtonsContainer.addEventListener('click', (event) => {
            const target = event.target.closest('button'); if(!target) return;
            if (target.classList.contains('difficulty-button')) {
                const difficulty = target.dataset.difficulty;
                if (difficulty) { console.log(`Выбрана сложность: ${difficulty}`); hideDifficultyModal(); initGame(difficulty); }
            } else if (target.id === 'cancel-difficulty-button') { console.log("Выбор сложности отменен."); hideDifficultyModal(); }
        });
    } else { console.error("Контейнер кнопок модального окна не найден."); }

    // Клик по оверлею для закрытия модального окна
    if(modalOverlay) { modalOverlay.addEventListener('click', () => { console.log("Клик по оверлею, закрытие модального окна."); hideDifficultyModal(); }); }
    else { console.error("Оверлей модального окна не найден."); }

    // --- Инициализация Telegram Web App SDK ---
     try {
         if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); console.log("Telegram WebApp SDK инициализирован."); }
         else { console.log("Telegram WebApp SDK не найден."); }
     } catch (e) { console.error("Ошибка инициализации Telegram WebApp SDK:", e); }

    // --- Первый запуск игры ---
    initGame("medium");

}); // Конец 'DOMContentLoaded'
