// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.
// <script src="sudoku.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    const noteToggleButton = document.getElementById('note-toggle-button');
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal.querySelector('.modal-buttons');
    // const cancelDifficultyButton = document.getElementById('cancel-difficulty-button'); // Не используется напрямую в обработчике

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = [];
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium") {
        console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`);
        try {
            if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                throw new Error("Библиотека sudoku.js не загружена или неисправна.");
            }
            currentPuzzle = sudoku.generate(difficulty);
            if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`);
            currentSolution = sudoku.solve(currentPuzzle);
            if (!currentSolution) throw new Error("Не удалось найти решение");

            userGrid = boardStringToObjectArray(currentPuzzle);
            renderBoard();
            clearSelection();
            statusMessageElement.textContent = '';
            statusMessageElement.className = '';
            isNoteMode = false;
            updateNoteToggleButtonState();
            console.log("Новая игра успешно инициализирована.");
        } catch (error) {
            console.error("ОШИБКА в initGame:", error);
            statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
            statusMessageElement.className = 'incorrect-msg';
            boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
        }
    }

    // --- Функции для модального окна ---
    function showDifficultyModal() {
        modalOverlay.style.display = 'block'; difficultyModal.style.display = 'block';
        requestAnimationFrame(() => { modalOverlay.classList.add('visible'); difficultyModal.classList.add('visible'); });
        console.log("Модальное окно показано.");
    }
    function hideDifficultyModal() {
         modalOverlay.classList.remove('visible'); difficultyModal.classList.remove('visible');
         setTimeout(() => { modalOverlay.style.display = 'none'; difficultyModal.style.display = 'none'; console.log("Модальное окно скрыто."); }, 300);
    }

    // --- Преобразование строки в массив объектов ---
    function boardStringToObjectArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const char = boardString[r * 9 + c]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() {
        boardElement.innerHTML = ''; if (!userGrid || userGrid.length !== 9) { console.error("renderBoard: Invalid userGrid."); return; }
        for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) { const cellElement = createCellElement(r, c); boardElement.appendChild(cellElement); } }
        console.log("Доска перерисована.");
    }

    // --- Создание DOM-элемента для ОДНОЙ ячейки ---
    function createCellElement(r, c) {
        const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c;
        const cellData = userGrid[r][c];
        const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container');
        const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container');
        if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const puzzleChar = currentPuzzle[r * 9 + c]; if (puzzleChar !== '.' && puzzleChar !== '0') { cell.classList.add('given'); } }
        else if (cellData.notes.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const noteDigit = document.createElement('div'); noteDigit.classList.add('note-digit'); noteDigit.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(noteDigit); } }
        else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; }
        cell.appendChild(valueContainer); cell.appendChild(notesContainer);
        cell.classList.remove('thick-border-bottom', 'thick-border-right'); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom');
        return cell;
    }

    // --- Перерисовка ОДНОЙ ячейки ---
    function renderCell(r, c) {
        const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
        if (oldCell) { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (selectedRow === r && selectedCol === c) { selectedCell = newCell; } oldCell.replaceWith(newCell);
        } else { console.warn(`renderCell: Cell [${r}, ${c}] not found.`); }
    }

    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const char = currentSolution[row * 9 + col]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
    function clearSelection() { if (selectedCell) { selectedCell.classList.remove('selected'); } boardElement.querySelectorAll('.cell.highlighted').forEach(cell => { cell.classList.remove('highlighted'); }); selectedCell = null; selectedRow = -1; selectedCol = -1; }
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => { cell.classList.remove('incorrect'); }); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
    function updateNoteToggleButtonState() { if (isNoteMode) { noteToggleButton.classList.add('active'); noteToggleButton.title = "Режим заметок (ВКЛ)"; } else { noteToggleButton.classList.remove('active'); noteToggleButton.title = "Режим заметок (ВЫКЛ)"; } }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки + подсветка)
    // Обрабатывает клик по ЛЮБОЙ ячейке (включая given)
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) return;

        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

        // Снять старое выделение И подсветку
        clearSelection();

        // Запомнить новую ячейку и координаты
        selectedCell = target;
        selectedRow = r;
        selectedCol = c;

        // Выделяем (.selected) только если НЕ given
        if (!selectedCell.classList.contains('given')) {
            selectedCell.classList.add('selected');
        }

        // Подсвечиваем строку/столбец ВСЕГДА
        boardElement.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);
            if (cellRow === r || cellCol === c) {
                cell.classList.add('highlighted');
            }
        });

        clearErrors();
    });

    // Клик по цифровой панели (без изменений)
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) return; // Проверка на given
        clearErrors();
        const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false;
        if (button.id === 'erase-button') { if (cellData.value !== 0) { cellData.value = 0; needsRender = true; } else if (cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; } }
        else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { if (cellData.value === 0) { if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; } } else { if (cellData.value !== num) { cellData.value = num; needsRender = true; } else { cellData.value = 0; needsRender = true; } } }
        if (needsRender) { renderCell(selectedRow, selectedCol); }
    });

     // Обработка нажатий клавиш (без изменений)
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) return; // Проверка на given
        const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false;
        if (event.key >= '1' && event.key <= '9') { clearErrors(); const num = parseInt(event.key); if (isNoteMode) { if (cellData.value === 0) { if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; } } else { if (cellData.value !== num) { cellData.value = num; needsRender = true; } else { cellData.value = 0; needsRender = true; } } }
        else if (event.key === 'Backspace' || event.key === 'Delete') { clearErrors(); if (cellData.value !== 0) { cellData.value = 0; needsRender = true; } else if (cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; } }
        if (needsRender) { renderCell(selectedRow, selectedCol); }
    });

    // ! НОВЫЙ, ПРОСТОЙ ОБРАБОТЧИК ДЛЯ СНЯТИЯ ВЫДЕЛЕНИЯ
    // Срабатывает на клик ВНЕ доски и ВНЕ цифровой панели
    document.addEventListener('click', (event) => {
        if (selectedCell && // Только если что-то выбрано
            !boardElement.contains(event.target) && // Клик НЕ внутри доски
            !numpad.contains(event.target) && // Клик НЕ внутри numpad
            !difficultyModal.contains(event.target) && // Клик НЕ внутри модалки
            !modalOverlay.contains(event.target) && // Клик НЕ по оверлею
             event.target.id !== 'new-game-button' // Клик НЕ по кнопке "Новая игра"
           )
        {
            console.log("Клик вне доски/numpad/modal, снимаем выделение.");
            clearSelection();
        }
    });


    // Клик по кнопке "Проверить" (без изменений)
    checkButton.addEventListener('click', () => { console.log("Check button clicked"); clearErrors(); if (!currentSolution || !userGrid) return; let allCorrect = true; let boardComplete = true; for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) { const cellData = userGrid[r][c]; const userValue = cellData.value; const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (!cellElement) continue; if (userValue === 0) { boardComplete = false; } else if (!cellElement.classList.contains('given')) { const solutionValue = getSolutionValue(r, c); if (userValue !== solutionValue) { cellElement.classList.add('incorrect'); allCorrect = false; } } } } if (allCorrect && boardComplete) { statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct'; clearSelection(); } else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены."; statusMessageElement.className = 'incorrect-msg'; } else { statusMessageElement.textContent = "Пока все верно, но поле не заполнено."; statusMessageElement.className = ''; } });
    // Клик по кнопке "Новая игра" (без изменений)
    newGameButton.addEventListener('click', () => { console.log("New game button clicked"); showDifficultyModal(); });
    // Обработка кликов внутри модального окна (без изменений)
    modalButtonsContainer.addEventListener('click', (event) => { const target = event.target; if (target.classList.contains('difficulty-button')) { const difficulty = target.dataset.difficulty; if (difficulty) { console.log(`Difficulty selected: ${difficulty}`); hideDifficultyModal(); initGame(difficulty); } } else if (target.id === 'cancel-difficulty-button') { console.log("Difficulty selection cancelled."); hideDifficultyModal(); } });
    // Клик по оверлею для закрытия модального окна (без изменений)
    modalOverlay.addEventListener('click', () => { console.log("Overlay clicked, closing modal."); hideDifficultyModal(); });
    // --- Инициализация Telegram Web App SDK --- (без изменений)
     try { if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); console.log("Telegram WebApp SDK initialized."); } else { console.log("Telegram WebApp SDK not found."); } } catch (e) { console.error("Error initializing TWA SDK:", e); }
    // --- Первый запуск игры ---
    initGame();

}); // Конец 'DOMContentLoaded'
