// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const hintButton = document.getElementById('hint-button');
    const undoButton = document.getElementById('undo-button'); // <<< КНОПКА ОТМЕНЫ
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

    // --- Стек истории для Undo --- // <<< НОВОЕ
    let historyStack = [];

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium", restoreState = null) {
        console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`);
        currentDifficulty = difficulty;
        stopTimer(); // Остановка обязательна перед любыми изменениями
        historyStack = []; // <<< Очищаем историю при любой инициализации
        updateUndoButtonState(); // <<< Обновляем состояние кнопки Отмена

        if (restoreState) {
            console.log("Восстановление игры из сохранения...");
            try {
                currentPuzzle = restoreState.puzzle;
                currentSolution = restoreState.solution;
                // Десериализуем userGrid (конвертируем массивы заметок обратно в Set)
                userGrid = restoreState.grid.map(row =>
                    row.map(cell => ({
                        value: cell.value,
                        notes: new Set(cell.notesArray || []) // Восстанавливаем Set
                    }))
                );
                secondsElapsed = restoreState.time;
                hintsRemaining = restoreState.hints;
                isNoteMode = false; // Режим заметок не сохраняем, сбрасываем

                if (!currentPuzzle || !currentSolution || !userGrid) {
                    throw new Error("Неполные данные в сохранении.");
                }
                console.log("Игра успешно восстановлена.");
            } catch (error) {
                console.error("Ошибка восстановления игры:", error);
                statusMessageElement.textContent = "Ошибка загрузки сохранения. Начинаем новую игру.";
                statusMessageElement.className = 'incorrect-msg';
                clearSavedGameState(); // Очищаем некорректное сохранение
                // Переходим к генерации новой игры
                return initGame(difficulty); // Рекурсивный вызов без restoreState
            }
        } else { // <<< Логика генерации новой игры
            console.log("Генерация новой игры...");
            try {
                if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                    throw new Error("Библиотека sudoku.js не загружена или неисправна.");
                }
                currentPuzzle = sudoku.generate(difficulty);
                if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`);
                currentSolution = sudoku.solve(currentPuzzle);
                if (!currentSolution) {
                     // Попытка решить еще раз, иногда генератор может давать сбои
                     currentSolution = sudoku.solve(currentPuzzle);
                     if (!currentSolution) throw new Error("Не удалось найти решение для сгенерированной головоломки");
                }
                userGrid = boardStringToObjectArray(currentPuzzle);
                secondsElapsed = 0;
                hintsRemaining = MAX_HINTS;
                isNoteMode = false;
                clearSavedGameState(); // Очищаем старое сохранение при старте НОВОЙ игры
                console.log("Новая игра успешно сгенерирована.");
            } catch (error) {
                console.error("ОШИБКА генерации новой игры:", error);
                statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
                statusMessageElement.className = 'incorrect-msg';
                boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
                // Обнуляем состояние, чтобы предотвратить дальнейшие ошибки
                currentPuzzle = null; currentSolution = null; userGrid = []; hintsRemaining = 0;
                stopTimer(); updateHintButtonState(); updateUndoButtonState(); // Обновляем кнопки
                return; // Прерываем инициализацию
            }
        }

        // Общая логика после восстановления или генерации
        renderBoard();
        clearSelection();
        if (!restoreState) { // Сбрасываем сообщение только если это не восстановление
            statusMessageElement.textContent = '';
            statusMessageElement.className = '';
        }
        updateNoteToggleButtonState();
        updateHintButtonState();
        updateUndoButtonState(); // Обновляем кнопку Отмена (скорее всего будет disabled)
        updateTimerDisplay(); // Показать время (00:00 или сохраненное)
        startTimer(); // Запустить таймер

        // Не сохраняем сразу, т.к. еще не было ходов (и history пусто)

        console.log("Игра инициализирована.");
    }

    // --- Функции сохранения/загрузки состояния ---
    function saveGameState() {
        if (!currentPuzzle || !currentSolution || !userGrid || userGrid.length === 0) {
             // console.warn("Попытка сохранить неинициализированную игру.");
             return;
        }

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
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            // console.log("Игра сохранена.");
        } catch (error) {
            console.error("Ошибка сохранения игры в localStorage:", error);
            statusMessageElement.textContent = "Ошибка сохранения игры!";
            statusMessageElement.className = 'incorrect-msg';
        }
    }

    function loadGameState() {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (!savedData) return null;
        try {
            const gameState = JSON.parse(savedData);
            if (gameState && gameState.puzzle && gameState.solution && gameState.grid) {
                console.log("Найдено сохранение от:", new Date(gameState.timestamp).toLocaleString());
                return gameState;
            } else {
                console.warn("Найдены некорректные данные сохранения.");
                clearSavedGameState(); return null;
            }
        } catch (error) {
            console.error("Ошибка парсинга сохраненных данных:", error);
            clearSavedGameState(); return null;
        }
    }

    function clearSavedGameState() {
        localStorage.removeItem(SAVE_KEY);
        console.log("Сохраненное состояние игры удалено.");
    }

    // --- Функции для Undo --- // <<< НОВЫЙ БЛОК

    // Создает глубокую копию текущего состояния для истории
    function createHistoryState() {
         if (!userGrid || userGrid.length === 0) return null; // Не создавать, если сетка пуста
         // Глубокое копирование сетки, включая Set заметок
         const gridCopy = userGrid.map(row =>
            row.map(cell => ({
                value: cell.value,
                notes: new Set(cell.notes || []) // Копируем Set
            }))
        );
        return {
            grid: gridCopy, // Сохраняем копию сетки
            hints: hintsRemaining // Сохраняем количество подсказок
        };
    }

    // Добавляет текущее состояние в стек истории
    function pushHistoryState() {
        const stateToPush = createHistoryState();
        if (stateToPush) { // Только если состояние было успешно создано
            historyStack.push(stateToPush);
            updateUndoButtonState(); // Обновляем кнопку
            // console.log("Состояние добавлено в историю, размер:", historyStack.length);
        } else {
             console.warn("Попытка добавить невалидное состояние в историю.");
        }
    }

    // Обработчик нажатия кнопки "Отмена"
    function handleUndo() {
        if (historyStack.length === 0) {
            console.log("История пуста, отмена невозможна.");
            return; // Нечего отменять
        }

        stopTimer(); // Останавливаем таймер на время отмены

        const previousState = historyStack.pop(); // Извлекаем последнее состояние
        console.log("Отмена хода. Восстановление состояния...");

        // Восстанавливаем состояние
        try {
            // Важно: previousState.grid уже содержит глубокую копию с Set'ами
            userGrid = previousState.grid;
            hintsRemaining = previousState.hints;

            // Обновляем интерфейс
            renderBoard(); // Перерисовываем всю доску
            clearSelection(); // Сбрасываем выделение
            clearErrors(); // Сбрасываем ошибки
            updateHintButtonState(); // Обновляем счетчик подсказок
            updateUndoButtonState(); // Обновляем доступность кнопки Отмена
            saveGameState(); // Сохраняем восстановленное состояние в localStorage

            console.log("Состояние успешно восстановлено.");
        } catch(error) {
             console.error("Ошибка при восстановлении состояния из истории:", error);
             statusMessageElement.textContent = "Ошибка отмены хода!";
             statusMessageElement.className = 'incorrect-msg';
             historyStack = []; // Очищаем историю в случае серьезной ошибки
             updateUndoButtonState();
        } finally {
             // Перезапускаем таймер, если игра не решена
             // Проверяем, есть ли пустые НЕ начальные ячейки
            let isSolved = true;
            if (userGrid && userGrid.length === 9) {
                 for (let r=0; r<9; ++r) {
                     for (let c=0; c<9; ++c) {
                         const index = r * 9 + c;
                         const isGiven = currentPuzzle && (currentPuzzle[index] !== '.' && currentPuzzle[index] !== '0');
                         if (!isGiven && userGrid[r][c].value === 0) {
                             isSolved = false; break;
                         }
                     }
                     if (!isSolved) break;
                 }
            } else { isSolved = false; } // Если сетки нет, не решена

             if (!isSolved) {
                 startTimer();
             } else {
                  // Если после отмены игра оказалась решенной, обновляем статус
                  checkButton.click(); // Проще всего симулировать клик по кнопке проверки
             }
        }
    }

    // Обновляет состояние кнопки "Отмена" (включена/выключена)
    function updateUndoButtonState() {
        if (undoButton) {
            undoButton.disabled = historyStack.length === 0;
        } else {
             console.error("Кнопка Отмена не найдена!");
        }
    }

    // --- // <<< КОНЕЦ БЛОКА UNDO

    // --- Функции для таймера ---
    function startTimer() {
        if(timerInterval) return;
        updateTimerDisplay(); // Обновить сразу
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
            if (secondsElapsed % 10 === 0) { saveGameState(); } // Сохраняем периодически
        }, 1000);
         console.log("Таймер запущен.");
    }
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("Таймер остановлен.");
             saveGameState(); // Сохраняем при остановке
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
        for (let r = 0; r < 9; r++) {
            grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const index = r * 9 + c;
                if (index >= boardString.length) {
                    console.error(`boardStringToObjectArray: Индекс ${index} вне диапазона.`);
                    grid[r][c] = { value: 0, notes: new Set() }; continue;
                }
                const char = boardString[index];
                const value = (char === '.' || char === '0') ? 0 : parseInt(char);
                grid[r][c] = { value: value, notes: new Set() };
            }
        }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() {
        boardElement.innerHTML = '';
        if (!userGrid || userGrid.length !== 9) {
             console.error("renderBoard: Некорректные данные userGrid");
             boardElement.innerHTML = '<p style="color: red; text-align: center;">Ошибка отрисовки доски.</p>'; return;
        }
        for (let r = 0; r < 9; r++) {
             if (!userGrid[r] || userGrid[r].length !== 9) {
                 console.error(`renderBoard: Некорректные данные в строке ${r}`); continue;
             }
            for (let c = 0; c < 9; c++) {
                if (userGrid[r][c] === undefined) {
                     console.error(`renderBoard: Отсутствуют данные для ячейки [${r}, ${c}]`);
                     const cellPlaceholder = document.createElement('div'); cellPlaceholder.classList.add('cell'); cellPlaceholder.textContent = '?';
                     boardElement.appendChild(cellPlaceholder); continue;
                }
                const cellElement = createCellElement(r, c);
                boardElement.appendChild(cellElement);
            }
        }
        console.log("Доска перерисована (renderBoard).");
    }

    // --- Создание DOM-элемента для ОДНОЙ ячейки ---
    function createCellElement(r, c) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = r; cell.dataset.col = c;

        if (!userGrid[r] || userGrid[r][c] === undefined) {
             console.error(`createCellElement: Нет данных для ячейки [${r}, ${c}]`);
             cell.textContent = '?'; return cell;
        }
        const cellData = userGrid[r][c];
        const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container');
        const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container');

        if (cellData.value !== 0) {
            valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none';
            const puzzleIndex = r * 9 + c;
            if (currentPuzzle && puzzleIndex < currentPuzzle.length) {
                 const puzzleChar = currentPuzzle[puzzleIndex];
                 if (puzzleChar !== '.' && puzzleChar !== '0') cell.classList.add('given');
            } else if (!currentPuzzle) { /* console.warn("currentPuzzle не определен"); */ }
        } else if (cellData.notes && cellData.notes.size > 0) {
            valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = '';
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div'); noteDigit.classList.add('note-digit');
                noteDigit.textContent = cellData.notes.has(n) ? n : '';
                notesContainer.appendChild(noteDigit);
            }
        } else {
            valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none';
        }
        cell.appendChild(valueContainer); cell.appendChild(notesContainer);
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
            if (selectedRow === r && selectedCol === c) selectedCell = newCell;
            oldCell.replaceWith(newCell);
        } else { console.warn(`renderCell: Ячейка [${r}, ${c}] не найдена.`); }
    }

    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) {
        if (!currentSolution) return null;
        const index = row * 9 + col;
         if (index >= currentSolution.length) { console.error(`getSolutionValue: Индекс ${index} вне диапазона.`); return null; }
        const char = currentSolution[index];
        return (char === '.' || char === '0') ? 0 : parseInt(char);
    }
    function clearSelection() {
        if (selectedCell) selectedCell.classList.remove('selected');
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted'));
        selectedCell = null; selectedRow = -1; selectedCol = -1;
    }
    function clearErrors() {
        boardElement.querySelectorAll('.cell.incorrect').forEach(cell => cell.classList.remove('incorrect'));
        statusMessageElement.textContent = ''; statusMessageElement.className = '';
    }
    function updateNoteToggleButtonState() {
        if (noteToggleButton) {
            noteToggleButton.classList.toggle('active', isNoteMode);
            noteToggleButton.title = `Режим заметок (${isNoteMode ? 'ВКЛ' : 'ВЫКЛ'})`;
        } else { console.warn("Кнопка режима заметок не найдена."); }
    }
    function updateHintButtonState() {
        if (hintButton) {
            hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`;
            hintButton.disabled = hintsRemaining <= 0 || !currentSolution;
            hintButton.title = hintButton.disabled ? "Подсказки закончились" : "Использовать подсказку";
        } else { console.warn("Кнопка подсказки не найдена."); }
    }
    function highlightRelatedCells(row, col) {
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => cell.classList.remove('highlighted'));
        boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => cell.classList.add('highlighted'));
    }

    function provideHint() {
        // --- Сохраняем состояние ПЕРЕД изменением ---
        pushHistoryState(); // Сохраняем до всех проверок, чтобы можно было отменить "пустое" действие подсказки
        // ---
        let hintUsed = false; // Флаг, что подсказка действительно сработала
        try {
            if (hintsRemaining <= 0) throw new Error("Подсказки закончились");
            if (!currentSolution || !userGrid) throw new Error("Игра не готова");
            if (!selectedCell) throw new Error("Выберите ячейку для подсказки");
            if (selectedCell.classList.contains('given')) throw new Error("Нельзя получить подсказку для начальной ячейки");

            const r = selectedRow; const c = selectedCol;
            if (!userGrid[r] || userGrid[r][c] === undefined) throw new Error(`Внутренняя ошибка: нет данных для ячейки [${r},${c}]`);
            if (userGrid[r][c].value !== 0) throw new Error("Ячейка уже заполнена");

            const solutionValue = getSolutionValue(r, c);
            if (solutionValue !== null && solutionValue !== 0) {
                console.log(`Подсказка для [${r}, ${c}]: ${solutionValue}`);
                userGrid[r][c].value = solutionValue;
                if (userGrid[r][c].notes) userGrid[r][c].notes.clear();
                renderCell(r, c);
                const hintedCellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (hintedCellElement) {
                    hintedCellElement.classList.remove('selected');
                    hintedCellElement.style.transition = 'background-color 0.1s ease-out';
                    hintedCellElement.style.backgroundColor = '#fffacd';
                    setTimeout(() => {
                        hintedCellElement.style.backgroundColor = '';
                        hintedCellElement.style.transition = '';
                        clearSelection();
                    }, 500);
                } else { clearSelection(); }
                hintsRemaining--;
                hintUsed = true; // Подсказка сработала
                updateHintButtonState();
                clearErrors();
                saveGameState(); // Сохраняем после использования подсказки
            } else {
                 throw new Error(`Ошибка получения решения для [${r}, ${c}]`);
            }
        } catch (error) {
             console.log("Ошибка подсказки:", error.message);
             statusMessageElement.textContent = error.message;
             statusMessageElement.className = error.message.includes("Ошибка") ? 'incorrect-msg' : ''; // Сообщение об ошибке или информационное
             setTimeout(() => { if (statusMessageElement.textContent === error.message) statusMessageElement.textContent = ""; }, 2000);

             // Если подсказка не сработала, удаляем добавленное состояние из истории
             if (!hintUsed) {
                  historyStack.pop(); // Удаляем ошибочно добавленное состояние
                  updateUndoButtonState(); // Обновляем кнопку, т.к. состояние могло стать пустым
             }
        }
    }

    // --- Обработчики событий ---

    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) return;
        const r = parseInt(target.dataset.row); const c = parseInt(target.dataset.col);
        if (isNaN(r) || isNaN(c)) return;
        if (target === selectedCell) { clearSelection(); }
        else {
            clearSelection(); selectedCell = target; selectedRow = r; selectedCol = c;
            if (!selectedCell.classList.contains('given')) selectedCell.classList.add('selected');
            highlightRelatedCells(r, c);
        }
        clearErrors();
    });

    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.id === 'note-toggle-button') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); return; }
        if (!selectedCell || selectedCell.classList.contains('given')) {
             if(selectedCell?.classList.contains('given')) { // Optional chaining
                 statusMessageElement.textContent = "Эту ячейку нельзя изменить"; statusMessageElement.className = '';
                 setTimeout(() => { if(statusMessageElement.textContent === "Эту ячейку нельзя изменить") statusMessageElement.textContent = ""; }, 1500);
             }
            return;
        }
        clearErrors();
        if (!userGrid[selectedRow]?.[selectedCol]) return; // Проверка существования
        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;
        let stateChanged = false;

        // --- Проверка, будет ли действие изменять состояние ---
        let potentialChange = false;
        if (button.id === 'erase-button') {
            potentialChange = (cellData.value !== 0) || (cellData.notes && cellData.notes.size > 0);
        } else if (button.dataset.num) {
             const num = parseInt(button.dataset.num);
             if (isNoteMode) { potentialChange = (cellData.value === 0); } // Заметки можно менять только в пустой
             else { potentialChange = (cellData.value !== num); } // Значение изменится или сотрется
        }

        // --- Сохраняем предыдущее состояние, ТОЛЬКО если будет изменение ---
        if (potentialChange) {
             pushHistoryState();
        }

        // --- Выполняем действие ---
        if (button.id === 'erase-button') {
            if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; }
            else if (cellData.notes && cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; }
        } else if (button.dataset.num) {
            const num = parseInt(button.dataset.num);
            if (isNoteMode) {
                 if (cellData.value === 0) {
                     if (!cellData.notes) cellData.notes = new Set();
                     if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num);
                     needsRender = true; stateChanged = true;
                 } else { /* Сообщение: Сначала сотрите цифру */ }
            } else {
                 if (cellData.value !== num) {
                     cellData.value = num;
                     if (cellData.notes && cellData.notes.size > 0) cellData.notes.clear();
                     needsRender = true; stateChanged = true;
                 } else { // Стирание повторным кликом
                     cellData.value = 0;
                     needsRender = true; stateChanged = true;
                 }
            }
        }

        if (needsRender) renderCell(selectedRow, selectedCol);
        if (stateChanged) saveGameState(); // Сохраняем итоговое состояние, если изменилось
    });

    document.addEventListener('keydown', (event) => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo(); return; }
        if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { isNoteMode = !isNoteMode; updateNoteToggleButtonState(); event.preventDefault(); return; }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
             if (!selectedCell) { const startCell = boardElement.querySelector(`.cell[data-row='0'][data-col='0']`); if (startCell) startCell.click(); else return; }
             let nextRow = selectedRow; let nextCol = selectedCol;
             const move = (current, delta, max) => Math.min(max, Math.max(0, current + delta));
             if (event.key === 'ArrowUp') nextRow = move(selectedRow, -1, 8); if (event.key === 'ArrowDown') nextRow = move(selectedRow, 1, 8);
             if (event.key === 'ArrowLeft') nextCol = move(selectedCol, -1, 8); if (event.key === 'ArrowRight') nextCol = move(selectedCol, 1, 8);
             if (nextRow !== selectedRow || nextCol !== selectedCol) { const nextCellElement = boardElement.querySelector(`.cell[data-row='${nextRow}'][data-col='${nextCol}']`); if (nextCellElement) nextCellElement.click(); }
             event.preventDefault(); return;
        }
        if (!selectedCell || selectedCell.classList.contains('given')) return;
        if (!userGrid[selectedRow]?.[selectedCol]) return;

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;
        let stateChanged = false;
        let potentialChange = false;

        // --- Проверяем потенциальное изменение ПЕРЕД сохранением истории ---
        if (event.key >= '1' && event.key <= '9') {
            const num = parseInt(event.key);
            if (isNoteMode) { potentialChange = (cellData.value === 0); }
            else { potentialChange = (cellData.value !== num); }
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            potentialChange = (cellData.value !== 0) || (cellData.notes && cellData.notes.size > 0);
        }

        // --- Сохраняем историю, если изменение будет ---
        if (potentialChange) {
            pushHistoryState();
        }

        // --- Применяем изменения ---
        if (event.key >= '1' && event.key <= '9') {
             clearErrors(); const num = parseInt(event.key);
             if (isNoteMode) {
                 if (cellData.value === 0) { if (!cellData.notes) cellData.notes = new Set(); if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num); needsRender = true; stateChanged = true; }
             } else {
                 if (cellData.value !== num) { cellData.value = num; if (cellData.notes?.size > 0) cellData.notes.clear(); needsRender = true; stateChanged = true; }
                 else { cellData.value = 0; needsRender = true; stateChanged = true; } // Стирание повторным нажатием
             }
             event.preventDefault();
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
             clearErrors();
             if (cellData.value !== 0) { cellData.value = 0; needsRender = true; stateChanged = true; }
             else if (cellData.notes && cellData.notes.size > 0) { cellData.notes.clear(); needsRender = true; stateChanged = true; }
             event.preventDefault();
        }

        if (needsRender) renderCell(selectedRow, selectedCol);
        if (stateChanged) saveGameState(); // Сохраняем итоговое состояние
    });

    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors(); if (!currentSolution || !userGrid) return;
        let allCorrect = true; let boardComplete = true;
        for (let r = 0; r < 9; r++) { if (!userGrid[r]) continue; for (let c = 0; c < 9; c++) { if (userGrid[r][c] === undefined) continue; const cellData = userGrid[r][c]; const userValue = cellData.value; const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (!cellElement) continue; if (userValue === 0) { boardComplete = false; } else if (!cellElement.classList.contains('given')) { const solutionValue = getSolutionValue(r, c); if (userValue !== solutionValue) { cellElement.classList.add('incorrect'); allCorrect = false; } } } }
        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct';
            stopTimer(); clearSelection(); hintButton.disabled = true;
            clearSavedGameState(); historyStack = []; updateUndoButtonState(); // Очищаем всё при победе
        } else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены."; statusMessageElement.className = 'incorrect-msg'; }
        else { statusMessageElement.textContent = "Пока все верно, но поле не заполнено."; statusMessageElement.className = ''; }
    });

    newGameButton.addEventListener('click', () => { console.log("Нажата кнопка 'Новая игра'"); stopTimer(); showDifficultyModal(); });

    if (undoButton) { undoButton.addEventListener('click', handleUndo); } else { console.error("Кнопка Отмена не найдена!"); }
    if (hintButton) { hintButton.addEventListener('click', provideHint); } else { console.error("Кнопка Подсказка не найдена!"); }

    if(modalButtonsContainer) {
        modalButtonsContainer.addEventListener('click', (event) => {
             const target = event.target.closest('button'); if(!target) return;
             if (target.classList.contains('difficulty-button')) {
                 const difficulty = target.dataset.difficulty;
                 if (difficulty) {
                     console.log(`Выбрана сложность: ${difficulty} (Начало новой игры)`);
                     hideDifficultyModal(); clearSavedGameState(); historyStack = []; updateUndoButtonState();
                     setTimeout(() => initGame(difficulty), 50);
                 }
             } else if (target.id === 'cancel-difficulty-button') {
                 console.log("Выбор сложности отменен."); hideDifficultyModal();
                 if (currentPuzzle && timerInterval === null && secondsElapsed > 0) {
                      let isSolved = true; /* ... проверка на решение ... */ if (!isSolved) startTimer();
                 }
             }
        });
    } else { console.error("Контейнер кнопок модального окна не найден."); }

    if(modalOverlay) {
         modalOverlay.addEventListener('click', () => {
             console.log("Клик по оверлею, закрытие модального окна."); hideDifficultyModal();
             if (currentPuzzle && timerInterval === null && secondsElapsed > 0) {
                 let isSolved = true; /* ... проверка на решение ... */ if (!isSolved) startTimer();
             }
         });
     } else { console.error("Оверлей модального окна не найден."); }

    try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); console.log("TG SDK init."); } else { console.log("TG SDK not found."); } } catch (e) { console.error("TG SDK Error:", e); }

    // --- Первый запуск игры ---
    const savedGame = loadGameState();
    if (savedGame) {
        if (confirm(`Найдена сохраненная игра (${savedGame.difficulty || 'сложность не указ.'}) от ${new Date(savedGame.timestamp).toLocaleString()}. Продолжить?`)) {
            initGame(savedGame.difficulty, savedGame);
        } else { clearSavedGameState(); initGame(); }
    } else { initGame(); }

}); // Конец 'DOMContentLoaded'
