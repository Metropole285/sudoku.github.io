// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const hintButton = document.getElementById('hint-button');
    const undoButton = document.getElementById('undo-button'); // Кнопка Отмены
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    const noteToggleButton = document.getElementById('note-toggle-button');
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal ? difficultyModal.querySelector('.modal-buttons') : null;
    const timerElement = document.getElementById('timer');

    // --- Ключи для localStorage ---
    const SAVE_KEY = 'sudokuGameState';

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = [];
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;
    let timerInterval = null;
    let secondsElapsed = 0;
    let currentDifficulty = 'medium';

    // --- Переменные для подсказок ---
    const MAX_HINTS = 3;
    let hintsRemaining = MAX_HINTS;

    // --- Стек истории для Undo ---
    let historyStack = [];

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium", restoreState = null) {
        console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`);
        currentDifficulty = difficulty;
        stopTimer();
        historyStack = []; // Очищаем историю
        updateUndoButtonState(); // Обновляем кнопку

        if (restoreState) {
            console.log("Восстановление игры из сохранения...");
            try {
                currentPuzzle = restoreState.puzzle;
                currentSolution = restoreState.solution;
                userGrid = restoreState.grid.map(row =>
                    row.map(cell => ({
                        value: cell.value,
                        notes: new Set(cell.notesArray || [])
                    }))
                );
                secondsElapsed = restoreState.time;
                hintsRemaining = restoreState.hints;
                isNoteMode = false;
                if (!currentPuzzle || !currentSolution || !userGrid) throw new Error("Неполные данные.");
                console.log("Игра успешно восстановлена.");
            } catch (error) {
                console.error("Ошибка восстановления игры:", error);
                statusMessageElement.textContent = "Ошибка загрузки сохранения. Начинаем новую игру.";
                statusMessageElement.className = 'incorrect-msg';
                clearSavedGameState();
                return initGame(difficulty); // Новая игра
            }
        } else {
            console.log("Генерация новой игры...");
            try {
                if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') throw new Error("sudoku.js не загружена.");
                currentPuzzle = sudoku.generate(difficulty);
                if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`);
                currentSolution = sudoku.solve(currentPuzzle) || sudoku.solve(currentPuzzle); // Повторная попытка
                if (!currentSolution) throw new Error("Не удалось найти решение.");
                userGrid = boardStringToObjectArray(currentPuzzle);
                secondsElapsed = 0; hintsRemaining = MAX_HINTS; isNoteMode = false;
                clearSavedGameState();
                console.log("Новая игра успешно сгенерирована.");
            } catch (error) {
                console.error("ОШИБКА генерации новой игры:", error);
                statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
                statusMessageElement.className = 'incorrect-msg';
                boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
                currentPuzzle = null; currentSolution = null; userGrid = []; hintsRemaining = 0;
                stopTimer(); updateHintButtonState(); updateUndoButtonState();
                return;
            }
        }
        // Общая логика
        renderBoard(); clearSelection();
        if (!restoreState) { statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
        updateNoteToggleButtonState(); updateHintButtonState(); updateUndoButtonState();
        updateTimerDisplay(); startTimer();
        console.log("Игра инициализирована.");
    }

    // --- Функции сохранения/загрузки состояния ---
    function saveGameState() {
        if (!currentPuzzle || !currentSolution || !userGrid || userGrid.length === 0) return;
        const serializableGrid = userGrid.map(row => row.map(cell => ({ value: cell.value, notesArray: Array.from(cell.notes || []) })));
        const gameState = { puzzle: currentPuzzle, solution: currentSolution, grid: serializableGrid, time: secondsElapsed, hints: hintsRemaining, difficulty: currentDifficulty, timestamp: Date.now() };
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); }
        catch (error) { console.error("Ошибка сохранения игры:", error); statusMessageElement.textContent = "Ошибка сохранения игры!"; statusMessageElement.className = 'incorrect-msg'; }
    }
    function loadGameState() {
        const savedData = localStorage.getItem(SAVE_KEY); if (!savedData) return null;
        try { const gameState = JSON.parse(savedData); if (gameState?.puzzle && gameState?.solution && gameState?.grid) { console.log("Найдено сохранение от:", new Date(gameState.timestamp).toLocaleString()); return gameState; } else { console.warn("Некорректные данные сохранения."); clearSavedGameState(); return null; } }
        catch (error) { console.error("Ошибка парсинга сохранения:", error); clearSavedGameState(); return null; }
    }
    function clearSavedGameState() { localStorage.removeItem(SAVE_KEY); console.log("Сохраненное состояние удалено."); }

    // --- Функции для Undo ---
    function createHistoryState() {
        if (!userGrid || userGrid.length === 0) return null;
        const gridCopy = userGrid.map(row => row.map(cell => ({ value: cell.value, notes: new Set(cell.notes || []) })));
        return { grid: gridCopy, hints: hintsRemaining };
    }
    function pushHistoryState() {
        const stateToPush = createHistoryState();
        if (stateToPush) { historyStack.push(stateToPush); updateUndoButtonState(); }
        else { console.warn("Попытка добавить невалидное состояние в историю."); }
    }
    function handleUndo() {
        if (historyStack.length === 0) { console.log("История пуста."); return; }
        stopTimer();
        const previousState = historyStack.pop();
        console.log("Отмена хода. Восстановление состояния...");

        try {
            // === ИЗМЕНЕНИЕ ЛОГИКИ ВОССТАНОВЛЕНИЯ ПОДСКАЗОК ===
            const hintsBeforeAction = previousState.hints; // Сколько было до действия
            const hintsNow = hintsRemaining;              // Сколько сейчас (после действия)

            // Восстанавливаем сетку всегда
            userGrid = previousState.grid;

            // Восстанавливаем подсказки, ТОЛЬКО если отменяемое действие их НЕ уменьшало
            if (hintsBeforeAction <= hintsNow) {
                // Отменяемое действие не было использованием подсказки (или их не меняло)
                hintsRemaining = hintsBeforeAction;
                 console.log("Undo: Обычный ход отменен, подсказки восстановлены до:", hintsRemaining);
            } else {
                // Отменяемое действие БЫЛО использованием подсказки.
                // НЕ восстанавливаем hintsRemaining, оставляем текущее значение (hintsNow).
                hintsRemaining = hintsNow; // По сути, эта строка не нужна, т.к. значение уже есть
                console.log("Undo: Использование подсказки отменено, кол-во подсказок НЕ изменено:", hintsRemaining);
            }
            // =================================================

            // Обновляем интерфейс
            renderBoard(); clearSelection(); clearErrors();
            updateHintButtonState(); // Обновить кнопку подсказок
            updateUndoButtonState(); // Обновить кнопку отмены
            saveGameState(); // Сохранить восстановленное состояние
            console.log("Состояние успешно восстановлено.");
        } catch(error) {
             console.error("Ошибка при восстановлении состояния:", error);
             statusMessageElement.textContent = "Ошибка отмены хода!"; statusMessageElement.className = 'incorrect-msg';
             historyStack = []; updateUndoButtonState(); // Очистка при ошибке
        } finally {
            // Перезапуск таймера, если игра не решена
             let isSolved = true;
             if (userGrid && userGrid.length === 9) { for (let r=0; r<9; ++r) { for (let c=0; c<9; ++c) { const index = r * 9 + c; const isGiven = currentPuzzle && (currentPuzzle[index] !== '.' && currentPuzzle[index] !== '0'); if (!isGiven && userGrid[r]?.[c]?.value === 0) { isSolved = false; break; } } if (!isSolved) break; } } else { isSolved = false; }
             if (!isSolved) { startTimer(); }
             else { checkButton.click(); } // Проверить, если вдруг стала решенной
        }
    }
    function updateUndoButtonState() { if (undoButton) { undoButton.disabled = historyStack.length === 0; } else { console.error("Кнопка Отмена не найдена!"); } }

    // --- Функции для таймера ---
    function startTimer() { if(timerInterval) return; updateTimerDisplay(); timerInterval = setInterval(() => { secondsElapsed++; updateTimerDisplay(); if (secondsElapsed % 10 === 0) { saveGameState(); } }, 1000); console.log("Таймер запущен."); }
    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; console.log("Таймер остановлен."); saveGameState(); } }
    function updateTimerDisplay() { if (!timerElement) return; const minutes = Math.floor(secondsElapsed / 60); const seconds = secondsElapsed % 60; timerElement.textContent = `Время: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }

    // --- Преобразование строки в сетку ---
    function boardStringToObjectArray(boardString) { const grid = []; for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const index = r * 9 + c; if (index >= boardString.length) { grid[r][c] = { value: 0, notes: new Set() }; continue; } const char = boardString[index]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } } return grid; }

    // --- Отрисовка ---
    function renderBoard() { boardElement.innerHTML = ''; if (!userGrid || userGrid.length !== 9) { boardElement.innerHTML = '<p>Ошибка отрисовки</p>'; return; } for (let r = 0; r < 9; r++) { if (!userGrid[r] || userGrid[r].length !== 9) continue; for (let c = 0; c < 9; c++) { if (userGrid[r][c] === undefined) { const ph = document.createElement('div'); ph.classList.add('cell'); ph.textContent = '?'; boardElement.appendChild(ph); continue; } boardElement.appendChild(createCellElement(r, c)); } } console.log("Доска перерисована."); }
    function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; if (!userGrid[r]?.[c]) { cell.textContent = '?'; return cell; } const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const idx = r * 9 + c; if (currentPuzzle?.[idx] && currentPuzzle[idx] !== '.' && currentPuzzle[idx] !== '0') cell.classList.add('given'); } else if (cellData.notes?.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const nd = document.createElement('div'); nd.classList.add('note-digit'); nd.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(nd); } } else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; } cell.appendChild(valueContainer); cell.appendChild(notesContainer); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom'); return cell; }
    function renderCell(r, c) { const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (oldCell) { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted'); if (selectedRow === r && selectedCol === c) selectedCell = newCell; oldCell.replaceWith(newCell); } else { console.warn(`renderCell: Ячейка [${r}, ${c}] не найдена.`); } }

    // --- Вспомогательные ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const index = row * 9 + col; if (index >= currentSolution.length) return null; const char = currentSolution[index]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
    function clearSelection() { if (selectedCell) selectedCell.classList.remove('selected'); boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); selectedCell = null; selectedRow = -1; selectedCol = -1; }
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => cell.classList.remove('incorrect')); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
    function updateNoteToggleButtonState() { if (noteToggleButton) { noteToggleButton.classList.toggle('active', isNoteMode); noteToggleButton.title = `Режим заметок (${isNoteMode ? 'ВКЛ' : 'ВЫКЛ'})`; } }
    function updateHintButtonState() { if (hintButton) { hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`; hintButton.disabled = hintsRemaining <= 0 || !currentSolution; hintButton.title = hintButton.disabled ? "Подсказки закончились" : "Использовать подсказку"; } }
    function highlightRelatedCells(row, col) { boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => cell.classList.add('highlighted')); }

    function provideHint() {
        pushHistoryState(); // Сохраняем до проверок
        let hintUsed = false;
        try {
            if (hintsRemaining <= 0) throw new Error("Подсказки закончились");
            if (!currentSolution || !userGrid) throw new Error("Игра не готова");
            if (!selectedCell) throw new Error("Выберите ячейку для подсказки");
            if (selectedCell.classList.contains('given')) throw new Error("Нельзя подсказать для начальной ячейки");
            const r = selectedRow; const c = selectedCol;
            if (!userGrid[r]?.[c]) throw new Error(`Ошибка данных [${r},${c}]`);
            if (userGrid[r][c].value !== 0) throw new Error("Ячейка уже заполнена");
            const solutionValue = getSolutionValue(r, c);
            if (solutionValue > 0) {
                console.log(`Подсказка [${r}, ${c}]: ${solutionValue}`);
                userGrid[r][c].value = solutionValue; userGrid[r][c].notes?.clear(); renderCell(r, c);
                const hintedCellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (hintedCellElement) { /* ... подсветка ... */ setTimeout(() => { /* ... сброс подсветки ... */ clearSelection(); }, 500); } else { clearSelection(); }
                hintsRemaining--; hintUsed = true; updateHintButtonState(); clearErrors(); saveGameState();
            } else throw new Error(`Ошибка решения [${r}, ${c}]`);
        } catch (error) {
             console.log("Ошибка подсказки:", error.message); statusMessageElement.textContent = error.message; statusMessageElement.className = error.message.includes("Ошибка") ? 'incorrect-msg' : ''; setTimeout(() => { if (statusMessageElement.textContent === error.message) statusMessageElement.textContent = ""; }, 2000);
             if (!hintUsed) { historyStack.pop(); updateUndoButtonState(); } // Откатываем историю, если подсказка не сработала
        }
    }

    // --- Обработчики событий ---
    boardElement.addEventListener('click', (event) => { const target = event.target.closest('.cell'); if (!target) return; const r = parseInt(target.dataset.row); const c = parseInt(target.dataset.col); if (isNaN(r) || isNaN(c)) return; if (target === selectedCell) { clearSelection(); } else { clearSelection(); selectedCell = target; selectedRow = r; selectedCol = c; if (!selectedCell.classList.contains('given')) selectedCell.classList.add('selected'); highlightRelatedCells(r, c); } clearErrors(); });
    numpad.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; } if (!selectedCell || selectedCell.classList.contains('given')) { if(selectedCell?.classList.contains('given')) { /* сообщение */ } return; } clearErrors(); if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (button.id === 'erase-button') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } if (potentialChange) { pushHistoryState(); } if (button.id === 'erase-button') { if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } else { /* сообщение */ } } else { if (cellData.value !== num) { cellData.value = num; cellData.notes?.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged) saveGameState(); });
    document.addEventListener('keydown', (event) => { if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo(); return; } if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; } if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { /* навигация */ event.preventDefault(); return; } if (!selectedCell || selectedCell.classList.contains('given')) return; if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (event.key >= '1' && event.key <= '9') { const num = parseInt(event.key); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } else if (event.key === 'Backspace' || event.key === 'Delete') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } if (potentialChange) { pushHistoryState(); } if (event.key >= '1' && event.key <= '9') { clearErrors(); const num = parseInt(event.key); if (isNoteMode) { if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } } else { if (cellData.value !== num) { cellData.value = num; cellData.notes?.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } event.preventDefault(); } else if (event.key === 'Backspace' || event.key === 'Delete') { clearErrors(); if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } event.preventDefault(); } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged) saveGameState(); });
    checkButton.addEventListener('click', () => { console.log("Проверка..."); clearErrors(); if (!currentSolution || !userGrid) return; let allCorrect = true; let boardComplete = true; for (let r = 0; r < 9; r++) { if (!userGrid[r]) continue; for (let c = 0; c < 9; c++) { if (!userGrid[r][c]) continue; const cd = userGrid[r][c]; const uv = cd.value; const ce = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (!ce) continue; if (uv === 0) { boardComplete = false; } else if (!ce.classList.contains('given')) { const sv = getSolutionValue(r, c); if (uv !== sv) { ce.classList.add('incorrect'); allCorrect = false; } } } } if (allCorrect && boardComplete) { statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct'; stopTimer(); clearSelection(); hintButton.disabled = true; clearSavedGameState(); historyStack = []; updateUndoButtonState(); } else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки."; statusMessageElement.className = 'incorrect-msg'; } else { statusMessageElement.textContent = "Пока верно, но не закончено."; statusMessageElement.className = ''; } });
    newGameButton.addEventListener('click', () => { console.log("Новая игра..."); stopTimer(); showDifficultyModal(); });
    if (undoButton) { undoButton.addEventListener('click', handleUndo); } else { console.error("Кнопка Отмена не найдена!"); }
    if (hintButton) { hintButton.addEventListener('click', provideHint); } else { console.error("Кнопка Подсказка не найдена!"); }
    if(modalButtonsContainer) { modalButtonsContainer.addEventListener('click', (event) => { const target = event.target.closest('button'); if(!target) return; if (target.classList.contains('difficulty-button')) { const difficulty = target.dataset.difficulty; if (difficulty) { console.log(`Выбрана сложность: ${difficulty}`); hideDifficultyModal(); clearSavedGameState(); historyStack = []; updateUndoButtonState(); setTimeout(() => initGame(difficulty), 50); } } else if (target.id === 'cancel-difficulty-button') { console.log("Отмена выбора."); hideDifficultyModal(); /* возобновление таймера */ let isSolved = true; /* проверка */ if (!isSolved) startTimer(); } }); } else { console.error("Контейнер кнопок модалки не найден."); }
    if(modalOverlay) { modalOverlay.addEventListener('click', () => { console.log("Клик по оверлею."); hideDifficultyModal(); /* возобновление таймера */ let isSolved = true; /* проверка */ if (!isSolved) startTimer(); }); } else { console.error("Оверлей не найден."); }
    try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); console.log("TG SDK init."); } else { console.log("TG SDK not found."); } } catch (e) { console.error("TG SDK Error:", e); }

    // --- Первый запуск игры ---
    const savedGame = loadGameState();
    if (savedGame) { if (confirm(`Найдена сохраненная игра (${savedGame.difficulty || 'сложность не указ.'}) от ${new Date(savedGame.timestamp).toLocaleString()}. Продолжить?`)) { initGame(savedGame.difficulty, savedGame); } else { clearSavedGameState(); initGame(); } } else { initGame(); }

}); // Конец 'DOMContentLoaded'
