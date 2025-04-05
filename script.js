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
    const cancelDifficultyButton = document.getElementById('cancel-difficulty-button');

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = [];
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium") { /* ... (код без изменений) ... */ }
    // --- Функции для модального окна ---
    function showDifficultyModal() { /* ... (код без изменений) ... */ }
    function hideDifficultyModal() { /* ... (код без изменений) ... */ }
    // --- Преобразование строки в массив объектов ---
    function boardStringToObjectArray(boardString) { /* ... (код без изменений) ... */ }
    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() { /* ... (код без изменений) ... */ }
    // --- Создание DOM-элемента для ОДНОЙ ячейки ---
    function createCellElement(r, c) { /* ... (код без изменений) ... */ }
    // --- Перерисовка ОДНОЙ ячейки ---
    function renderCell(r, c) { /* ... (код без изменений) ... */ }
    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) { /* ... (код без изменений) ... */ }
    function clearSelection() { /* ... (код без изменений) ... */ }
    function clearErrors() { /* ... (код без изменений) ... */ }
    function updateNoteToggleButtonState() { /* ... (код без изменений) ... */ }

    // --- Обработчики событий ---

    // ! ИЗМЕНЕНИЕ: Клик по доске (только устанавливает выделение, не снимает)
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell'); // Ищем ячейку
        if (!target) {
            // Клик внутри доски, но мимо ячейки - ничего не делаем со снятием выделения
            return;
        }

        // Если кликнули по той же ячейке, ничего не делаем (выделение уже есть или снимется общим обработчиком)
        if (selectedCell === target) {
            return;
        }

        // --- Клик по НОВОЙ ячейке ---
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

        // Снять старое выделение И подсветку строки/столбца
        clearSelection();

        // Запомнить новую ячейку и ее координаты
        selectedCell = target;
        selectedRow = r;
        selectedCol = c;

        // Добавляем класс .selected только если ячейка НЕ 'given'
        if (!selectedCell.classList.contains('given')) {
            selectedCell.classList.add('selected');
        }

        // Добавить класс .highlighted ко всем ячейкам в той же строке и столбце
        boardElement.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);
            if (cellRow === r || cellCol === c) {
                cell.classList.add('highlighted');
            }
        });

        clearErrors(); // Убрать подсветку ошибок при выборе
    });

    // Клик по цифровой панели (БЕЗ ИЗМЕНЕНИЙ - он не должен снимать выделение)
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); console.log("Режим заметок:", isNoteMode ? "ВКЛ" : "ВЫКЛ"); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) { console.log("Действие (numpad) отменено: 'given' или нет выбора."); return; }
        clearErrors();
        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;
        if (button.id === 'erase-button') { if (cellData.value !== 0) { cellData.value = 0; needsRender = true; } else if (cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; } }
        else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { if (cellData.value === 0) { if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; } else { console.log("Нельзя добавить заметку при основном значении."); } } else { if (cellData.value !== num) { cellData.value = num; needsRender = true; } else { cellData.value = 0; needsRender = true; } } }
        if (needsRender) { renderCell(selectedRow, selectedCol); }
    });

     // Обработка нажатий клавиш (БЕЗ ИЗМЕНЕНИЙ - она не должна снимать выделение)
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); console.log("Режим заметок переключен клавиатурой:", isNoteMode ? "ВКЛ" : "ВЫКЛ"); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) { console.log("Действие (keydown) отменено: 'given' или нет выбора."); return; }
        const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false;
        if (event.key >= '1' && event.key <= '9') { clearErrors(); const num = parseInt(event.key); if (isNoteMode) { if (cellData.value === 0) { if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; } } else { if (cellData.value !== num) { cellData.value = num; needsRender = true; } else { cellData.value = 0; needsRender = true; } } }
        else if (event.key === 'Backspace' || event.key === 'Delete') { clearErrors(); if (cellData.value !== 0) { cellData.value = 0; needsRender = true; } else if (cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; } }
        if (needsRender) { renderCell(selectedRow, selectedCol); }
    });

    // --- Клик по документу для снятия выделения ---
    // ! ИЗМЕНЕНИЕ: Упрощенная логика
    document.addEventListener('click', (event) => {
        // Проверяем, есть ли вообще выделение
        if (!selectedCell) {
            return;
        }

        // Элемент, по которому кликнули
        const target = event.target;

        // Был ли клик ВНУТРИ доски?
        const isClickInsideBoard = boardElement.contains(target);
        // Был ли клик ВНУТРИ цифровой панели?
        const isClickInsideNumpad = numpad.contains(target);
        // Был ли клик по кнопке "Новая игра" (чтобы не сбрасывать выделение перед показом модалки)?
        const isClickOnNewGame = newGameButton.contains(target);

        // Если клик НЕ внутри доски И НЕ внутри цифровой панели И НЕ по кнопке "Новая игра"
        if (!isClickInsideBoard && !isClickInsideNumpad && !isClickOnNewGame) {
             // Проверяем также, не кликнули ли мы внутри уже открытого модального окна
             const isClickInsideModal = difficultyModal.contains(target);
             if (!isClickInsideModal) { // Снимаем выделение только если клик был не в модалке
                 console.log("Клик вне доски/numpad/newGame/modal, снимаем выделение.");
                 clearSelection();
             }
        }
        // Обработка повторного клика на ту же ячейку перенесена в обработчик boardElement.addEventListener
    }, true); // Используем capturing phase, чтобы сработать до других обработчиков, если нужно


    // Клик по кнопке "Проверить" (без изменений)
    checkButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });
    // Клик по кнопке "Новая игра" -> Показать модальное окно (без изменений)
    newGameButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });
    // Обработка кликов внутри модального окна (без изменений)
    modalButtonsContainer.addEventListener('click', (event) => { /* ... (код без изменений) ... */ });
    // Клик по оверлею для закрытия модального окна (без изменений)
    modalOverlay.addEventListener('click', () => { /* ... (код без изменений) ... */ });
    // --- Инициализация Telegram Web App SDK --- (без изменений)
     try { /* ... */ } catch (e) { /* ... */ }
    // --- Первый запуск игры при загрузке страницы ---
    initGame();

}); // Конец 'DOMContentLoaded'


// --- КОД НЕИЗМЕНЕННЫХ ФУНКЦИЙ (ДЛЯ ПОЛНОТЫ) ---
function initGame(difficulty = "medium") { console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`); try { if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') { throw new Error("Библиотека sudoku.js не загружена или неисправна."); } currentPuzzle = sudoku.generate(difficulty); if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`); currentSolution = sudoku.solve(currentPuzzle); if (!currentSolution) throw new Error("Не удалось найти решение"); userGrid = boardStringToObjectArray(currentPuzzle); renderBoard(); clearSelection(); statusMessageElement.textContent = ''; statusMessageElement.className = ''; isNoteMode = false; updateNoteToggleButtonState(); console.log("Новая игра успешно инициализирована."); } catch (error) { console.error("ОШИБКА в initGame:", error); statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message; statusMessageElement.className = 'incorrect-msg'; boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>'; } }
function showDifficultyModal() { modalOverlay.style.display = 'block'; difficultyModal.style.display = 'block'; requestAnimationFrame(() => { modalOverlay.classList.add('visible'); difficultyModal.classList.add('visible'); }); console.log("Модальное окно выбора сложности показано."); }
function hideDifficultyModal() { modalOverlay.classList.remove('visible'); difficultyModal.classList.remove('visible'); setTimeout(() => { modalOverlay.style.display = 'none'; difficultyModal.style.display = 'none'; console.log("Модальное окно скрыто."); }, 300); }
function boardStringToObjectArray(boardString) { const grid = []; for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const char = boardString[r * 9 + c]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } } return grid; }
function renderBoard() { boardElement.innerHTML = ''; if (!userGrid || userGrid.length !== 9) return; for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) { const cellElement = createCellElement(r, c); boardElement.appendChild(cellElement); } } console.log("Доска перерисована."); }
function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const puzzleChar = currentPuzzle[r * 9 + c]; if (puzzleChar !== '.' && puzzleChar !== '0') { cell.classList.add('given'); } } else if (cellData.notes.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const noteDigit = document.createElement('div'); noteDigit.classList.add('note-digit'); noteDigit.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(noteDigit); } } else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; } cell.appendChild(valueContainer); cell.appendChild(notesContainer); cell.classList.remove('thick-border-bottom', 'thick-border-right'); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom'); return cell; }
function renderCell(r, c) { const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (oldCell) { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (selectedRow === r && selectedCol === c) { selectedCell = newCell; } oldCell.replaceWith(newCell); } else { console.warn(`renderCell: Cell [${r}, ${c}] not found.`); } }
function getSolutionValue(row, col) { if (!currentSolution) return null; const char = currentSolution[row * 9 + col]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
function clearSelection() { if (selectedCell) { selectedCell.classList.remove('selected'); } boardElement.querySelectorAll('.cell.highlighted').forEach(cell => { cell.classList.remove('highlighted'); }); selectedCell = null; selectedRow = -1; selectedCol = -1; }
function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => { cell.classList.remove('incorrect'); }); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
function updateNoteToggleButtonState() { if (isNoteMode) { noteToggleButton.classList.add('active'); noteToggleButton.title = "Режим заметок (ВКЛ)"; } else { noteToggleButton.classList.remove('active'); noteToggleButton.title = "Режим заметок (ВЫКЛ)"; } }
// Код обработчиков checkButton, newGameButton, модального окна и TWA SDK уже включен выше.
