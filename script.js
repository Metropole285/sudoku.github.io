// Убедитесь, что файл sudoku.js (или sudoku.min.js, если вы его так назвали)
// подключен в index.html ПЕРЕД этим скриптом.
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
    const modalButtonsContainer = difficultyModal ? difficultyModal.querySelector('.modal-buttons') : null; // Добавлена проверка

    // --- Переменные состояния игры ---
    let currentPuzzle = null; // Головоломка в виде строки
    let currentSolution = null; // Решение головоломки в виде строки
    let userGrid = []; // Текущее состояние доски пользователя (массив 9x9 объектов {value, notes})
    let selectedCell = null; // Ссылка на выбранный DOM-элемент ячейки (<div>)
    let selectedRow = -1;    // Индекс строки выбранной ячейки
    let selectedCol = -1;    // Индекс колонки выбранной ячейки
    let isNoteMode = false; // Флаг режима заметок

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

            userGrid = boardStringToObjectArray(currentPuzzle); // Преобразуем в массив объектов
            renderBoard(); // Рисуем доску
            clearSelection(); // Сбрасываем выделение
            statusMessageElement.textContent = ''; // Чистим статус
            statusMessageElement.className = '';
            isNoteMode = false; // Сбрасываем режим заметок
            updateNoteToggleButtonState(); // Обновляем вид кнопки заметок
            console.log("Новая игра успешно инициализирована.");
        } catch (error) {
            console.error("ОШИБКА в initGame:", error);
            statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
            statusMessageElement.className = 'incorrect-msg';
            boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
        }
    }

    // --- Функции для модального окна выбора сложности ---
    function showDifficultyModal() {
        if (modalOverlay && difficultyModal) {
            modalOverlay.style.display = 'block';
            difficultyModal.style.display = 'block';
            requestAnimationFrame(() => {
                modalOverlay.classList.add('visible');
                difficultyModal.classList.add('visible');
            });
            console.log("Модальное окно показано.");
        } else {
            console.error("Элементы модального окна не найдены!");
        }
    }
    function hideDifficultyModal() {
         if (modalOverlay && difficultyModal) {
            modalOverlay.classList.remove('visible');
            difficultyModal.classList.remove('visible');
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                difficultyModal.style.display = 'none';
            }, 300);
            console.log("Модальное окно скрыто.");
         }
    }

    // --- Преобразование строки головоломки в массив объектов ячеек ---
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
        if (!userGrid || userGrid.length !== 9) { console.error("renderBoard: Некорректные данные userGrid"); return; }
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
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
        const cellData = userGrid[r][c];
        const valueContainer = document.createElement('div');
        valueContainer.classList.add('cell-value-container');
        const notesContainer = document.createElement('div');
        notesContainer.classList.add('cell-notes-container');

        if (cellData.value !== 0) { // Показываем основное значение
            valueContainer.textContent = cellData.value;
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none';
            const puzzleChar = currentPuzzle[r * 9 + c];
            if (puzzleChar !== '.' && puzzleChar !== '0') {
                cell.classList.add('given');
            }
        } else if (cellData.notes.size > 0) { // Показываем заметки
            valueContainer.style.display = 'none';
            notesContainer.style.display = 'grid';
            notesContainer.innerHTML = '';
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div');
                noteDigit.classList.add('note-digit');
                noteDigit.textContent = cellData.notes.has(n) ? n : '';
                notesContainer.appendChild(noteDigit);
            }
        } else { // Ячейка пустая (нет ни значения, ни заметок)
            valueContainer.textContent = '';
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none';
        }

        cell.appendChild(valueContainer);
        cell.appendChild(notesContainer);
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
        } else {
            console.warn(`renderCell: Ячейка [${r}, ${c}] не найдена в DOM для перерисовки.`);
        }
    }

    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) { if (!currentSolution) return null; const char = currentSolution[row * 9 + col]; return (char === '.' || char === '0') ? 0 : parseInt(char); }

    // Снятие выделения ячейки и подсветки строки/столбца
    function clearSelection() {
        if (selectedCell) { selectedCell.classList.remove('selected'); }
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => { cell.classList.remove('highlighted'); });
        selectedCell = null; selectedRow = -1; selectedCol = -1;
         console.log("Selection cleared.");
    }

    // Очистка подсветки неверных ячеек и статуса
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => { cell.classList.remove('incorrect'); }); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }

    // Обновление вида кнопки режима заметок
    function updateNoteToggleButtonState() {
        if (noteToggleButton) {
            if (isNoteMode) { noteToggleButton.classList.add('active'); noteToggleButton.title = "Режим заметок (ВКЛ)"; }
            else { noteToggleButton.classList.remove('active'); noteToggleButton.title = "Режим заметок (ВЫКЛ)"; }
            console.log(`Note mode toggled: ${isNoteMode}`);
        } else { console.warn("Кнопка режима заметок не найдена."); }
    }

    // Новая функция для подсветки связанных ячеек (строка, столбец)
    function highlightRelatedCells(row, col) {
        boardElement.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);
            if (cellRow === row || cellCol === col) { cell.classList.add('highlighted'); }
        });
        console.log("Related cells highlighted.");
    }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки + подсветка) - ИСПРАВЛЕННАЯ ЛОГИКА
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) { console.log("Клик мимо ячейки."); return; }
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

        if (target === selectedCell) { // Повторный клик на ту же ячейку
            clearSelection(); // Просто снимаем выделение
        } else { // Клик на другую ячейку
            clearSelection(); // Снимаем старое выделение/подсветку
            selectedCell = target; // Запоминаем новую
            selectedRow = r;
            selectedCol = c;
            console.log(`Selected cell [${r}, ${c}]`);
            if (!selectedCell.classList.contains('given')) { // Выделяем, если не изначальная
                selectedCell.classList.add('selected');
            }
            highlightRelatedCells(r, c); // Подсвечиваем строку/столбец
        }
        clearErrors(); // Убираем ошибки при любом выборе
    });

    // Клик по цифровой панели (ввод/стирание/заметки) - ИЗМЕНЕННАЯ ЛОГИКА СТИРАНИЯ
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'note-toggle-button') { // Переключение режима заметок
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            return;
        }

        if (!selectedCell || selectedCell.classList.contains('given')) { // Ячейка не выбрана или не изменяема
             console.log("Numpad click ignored: cell not selected or is given.");
             return;
        }

        clearErrors(); // Убираем ошибки перед действием

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false; // Нужно ли перерисовать ячейку?

        // === ОБНОВЛЕННАЯ ЛОГИКА ДЛЯ КНОПКИ "СТЕРЕТЬ" ===
        if (button.id === 'erase-button') {
            if (cellData.value !== 0) { // Если было БОЛЬШОЕ значение
                cellData.value = 0;     // Стираем ТОЛЬКО его (заметки остаются)
                needsRender = true;
                console.log(`Erased value at [${selectedRow}, ${selectedCol}], notes preserved.`);
            } else if (cellData.notes.size > 0) { // Если значения не было, но были ЗАМЕТКИ
                cellData.notes.clear(); // Стираем все заметки
                needsRender = true;
                console.log(`Cleared notes at [${selectedRow}, ${selectedCol}]`);
            }
        }
        // === КОНЕЦ ОБНОВЛЕНИЙ ДЛЯ "СТЕРЕТЬ" ===

        // Обработка кнопок с цифрами
        else if (button.dataset.num) {
            const num = parseInt(button.dataset.num);
            if (isNoteMode) { // РЕЖИМ ЗАМЕТОК
                if (cellData.value === 0) { // Только для пустых ячеек
                    if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num);
                    needsRender = true;
                } else { console.log("Cannot add note to a cell with a value."); }
            } else { // РЕЖИМ ВВОДА ЦИФР
                if (cellData.value !== num) { // Вводим новую цифру
                    cellData.value = num;
                    // Заметки НЕ стираем: cellData.notes.clear();
                    needsRender = true;
                } else { // Повторный клик на ту же цифру - стираем ее
                    cellData.value = 0;
                    needsRender = true;
                }
            }
        }

        if (needsRender) { // Перерисовываем ячейку, если были изменения
            renderCell(selectedRow, selectedCol);
        }
    });

     // Обработка нажатий клавиш клавиатуры - ИЗМЕНЕННАЯ ЛОГИКА СТИРАНИЯ
    document.addEventListener('keydown', (event) => {
        // Переключение режима заметок
        if ((event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') && !(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            event.preventDefault();
            return;
        }

        if (!selectedCell || selectedCell.classList.contains('given')) return; // Ячейка не выбрана или не изменяема

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;

        // Обработка цифр 1-9
        if (event.key >= '1' && event.key <= '9') {
            clearErrors();
            const num = parseInt(event.key);
            if (isNoteMode) { // Заметки
                if (cellData.value === 0) {
                    if (cellData.notes.has(num)) cellData.notes.delete(num); else cellData.notes.add(num);
                    needsRender = true;
                }
            } else { // Ввод цифры
                if (cellData.value !== num) {
                    cellData.value = num;
                    // Заметки НЕ стираем: cellData.notes.clear();
                    needsRender = true;
                } else { // Повторное нажатие - стирание
                    cellData.value = 0;
                    needsRender = true;
                }
            }
            event.preventDefault();
        }
        // === ОБНОВЛЕННАЯ ЛОГИКА ДЛЯ BACKSPACE / DELETE ===
        else if (event.key === 'Backspace' || event.key === 'Delete') {
            clearErrors();
            if (cellData.value !== 0) { // Если было БОЛЬШОЕ значение
                cellData.value = 0;     // Стираем ТОЛЬКО его
                needsRender = true;
                 console.log(`Key: Erased value at [${selectedRow}, ${selectedCol}], notes preserved.`);
            } else if (cellData.notes.size > 0) { // Если значения не было, но были ЗАМЕТКИ
                cellData.notes.clear(); // Стираем все заметки
                needsRender = true;
                 console.log(`Key: Cleared notes at [${selectedRow}, ${selectedCol}]`);
            }
            event.preventDefault();
        }
        // === КОНЕЦ ОБНОВЛЕНИЙ ===
        // Можно добавить обработку стрелок для навигации

        if (needsRender) { // Перерисовываем, если были изменения
            renderCell(selectedRow, selectedCol);
        }
    });

    // Клик по кнопке "Проверить" (без изменений)
    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors();
        if (!currentSolution || !userGrid) return;
        let allCorrect = true; let boardComplete = true;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellData = userGrid[r][c]; const userValue = cellData.value;
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue;
                if (userValue === 0) { boardComplete = false; }
                else if (!cellElement.classList.contains('given')) {
                    const solutionValue = getSolutionValue(r, c);
                    if (userValue !== solutionValue) { cellElement.classList.add('incorrect'); allCorrect = false; }
                }
            }
        }
        if (allCorrect && boardComplete) { statusMessageElement.textContent = "Поздравляем! Судоку решено верно!"; statusMessageElement.className = 'correct'; clearSelection(); }
        else if (!allCorrect) { statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены."; statusMessageElement.className = 'incorrect-msg'; }
        else { statusMessageElement.textContent = "Пока все верно, но поле не заполнено."; statusMessageElement.className = ''; }
    });

    // Клик по кнопке "Новая игра" - показывает модальное окно (без изменений)
    newGameButton.addEventListener('click', () => { console.log("Нажата кнопка 'Новая игра'"); showDifficultyModal(); });

    // Обработка кликов внутри модального окна выбора сложности (без изменений)
    if(modalButtonsContainer) {
        modalButtonsContainer.addEventListener('click', (event) => {
            const target = event.target.closest('button');
             if(!target) return;
            if (target.classList.contains('difficulty-button')) {
                const difficulty = target.dataset.difficulty;
                if (difficulty) { console.log(`Выбрана сложность: ${difficulty}`); hideDifficultyModal(); initGame(difficulty); }
            } else if (target.id === 'cancel-difficulty-button') { console.log("Выбор сложности отменен."); hideDifficultyModal(); }
        });
    } else { console.error("Контейнер кнопок модального окна не найден."); }

    // Клик по оверлею для закрытия модального окна (без изменений)
    if(modalOverlay) { modalOverlay.addEventListener('click', () => { console.log("Клик по оверлею, закрытие модального окна."); hideDifficultyModal(); }); }
    else { console.error("Оверлей модального окна не найден."); }

    // --- Инициализация Telegram Web App SDK (без изменений) ---
     try {
         if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); console.log("Telegram WebApp SDK инициализирован."); }
         else { console.log("Telegram WebApp SDK не найден."); }
     } catch (e) { console.error("Ошибка инициализации Telegram WebApp SDK:", e); }

    // --- Первый запуск игры при загрузке страницы ---
    initGame("medium"); // Начинаем со средней сложности

}); // Конец обработчика 'DOMContentLoaded'
