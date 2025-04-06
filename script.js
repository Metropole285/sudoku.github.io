// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const hintButton = document.getElementById('hint-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    const noteToggleButton = document.getElementById('note-toggle-button');
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal ? difficultyModal.querySelector('.modal-buttons') : null;
    const timerElement = document.getElementById('timer');

    // --- Ключи для localStorage --- // <<< НОВОЕ
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
    let currentDifficulty = 'medium'; // <<< НОВОЕ: храним текущую сложность

    // --- Переменные для подсказок ---
    const MAX_HINTS = 3;
    let hintsRemaining = MAX_HINTS;

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium", restoreState = null) { // <<< Добавлен параметр restoreState
        console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`);
        currentDifficulty = difficulty; // <<< Сохраняем сложность
        stopTimer(); // Останавливаем предыдущий таймер, если был

        if (restoreState) { // <<< НОВОЕ: Логика восстановления состояния
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
        } else { // <<< НОВОЕ: Логика генерации новой игры
            console.log("Генерация новой игры...");
            try {
                if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                    throw new Error("Библиотека sudoku.js не загружена или неисправна.");
                }
                console.log("Библиотека sudoku найдена.");
                currentPuzzle = sudoku.generate(difficulty);
                if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`);
                console.log("Сгенерировано:", currentPuzzle);
                currentSolution = sudoku.solve(currentPuzzle);
                if (!currentSolution) {
                     // Попытка решить еще раз, иногда генератор может давать сбои
                     currentSolution = sudoku.solve(currentPuzzle);
                     if (!currentSolution) throw new Error("Не удалось найти решение для сгенерированной головоломки");
                }
                console.log("Решение:", currentSolution);

                userGrid = boardStringToObjectArray(currentPuzzle);
                secondsElapsed = 0;
                hintsRemaining = MAX_HINTS;
                isNoteMode = false;
                clearSavedGameState(); // Очищаем старое сохранение при старте новой игры
                console.log("Новая игра успешно сгенерирована.");
            } catch (error) {
                console.error("ОШИБКА генерации новой игры:", error);
                statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
                statusMessageElement.className = 'incorrect-msg';
                boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
                // Обнуляем состояние, чтобы предотвратить дальнейшие ошибки
                currentPuzzle = null; currentSolution = null; userGrid = []; hintsRemaining = 0;
                stopTimer();
                updateHintButtonState();
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
        updateTimerDisplay(); // Показать время (00:00 или сохраненное)
        startTimer(); // Запустить таймер

        if (!restoreState) saveGameState(); // <<< Сохраняем состояние сразу после генерации новой игры

        console.log("Игра инициализирована.");
    }

    // --- Функции сохранения/загрузки состояния --- // <<< НОВЫЙ БЛОК

    function saveGameState() {
        if (!currentPuzzle || !currentSolution || !userGrid) {
            // Не сохраняем, если игра не инициализирована полностью
            // console.log("Сохранение отменено: игра не готова.");
            return;
        }

        // Сериализуем userGrid (конвертируем Set в массив)
        const serializableGrid = userGrid.map(row =>
            row.map(cell => ({
                value: cell.value,
                notesArray: Array.from(cell.notes || []) // Конвертируем Set в массив
            }))
        );

        const gameState = {
            puzzle: currentPuzzle,
            solution: currentSolution,
            grid: serializableGrid,
            time: secondsElapsed,
            hints: hintsRemaining,
            difficulty: currentDifficulty,
            timestamp: Date.now() // Добавим время сохранения
        };

        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            // console.log("Игра сохранена."); // Можно раскомментировать для отладки
        } catch (error) {
            console.error("Ошибка сохранения игры в localStorage:", error);
            // Возможно, localStorage переполнен
            statusMessageElement.textContent = "Ошибка сохранения игры!";
            statusMessageElement.className = 'incorrect-msg';
        }
    }

    function loadGameState() {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (!savedData) {
            return null; // Нет сохраненной игры
        }
        try {
            const gameState = JSON.parse(savedData);
            // Простая проверка на наличие основных полей
            if (gameState && gameState.puzzle && gameState.solution && gameState.grid) {
                console.log("Найдено сохранение от:", new Date(gameState.timestamp).toLocaleString());
                return gameState;
            } else {
                console.warn("Найдены некорректные данные сохранения.");
                clearSavedGameState(); // Удаляем некорректные данные
                return null;
            }
        } catch (error) {
            console.error("Ошибка парсинга сохраненных данных:", error);
            clearSavedGameState(); // Удаляем некорректные данные
            return null;
        }
    }

    function clearSavedGameState() {
        localStorage.removeItem(SAVE_KEY);
        console.log("Сохраненное состояние игры удалено.");
    }

    // --- // <<< КОНЕЦ НОВОГО БЛОКА

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
            setTimeout(() => {
                if (!modalOverlay.classList.contains('visible')) modalOverlay.style.display = 'none';
                if (!difficultyModal.classList.contains('visible')) difficultyModal.style.display = 'none';
            }, 300);
            console.log("Модальное окно скрыто.");
         }
    }

    // --- Функции для таймера ---
    function startTimer() {
        if(timerInterval) return; // Не запускать, если уже запущен
        // Запускаем немедленно первый update, потом интервал
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
            // Периодически сохраняем время (например, каждые 10 сек), чтобы не терять прогресс таймера при сбое
            if (secondsElapsed % 10 === 0) {
                 saveGameState();
            }
        }, 1000);
         console.log("Таймер запущен.");
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("Таймер остановлен.");
             // Сохраняем игру при остановке таймера (например, при победе или открытии модалки)
             saveGameState();
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
                    console.error(`boardStringToObjectArray: Индекс ${index} вне диапазона строки длиной ${boardString.length}`);
                    grid[r][c] = { value: 0, notes: new Set() };
                    continue;
                }
                const char = boardString[index];
                const value = (char === '.' || char === '0') ? 0 : parseInt(char);
                grid[r][c] = {
                    value: value,
                    notes: new Set()
                };
            }
        }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() {
        boardElement.innerHTML = '';
        if (!userGrid || userGrid.length !== 9) {
             console.error("renderBoard: Некорректные данные userGrid");
             boardElement.innerHTML = '<p style="color: red; text-align: center;">Ошибка отрисовки доски.</p>';
             return;
        }
        for (let r = 0; r < 9; r++) {
             if (!userGrid[r] || userGrid[r].length !== 9) {
                 console.error(`renderBoard: Некорректные данные в строке ${r}`);
                 continue;
             }
            for (let c = 0; c < 9; c++) {
                // Добавим проверку на существование cellData перед созданием элемента
                if (userGrid[r][c] === undefined) {
                     console.error(`renderBoard: Отсутствуют данные для ячейки [${r}, ${c}]`);
                     // Можно создать пустой элемент или пропустить
                     const cellPlaceholder = document.createElement('div');
                     cellPlaceholder.classList.add('cell');
                     cellPlaceholder.textContent = '?';
                     boardElement.appendChild(cellPlaceholder);
                     continue;
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
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (!userGrid[r] || userGrid[r][c] === undefined) {
             console.error(`createCellElement: Нет данных для ячейки [${r}, ${c}]`);
             cell.textContent = '?';
             return cell;
        }
        const cellData = userGrid[r][c];

        const valueContainer = document.createElement('div');
        valueContainer.classList.add('cell-value-container');

        const notesContainer = document.createElement('div');
        notesContainer.classList.add('cell-notes-container');

        if (cellData.value !== 0) {
            valueContainer.textContent = cellData.value;
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none';
            const puzzleIndex = r * 9 + c;
            if (currentPuzzle && puzzleIndex < currentPuzzle.length) {
                 const puzzleChar = currentPuzzle[puzzleIndex];
                 if (puzzleChar !== '.' && puzzleChar !== '0') {
                     cell.classList.add('given');
                 }
            } else if (!currentPuzzle) {
                // console.warn("createCellElement: currentPuzzle не определен при проверке 'given'");
            }

        } else if (cellData.notes && cellData.notes.size > 0) {
            valueContainer.style.display = 'none';
            notesContainer.style.display = 'grid';
            notesContainer.innerHTML = '';
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div');
                noteDigit.classList.add('note-digit');
                noteDigit.textContent = cellData.notes.has(n) ? n : '';
                notesContainer.appendChild(noteDigit);
            }
        } else {
            valueContainer.textContent = '';
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none';
        }

        cell.appendChild(valueContainer);
        cell.appendChild(notesContainer);

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
            if (selectedRow === r && selectedCol === c) {
                 selectedCell = newCell;
            }
            oldCell.replaceWith(newCell);
        } else {
            console.warn(`renderCell: Ячейка [${r}, ${c}] не найдена для перерисовки.`);
        }
    }

    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) {
        if (!currentSolution) return null;
        const index = row * 9 + col;
         if (index >= currentSolution.length) {
             console.error(`getSolutionValue: Индекс ${index} вне диапазона решения.`);
             return null;
         }
        const char = currentSolution[index];
        return (char === '.' || char === '0') ? 0 : parseInt(char);
    }

    function clearSelection() {
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
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

    function updateNoteToggleButtonState() {
        if (noteToggleButton) {
            if (isNoteMode) {
                noteToggleButton.classList.add('active');
                noteToggleButton.title = "Режим заметок (ВКЛ)";
            } else {
                noteToggleButton.classList.remove('active');
                noteToggleButton.title = "Режим заметок (ВЫКЛ)";
            }
        } else {
            console.warn("Кнопка режима заметок не найдена.");
        }
    }

    function updateHintButtonState() {
        if (hintButton) {
            hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`;
            hintButton.disabled = hintsRemaining <= 0 || !currentSolution;
            hintButton.title = hintButton.disabled ? "Подсказки закончились" : "Использовать подсказку";
        } else {
            console.warn("Кнопка подсказки не найдена.");
        }
    }

    function highlightRelatedCells(row, col) {
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
        boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => {
            cell.classList.add('highlighted');
        });
    }

    function provideHint() {
        if (hintsRemaining <= 0) return;
        if (!currentSolution || !userGrid) return;
        if (!selectedCell) {
            statusMessageElement.textContent = "Выберите ячейку для подсказки";
            statusMessageElement.className = '';
            setTimeout(() => { if (statusMessageElement.textContent === "Выберите ячейку для подсказки") statusMessageElement.textContent = ""; }, 2000);
            return;
        }
        if (selectedCell.classList.contains('given')) {
            statusMessageElement.textContent = "Нельзя получить подсказку для начальной ячейки";
            statusMessageElement.className = '';
            setTimeout(() => { if (statusMessageElement.textContent === "Нельзя получить подсказку для начальной ячейки") statusMessageElement.textContent = ""; }, 2000);
            return;
        }

        const r = selectedRow;
        const c = selectedCol;
        if (!userGrid[r] || userGrid[r][c] === undefined) return;
        if (userGrid[r][c].value !== 0) {
            statusMessageElement.textContent = "Ячейка уже заполнена";
             statusMessageElement.className = '';
            setTimeout(() => { if (statusMessageElement.textContent === "Ячейка уже заполнена") statusMessageElement.textContent = ""; }, 2000);
            return;
        }

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
            } else {
                 clearSelection();
            }

            hintsRemaining--;
            updateHintButtonState();
            clearErrors();
            saveGameState(); // <<< Сохраняем после использования подсказки

        } else {
            console.error(`Не удалось получить значение решения для [${r}, ${c}]`);
            statusMessageElement.textContent = "Ошибка получения подсказки";
            statusMessageElement.className = 'incorrect-msg';
        }
    }


    // --- Обработчики событий ---

    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) return;
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);
        if (isNaN(r) || isNaN(c)) return;

        if (target === selectedCell) {
            clearSelection();
        } else {
            clearSelection();
            selectedCell = target;
            selectedRow = r;
            selectedCol = c;
            if (!selectedCell.classList.contains('given')) {
                selectedCell.classList.add('selected');
            }
            highlightRelatedCells(r, c);
        }
        clearErrors();
    });

    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'note-toggle-button') {
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            return;
        }

        if (!selectedCell || selectedCell.classList.contains('given')) {
             if(selectedCell && selectedCell.classList.contains('given')) {
                 statusMessageElement.textContent = "Эту ячейку нельзя изменить";
                 statusMessageElement.className = '';
                 setTimeout(() => { if(statusMessageElement.textContent === "Эту ячейку нельзя изменить") statusMessageElement.textContent = ""; }, 1500);
             }
            return;
        }

        clearErrors();
         if (!userGrid[selectedRow] || userGrid[selectedRow][selectedCol] === undefined) return;
        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;
        let stateChanged = false; // <<< Флаг для сохранения

        if (button.id === 'erase-button') {
            if (cellData.value !== 0) {
                cellData.value = 0;
                needsRender = true; stateChanged = true;
            } else if (cellData.notes && cellData.notes.size > 0) {
                cellData.notes.clear();
                needsRender = true; stateChanged = true;
            }
        } else if (button.dataset.num) {
            const num = parseInt(button.dataset.num);
            if (isNoteMode) {
                if (cellData.value === 0) {
                     if (!cellData.notes) cellData.notes = new Set();
                    if (cellData.notes.has(num)) {
                        cellData.notes.delete(num);
                    } else {
                        cellData.notes.add(num);
                    }
                    needsRender = true; stateChanged = true;
                } else {
                    statusMessageElement.textContent = "Сначала сотрите цифру";
                    statusMessageElement.className = '';
                    setTimeout(() => { if(statusMessageElement.textContent === "Сначала сотрите цифру") statusMessageElement.textContent = ""; }, 1500);
                }
            } else {
                if (cellData.value !== num) {
                    cellData.value = num;
                    if (cellData.notes && cellData.notes.size > 0) cellData.notes.clear();
                    needsRender = true; stateChanged = true;
                } else {
                    cellData.value = 0;
                    needsRender = true; stateChanged = true;
                }
            }
        }

        if (needsRender) {
            renderCell(selectedRow, selectedCol);
        }
        if (stateChanged) { // <<< Сохраняем только если что-то изменилось
            saveGameState();
        }
    });

    document.addEventListener('keydown', (event) => {
         if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') {
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            event.preventDefault();
            return;
        }

         if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            if (!selectedCell) {
                 const startCell = boardElement.querySelector(`.cell[data-row='0'][data-col='0']`);
                 if (startCell) startCell.click();
                 else return;
             }
            let nextRow = selectedRow; let nextCol = selectedCol;
             const move = (current, delta, max) => Math.min(max, Math.max(0, current + delta));
            if (event.key === 'ArrowUp') nextRow = move(selectedRow, -1, 8);
            if (event.key === 'ArrowDown') nextRow = move(selectedRow, 1, 8);
            if (event.key === 'ArrowLeft') nextCol = move(selectedCol, -1, 8);
            if (event.key === 'ArrowRight') nextCol = move(selectedCol, 1, 8);

            if (nextRow !== selectedRow || nextCol !== selectedCol) {
                 const nextCellElement = boardElement.querySelector(`.cell[data-row='${nextRow}'][data-col='${nextCol}']`);
                 if (nextCellElement) nextCellElement.click();
            }
            event.preventDefault();
            return;
        }

        if (!selectedCell || selectedCell.classList.contains('given')) return;
        if (!userGrid[selectedRow] || userGrid[selectedRow][selectedCol] === undefined) return;

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;
        let stateChanged = false; // <<< Флаг для сохранения

        if (event.key >= '1' && event.key <= '9') {
            clearErrors();
            const num = parseInt(event.key);
            if (isNoteMode) {
                if (cellData.value === 0) {
                    if (!cellData.notes) cellData.notes = new Set();
                    if (cellData.notes.has(num)) cellData.notes.delete(num);
                    else cellData.notes.add(num);
                    needsRender = true; stateChanged = true;
                }
            } else {
                if (cellData.value !== num) {
                    cellData.value = num;
                     if (cellData.notes && cellData.notes.size > 0) cellData.notes.clear();
                    needsRender = true; stateChanged = true;
                } else {
                    cellData.value = 0;
                    needsRender = true; stateChanged = true;
                }
            }
            event.preventDefault();
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            clearErrors();
            if (cellData.value !== 0) {
                cellData.value = 0;
                needsRender = true; stateChanged = true;
            } else if (cellData.notes && cellData.notes.size > 0) {
                cellData.notes.clear();
                needsRender = true; stateChanged = true;
            }
            event.preventDefault();
        }

        if (needsRender && selectedRow !== -1 && selectedCol !== -1) {
            renderCell(selectedRow, selectedCol);
        }
         if (stateChanged) { // <<< Сохраняем после изменений с клавиатуры
             saveGameState();
         }
    });

    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors();
        if (!currentSolution || !userGrid) return;

        let allCorrect = true;
        let boardComplete = true;

        for (let r = 0; r < 9; r++) {
             if (!userGrid[r]) continue;
            for (let c = 0; c < 9; c++) {
                 if (userGrid[r][c] === undefined) continue;
                const cellData = userGrid[r][c];
                const userValue = cellData.value;
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue;

                if (userValue === 0) {
                    boardComplete = false;
                } else if (!cellElement.classList.contains('given')) {
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
            stopTimer();
            clearSelection();
            hintButton.disabled = true;
            clearSavedGameState(); // <<< Очищаем сохранение при победе
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg';
        } else {
            statusMessageElement.textContent = "Пока все верно, но поле не заполнено.";
            statusMessageElement.className = '';
        }
    });

    newGameButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Новая игра'");
        stopTimer(); // Останавливаем таймер и сохраняем текущее состояние перед показом модалки
        showDifficultyModal();
    });

    if (hintButton) {
        hintButton.addEventListener('click', provideHint);
    } else { console.error("Кнопка подсказки не найдена!"); }

    if(modalButtonsContainer) {
        modalButtonsContainer.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if(!target) return;

            if (target.classList.contains('difficulty-button')) {
                const difficulty = target.dataset.difficulty;
                if (difficulty) {
                    console.log(`Выбрана сложность: ${difficulty} (Начало новой игры)`);
                    hideDifficultyModal();
                    // Явно очищаем сохранение перед началом НОВОЙ игры
                    clearSavedGameState(); // <<< Очищаем здесь
                    setTimeout(() => initGame(difficulty), 50); // Запускаем новую игру без восстановления
                }
            } else if (target.id === 'cancel-difficulty-button') {
                console.log("Выбор сложности отменен.");
                hideDifficultyModal();
                // Возобновляем таймер, если игра не была решена
                if (currentPuzzle && timerInterval === null && secondsElapsed > 0) {
                    let isSolved = !boardElement.querySelector('.cell:not(.given):empty'); // Проверяем, есть ли пустые ячейки (упрощенно)
                     if (!isSolved) {
                         // Проверяем, были ли ошибки при последней проверке
                         const hasErrors = boardElement.querySelector('.cell.incorrect');
                         if(!hasErrors) startTimer(); // Запускаем таймер только если нет ошибок и игра не решена
                     }
                }
            }
        });
    } else { console.error("Контейнер кнопок модального окна не найден."); }

    if(modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            console.log("Клик по оверлею, закрытие модального окна.");
            hideDifficultyModal();
             // Логика восстановления таймера (аналогично кнопке Отмена)
            if (currentPuzzle && timerInterval === null && secondsElapsed > 0) {
                 let isSolved = !boardElement.querySelector('.cell:not(.given):empty');
                  if (!isSolved) {
                         const hasErrors = boardElement.querySelector('.cell.incorrect');
                         if(!hasErrors) startTimer();
                  }
            }
        });
    } else { console.error("Оверлей модального окна не найден."); }

     try {
         if (window.Telegram && window.Telegram.WebApp) {
             window.Telegram.WebApp.ready();
             console.log("Telegram WebApp SDK инициализирован.");
         } else {
             console.log("Telegram WebApp SDK не найден.");
         }
     } catch (e) { console.error("Ошибка инициализации Telegram WebApp SDK:", e); }

    // --- Первый запуск игры --- // <<< ИЗМЕНЕНА ЛОГИКА ЗАПУСКА
    const savedGame = loadGameState();
    if (savedGame) {
        // Используем confirm для простоты, можно заменить на кастомное модальное окно
        if (confirm("Найдена сохраненная игра. Продолжить?")) {
            initGame(savedGame.difficulty, savedGame); // Запускаем с восстановлением
        } else {
            clearSavedGameState(); // Пользователь отказался, удаляем сохранение
            initGame(); // Запускаем новую игру по умолчанию
        }
    } else {
        initGame(); // Нет сохранения, запускаем новую игру по умолчанию
    }

}); // Конец 'DOMContentLoaded'
