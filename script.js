// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed."); // Сообщение для проверки, что listener сработал

    // --- Получение ссылок на ЭКРАНЫ и основные кнопки ---
    // Добавляем проверки на null сразу
    const initialScreen = document.getElementById('initial-screen');
    if (!initialScreen) console.error("Critical Error: #initial-screen not found!");
    const newGameOptionsScreen = document.getElementById('new-game-options');
    if (!newGameOptionsScreen) console.error("Critical Error: #new-game-options not found!");
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) console.error("Critical Error: #game-container not found!");

    const startNewGameButton = document.getElementById('start-new-game-button');
    if (!startNewGameButton) console.error("Error: #start-new-game-button not found!");
    const continueGameButton = document.getElementById('continue-game-button');
    if (!continueGameButton) console.error("Error: #continue-game-button not found!");
    const difficultyButtonsContainer = newGameOptionsScreen ? newGameOptionsScreen.querySelector('.difficulty-selection') : null;
    if (!difficultyButtonsContainer) console.error("Error: .difficulty-selection not found within #new-game-options!");
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    if (!themeToggleCheckbox) console.error("Error: #theme-toggle-checkbox not found!");
    const backToInitialButton = document.getElementById('back-to-initial-button');
    if (!backToInitialButton) console.error("Error: #back-to-initial-button not found!");
    const exitGameButton = document.getElementById('exit-game-button');
    if (!exitGameButton) console.error("Error: #exit-game-button not found!");

    // --- Получение ссылок на элементы ИГРОВОГО ЭКРАНА ---
    const boardElement = document.getElementById('sudoku-board');
    if (!boardElement) console.error("Error: #sudoku-board not found!");
    const checkButton = document.getElementById('check-button');
    if (!checkButton) console.error("Error: #check-button not found!");
    const hintButton = document.getElementById('hint-button');
    if (!hintButton) console.error("Error: #hint-button not found!");
    const undoButton = document.getElementById('undo-button');
    if (!undoButton) console.error("Error: #undo-button not found!");
    const statusMessageElement = document.getElementById('status-message');
    if (!statusMessageElement) console.error("Error: #status-message not found!");
    const numpad = document.getElementById('numpad');
    if (!numpad) console.error("Error: #numpad not found!");
    const noteToggleButton = document.getElementById('note-toggle-button');
    if (!noteToggleButton) console.error("Error: #note-toggle-button not found!");
    const timerElement = document.getElementById('timer');
    if (!timerElement) console.error("Error: #timer not found!");

    // --- Ключи для localStorage ---
    const SAVE_KEY = 'sudokuGameState';
    const THEME_KEY = 'sudokuThemePreference';

    // --- Переменные состояния игры ---
    let currentPuzzle = null; let currentSolution = null; let userGrid = [];
    let selectedCell = null; let selectedRow = -1; let selectedCol = -1;
    let isNoteMode = false; let timerInterval = null; let secondsElapsed = 0;
    let currentDifficulty = 'medium';
    let historyStack = [];

    // --- Переменные для подсказок ---
    const MAX_HINTS = 3;
    const HINTS_REWARD = 1;
    let hintsRemaining = MAX_HINTS;

    // === ПЛЕЙСХОЛДЕРЫ ДЛЯ SDK РЕКЛАМЫ ===
    let isAdReady = false; let isShowingAd = false;
    function initializeAds() { console.log("ADS Init..."); setTimeout(() => { preloadRewardedAd(); }, 2000); }
    function preloadRewardedAd() { if (isAdReady || isShowingAd) return; console.log("ADS Load..."); isAdReady = false; setTimeout(() => { if (!isShowingAd) { isAdReady = true; console.log("ADS Ready."); } else { console.log("ADS Load aborted (showing)."); } }, 3000 + Math.random() * 2000); }
    function showRewardedAd(callbacks) { if (!isAdReady || isShowingAd) { console.log("ADS Not ready/Showing."); if (callbacks.onError) callbacks.onError("Реклама не готова."); preloadRewardedAd(); return; } console.log("ADS Show..."); isShowingAd = true; isAdReady = false; if(statusMessageElement) { statusMessageElement.textContent = "Показ рекламы..."; statusMessageElement.className = ''; } document.body.style.pointerEvents = 'none'; setTimeout(() => { const success = Math.random() > 0.2; document.body.style.pointerEvents = 'auto'; if(statusMessageElement) statusMessageElement.textContent = ""; isShowingAd = false; console.log("ADS Show End."); if (success) { console.log("ADS Success!"); if (callbacks.onSuccess) callbacks.onSuccess(); } else { console.log("ADS Error/Skip."); if (callbacks.onError) callbacks.onError("Реклама не загружена / пропущена."); } preloadRewardedAd(); }, 5000); }
    // === КОНЕЦ ПЛЕЙСХОЛДЕРОВ ===

    // --- Функции Управления Экранами ---
    function showScreen(screenToShow) {
        // Добавим проверку на существование экранов перед манипуляцией
        [initialScreen, newGameOptionsScreen, gameContainer].forEach(screen => {
            if (screen) screen.classList.remove('visible');
            else console.warn("A screen element was not found during showScreen iteration.");
        });
        if (screenToShow) {
            screenToShow.classList.add('visible');
            console.log(`Screen shown: #${screenToShow.id}`);
        } else {
            console.error("showScreen: screenToShow is null or undefined! Cannot show screen.");
            // Как запасной вариант, можно показать начальный экран, если он есть
            if (initialScreen) {
                initialScreen.classList.add('visible');
                console.log("Fallback: Showing initial screen.");
            } else {
                 // Совсем крайний случай - пишем прямо в body
                 document.body.innerHTML = '<p style="color: red; font-size: 20px;">Critical Error: Cannot display any screen.</p>';
            }
        }
    }

    // --- Функции Темы ---
    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-theme', isDark);
        if (themeToggleCheckbox) { // Проверка на null
            themeToggleCheckbox.checked = isDark;
        } else {
            console.warn("Theme toggle checkbox not found, cannot sync state.");
        }
        console.log(`Theme applied: ${theme}`);
        if (window.Telegram?.WebApp) {
            try {
                 const bodyStyle = getComputedStyle(document.body);
                 const headerColor = bodyStyle.getPropertyValue('--bg-primary').trim();
                 if (headerColor) { // Убедимся, что цвет получили
                    Telegram.WebApp.setHeaderColor(headerColor);
                    // Telegram.WebApp.setBackgroundColor(headerColor);
                    console.log("Informed Telegram about theme change.");
                 } else {
                    console.warn("Could not get --bg-primary color for Telegram theme.");
                 }
            } catch (e) { console.error("Error informing Telegram theme:", e); }
        }
    }

    function loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem(THEME_KEY);
            const currentTheme = savedTheme || 'light';
            applyTheme(currentTheme);
        } catch (e) {
            console.error("Error loading theme preference:", e);
            applyTheme('light'); // Запасной вариант
        }
    }

    function handleThemeToggle() {
        if (!themeToggleCheckbox) {
             console.error("Cannot handle theme toggle: checkbox not found.");
             return;
        }
        const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light';
        applyTheme(newTheme);
        try {
            localStorage.setItem(THEME_KEY, newTheme);
            console.log(`Theme saved: ${newTheme}`);
        } catch (e) {
            console.error("Error saving theme preference:", e);
        }
    }

    // --- Инициализация ИГРЫ ---
    function initGame(difficulty, restoreState = null) {
        console.log(`InitGame called: difficulty=${difficulty}, restore=${!!restoreState}`);
        // Проверим критичные элементы для игры
        if (!boardElement || !statusMessageElement || !timerElement || !hintButton || !undoButton || !noteToggleButton) {
             console.error("Cannot initialize game: Essential game elements are missing!");
             if (statusMessageElement) {
                 statusMessageElement.textContent = "Критическая ошибка: Отсутствуют элементы игры.";
                 statusMessageElement.className = 'incorrect-msg';
             }
             return; // Не можем продолжить
        }

        currentDifficulty = difficulty;
        stopTimer();
        historyStack = [];
        updateUndoButtonState();
        isNoteMode = false;
        updateNoteToggleButtonState();
        clearSelection();
        clearErrors();
        statusMessageElement.textContent = ''; statusMessageElement.className = '';

        if (restoreState) {
            console.log("Attempting to restore game state...");
            try {
                if (!restoreState.puzzle || !restoreState.solution || !restoreState.grid || !restoreState.difficulty) {
                    throw new Error("Invalid saved data structure (missing essential keys).");
                }
                currentPuzzle = restoreState.puzzle;
                currentSolution = restoreState.solution;
                userGrid = restoreState.grid.map(row =>
                    row.map(cell => ({
                        value: cell.value,
                        notes: new Set(cell.notesArray || [])
                    }))
                );
                secondsElapsed = restoreState.time || 0;
                hintsRemaining = restoreState.hints !== undefined ? restoreState.hints : MAX_HINTS;
                console.log("Game state restored successfully.");
            } catch (error) {
                console.error("Error restoring game state:", error);
                statusMessageElement.textContent = "Ошибка загрузки сохранения. Начинаем новую игру.";
                statusMessageElement.className = 'incorrect-msg';
                clearSavedGameState();
                return initGame(difficulty);
            }
        } else {
            console.log(`Generating new game with difficulty: ${difficulty}...`);
            try {
                if (typeof sudoku === 'undefined' || typeof sudoku.generate !== 'function') {
                    throw new Error("Sudoku library ('sudoku.js') is not loaded or 'generate' function is missing.");
                }
                currentPuzzle = sudoku.generate(difficulty);
                if (!currentPuzzle) throw new Error(`Failed to generate puzzle for difficulty: ${difficulty}`);

                if (typeof sudoku.solve !== 'function') {
                     throw new Error("Sudoku library ('sudoku.js') 'solve' function is missing.");
                }
                currentSolution = sudoku.solve(currentPuzzle) || sudoku.solve(currentPuzzle); // Try solving
                if (!currentSolution) throw new Error("Failed to solve the generated puzzle. The puzzle might be invalid.");

                userGrid = boardStringToObjectArray(currentPuzzle);
                secondsElapsed = 0;
                hintsRemaining = MAX_HINTS;
                clearSavedGameState();
                console.log("New game generated successfully.");
            } catch (error) {
                console.error("Error generating new game:", error);
                statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
                statusMessageElement.className = 'incorrect-msg';
                boardElement.innerHTML = '<p>Не удалось загрузить игру.</p>';
                currentPuzzle = null; currentSolution = null; userGrid = []; hintsRemaining = 0;
                stopTimer();
                updateHintButtonState(); updateUndoButtonState();
                // Не показываем здесь начальный экран, пусть остается сообщение об ошибке
                return; // Прерываем инициализацию
            }
        }

        renderBoard();
        updateHintButtonState();
        updateUndoButtonState();
        updateTimerDisplay();
        startTimer();
        showScreen(gameContainer); // Показываем игровой экран ТОЛЬКО если все прошло успешно
        console.log("Game initialization complete. Game screen shown.");
    }

    // --- Функции сохранения/загрузки состояния ---
    function saveGameState() {
        // Добавим проверку userGrid перед сохранением
        if (!currentPuzzle || !currentSolution || !userGrid || userGrid.length !== 9) {
             console.warn("Cannot save game state: Invalid game data.");
             return;
        }
        try {
            const serializableGrid = userGrid.map(row =>
                 row.map(cell => ({
                     value: cell.value,
                     notesArray: Array.from(cell.notes || [])
                 }))
            );
            const gameState = {
                puzzle: currentPuzzle, solution: currentSolution, grid: serializableGrid,
                time: secondsElapsed, hints: hintsRemaining, difficulty: currentDifficulty,
                timestamp: Date.now()
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            console.log("Game state saved.");
        } catch (error) {
             console.error("Save Game State Error:", error);
             if(statusMessageElement) {
                statusMessageElement.textContent = "Ошибка сохранения игры!";
                statusMessageElement.className = 'incorrect-msg';
             }
        }
    }
    function loadGameState() {
         const savedData = localStorage.getItem(SAVE_KEY);
         if (!savedData) { console.log("No saved game found."); return null;}
         try {
             const gameState = JSON.parse(savedData);
             // Более строгая проверка структуры
             if (gameState && typeof gameState === 'object' &&
                 gameState.puzzle && gameState.solution && Array.isArray(gameState.grid) &&
                 gameState.difficulty && typeof gameState.timestamp === 'number')
             {
                 console.log("Saved game found:", new Date(gameState.timestamp).toLocaleString(), "Difficulty:", gameState.difficulty);
                 return gameState;
             } else {
                 console.warn("Invalid save data structure found. Clearing.");
                 clearSavedGameState();
                 return null;
             }
         } catch (error) {
             console.error("Error parsing saved game state:", error);
             clearSavedGameState();
             return null;
         }
    }
    function clearSavedGameState() {
         try {
             localStorage.removeItem(SAVE_KEY);
             console.log("Saved game state cleared.");
             checkContinueButton(); // Обновляем кнопку сразу
         } catch (e) {
             console.error("Error clearing saved game state:", e);
         }
    }

    // --- Функции для Undo ---
    function createHistoryState() { if (!userGrid || userGrid.length !== 9) return null; const gridCopy = userGrid.map(row => row.map(cell => ({ value: cell.value, notes: new Set(cell.notes || []) }))); return { grid: gridCopy, hints: hintsRemaining }; }
    function pushHistoryState() { const stateToPush = createHistoryState(); if (stateToPush) { historyStack.push(stateToPush); updateUndoButtonState(); } else { console.warn("Invalid history push attempt."); } }
    function handleUndo() { if (historyStack.length === 0 || isShowingAd) return; stopTimer(); const previousState = historyStack.pop(); console.log("Undo action triggered..."); try { const hintsBeforeAction = previousState.hints; const hintsNow = hintsRemaining; userGrid = previousState.grid; if (hintsBeforeAction <= hintsNow) { hintsRemaining = hintsBeforeAction; } else { console.log("Undo Hint Use: Hint count not restored (was used in this step)."); } renderBoard(); clearSelection(); clearErrors(); updateHintButtonState(); updateUndoButtonState(); saveGameState(); console.log("Undo successful."); } catch(error) { console.error("Undo Err:", error); if(statusMessageElement) {statusMessageElement.textContent = "Ошибка отмены хода!"; statusMessageElement.className = 'incorrect-msg';} historyStack = []; updateUndoButtonState(); } finally { resumeTimerIfNeeded(); } }
    function updateUndoButtonState() { if (undoButton) { undoButton.disabled = historyStack.length === 0; } }

    // --- Функции для таймера ---
    function startTimer() {
        if(timerInterval || !gameContainer || !gameContainer.classList.contains('visible')) return;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
             secondsElapsed++;
             updateTimerDisplay();
             if (secondsElapsed % 10 === 0) { saveGameState(); }
        }, 1000);
        console.log("Timer started.");
    }
    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; console.log("Timer stopped."); saveGameState(); } }
    function updateTimerDisplay() { if (!timerElement) return; const minutes = Math.floor(secondsElapsed / 60); const seconds = secondsElapsed % 60; timerElement.textContent = `Время: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }

    // --- Преобразование строки в сетку ---
    function boardStringToObjectArray(boardString) { if (!boardString || typeof boardString !== 'string') return []; const grid = []; for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const index = r * 9 + c; if (index >= boardString.length) { grid[r][c] = { value: 0, notes: new Set() }; continue; } const char = boardString[index]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } } return grid; }

    // --- Отрисовка ---
    function renderBoard() { if (!boardElement) {console.error("renderBoard: boardElement not found!"); return;} boardElement.innerHTML = ''; if (!userGrid || userGrid.length !== 9) { boardElement.innerHTML = '<p>Ошибка данных для отрисовки</p>'; return; } try { for (let r = 0; r < 9; r++) { if (!userGrid[r] || userGrid[r].length !== 9) throw new Error(`Invalid row data at r=${r}`); for (let c = 0; c < 9; c++) { if (userGrid[r][c] === undefined) { const ph = document.createElement('div'); ph.classList.add('cell'); ph.textContent = '?'; boardElement.appendChild(ph); continue; } boardElement.appendChild(createCellElement(r, c)); } } } catch (error) { console.error("Error during renderBoard:", error); boardElement.innerHTML = '<p style="color:red;">Ошибка отрисовки доски!</p>'; } }
    function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; if (!userGrid[r]?.[c]) { cell.textContent = '?'; return cell; } const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const idx = r * 9 + c; if (currentPuzzle?.[idx] && currentPuzzle[idx] !== '.' && currentPuzzle[idx] !== '0') cell.classList.add('given'); } else if (cellData.notes instanceof Set && cellData.notes.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const nd = document.createElement('div'); nd.classList.add('note-digit'); nd.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(nd); } } else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; } cell.appendChild(valueContainer); cell.appendChild(notesContainer); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom'); return cell; }
    function renderCell(r, c) { if (!boardElement) return; const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (oldCell) { try { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted'); if (selectedRow === r && selectedCol === c) selectedCell = newCell; oldCell.replaceWith(newCell); } catch (error) { console.error(`Error rendering cell [${r}, ${c}]:`, error); }} else { console.warn(`renderCell: Cell [${r}, ${c}] not found?`); } }

    // --- Вспомогательные ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const index = row * 9 + col; if (index >= currentSolution.length) return null; const char = currentSolution[index]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
    function clearSelection() { if (selectedCell) selectedCell.classList.remove('selected'); if(boardElement) boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); selectedCell = null; selectedRow = -1; selectedCol = -1; }
    function clearErrors() { if(boardElement) boardElement.querySelectorAll('.cell.incorrect').forEach(cell => cell.classList.remove('incorrect')); if(statusMessageElement) { statusMessageElement.textContent = ''; statusMessageElement.className = ''; } }
    function updateNoteToggleButtonState() { if (noteToggleButton) { noteToggleButton.classList.toggle('active', isNoteMode); noteToggleButton.title = `Режим заметок (${isNoteMode ? 'ВКЛ' : 'ВЫКЛ'})`; } }
    function updateHintButtonState() { if (hintButton) { const solved = isGameSolved(); hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`; hintButton.disabled = !currentSolution || solved; if (!currentSolution) { hintButton.title = "Игра не загружена"; } else if(solved) { hintButton.title = "Игра решена"; } else if (hintsRemaining > 0) { hintButton.title = "Использовать подсказку"; } else { hintButton.title = `Получить ${HINTS_REWARD} подсказку (смотреть рекламу)`; } } else { console.warn("Hint button not found?"); } }
    function highlightRelatedCells(row, col) { if(boardElement) { boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted')); boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => cell.classList.add('highlighted')); }}
    function isGameSolved() { if (!userGrid || userGrid.length !== 9) return false; return !userGrid.flat().some(cell => cell.value === 0); }
    function resumeTimerIfNeeded() { if (gameContainer && gameContainer.classList.contains('visible') && !isGameSolved()) { startTimer(); } else { stopTimer(); } }

    // --- Логика подсказки (Внутренняя + Предложение рекламы) ---
    function provideHintInternal() { if (!selectedCell) { if(statusMessageElement) { statusMessageElement.textContent = "Выберите ячейку для подсказки."; statusMessageElement.className = '';} setTimeout(() => clearErrors(), 2000); return; } pushHistoryState(); let hintUsed = false; try { if (selectedCell.classList.contains('given')) throw new Error("Это начальная цифра"); const r = selectedRow; const c = selectedCol; if (r < 0 || c < 0 || !userGrid[r]?.[c]) throw new Error(`Ошибка данных ячейки [${r},${c}]`); if (userGrid[r][c].value !== 0) throw new Error("Ячейка уже заполнена"); const solutionValue = getSolutionValue(r, c); if (solutionValue > 0) { console.log(`Hint provided for [${r}, ${c}]: ${solutionValue}`); userGrid[r][c].value = solutionValue; if (userGrid[r][c].notes) userGrid[r][c].notes.clear(); renderCell(r, c); const hintedCellElement = boardElement?.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (hintedCellElement) { hintedCellElement.classList.remove('selected'); const hintColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-hint-flash').trim() || '#fffacd'; hintedCellElement.style.transition = 'background-color 0.1s ease-out'; hintedCellElement.style.backgroundColor = hintColor; setTimeout(() => { if(hintedCellElement) {hintedCellElement.style.backgroundColor = ''; hintedCellElement.style.transition = '';} clearSelection(); }, 500); } else { clearSelection(); } hintsRemaining--; hintUsed = true; updateHintButtonState(); clearErrors(); saveGameState(); if(isGameSolved()) { checkButton.click(); } } else throw new Error(`Не найдено решение для [${r}, ${c}]`); } catch (error) { console.error("Hint Internal Error:", error.message); if(statusMessageElement) { statusMessageElement.textContent = error.message; statusMessageElement.className = 'incorrect-msg'; setTimeout(() => clearErrors(), 2500); } if (!hintUsed) { historyStack.pop(); updateUndoButtonState(); } } }
    function offerRewardedAdForHints() { if (isShowingAd) { console.log("Ad Offer deferred (already showing ad)."); return; } console.log("Offering rewarded ad for hints..."); if (confirm(`Подсказки закончились! Посмотреть рекламу, чтобы получить ${HINTS_REWARD} подсказку?`)) { console.log("User agreed to watch ad."); if (!isAdReady) { if(statusMessageElement) {statusMessageElement.textContent = "Реклама загружается..."; statusMessageElement.className = '';} preloadRewardedAd(); return; } showRewardedAd({ onSuccess: () => { console.log("Ad Reward: +", HINTS_REWARD, "hint(s)"); hintsRemaining += HINTS_REWARD; updateHintButtonState(); saveGameState(); if(statusMessageElement) {statusMessageElement.textContent = `Вы получили +${HINTS_REWARD} подсказку!`; statusMessageElement.className = 'correct'; setTimeout(() => { if (statusMessageElement.textContent.includes(`+${HINTS_REWARD}`)) statusMessageElement.textContent = ""; }, 3000); } }, onError: (errorMsg) => { console.log("Ad Error/Skip:", errorMsg); if(statusMessageElement) {statusMessageElement.textContent = `Ошибка: ${errorMsg || 'Реклама не показана'}. Подсказка не добавлена.`; statusMessageElement.className = 'incorrect-msg'; setTimeout(() => { if (statusMessageElement.textContent.startsWith("Ошибка:")) statusMessageElement.textContent = ""; }, 3000); } } }); } else { console.log("User declined ad."); } }

    // --- Обработчики Событий ---
    function addEventListeners() {
        console.log("Adding event listeners...");
        // 1. Стартовый Экран
        if (startNewGameButton) startNewGameButton.addEventListener('click', () => { console.log("New Game button clicked."); showScreen(newGameOptionsScreen); });
        if (continueGameButton) continueGameButton.addEventListener('click', () => { console.log("Continue Game button clicked."); const savedState = loadGameState(); if (savedState) { const difficultyToLoad = savedState.difficulty || 'medium'; initGame(difficultyToLoad, savedState); } else { console.warn("Continue clicked, but no saved game found."); if(statusMessageElement) { statusMessageElement.textContent = "Нет сохраненной игры."; statusMessageElement.className = 'incorrect-msg'; } if(continueGameButton) continueGameButton.disabled = true; } });

        // 2. Экран Настроек Новой Игры
        if (difficultyButtonsContainer) difficultyButtonsContainer.addEventListener('click', (event) => { const target = event.target.closest('button.difficulty-button'); if (target && target.dataset.difficulty) { const difficulty = target.dataset.difficulty; console.log(`Difficulty selected: ${difficulty}`); clearSavedGameState(); initGame(difficulty); } });
        if (themeToggleCheckbox) themeToggleCheckbox.addEventListener('change', handleThemeToggle);
        if (backToInitialButton) backToInitialButton.addEventListener('click', () => { console.log("Back button clicked."); showScreen(initialScreen); checkContinueButton(); });

        // 3. Игровой Экран
        if (boardElement) boardElement.addEventListener('click', (event) => { const target = event.target.closest('.cell'); if (!target || isShowingAd) return; const r = parseInt(target.dataset.row); const c = parseInt(target.dataset.col); if (isNaN(r) || isNaN(c)) return; if (target === selectedCell) { clearSelection(); } else { clearSelection(); selectedCell = target; selectedRow = r; selectedCol = c; if (!selectedCell.classList.contains('given')) selectedCell.classList.add('selected'); highlightRelatedCells(r, c); } clearErrors(); });
        if (numpad) numpad.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button || isShowingAd) return; if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; } if (!selectedCell || selectedCell.classList.contains('given')) { return; } clearErrors(); if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (button.id === 'erase-button') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } if (potentialChange && !isGameSolved()) { pushHistoryState(); } if (button.id === 'erase-button') { if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } } else if (button.dataset.num) { const num = parseInt(button.dataset.num); if (isNoteMode) { if (cellData.value === 0) { if (!(cellData.notes instanceof Set)) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } } else { if (cellData.value !== num) { cellData.value = num; if (cellData.notes) cellData.notes.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged && !isGameSolved()) saveGameState(); });
        if (checkButton) checkButton.addEventListener('click', () => { console.log("Check button clicked."); clearErrors(); if (!currentSolution || !userGrid) return; let allCorrect = true; let boardComplete = true; for (let r = 0; r < 9; r++) { if (!userGrid[r]) continue; for (let c = 0; c < 9; c++) { if (!userGrid[r][c]) continue; const cd = userGrid[r][c]; const uv = cd.value; const ce = boardElement?.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (!ce) continue; if (uv === 0) { boardComplete = false; } else if (!ce.classList.contains('given')) { const sv = getSolutionValue(r, c); if (uv !== sv) { ce.classList.add('incorrect'); allCorrect = false; } } } } if (allCorrect && boardComplete) { if(statusMessageElement){ statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct'; } stopTimer(); clearSelection(); updateHintButtonState(); } else if (!allCorrect) { if(statusMessageElement){statusMessageElement.textContent = "Найдены ошибки."; statusMessageElement.className = 'incorrect-msg';} } else { if(statusMessageElement){statusMessageElement.textContent = "Пока верно, но не закончено."; statusMessageElement.className = '';} } });
        if (undoButton) undoButton.addEventListener('click', handleUndo);
        if (hintButton) hintButton.addEventListener('click', () => { if (isShowingAd || isGameSolved()) return; if (hintsRemaining > 0) { provideHintInternal(); } else { offerRewardedAdForHints(); } });
        if (exitGameButton) exitGameButton.addEventListener('click', () => { console.log("Exit to menu button clicked."); stopTimer(); showScreen(initialScreen); checkContinueButton(); });

        // Глобальный обработчик клавиатуры
        document.addEventListener('keydown', (event) => { if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || isShowingAd || !gameContainer || !gameContainer.classList.contains('visible')) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo(); return; } if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; } if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { if (!selectedCell) { const startCell = boardElement?.querySelector(`.cell[data-row='0'][data-col='0']`); if (startCell) startCell.click(); else return; } let nextRow = selectedRow; let nextCol = selectedCol; const move = (current, delta, max) => Math.min(max, Math.max(0, current + delta)); if (event.key === 'ArrowUp') nextRow = move(selectedRow, -1, 8); if (event.key === 'ArrowDown') nextRow = move(selectedRow, 1, 8); if (event.key === 'ArrowLeft') nextCol = move(selectedCol, -1, 8); if (event.key === 'ArrowRight') nextCol = move(selectedCol, 1, 8); if (nextRow !== selectedRow || nextCol !== selectedCol) { const nextCellElement = boardElement?.querySelector(`.cell[data-row='${nextRow}'][data-col='${nextCol}']`); if (nextCellElement) nextCellElement.click(); } event.preventDefault(); return; } if (!selectedCell || selectedCell.classList.contains('given')) return; if (!userGrid[selectedRow]?.[selectedCol]) return; const cellData = userGrid[selectedRow][selectedCol]; let needsRender = false; let stateChanged = false; let potentialChange = false; if (event.key >= '1' && event.key <= '9') { const num = parseInt(event.key); if (isNoteMode) { potentialChange = (cellData.value === 0); } else { potentialChange = (cellData.value !== num); } } else if (event.key === 'Backspace' || event.key === 'Delete') { potentialChange = (cellData.value !== 0) || (cellData.notes?.size > 0); } if (potentialChange && !isGameSolved()) { pushHistoryState(); } if (event.key >= '1' && event.key <= '9') { clearErrors(); const num = parseInt(event.key); if (isNoteMode) { if (cellData.value === 0) { if (!(cellData.notes instanceof Set)) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; } } else { if (cellData.value !== num) { cellData.value = num; if (cellData.notes) cellData.notes.clear(); needsRender = true; stateChanged = true; } else { cellData.value = 0; needsRender = true; stateChanged = true; } } event.preventDefault(); } else if (event.key === 'Backspace' || event.key === 'Delete') { clearErrors(); if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; } else if (cellData.notes?.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; } event.preventDefault(); } if (needsRender) renderCell(selectedRow, selectedCol); if (stateChanged && !isGameSolved()) saveGameState(); });

        console.log("Event listeners added.");
    }


    // --- Инициализация Приложения ---
    function initializeApp() {
        console.log("Initializing application...");
        try { // Обертка всей инициализации
            loadThemePreference();
            checkContinueButton();
            addEventListeners(); // Добавляем слушатели СРАЗУ
            showScreen(initialScreen); // Показываем начальный экран ПОСЛЕ добавления слушателей
            initializeAds();
            // Инициализация TG SDK
            try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); console.log("TG SDK ready."); } else { console.log("TG SDK not found."); } } catch (e) { console.error("TG SDK Init Error:", e); }
            console.log("Application initialized successfully.");
        } catch (error) {
            console.error("CRITICAL ERROR during application initialization:", error);
            // Попытка вывести ошибку на экран, если стандартные элементы недоступны
            document.body.innerHTML = `<div style="padding: 20px; color: red; border: 2px solid red; background: white;">
                <h1>Критическая ошибка!</h1>
                <p>Не удалось запустить приложение.</p>
                <p>Детали ошибки (см. Консоль разработчика F12):</p>
                <pre>${error.message}\n${error.stack}</pre>
            </div>`;
        }
    }

    // Функция для проверки и установки состояния кнопки "Продолжить"
    function checkContinueButton() {
        if (!continueGameButton) return; // Проверка на null
        try {
            const savedState = loadGameState();
            continueGameButton.disabled = !savedState;
            console.log(`Continue button state updated. Enabled: ${!continueGameButton.disabled}`);
        } catch (e) {
            console.error("Error checking continue button state:", e);
            continueGameButton.disabled = true; // Отключаем на всякий случай
        }
    }

    // --- Запуск ---
    initializeApp();

}); // Конец 'DOMContentLoaded'
