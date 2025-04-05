// Убедитесь, что файл sudoku.js подключен в index.html ПЕРЕД этим скриптом.
// <script src="sudoku.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    const noteToggleButton = document.getElementById('note-toggle-button');

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = []; // Массив 9x9 объектов { value: number, notes: Set<number> }
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;

    // --- Инициализация новой игры ---
    function initGame() {
        console.log("Запуск initGame...");
        try {
            if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                throw new Error("Библиотека sudoku.js не загружена или неисправна.");
            }
            console.log("Библиотека sudoku найдена.");
            currentPuzzle = sudoku.generate("medium");
            if (!currentPuzzle) throw new Error("Генерация не удалась");
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

    // --- Преобразование строки в массив объектов ---
    function boardStringToObjectArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) {
            grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const char = boardString[r * 9 + c];
                const value = (char === '.' || char === '0') ? 0 : parseInt(char);
                grid[r][c] = { value: value, notes: new Set() };
            }
        }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() {
        boardElement.innerHTML = '';
        if (!userGrid || userGrid.length !== 9) return;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellElement = createCellElement(r, c);
                boardElement.appendChild(cellElement);
            }
        }
        console.log("Доска перерисована.");
    }

    // --- Создание DOM-элемента для ОДНОЙ ячейки ---
    function createCellElement(r, c) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = r;
        cell.dataset.col = c;
        const cellData = userGrid[r][c];
        const valueContainer = document.createElement('div');
        valueContainer.classList.add('cell-value-container');
        const notesContainer = document.createElement('div');
        notesContainer.classList.add('cell-notes-container');

        if (cellData.value !== 0) { // Приоритет у основного значения
            valueContainer.textContent = cellData.value;
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none'; // Скрываем заметки
            const puzzleChar = currentPuzzle[r * 9 + c];
            if (puzzleChar !== '.' && puzzleChar !== '0') {
                cell.classList.add('given');
            }
        } else if (cellData.notes.size > 0) { // Если нет значения, но есть заметки
            valueContainer.style.display = 'none'; // Скрываем значение
            notesContainer.style.display = 'grid'; // Показываем заметки
            notesContainer.innerHTML = '';
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div');
                noteDigit.classList.add('note-digit');
                noteDigit.textContent = cellData.notes.has(n) ? n : '';
                notesContainer.appendChild(noteDigit);
            }
        } else { // Пустая ячейка
            valueContainer.textContent = '';
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none';
        }

        cell.appendChild(valueContainer);
        cell.appendChild(notesContainer);

        // Толстые границы
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
            if (selectedRow === r && selectedCol === c) {
                selectedCell = newCell;
            }
            oldCell.replaceWith(newCell);
        } else {
            console.warn(`renderCell: Не найдена ячейка [${r}, ${c}]`);
        }
    }

    // --- Вспомогательные функции ---
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

    function updateNoteToggleButtonState() {
        if (isNoteMode) {
            noteToggleButton.classList.add('active');
            noteToggleButton.title = "Режим заметок (ВКЛ)";
        } else {
            noteToggleButton.classList.remove('active');
            noteToggleButton.title = "Режим заметок (ВЫКЛ)";
        }
    }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки) - без изменений
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) { clearSelection(); return; }
        if (!target.classList.contains('given')) {
            clearSelection();
            selectedCell = target;
            selectedRow = parseInt(target.dataset.row);
            selectedCol = parseInt(target.dataset.col);
            selectedCell.classList.add('selected');
            clearErrors();
        } else {
            clearSelection();
        }
    });

    // Клик по цифровой панели
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        // Переключение режима заметок
        if (button.id === 'note-toggle-button') {
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            console.log("Режим заметок:", isNoteMode ? "ВКЛ" : "ВЫКЛ");
            return;
        }

        if (!selectedCell) return; // Дальнейшие действия только если ячейка выбрана
        clearErrors();
        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false; // Флаг для перерисовки ячейки

        if (button.id === 'erase-button') {
            // --- Логика стирания ---
            if (cellData.value !== 0) {
                // Если есть основное значение, стираем ТОЛЬКО его
                cellData.value = 0;
                console.log(`Стёрто основное значение в [${selectedRow}, ${selectedCol}]`);
                needsRender = true;
            } else if (cellData.notes.size > 0) {
                // Если нет основного значения, но есть заметки, стираем ТОЛЬКО заметки
                cellData.notes.clear();
                console.log(`Стёрты заметки в [${selectedRow}, ${selectedCol}]`);
                needsRender = true;
            }
        } else if (button.dataset.num) {
            // --- Логика ввода цифры ---
            const num = parseInt(button.dataset.num);
            if (isNoteMode) {
                // Режим заметок: добавляем/удаляем заметку, если нет основного значения
                if (cellData.value === 0) {
                    if (cellData.notes.has(num)) {
                        cellData.notes.delete(num);
                        console.log(`Удалена заметка ${num} в [${selectedRow}, ${selectedCol}]`);
                    } else {
                        cellData.notes.add(num);
                        console.log(`Добавлена заметка ${num} в [${selectedRow}, ${selectedCol}]`);
                    }
                    needsRender = true;
                } else {
                    console.log("Нельзя добавить заметку, если есть основное значение.");
                }
            } else {
                // Обычный режим: устанавливаем/убираем основное значение
                // НЕ стираем заметки здесь!
                if (cellData.value !== num) {
                    cellData.value = num;
                    console.log(`Введено значение ${num} в [${selectedRow}, ${selectedCol}]`);
                    needsRender = true;
                } else { // Повторный клик на ту же цифру - убираем ее
                    cellData.value = 0;
                    console.log(`Удалено значение ${num} в [${selectedRow}, ${selectedCol}]`);
                    needsRender = true;
                }
            }
        }

        // Перерисовываем ячейку, только если были изменения
        if (needsRender) {
            renderCell(selectedRow, selectedCol);
        }
    });

     // Обработка нажатий клавиш
    document.addEventListener('keydown', (event) => {
        if (!selectedCell) return;

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;

        // Цифры 1-9
        if (event.key >= '1' && event.key <= '9') {
            clearErrors();
            const num = parseInt(event.key);
            if (isNoteMode) {
                if (cellData.value === 0) {
                    if (cellData.notes.has(num)) cellData.notes.delete(num);
                    else cellData.notes.add(num);
                    needsRender = true;
                }
            } else {
                if (cellData.value !== num) {
                    cellData.value = num;
                    // НЕ стираем заметки: cellData.notes.clear();
                    needsRender = true;
                } else {
                    cellData.value = 0;
                    needsRender = true;
                }
            }
        }
        // Стирание (Backspace/Delete)
        else if (event.key === 'Backspace' || event.key === 'Delete') {
            clearErrors();
             if (cellData.value !== 0) {
                cellData.value = 0; // Стираем только значение
                needsRender = true;
            } else if (cellData.notes.size > 0) {
                cellData.notes.clear(); // Стираем заметки, если значения нет
                needsRender = true;
            }
        }
        // Переключение режима (N/Т)
        else if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') {
             isNoteMode = !isNoteMode;
             updateNoteToggleButtonState();
             event.preventDefault();
        }

        if (needsRender) {
            renderCell(selectedRow, selectedCol);
        }
    });

    // Клик по кнопке "Проверить" - без изменений (проверяет только cellData.value)
    checkButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });

    // Клик по кнопке "Новая игра" - без изменений
    newGameButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });

    // --- Инициализация Telegram Web App SDK --- (без изменений)
     try { /* ... */ } catch (e) { /* ... */ }

    // --- Первый запуск игры при загрузке ---
    initGame();

}); // Конец 'DOMContentLoaded'
