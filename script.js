// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на ЭКРАНЫ и основные кнопки ---
    const initialScreen = document.getElementById('initial-screen');
    const newGameOptionsScreen = document.getElementById('new-game-options');
    const gameContainer = document.getElementById('game-container');
    const startNewGameButton = document.getElementById('start-new-game-button');
    const continueGameButton = document.getElementById('continue-game-button');
    const difficultyButtonsContainer = newGameOptionsScreen.querySelector('.difficulty-selection');
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const backToInitialButton = document.getElementById('back-to-initial-button'); // << НОВОЕ
    const exitGameButton = document.getElementById('exit-game-button'); // << НОВОЕ

    // --- Получение ссылок на элементы ИГРОВОГО ЭКРАНА ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    // const newGameButton = document.getElementById('new-game-button'); // Удалена из игрового экрана
    const hintButton = document.getElementById('hint-button');
    const undoButton = document.getElementById('undo-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    const noteToggleButton = document.getElementById('note-toggle-button');
    const timerElement = document.getElementById('timer');

    // --- Ключи для localStorage ---
    const SAVE_KEY = 'sudokuGameState';
    const THEME_KEY = 'sudokuThemePreference';

    // --- Переменные состояния игры ---
    let currentPuzzle = null; let currentSolution = null; let userGrid = [];
    let selectedCell = null; let selectedRow = -1; let selectedCol = -1;
    let isNoteMode = false; let timerInterval = null; let secondsElapsed = 0;
    let currentDifficulty = 'medium'; // Сложность по умолчанию
    let historyStack = [];

    // --- Переменные для подсказок ---
    const MAX_HINTS = 3;
    const HINTS_REWARD = 1; // 1 подсказка за рекламу
    let hintsRemaining = MAX_HINTS;

    // === ПЛЕЙСХОЛДЕРЫ ДЛЯ SDK РЕКЛАМЫ (Без изменений) ===
    let isAdReady = false; let isShowingAd = false;
    function initializeAds() { console.log("ADS Init..."); setTimeout(() => { preloadRewardedAd(); }, 2000); }
    function preloadRewardedAd() { if (isAdReady || isShowingAd) return; console.log("ADS Load..."); isAdReady = false; setTimeout(() => { if (!isShowingAd) { isAdReady = true; console.log("ADS Ready."); } else { console.log("ADS Load aborted (showing)."); } }, 3000 + Math.random() * 2000); }
    function showRewardedAd(callbacks) { if (!isAdReady || isShowingAd) { console.log("ADS Not ready/Showing."); if (callbacks.onError) callbacks.onError("Реклама не готова."); preloadRewardedAd(); return; } console.log("ADS Show..."); isShowingAd = true; isAdReady = false; statusMessageElement.textContent = "Показ рекламы..."; statusMessageElement.className = ''; document.body.style.pointerEvents = 'none'; setTimeout(() => { const success = Math.random() > 0.2; document.body.style.pointerEvents = 'auto'; statusMessageElement.textContent = ""; isShowingAd = false; console.log("ADS Show End."); if (success) { console.log("ADS Success!"); if (callbacks.onSuccess) callbacks.onSuccess(); } else { console.log("ADS Error/Skip."); if (callbacks.onError) callbacks.onError("Реклама не загружена / пропущена."); } preloadRewardedAd(); }, 5000); }
    // === КОНЕЦ ПЛЕЙСХОЛДЕРОВ ===

    // --- Функции Управления Экранами --- // << НОВОЕ
    function showScreen(screenToShow) {
        [initialScreen, newGameOptionsScreen, gameContainer].forEach(screen => {
            screen.classList.remove('visible');
        });
        if (screenToShow) {
            screenToShow.classList.add('visible');
            console.log(`Screen shown: #${screenToShow.id}`);
        } else {
            console.error("showScreen: screenToShow is null or undefined");
        }
    }

    // --- Функции Темы ---
    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-theme', isDark);
        if (themeToggleCheckbox) {
            themeToggleCheckbox.checked = isDark; // Синхронизируем чекбокс
        }
        console.log(`Theme applied: ${theme}`);
        // Оповещение Telegram (опционально)
        if (window.Telegram?.WebApp) {
            try {
                 // Пример: используем цвета из CSS переменных (нужно получить их реальные значения)
                 const bodyStyle = getComputedStyle(document.body);
                 const headerColor = bodyStyle.getPropertyValue('--bg-primary').trim();
                 Telegram.WebApp.setHeaderColor(headerColor);
                 // Telegram.WebApp.setBackgroundColor(headerColor);
                 console.log("Informed Telegram about theme change.");
            } catch (e) { console.error("Error informing Telegram theme:", e); }
        }
    }

    function loadThemePreference() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        const currentTheme = savedTheme || 'light'; // Светлая по умолчанию
        applyTheme(currentTheme);
    }

    function handleThemeToggle() {
        const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        console.log(`Theme saved: ${newTheme}`);
    }

    // --- Инициализация ИГРЫ (Вызывается после выбора сложности или "Продолжить") ---
    function initGame(difficulty, restoreState = null) {
        console.log(`InitGame called: difficulty=${difficulty}, restore=${!!restoreState}`);
        currentDifficulty = difficulty;
        stopTimer(); // Остановка предыдущего таймера, если был
        historyStack = [];
        updateUndoButtonState();
        isNoteMode = false; // Сброс режима заметок при старте
        updateNoteToggleButtonState();
        clearSelection();
        clearErrors();
        statusMessageElement.textContent = ''; statusMessageElement.className = '';

        if (restoreState) {
            console.log("Attempting to restore game state...");
            try {
                currentPuzzle = restoreState.puzzle;
                currentSolution = restoreState.solution;
                // Восстановление userGrid с Set'ами для заметок
                userGrid = restoreState.grid.map(row =>
                    row.map(cell => ({
                        value: cell.value,
                        notes: new Set(cell.notesArray || []) // Убедимся, что notesArray существует
                    }))
                );
                secondsElapsed = restoreState.time || 0; // Время
                hintsRemaining = restoreState.hints !== undefined ? restoreState.hints : MAX_HINTS; // Подсказки

                if (!currentPuzzle || !currentSolution || !userGrid) throw new Error("Invalid saved data structure.");
                console.log("Game state restored successfully.");
            } catch (error) {
                console.error("Error restoring game state:", error);
                statusMessageElement.textContent = "Ошибка загрузки сохранения. Начинаем новую игру.";
                statusMessageElement.className = 'incorrect-msg';
                clearSavedGameState();
                // Если восстановление не удалось, генерируем новую игру с выбранной сложностью
                return initGame(difficulty); // Рекурсивный вызов без restoreState
            }
        } else {
            console.log(`Generating new game with difficulty: ${difficulty}...`);
            try {
                if (typeof sudoku === 'undefined' || !sudoku?.generate) throw new Error("sudoku.js library not found or generate function missing.");
                currentPuzzle = sudoku.generate(difficulty);
                if (!currentPuzzle) throw new Error(`Failed to generate puzzle for difficulty: ${difficulty}`);

                // Пытаемся решить дважды для надежности (как было в оригинале)
                currentSolution = sudoku.solve(currentPuzzle) || sudoku.solve(currentPuzzle);
                if (!currentSolution) throw new Error("Failed to solve the generated puzzle.");

                userGrid = boardStringToObjectArray(currentPuzzle);
                secondsElapsed = 0;
                hintsRemaining = MAX_HINTS;
                clearSavedGameState(); // Очищаем старое сохранение при старте новой игры
                console.log("New game generated successfully.");
            } catch (error) {
                console.error("Error generating new game:", error);
                statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
                statusMessageElement.className = 'incorrect-msg';
                boardElement.innerHTML = '<p>Не удалось загрузить игру.</p>';
                currentPuzzle = null; currentSolution = null; userGrid = []; hintsRemaining = 0;
                stopTimer();
                updateHintButtonState(); updateUndoButtonState();
                showScreen(initialScreen); // Возврат на стартовый экран при ошибке генерации
                return; // Прерываем инициализацию
            }
        }

        renderBoard(); // Отрисовка доски
        updateHintButtonState(); // Обновляем кнопку подсказок
        updateUndoButtonState(); // Обновляем кнопку отмены
        updateTimerDisplay(); // Показываем начальное время (00:00)
        startTimer(); // Запускаем таймер
        showScreen(gameContainer); // Показываем игровой экран
        console.log("Game initialization complete. Game screen shown.");
    }

    // --- Функции сохранения/загрузки состояния (Без изменений) ---
    function saveGameState() { if (!currentPuzzle || !currentSolution || !userGrid?.length) return; const serializableGrid = userGrid.map(row => row.map(cell => ({ value: cell.value, notesArray: Array.from(cell.notes || []) }))); const gameState = { puzzle: currentPuzzle, solution: currentSolution, grid: serializableGrid, time: secondsElapsed, hints: hintsRemaining, difficulty: currentDifficulty, timestamp: Date.now() }; try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); console.log("Game state saved.");} catch (error) { console.error("Save Err:", error); /* сообщение */ } }
    function loadGameState() { const savedData = localStorage.getItem(SAVE_KEY); if (!savedData) { console.log("No saved game found."); return null;} try { const gameState = JSON.parse(savedData); if (gameState?.puzzle && gameState?.solution && gameState?.grid && gameState?.difficulty && gameState.timestamp) { console.log("Saved game found:", new Date(gameState.timestamp).toLocaleString(), "Difficulty:", gameState.difficulty); return gameState; } else { console.warn("Invalid save data structure found. Clearing."); clearSavedGameState(); return null; } } catch (error) { console.error("Error parsing saved game state:", error); clearSavedGameState(); return null; } }
    function clearSavedGameState() { localStorage.removeItem(SAVE_KEY); console.log("Saved game state cleared."); checkContinueButton(); /* Обновляем состояние кнопки Продолжить */ }

    // --- Функции для Undo (Без изменений) ---
    function createHistoryState() { if (!userGrid?.length) return null; const gridCopy = userGrid.map(row => row.map(cell => ({ value: cell.value, notes: new Set(cell.notes || []) }))); return { grid: gridCopy, hints: hintsRemaining }; }
    function pushHistoryState() { const stateToPush = createHistoryState(); if (stateToPush) { historyStack.push(stateToPush); updateUndoButtonState(); } else { console.warn("Invalid history push attempt."); } }
    function handleUndo() { if (historyStack.length === 0 || isShowingAd) return; stopTimer(); const previousState = historyStack.pop(); console.log("Undo action triggered..."); try { const hintsBeforeAction = previousState.hints; const hintsNow = hintsRemaining; userGrid = previousState.grid; if (hintsBeforeAction <= hintsNow) { hintsRemaining = hintsBeforeAction; } else { console.log("Undo Hint Use: Hint count not restored (was used in this step)."); } renderBoard(); clearSelection(); clearErrors(); updateHintButtonState(); updateUndoButtonState(); saveGameState(); console.log("Undo successful."); } catch(error) { console.error("Undo Err:", error); statusMessageElement.textContent = "Ошибка отмены хода!"; statusMessageElement.className = 'incorrect-msg'; historyStack = []; updateUndoButtonState(); } finally { resumeTimerIfNeeded(); /* Возобновляем таймер, если игра не решена */ } }
    function updateUndoButtonState() { if (undoButton) { undoButton.disabled = historyStack.length === 0; } }

    // --- Функции для таймера (Небольшое изменение в startTimer) ---
    function startTimer() {
        if(timerInterval || !gameContainer.classList.contains('visible')) return; // Не запускаем, если уже идет или не на игровом экране
        updateTimerDisplay(); // Обновляем сразу
        timerInterval = setInterval(() => {
             secondsElapsed++;
             updateTimerDisplay();
             if (secondsElapsed % 10 === 0) { // Сохраняем каждые 10 сек
                 saveGameState();
             }
        }, 1000);
        console.log("Timer started.");
    }
    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; console.log("Timer stopped."); saveGameState(); /* Сохраняемся при остановке */ } }
    function updateTimerDisplay() { if (!timerElement) return; const minutes = Math.floor(secondsElapsed / 60); const seconds = secondsElapsed % 60; timerElement.textContent = `Время: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }

    // --- Преобразование строки в сетку (Без изменений) ---
    function boardStringToObjectArray(boardString) { const grid = []; for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const index = r * 9 + c; if (index >= boardString.length) { grid[r][c] = { value: 0, notes: new Set() }; continue; } const char = boardString[index]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } } return grid; }

    // --- Отрисовка (Без изменений) ---
    function renderBoard() { boardElement.innerHTML = ''; if (!userGrid?.length) { boardElement.innerHTML = '<p>Ошибка отрисовки</p>'; return; } for (let r = 0; r < 9; r++) { if (!userGrid[r]?.length) continue; for (let c = 0; c < 9; c++) { if (userGrid[r][c] === undefined) { const ph = document.createElement('div'); ph.classList.add('cell'); ph.textContent = '?'; boardElement.appendChild(ph); continue; } boardElement.appendChild(createCellElement(r, c)); } } /* console.log("Board Rendered."); */ }
    function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; if (!userGrid[r]?.[c]) { cell.textContent = '?'; return cell; } const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const idx = r * 9 + c; if (currentPuzzle?.[idx] && currentPuzzle[idx] !== '.' && currentPuzzle[idx] !== '0') cell.classList.add('given'); } else if (cellData.notes?.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const nd = document.createElement('div'); nd.classList.add('note-digit'); nd.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(nd); } } else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; } cell.appendChild(valueContainer); cell.appendChild(notesContainer); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom'); return cell; }
    function renderCell(r, c) { const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (oldCell) { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted'); if (selectedRow === r && selectedCol === c) selectedCell = newCell; oldCell.replaceWith(newCell); } else { console.warn(`renderCell: Cell [${r}, ${c}] not found?`); } }

    // --- Вспомогательные (Без изменений, кроме resumeTimerIfNeeded) ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const index = row * 9 + col; if (index >= currentSolution.length) return null; const char = currentSolution[index]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
    function clearSelection() { if (selectedCell) selectedCell.classList.remove('selected'); boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); selectedCell = null; selectedRow = -1; selectedCol = -1; }
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => cell.classList.remove('incorrect')); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
    function updateNoteToggleButtonState() { if (noteToggleButton) { noteToggleButton.classList.toggle('active', isNoteMode); noteToggleButton.title = `Режим заметок (${isNoteMode ? 'ВКЛ' : 'ВЫКЛ'})`; } }
    function updateHintButtonState() { if (hintButton) { hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`; hintButton.disabled = !currentSolution || isGameSolved(); if (!currentSolution) { hintButton.title = "Игра не загружена"; } else if(isGameSolved()) { hintButton.title = "Игра решена"; } else if (hintsRemaining > 0) { hintButton.title = "Использовать подсказку"; } else { hintButton.title = `Получить ${HINTS_REWARD} подсказку (смотреть рекламу)`; } } else { console.warn("Hint button not found?"); } }
    function highlightRelatedCells(row, col) { boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => cell.classList.add('highlighted')); }
    function isGameSolved() { if (!userGrid || userGrid.length === 0) return false; return !userGrid.flat().some(cell => cell.value === 0); }
    function resumeTimerIfNeeded() { if (gameContainer.classList.contains('visible') && !isGameSolved()) { startTimer(); } else { stopTimer(); } }

    // --- Логика подсказки (Внутренняя + Предложение рекламы) (Без изменений) ---
    function provideHintInternal() { pushHistoryState(); let hintUsed = false; try { if (!selectedCell) throw new Error("Ячейка не выбрана"); if (selectedCell.classList.contains('given')) throw new Error("Это начальная цифра"); const r = selectedRow; const c = selectedCol; if (!userGrid[r]?.[c]) throw new Error(`Ошибка данных ячейки [${r},${c}]`); if (userGrid[r][c].value !== 0) throw new Error("Ячейка уже заполнена"); const solutionValue = getSolutionValue(r, c); if (solutionValue > 0) { console.log(`Hint provided for [${r}, ${c}]: ${solutionValue}`); userGrid[r][c].value = solutionValue; userGrid[r][c].notes?.clear(); renderCell(r, c); const hintedCellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (hintedCellElement) { hintedCellElement.classList.remove('selected'); const hintColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-hint-flash').trim() || '#fffacd'; hintedCellElement.style.transition = 'background-color 0.1s ease-out'; hintedCellElement.style.backgroundColor = hintColor; setTimeout(() => { hintedCellElement.style.backgroundColor = ''; hintedCellElement.style.transition = ''; clearSelection(); }, 500); } else { clearSelection(); } hintsRemaining--; hintUsed = true; updateHintButtonState(); clearErrors(); saveGameState(); } else throw new Error(`Не найдено решение для [${r}, ${c}]`); } catch (error) { console.error("Hint Internal Error:", error.message); statusMessageElement.textContent = error.message; statusMessageElement.className = 'incorrect-msg'; setTimeout(() => { if (statusMessageElement.textContent === error.message) statusMessageElement.textContent = ""; }, 2500); if (!hintUsed) { historyStack.pop(); updateUndoButtonState(); } } }
    function offerRewardedAdForHints() { if (isShowingAd) { console.log("Ad Offer deferred (already showing ad)."); return; } console.log("Offering rewarded ad for hints..."); if (confirm(`Подсказки закончились! Посмотреть рекламу, чтобы получить ${HINTS_REWARD} подсказку?`)) { console.log("User agreed to watch ad."); if (!isAdReady) { statusMessageElement.textContent = "Реклама загружается..."; statusMessageElement.className = ''; preloadRewardedAd(); return; } showRewardedAd({ onSuccess: () => { console.log("Ad Reward: +", HINTS_REWARD, "hint(s)"); hintsRemaining += HINTS_REWARD; updateHintButtonState(); saveGameState(); statusMessageElement.textContent = `Вы получили +${HINTS_REWARD} подсказку!`; statusMessageElement.className = 'correct'; setTimeout(() => { if (statusMessageElement.textContent.includes(`+${HINTS_REWARD}`)) statusMessageElement.textContent = ""; }, 3000); }, onError: (errorMsg) => { console.log("Ad Error/Skip:", errorMsg); statusMessageElement.textContent = `Ошибка: ${errorMsg || 'Реклама не показана'}. Подсказка не добавлена.`; statusMessageElement.className = 'incorrect-msg'; setTimeout(() => { if (statusMessageElement.textContent.startsWith("Ошибка:")) statusMessageElement.textContent = ""; }, 3000); } }); } else { console.log("User declined ad."); } }

    // --- Обработчики Событий ---

    // 1. Стартовый Экран
    startNewGameButton.addEventListener('click', () => {
        console.log("New Game button clicked.");
        showScreen(newGameOptionsScreen);
    });

    continueGameButton.addEventListener('click', () => {
        console.log("Continue Game button clicked.");
        const savedState = loadGameState();
        if (savedState) {
            // Загружаем сложность из сохранения
            const difficultyToLoad = savedState.difficulty || 'medium';
            initGame(difficultyToLoad, savedState); // Инициализируем игру с сохраненным состоянием
        } else {
            console.warn("Continue clicked, but no saved game found.");
            statusMessageElement.textContent = "Нет сохраненной игры.";
            statusMessageElement.className = 'incorrect-msg';
            continueGameButton.disabled = true; // На всякий случай еще раз отключаем
        }
    });

    // 2. Экран Настроек Новой Игры
    difficultyButtonsContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button.difficulty-button');
        if (target && target.dataset.difficulty) {
            const difficulty = target.dataset.difficulty;
            console.log(`Difficulty selected: ${difficulty}`);
            // Очищаем предыдущее состояние, т.к. начинаем новую игру
            clearSavedGameState();
            // Инициализируем игру с выбранной сложностью (без restoreState)
            initGame(difficulty);
        }
    });

    themeToggleCheckbox.addEventListener('change', handleThemeToggle);

    backToInitialButton.addEventListener('click', () => {
        console.log("Back button clicked.");
        showScreen(initialScreen); // Показываем начальный экран
        checkContinueButton(); // Проверяем кнопку "Продолжить" снова
    });


    // 3. Игровой Экран
    boardElement.addEventListener('click', (event) => { const target = event.target.closest('.cell'); if (!target || isShowingAd) return; const r = parseInt(target.dataset.row); const c = parseInt(target.dataset.col); if (isNaN(r) || isNaN(c)) return; if (target === selectedCell) { clearSelection(); } else { clearSelection(); selectedCell = target; selectedRow = r; selectedCol = c; if (!selectedCell.classList.contains('given')) selectedCell.classList.add('selected'); highlightRelatedCells(r, c); } clearErrors(); });
    numpad.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button || isShowingAd) return; if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; } if (!selectedCell || selectedCell.classList.contains('given')) { if(selectedCell?.classList.contains('given')) { /* msg */ } return; } clearErrors(); if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (button.id === 'erase-button') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } if (potentialChange && !isGameSolved()) { pushHistoryState(); } if (button.id === 'erase-button') { if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } else { /* msg */ } } else { if (cellData.value !== num) { cellData.value = num; cellData.notes?.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged && !isGameSolved()) saveGameState(); });
    document.addEventListener('keydown', (event) => { if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || isShowingAd || !gameContainer.classList.contains('visible') /* Игнор, если не на игровом экране */) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo(); return; } if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; } if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { if (!selectedCell) { const startCell = boardElement.querySelector(`.cell[data-row='0'][data-col='0']`); if (startCell) startCell.click(); else return; } let nextRow = selectedRow; let nextCol = selectedCol; const move = (current, delta, max) => Math.min(max, Math.max(0, current + delta)); if (event.key === 'ArrowUp') nextRow = move(selectedRow, -1, 8); if (event.key === 'ArrowDown') nextRow = move(selectedRow, 1, 8); if (event.key === 'ArrowLeft') nextCol = move(selectedCol, -1, 8); if (event.key === 'ArrowRight') nextCol = move(selectedCol, 1, 8); if (nextRow !== selectedRow || nextCol !== selectedCol) { const nextCellElement = boardElement.querySelector(`.cell[data-row='${nextRow}'][data-col='${nextCol}']`); if (nextCellElement) nextCellElement.click(); } event.preventDefault(); return; } if (!selectedCell || selectedCell.classList.contains('given')) return; if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (event.key >= '1' && event.key <= '9') { const num = parseInt(event.key); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } else if (event.key === 'Backspace' || event.key === 'Delete') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } if (potentialChange && !isGameSolved()) { pushHistoryState(); } if (event.key >= '1' && event.key <= '9') { clearErrors(); const num = parseInt(event.key); if (isNoteMode) { if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } } else { if (cellData.value !== num) { cellData.value = num; cellData.notes?.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } event.preventDefault(); } else if (event.key === 'Backspace' || event.key === 'Delete') { clearErrors(); if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } event.preventDefault(); } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged && !isGameSolved()) saveGameState(); });
    checkButton.addEventListener('click', () => { console.log("Check button clicked."); clearErrors(); if (!currentSolution || !userGrid) return; let allCorrect = true; let boardComplete = true; for (let r = 0; r < 9; r++) { if (!userGrid[r]) continue; for (let c = 0; c < 9; c++) { if (!userGrid[r][c]) continue; const cd = userGrid[r][c]; const uv = cd.value; const ce = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (!ce) continue; if (uv === 0) { boardComplete = false; } else if (!ce.classList.contains('given')) { const sv = getSolutionValue(r, c); if (uv !== sv) { ce.classList.add('incorrect'); allCorrect = false; } } } } if (allCorrect && boardComplete) { statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct'; stopTimer(); clearSelection(); updateHintButtonState(); // Обновит состояние кнопки (disabled) // clearSavedGameState(); // Не очищаем, чтобы можно было посмотреть решенную доску // historyStack = []; // Тоже не очищаем, вдруг захотят отменить? // updateUndoButtonState(); } else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки."; statusMessageElement.className = 'incorrect-msg'; } else { statusMessageElement.textContent = "Пока верно, но не закончено."; statusMessageElement.className = ''; } });
    if (undoButton) { undoButton.addEventListener('click', handleUndo); } else { console.error("Undo Button not found?"); }
    if (hintButton) { hintButton.addEventListener('click', () => { if (isShowingAd || isGameSolved()) return; if (hintsRemaining > 0) { provideHintInternal(); } else { offerRewardedAdForHints(); } }); } else { console.error("Hint Button not found?"); }
    exitGameButton.addEventListener('click', () => {
        console.log("Exit to menu button clicked.");
        stopTimer(); // Остановка таймера (сохранение произойдет внутри)
        showScreen(initialScreen); // Показать начальный экран
        checkContinueButton(); // Обновить состояние кнопки "Продолжить"
    });

    // --- Инициализация Приложения ---
    function initializeApp() {
        console.log("Initializing application...");
        loadThemePreference(); // Загружаем тему
        checkContinueButton(); // Проверяем наличие сохранения и активируем/деактивируем кнопку
        showScreen(initialScreen); // Показываем начальный экран по умолчанию
        initializeAds(); // Инициализируем плейсхолдер рекламы
        // Инициализация TG SDK
        try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); console.log("TG SDK ready."); } else { console.log("TG SDK not found."); } } catch (e) { console.error("TG SDK Error:", e); }
        console.log("Application initialized.");
    }

    // Функция для проверки и установки состояния кнопки "Продолжить"
    function checkContinueButton() {
        const savedState = loadGameState(); // Просто проверяем наличие валидного сохранения
        if (continueGameButton) {
            continueGameButton.disabled = !savedState;
            console.log(`Continue button state updated. Enabled: ${!continueGameButton.disabled}`);
        }
    }

    // --- Запуск ---
    initializeApp();

}); // Конец 'DOMContentLoaded'
