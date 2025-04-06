// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const hintButton = document.getElementById('hint-button');
    const undoButton = document.getElementById('undo-button');
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
    let currentPuzzle = null; let currentSolution = null; let userGrid = [];
    let selectedCell = null; let selectedRow = -1; let selectedCol = -1;
    let isNoteMode = false; let timerInterval = null; let secondsElapsed = 0;
    let currentDifficulty = 'medium';

    // --- Переменные для подсказок ---
    const MAX_HINTS = 3;
    const HINTS_REWARD = 1; // <<< ИЗМЕНЕНО: Теперь 1 подсказка за рекламу
    let hintsRemaining = MAX_HINTS;

    // --- Стек истории для Undo ---
    let historyStack = [];

    // === ПЛЕЙСХОЛДЕРЫ ДЛЯ SDK РЕКЛАМЫ ===
    let isAdReady = false; // Имитация готовности рекламы
    let isShowingAd = false; // Флаг, показывается ли реклама сейчас

    // Имитация инициализации SDK
    function initializeAds() {
        console.log("Инициализация ADS SDK...");
        setTimeout(() => { preloadRewardedAd(); }, 2000);
    }
    // Имитация предзагрузки рекламы
    function preloadRewardedAd() {
        if (isAdReady || isShowingAd) return; // Не загружать, если готова или показывается
        console.log("ADS SDK: Загрузка Rewarded Ad...");
        isAdReady = false; // Сбрасываем флаг на время загрузки
        setTimeout(() => {
             // Только если все еще не показывается реклама (избегаем гонки состояний)
             if (!isShowingAd) {
                  isAdReady = true;
                  console.log("ADS SDK: Rewarded Ad загружена и готова.");
             } else {
                  console.log("ADS SDK: Загрузка прервана, т.к. начался показ.");
             }
        }, 3000 + Math.random() * 2000);
    }
    // Имитация показа рекламы
    function showRewardedAd(callbacks) {
        if (!isAdReady || isShowingAd) {
            console.log("ADS SDK: Реклама не готова или уже показывается.");
            if (callbacks.onError) callbacks.onError("Реклама не готова.");
            preloadRewardedAd(); // Попробуем загрузить снова на всякий случай
            return;
        }
        console.log("ADS SDK: Показ Rewarded Ad...");
        isShowingAd = true; isAdReady = false;
        statusMessageElement.textContent = "Показ рекламы..."; statusMessageElement.className = '';
        document.body.style.pointerEvents = 'none';

        setTimeout(() => {
            const success = Math.random() > 0.2; // 80% шанс успеха
            document.body.style.pointerEvents = 'auto'; statusMessageElement.textContent = "";
            isShowingAd = false; console.log("ADS SDK: Показ завершен.");

            if (success) {
                console.log("ADS SDK: Успешный просмотр!");
                if (callbacks.onSuccess) callbacks.onSuccess();
            } else {
                console.log("ADS SDK: Ошибка показа или пропуск.");
                if (callbacks.onError) callbacks.onError("Реклама не загружена / пропущена.");
            }
            preloadRewardedAd(); // Запускаем загрузку следующей
        }, 5000); // Имитация 5 секунд просмотра
    }
    // === КОНЕЦ ПЛЕЙСХОЛДЕРОВ ===

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium", restoreState = null) {
        console.log(`Запуск initGame: ${difficulty}...`);
        currentDifficulty = difficulty; stopTimer(); historyStack = []; updateUndoButtonState();
        if (restoreState) {
            console.log("Восстановление...");
            try {
                currentPuzzle = restoreState.puzzle; currentSolution = restoreState.solution;
                userGrid = restoreState.grid.map(row => row.map(cell => ({ value: cell.value, notes: new Set(cell.notesArray || []) })));
                secondsElapsed = restoreState.time; hintsRemaining = restoreState.hints; isNoteMode = false;
                if (!currentPuzzle || !currentSolution || !userGrid) throw new Error("Неполные данные.");
                console.log("Восстановлено.");
            } catch (error) { console.error("Ошибка восстановления:", error); statusMessageElement.textContent = "Ошибка загрузки. Новая игра."; statusMessageElement.className = 'incorrect-msg'; clearSavedGameState(); return initGame(difficulty); }
        } else {
            console.log("Генерация...");
            try {
                if (typeof sudoku === 'undefined' || !sudoku?.generate) throw new Error("sudoku.js?");
                currentPuzzle = sudoku.generate(difficulty); if (!currentPuzzle) throw new Error(`Генерация (${difficulty})?`);
                currentSolution = sudoku.solve(currentPuzzle) || sudoku.solve(currentPuzzle); if (!currentSolution) throw new Error("Решение?");
                userGrid = boardStringToObjectArray(currentPuzzle); secondsElapsed = 0; hintsRemaining = MAX_HINTS; isNoteMode = false; clearSavedGameState();
                console.log("Сгенерировано.");
            } catch (error) { console.error("ОШИБКА генерации:", error); statusMessageElement.textContent = "Ошибка генерации! " + error.message; statusMessageElement.className = 'incorrect-msg'; boardElement.innerHTML = '<p>Ошибка загрузки.</p>'; currentPuzzle = null; currentSolution = null; userGrid = []; hintsRemaining = 0; stopTimer(); updateHintButtonState(); updateUndoButtonState(); return; }
        }
        renderBoard(); clearSelection(); if (!restoreState) { statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
        updateNoteToggleButtonState(); updateHintButtonState(); updateUndoButtonState();
        updateTimerDisplay(); startTimer(); console.log("Игра инициализирована.");
    }

    // --- Функции сохранения/загрузки состояния ---
    function saveGameState() { if (!currentPuzzle || !currentSolution || !userGrid?.length) return; const serializableGrid = userGrid.map(row => row.map(cell => ({ value: cell.value, notesArray: Array.from(cell.notes || []) }))); const gameState = { puzzle: currentPuzzle, solution: currentSolution, grid: serializableGrid, time: secondsElapsed, hints: hintsRemaining, difficulty: currentDifficulty, timestamp: Date.now() }; try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); } catch (error) { console.error("Ошибка сохранения:", error); /* сообщение */ } }
    function loadGameState() { const savedData = localStorage.getItem(SAVE_KEY); if (!savedData) return null; try { const gameState = JSON.parse(savedData); if (gameState?.puzzle && gameState?.solution && gameState?.grid) { console.log("Найдено сохранение от:", new Date(gameState.timestamp).toLocaleString()); return gameState; } else { console.warn("Некорректные данные."); clearSavedGameState(); return null; } } catch (error) { console.error("Ошибка парсинга:", error); clearSavedGameState(); return null; } }
    function clearSavedGameState() { localStorage.removeItem(SAVE_KEY); console.log("Сохраненное состояние удалено."); }

    // --- Функции для Undo ---
    function createHistoryState() { if (!userGrid?.length) return null; const gridCopy = userGrid.map(row => row.map(cell => ({ value: cell.value, notes: new Set(cell.notes || []) }))); return { grid: gridCopy, hints: hintsRemaining }; }
    function pushHistoryState() { const stateToPush = createHistoryState(); if (stateToPush) { historyStack.push(stateToPush); updateUndoButtonState(); } else { console.warn("Попытка добавить невалидное состояние."); } }
    function handleUndo() { if (historyStack.length === 0) return; stopTimer(); const previousState = historyStack.pop(); console.log("Отмена хода..."); try { const hintsBeforeAction = previousState.hints; const hintsNow = hintsRemaining; userGrid = previousState.grid; if (hintsBeforeAction <= hintsNow) { hintsRemaining = hintsBeforeAction; } else { /* Не восстанавливаем подсказки */ console.log("Undo: Отмена подсказки, счетчик не изменен."); } renderBoard(); clearSelection(); clearErrors(); updateHintButtonState(); updateUndoButtonState(); saveGameState(); console.log("Восстановлено."); } catch(error) { console.error("Ошибка Undo:", error); statusMessageElement.textContent = "Ошибка отмены!"; statusMessageElement.className = 'incorrect-msg'; historyStack = []; updateUndoButtonState(); } finally { let isSolved = !userGrid.flat().some((cell, i) => { const isGiven = currentPuzzle && (currentPuzzle[i] !== '.' && currentPuzzle[i] !== '0'); return !isGiven && cell.value === 0; }); if (!isSolved) { startTimer(); } else { checkButton.click(); } } }
    function updateUndoButtonState() { if (undoButton) { undoButton.disabled = historyStack.length === 0; } else { console.error("Кнопка Отмена?"); } }

    // --- Функции для таймера ---
    function startTimer() { if(timerInterval) return; updateTimerDisplay(); timerInterval = setInterval(() => { secondsElapsed++; updateTimerDisplay(); if (secondsElapsed % 10 === 0) { saveGameState(); } }, 1000); console.log("Таймер запущен."); }
    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; console.log("Таймер остановлен."); saveGameState(); } }
    function updateTimerDisplay() { if (!timerElement) return; const minutes = Math.floor(secondsElapsed / 60); const seconds = secondsElapsed % 60; timerElement.textContent = `Время: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }

    // --- Преобразование строки в сетку ---
    function boardStringToObjectArray(boardString) { const grid = []; for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const index = r * 9 + c; if (index >= boardString.length) { grid[r][c] = { value: 0, notes: new Set() }; continue; } const char = boardString[index]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } } return grid; }

    // --- Отрисовка ---
    function renderBoard() { boardElement.innerHTML = ''; if (!userGrid?.length) { boardElement.innerHTML = '<p>Ошибка</p>'; return; } for (let r = 0; r < 9; r++) { if (!userGrid[r]?.length) continue; for (let c = 0; c < 9; c++) { if (userGrid[r][c] === undefined) { const ph = document.createElement('div'); ph.classList.add('cell'); ph.textContent = '?'; boardElement.appendChild(ph); continue; } boardElement.appendChild(createCellElement(r, c)); } } console.log("Доска перерисована."); }
    function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; if (!userGrid[r]?.[c]) { cell.textContent = '?'; return cell; } const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const idx = r * 9 + c; if (currentPuzzle?.[idx] && currentPuzzle[idx] !== '.' && currentPuzzle[idx] !== '0') cell.classList.add('given'); } else if (cellData.notes?.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const nd = document.createElement('div'); nd.classList.add('note-digit'); nd.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(nd); } } else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; } cell.appendChild(valueContainer); cell.appendChild(notesContainer); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom'); return cell; }
    function renderCell(r, c) { const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (oldCell) { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted'); if (selectedRow === r && selectedCol === c) selectedCell = newCell; oldCell.replaceWith(newCell); } else { console.warn(`renderCell: Ячейка [${r}, ${c}]?`); } }

    // --- Вспомогательные ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const index = row * 9 + col; if (index >= currentSolution.length) return null; const char = currentSolution[index]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
    function clearSelection() { if (selectedCell) selectedCell.classList.remove('selected'); boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); selectedCell = null; selectedRow = -1; selectedCol = -1; }
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => cell.classList.remove('incorrect')); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
    function updateNoteToggleButtonState() { if (noteToggleButton) { noteToggleButton.classList.toggle('active', isNoteMode); noteToggleButton.title = `Режим заметок (${isNoteMode ? 'ВКЛ' : 'ВЫКЛ'})`; } }
    function updateHintButtonState() { if (hintButton) { hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`; hintButton.disabled = hintsRemaining <= 0 || !currentSolution; hintButton.title = hintButton.disabled ? "Подсказки закончились" : "Использовать подсказку"; } }
    function highlightRelatedCells(row, col) { boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => cell.classList.add('highlighted')); }

    // --- Логика подсказки (внутренняя) ---
    function provideHintInternal() {
        pushHistoryState(); // Сохраняем до проверок
        let hintUsed = false;
        try {
            if (!selectedCell) throw new Error("Ячейка не выбрана (internal)");
            const r = selectedRow; const c = selectedCol;
            if (!userGrid[r]?.[c]) throw new Error(`Ошибка данных [${r},${c}] (internal)`);
            const solutionValue = getSolutionValue(r, c);
            if (solutionValue > 0) {
                console.log(`Подсказка [${r}, ${c}]: ${solutionValue}`);
                userGrid[r][c].value = solutionValue; userGrid[r][c].notes?.clear(); renderCell(r, c);
                const hintedCellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (hintedCellElement) { hintedCellElement.classList.remove('selected'); hintedCellElement.style.transition = 'background-color 0.1s ease-out'; hintedCellElement.style.backgroundColor = '#fffacd'; setTimeout(() => { hintedCellElement.style.backgroundColor = ''; hintedCellElement.style.transition = ''; clearSelection(); }, 500); } else { clearSelection(); }
                hintsRemaining--; hintUsed = true; updateHintButtonState(); clearErrors(); saveGameState();
            } else throw new Error(`Ошибка решения [${r}, ${c}] (internal)`);
        } catch (error) {
             console.error("Ошибка при выполнении подсказки:", error.message); statusMessageElement.textContent = "Внутренняя ошибка подсказки"; statusMessageElement.className = 'incorrect-msg';
             if (!hintUsed) { historyStack.pop(); updateUndoButtonState(); }
        }
    }

    // --- Предложение рекламы ---
    function offerRewardedAdForHints() {
        if (isShowingAd) return;
        console.log("Предложение рекламы за подсказку.");

        // <<< ИЗМЕНЕНО: Текст сообщения под 1 подсказку
        if (confirm(`Подсказки закончились! Посмотреть рекламу, чтобы получить ${HINTS_REWARD} подсказку?`)) {
            console.log("Пользователь согласился.");
             if (!isAdReady) {
                 statusMessageElement.textContent = "Реклама загружается..."; statusMessageElement.className = '';
                 preloadRewardedAd(); return;
             }
            showRewardedAd({
                onSuccess: () => {
                    // <<< ИЗМЕНЕНО: Начисление и текст под 1 подсказку
                    console.log("Награда: +", HINTS_REWARD, "подсказка");
                    hintsRemaining += HINTS_REWARD;
                    updateHintButtonState(); saveGameState();
                    statusMessageElement.textContent = `Вы получили +${HINTS_REWARD} подсказку!`;
                    statusMessageElement.className = 'correct';
                    setTimeout(() => { if (statusMessageElement.textContent.includes(`+${HINTS_REWARD}`)) statusMessageElement.textContent = ""; }, 3000);
                },
                onError: (errorMsg) => {
                    console.log("Ошибка рекламы:", errorMsg); statusMessageElement.textContent = `Ошибка: ${errorMsg}. Подсказка не добавлена.`; statusMessageElement.className = 'incorrect-msg';
                    setTimeout(() => { if (statusMessageElement.textContent.startsWith("Ошибка:")) statusMessageElement.textContent = ""; }, 3000);
                }
            });
        } else { console.log("Пользователь отказался."); }
    }

    // --- Обработчики событий ---
    boardElement.addEventListener('click', (event) => { const target = event.target.closest('.cell'); if (!target) return; const r = parseInt(target.dataset.row); const c = parseInt(target.dataset.col); if (isNaN(r) || isNaN(c)) return; if (target === selectedCell) { clearSelection(); } else { clearSelection(); selectedCell = target; selectedRow = r; selectedCol = c; if (!selectedCell.classList.contains('given')) selectedCell.classList.add('selected'); highlightRelatedCells(r, c); } clearErrors(); });
    numpad.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; } if (!selectedCell || selectedCell.classList.contains('given')) { if(selectedCell?.classList.contains('given')) { /* сообщение */ } return; } clearErrors(); if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (button.id === 'erase-button') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } if (potentialChange) { pushHistoryState(); } if (button.id === 'erase-button') { if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } else { /* сообщение */ } } else { if (cellData.value !== num) { cellData.value = num; cellData.notes?.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged) saveGameState(); });
    document.addEventListener('keydown', (event) => { if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo(); return; } if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; } if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { if (!selectedCell) { const startCell = boardElement.querySelector(`.cell[data-row='0'][data-col='0']`); if (startCell) startCell.click(); else return; } let nextRow = selectedRow; let nextCol = selectedCol; const move = (current, delta, max) => Math.min(max, Math.max(0, current + delta)); if (event.key === 'ArrowUp') nextRow = move(selectedRow, -1, 8); if (event.key === 'ArrowDown') nextRow = move(selectedRow, 1, 8); if (event.key === 'ArrowLeft') nextCol = move(selectedCol, -1, 8); if (event.key === 'ArrowRight') nextCol = move(selectedCol, 1, 8); if (nextRow !== selectedRow || nextCol !== selectedCol) { const nextCellElement = boardElement.querySelector(`.cell[data-row='${nextRow}'][data-col='${nextCol}']`); if (nextCellElement) nextCellElement.click(); } event.preventDefault(); return; } if (!selectedCell || selectedCell.classList.contains('given')) return; if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (event.key >= '1' && event.key <= '9') { const num = parseInt(event.key); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } else if (event.key === 'Backspace' || event.key === 'Delete') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } if (potentialChange) { pushHistoryState(); } if (event.key >= '1' && event.key <= '9') { clearErrors(); const num = parseInt(event.key); if (isNoteMode) { if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } } else { if (cellData.value !== num) { cellData.value = num; cellData.notes?.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } event.preventDefault(); } else if (event.key === 'Backspace' || event.key === 'Delete') { clearErrors(); if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } event.preventDefault(); } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged) saveGameState(); });
    checkButton.addEventListener('click', () => { console.log("Проверка..."); clearErrors(); if (!currentSolution || !userGrid) return; let allCorrect = true; let boardComplete = true; for (let r = 0; r < 9; r++) { if (!userGrid[r]) continue; for (let c = 0; c < 9; c++) { if (!userGrid[r][c]) continue; const cd = userGrid[r][c]; const uv = cd.value; const ce = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (!ce) continue; if (uv === 0) { boardComplete = false; } else if (!ce.classList.contains('given')) { const sv = getSolutionValue(r, c); if (uv !== sv) { ce.classList.add('incorrect'); allCorrect = false; } } } } if (allCorrect && boardComplete) { statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct'; stopTimer(); clearSelection(); hintButton.disabled = true; clearSavedGameState(); historyStack = []; updateUndoButtonState(); } else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки."; statusMessageElement.className = 'incorrect-msg'; } else { statusMessageElement.textContent = "Пока верно, но не закончено."; statusMessageElement.className = ''; } });
    newGameButton.addEventListener('click', () => { console.log("Новая игра..."); stopTimer(); showDifficultyModal(); });
    if (undoButton) { undoButton.addEventListener('click', handleUndo); } else { console.error("Кнопка Отмена?"); }

    // --- Обработчик клика Подсказки/Рекламы ---
    if (hintButton) {
        hintButton.addEventListener('click', () => {
            if (isShowingAd) return;
            if (hintsRemaining > 0) {
                try { // Проверки перед вызовом
                    if (!selectedCell) throw new Error("Выберите ячейку");
                    if (selectedCell.classList.contains('given')) throw new Error("Нельзя подсказать");
                    const r = selectedRow; const c = selectedCol;
                    if (!userGrid[r]?.[c]) throw new Error(`Ошибка данных`);
                    if (userGrid[r][c].value !== 0) throw new Error("Ячейка заполнена");
                    provideHintInternal(); // Вызов основной логики
                } catch (error) {
                     console.log("Проверка перед подсказкой:", error.message); statusMessageElement.textContent = error.message; statusMessageElement.className = '';
                     setTimeout(() => { if (statusMessageElement.textContent === error.message) statusMessageElement.textContent = ""; }, 2000);
                }
            } else { offerRewardedAdForHints(); } // Предлагаем рекламу
        });
    } else { console.error("Кнопка Подсказка?"); }
    // ---

    if(modalButtonsContainer) { modalButtonsContainer.addEventListener('click', (event) => { const target = event.target.closest('button'); if(!target) return; if (target.classList.contains('difficulty-button')) { const difficulty = target.dataset.difficulty; if (difficulty) { console.log(`Выбрана сложность: ${difficulty}`); hideDifficultyModal(); clearSavedGameState(); historyStack = []; updateUndoButtonState(); setTimeout(() => initGame(difficulty), 50); } } else if (target.id === 'cancel-difficulty-button') { console.log("Отмена выбора."); hideDifficultyModal(); let isSolved = true; /* проверка */ if (!isSolved) startTimer(); } }); } else { console.error("Кнопки модалки?"); }
    if(modalOverlay) { modalOverlay.addEventListener('click', () => { console.log("Клик оверлея."); hideDifficultyModal(); let isSolved = true; /* проверка */ if (!isSolved) startTimer(); }); } else { console.error("Оверлей?"); }
    try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); console.log("TG SDK init."); } else { console.log("TG SDK not found."); } } catch (e) { console.error("TG SDK Error:", e); }

    // --- Первый запуск игры ---
    const savedGame = loadGameState();
    if (savedGame) { if (confirm(`Найдена сохраненная игра (${savedGame.difficulty || '???'}) от ${new Date(savedGame.timestamp).toLocaleString()}. Продолжить?`)) { initGame(savedGame.difficulty, savedGame); } else { clearSavedGameState(); initGame(); } } else { initGame(); }

    // --- Инициализация рекламы при старте ---
    initializeAds();

}); // Конец 'DOMContentLoaded'
