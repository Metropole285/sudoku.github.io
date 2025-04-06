// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.
// <script src="sudoku.js"></script> или <script src="sudoku.min.js"></script>

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

    // --- Переменные для подсказок ---
    const MAX_HINTS = 3;
    let hintsRemaining = MAX_HINTS;

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

            userGrid = boardStringToObjectArray(currentPuzzle);
            renderBoard();
            clearSelection();
            statusMessageElement.textContent = '';
            statusMessageElement.className = '';
            isNoteMode = false;
            updateNoteToggleButtonState();

            // --- Сброс и обновление подсказок ---
            hintsRemaining = MAX_HINTS;
            updateHintButtonState();
            // ------------------------------------

            // --- Управление таймером при старте игры ---
            stopTimer(); // Остановить предыдущий, если был
            secondsElapsed = 0; // Сбросить счетчик
            updateTimerDisplay(); // Показать 00:00
            startTimer(); // Запустить новый
            // ------------------------------------------

            console.log("Новая игра успешно инициализирована.");
        } catch (error) {
            console.error("ОШИБКА в initGame:", error);
            statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
            statusMessageElement.className = 'incorrect-msg';
            boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
            stopTimer(); // Остановить таймер и при ошибке
            hintsRemaining = 0;
            updateHintButtonState();
        }
    }

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
            // Ждем завершения анимации скрытия перед установкой display: none
            setTimeout(() => {
                if (!modalOverlay.classList.contains('visible')) modalOverlay.style.display = 'none';
                if (!difficultyModal.classList.contains('visible')) difficultyModal.style.display = 'none';
            }, 300); // Должно совпадать с transition duration в CSS
            console.log("Модальное окно скрыто.");
         }
    }

    // --- Функции для таймера ---
    function startTimer() {
        if(timerInterval) return; // Не запускать, если уже запущен
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
         console.log("Таймер запущен.");
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("Таймер остановлен.");
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
                if (index >= boardString.length) { // Защита от некорректной строки
                    console.error(`boardStringToObjectArray: Индекс ${index} вне диапазона строки длиной ${boardString.length}`);
                    grid[r][c] = { value: 0, notes: new Set() };
                    continue;
                }
                const char = boardString[index];
                const value = (char === '.' || char === '0') ? 0 : parseInt(char);
                grid[r][c] = {
                    value: value,
                    notes: new Set() // Заметки инициализируются пустыми
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
                 continue; // Пропустить некорректную строку
             }
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

        // Проверка на существование данных для ячейки
        if (!userGrid[r] || userGrid[r][c] === undefined) {
             console.error(`createCellElement: Нет данных для ячейки [${r}, ${c}]`);
             cell.textContent = '?'; // Отобразить ошибку
             return cell;
        }
        const cellData = userGrid[r][c];

        const valueContainer = document.createElement('div');
        valueContainer.classList.add('cell-value-container');

        const notesContainer = document.createElement('div');
        notesContainer.classList.add('cell-notes-container');

        if (cellData.value !== 0) { // Показываем основное значение
            valueContainer.textContent = cellData.value;
            valueContainer.style.display = 'flex';
            notesContainer.style.display = 'none';
            // Определяем, была ли ячейка изначально заполнена
            const puzzleIndex = r * 9 + c;
            if (currentPuzzle && puzzleIndex < currentPuzzle.length) {
                 const puzzleChar = currentPuzzle[puzzleIndex];
                 if (puzzleChar !== '.' && puzzleChar !== '0') {
                     cell.classList.add('given');
                 }
            } else if (!currentPuzzle) {
                console.warn("createCellElement: currentPuzzle не определен при проверке 'given'");
            }

        } else if (cellData.notes && cellData.notes.size > 0) { // Показываем заметки
            valueContainer.style.display = 'none';
            notesContainer.style.display = 'grid';
            notesContainer.innerHTML = ''; // Очищаем перед заполнением
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div');
                noteDigit.classList.add('note-digit');
                noteDigit.textContent = cellData.notes.has(n) ? n : '';
                notesContainer.appendChild(noteDigit);
            }
        } else { // Ячейка пустая (нет ни значения, ни заметок)
            valueContainer.textContent = '';
            valueContainer.style.display = 'flex'; // Показываем пустой контейнер значения
            notesContainer.style.display = 'none'; // Скрываем контейнер заметок
        }

        cell.appendChild(valueContainer);
        cell.appendChild(notesContainer);

        // Добавляем толстые границы
        if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right');
        if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom');

        return cell;
    }


    // --- Перерисовка ОДНОЙ ячейки ---
    function renderCell(r, c) {
        const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
        if (oldCell) {
            const newCell = createCellElement(r, c);
            // Сохраняем классы состояния (selected, incorrect, highlighted)
            if (oldCell.classList.contains('selected')) newCell.classList.add('selected');
            if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect');
            if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted');
            // Обновляем ссылку на выбранную ячейку, если это она
            if (selectedRow === r && selectedCol === c) {
                 selectedCell = newCell; // Обновляем ссылку!
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

    // Снятие выделения ячейки и подсветки
    function clearSelection() {
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        // Убираем подсветку со всех ячеек
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
        selectedCell = null;
        selectedRow = -1;
        selectedCol = -1;
        // console.log("Selection cleared.");
    }

    // Очистка подсветки ошибок и статуса
    function clearErrors() {
        boardElement.querySelectorAll('.cell.incorrect').forEach(cell => {
            cell.classList.remove('incorrect');
        });
        statusMessageElement.textContent = '';
        statusMessageElement.className = '';
    }

    // Обновление вида кнопки режима заметок
    function updateNoteToggleButtonState() {
        if (noteToggleButton) {
            if (isNoteMode) {
                noteToggleButton.classList.add('active');
                noteToggleButton.title = "Режим заметок (ВКЛ)";
            } else {
                noteToggleButton.classList.remove('active');
                noteToggleButton.title = "Режим заметок (ВЫКЛ)";
            }
            // console.log(`Note mode toggled: ${isNoteMode}`);
        } else {
            console.warn("Кнопка режима заметок не найдена.");
        }
    }

    // Функция обновления состояния кнопки подсказки
    function updateHintButtonState() {
        if (hintButton) {
            hintButton.textContent = `💡 ${hintsRemaining}/${MAX_HINTS}`;
            hintButton.disabled = hintsRemaining <= 0 || !currentSolution; // Отключаем, если нет подсказок или игра не загружена
            hintButton.title = hintButton.disabled ? "Подсказки закончились" : "Использовать подсказку";
        } else {
            console.warn("Кнопка подсказки не найдена.");
        }
    }

    // Функция подсветки строки и столбца
    function highlightRelatedCells(row, col) {
        // Сначала убираем старую подсветку
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });

        // Подсвечиваем ТОЛЬКО строку и столбец
        boardElement.querySelectorAll(`.cell[data-row='${row}'], .cell[data-col='${col}']`).forEach(cell => {
            cell.classList.add('highlighted');
        });

        // console.log(`Подсвечены строка ${row} и столбец ${col}.`);
    }


    // === ИЗМЕНЕНИЕ ЗДЕСЬ: Функция предоставления подсказки для ВЫБРАННОЙ ячейки ===
    function provideHint() {
        // 1. Проверка общих условий
        if (hintsRemaining <= 0) {
            console.log("Подсказка недоступна: закончились.");
            // Кнопка и так disabled, сообщение не обязательно
            return;
        }
        if (!currentSolution || !userGrid) {
            console.log("Подсказка недоступна: игра не готова.");
            return;
        }

        // 2. Проверка выбранной ячейки
        if (!selectedCell) {
            console.log("Подсказка невозможна: ячейка не выбрана.");
            statusMessageElement.textContent = "Выберите ячейку для подсказки";
            statusMessageElement.className = ''; // Не ошибка
            setTimeout(() => { if (statusMessageElement.textContent === "Выберите ячейку для подсказки") statusMessageElement.textContent = ""; }, 2000);
            return;
        }

        // 3. Проверка, не 'given' ли ячейка
        if (selectedCell.classList.contains('given')) {
            console.log("Подсказка невозможна: выбрана начальная ячейка.");
            statusMessageElement.textContent = "Нельзя получить подсказку для начальной ячейки";
            statusMessageElement.className = ''; // Не ошибка
            setTimeout(() => { if (statusMessageElement.textContent === "Нельзя получить подсказку для начальной ячейки") statusMessageElement.textContent = ""; }, 2000);
            return;
        }

        // 4. Проверка, не заполнена ли ячейка уже
        const r = selectedRow;
        const c = selectedCol;
        if (!userGrid[r] || userGrid[r][c] === undefined) {
             console.error(`Данные userGrid для [${r},${c}] отсутствуют при запросе подсказки.`);
             return;
        }
        if (userGrid[r][c].value !== 0) {
            console.log("Подсказка не нужна: ячейка уже заполнена.");
            statusMessageElement.textContent = "Ячейка уже заполнена";
             statusMessageElement.className = ''; // Не ошибка
            setTimeout(() => { if (statusMessageElement.textContent === "Ячейка уже заполнена") statusMessageElement.textContent = ""; }, 2000);
            return;
        }

        // 5. Все проверки пройдены, даем подсказку
        const solutionValue = getSolutionValue(r, c);
        if (solutionValue !== null && solutionValue !== 0) {
            console.log(`Подсказка для [${r}, ${c}]: ${solutionValue}`);
            userGrid[r][c].value = solutionValue; // Устанавливаем значение
            if (userGrid[r][c].notes) userGrid[r][c].notes.clear(); // Очищаем заметки

            renderCell(r, c); // Перерисовываем ячейку

            // Кратковременно подсветим ячейку с подсказкой
            const hintedCellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); // Ищем заново, т.к. renderCell заменил элемент
            if (hintedCellElement) {
                 // Убедимся, что стиль selected снят (если он был), чтобы подсветка была видна
                hintedCellElement.classList.remove('selected');
                // Подсвечиваем
                hintedCellElement.style.transition = 'background-color 0.1s ease-out';
                hintedCellElement.style.backgroundColor = '#fffacd'; // LemonChiffon
                setTimeout(() => {
                    hintedCellElement.style.backgroundColor = '';
                    hintedCellElement.style.transition = '';
                    // Важно: Снимаем выделение и подсветку после подсказки
                    clearSelection();
                }, 500);
            } else {
                 clearSelection(); // Все равно снимаем выделение
            }

            hintsRemaining--;
            updateHintButtonState();
            clearErrors(); // Убираем возможные предыдущие сообщения об ошибках

        } else {
            console.error(`Не удалось получить значение решения для [${r}, ${c}]`);
            statusMessageElement.textContent = "Ошибка получения подсказки";
            statusMessageElement.className = 'incorrect-msg';
        }
    }
    // ========================================================================


    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки + подсветка)
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell');
        if (!target) return;

        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

        if (isNaN(r) || isNaN(c)) { console.error("Не удалось определить координаты ячейки"); return; }

        if (target === selectedCell) {
            clearSelection(); // Повторный клик - снять выделение
        } else { // Клик на другую ячейку
            clearSelection(); // Сначала снимаем старое выделение
            selectedCell = target;
            selectedRow = r;
            selectedCol = c;
            console.log(`Выбрана ячейка [${r}, ${c}]`);

            // Выделяем ячейку только если она не предустановленная
            if (!selectedCell.classList.contains('given')) {
                selectedCell.classList.add('selected');
            }
            // Подсвечиваем связанные ячейки (строку и столбец)
            highlightRelatedCells(r, c);
        }
        clearErrors(); // Убираем подсветку ошибок при клике на любую ячейку
    });

    // Клик по цифровой панели (ввод/стирание/заметки)
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return; // Клик не по кнопке

        // Обработка переключателя заметок
        if (button.id === 'note-toggle-button') {
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            return; // Действие выполнено
        }

        // Если ячейка не выбрана или выбрана предустановленная, игнорируем ввод
        if (!selectedCell || selectedCell.classList.contains('given')) {
             if(selectedCell && selectedCell.classList.contains('given')) {
                 statusMessageElement.textContent = "Эту ячейку нельзя изменить";
                 statusMessageElement.className = '';
                 setTimeout(() => { if(statusMessageElement.textContent === "Эту ячейку нельзя изменить") statusMessageElement.textContent = ""; }, 1500);
             }
            return;
        }

        // Ячейка выбрана и она не 'given'
        clearErrors(); // Убираем ошибки перед вводом
         // Убедимся, что данные для ячейки существуют
         if (!userGrid[selectedRow] || userGrid[selectedRow][selectedCol] === undefined) {
            console.error(`Нет данных userGrid для выбранной ячейки [${selectedRow}, ${selectedCol}]`);
            return;
        }
        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false; // Флаг, нужно ли перерисовывать ячейку

        if (button.id === 'erase-button') { // Нажата кнопка "Стереть"
            if (cellData.value !== 0) { // Если есть значение, стираем его
                cellData.value = 0;
                needsRender = true;
                console.log(`Стерто значение в [${selectedRow}, ${selectedCol}], заметки сохранены.`);
            } else if (cellData.notes && cellData.notes.size > 0) { // Если значения нет, но есть заметки, стираем заметки
                cellData.notes.clear();
                needsRender = true;
                console.log(`Очищены заметки в [${selectedRow}, ${selectedCol}]`);
            }
        } else if (button.dataset.num) { // Нажата кнопка с цифрой
            const num = parseInt(button.dataset.num);
            if (isNoteMode) { // РЕЖИМ ЗАМЕТОК
                // Заметки можно ставить только в пустые ячейки
                if (cellData.value === 0) {
                     if (!cellData.notes) cellData.notes = new Set(); // Инициализируем, если нужно
                    if (cellData.notes.has(num)) {
                        cellData.notes.delete(num); // Убираем заметку, если она уже есть
                    } else {
                        cellData.notes.add(num); // Добавляем заметку
                    }
                    needsRender = true;
                } else {
                    console.log("Нельзя добавить заметку в ячейку со значением.");
                    statusMessageElement.textContent = "Сначала сотрите цифру";
                    statusMessageElement.className = '';
                    setTimeout(() => { if(statusMessageElement.textContent === "Сначала сотрите цифру") statusMessageElement.textContent = ""; }, 1500);
                }
            } else { // РЕЖИМ ВВОДА ЦИФРЫ
                if (cellData.value !== num) { // Если вводим новую цифру
                    cellData.value = num;
                    // При вводе основного значения, ОЧИЩАЕМ заметки в этой ячейке
                    if (cellData.notes && cellData.notes.size > 0) {
                         cellData.notes.clear();
                         console.log(`Введено значение ${num} в [${selectedRow}, ${selectedCol}], заметки очищены.`);
                    } else {
                         console.log(`Введено значение ${num} в [${selectedRow}, ${selectedCol}].`);
                    }
                    needsRender = true;
                } else { // Повторный клик на ту же цифру - стираем ее
                    cellData.value = 0;
                    // Заметки НЕ восстанавливаем при стирании
                    needsRender = true;
                    console.log(`Стерто значение ${num} в [${selectedRow}, ${selectedCol}] повторным кликом.`);
                }
            }
        }

        if (needsRender) {
            renderCell(selectedRow, selectedCol); // Перерисовываем только измененную ячейку
        }
    });

     // Обработка нажатий клавиш клавиатуры
    document.addEventListener('keydown', (event) => {
         // Игнорируем ввод, если фокус на текстовом поле
         if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

         // Переключение режима заметок клавишей N/Т
        if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') {
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            event.preventDefault();
            return;
        }

        // Разрешаем навигацию стрелками всегда
         if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            if (!selectedCell) { // Если ничего не выбрано, выбираем (0,0)
                 const startCell = boardElement.querySelector(`.cell[data-row='0'][data-col='0']`);
                 if (startCell) startCell.click();
                 else return; // Не можем начать навигацию
             }
             // Теперь selectedCell точно есть
            let nextRow = selectedRow;
            let nextCol = selectedCol;

             // Используем функции для инкремента/декремента с проверкой границ
             const move = (current, delta, max) => Math.min(max, Math.max(0, current + delta));

            if (event.key === 'ArrowUp') nextRow = move(selectedRow, -1, 8);
            if (event.key === 'ArrowDown') nextRow = move(selectedRow, 1, 8);
            if (event.key === 'ArrowLeft') nextCol = move(selectedCol, -1, 8);
            if (event.key === 'ArrowRight') nextCol = move(selectedCol, 1, 8);

            if (nextRow !== selectedRow || nextCol !== selectedCol) {
                 const nextCellElement = boardElement.querySelector(`.cell[data-row='${nextRow}'][data-col='${nextCol}']`);
                 if (nextCellElement) {
                     // Имитируем клик по новой ячейке для выделения и подсветки
                     nextCellElement.click();
                 }
            }
            event.preventDefault(); // Предотвратить прокрутку страницы стрелками
            return; // Завершаем обработку для стрелок
        }


        // Для остальных клавиш (цифры, delete) нужна выбранная и не 'given' ячейка
        if (!selectedCell || selectedCell.classList.contains('given')) {
             return;
        }

        // Убедимся, что данные для ячейки существуют
        if (!userGrid[selectedRow] || userGrid[selectedRow][selectedCol] === undefined) {
             console.error(`(Key) Нет данных userGrid для выбранной ячейки [${selectedRow}, ${selectedCol}]`);
             return;
        }
        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;

        if (event.key >= '1' && event.key <= '9') { // Ввод цифр 1-9
            clearErrors();
            const num = parseInt(event.key);
            if (isNoteMode) { // Режим заметок
                if (cellData.value === 0) {
                    if (!cellData.notes) cellData.notes = new Set();
                    if (cellData.notes.has(num)) cellData.notes.delete(num);
                    else cellData.notes.add(num);
                    needsRender = true;
                }
            } else { // Режим ввода цифры
                if (cellData.value !== num) {
                    cellData.value = num;
                     if (cellData.notes && cellData.notes.size > 0) cellData.notes.clear(); // Очищаем заметки
                    needsRender = true;
                } else { // Повторное нажатие - стирание
                    cellData.value = 0;
                    needsRender = true;
                }
            }
            event.preventDefault();
        } else if (event.key === 'Backspace' || event.key === 'Delete') { // Стирание
            clearErrors();
            if (cellData.value !== 0) { // Стираем значение
                cellData.value = 0;
                needsRender = true;
                console.log(`Key: Стерто значение в [${selectedRow}, ${selectedCol}], заметки сохранены.`);
            } else if (cellData.notes && cellData.notes.size > 0) { // Стираем заметки
                cellData.notes.clear();
                needsRender = true;
                console.log(`Key: Очищены заметки в [${selectedRow}, ${selectedCol}]`);
            }
            event.preventDefault();
        }

        if (needsRender && selectedRow !== -1 && selectedCol !== -1) {
            renderCell(selectedRow, selectedCol);
        }
    });

    // Клик по кнопке "Проверить"
    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors(); // Сначала убираем старые ошибки
        if (!currentSolution || !userGrid) {
            console.error("Проверка невозможна: нет решения или сетки пользователя.");
            statusMessageElement.textContent = "Ошибка проверки!";
            statusMessageElement.className = 'incorrect-msg';
            return;
        }

        let allCorrect = true;
        let boardComplete = true;

        for (let r = 0; r < 9; r++) {
             if (!userGrid[r]) continue; // Пропускаем некорректные строки
            for (let c = 0; c < 9; c++) {
                 if (userGrid[r][c] === undefined) continue; // Пропускаем некорректные ячейки
                const cellData = userGrid[r][c];
                const userValue = cellData.value;
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue; // Пропускаем, если элемент не найден

                if (userValue === 0) {
                    boardComplete = false; // Найдена пустая ячейка
                } else if (!cellElement.classList.contains('given')) { // Проверяем только введенные пользователем
                    const solutionValue = getSolutionValue(r, c);
                    if (userValue !== solutionValue) {
                        cellElement.classList.add('incorrect'); // Помечаем неверную
                        allCorrect = false;
                    }
                }
            }
        }

        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!";
            statusMessageElement.className = 'correct';
            stopTimer(); // Останавливаем таймер при успехе
            clearSelection(); // Снимаем выделение ячейки
            hintButton.disabled = true; // Отключаем подсказки для решенной игры
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg';
        } else { // allCorrect = true, boardComplete = false
            statusMessageElement.textContent = "Пока все верно, но поле не заполнено.";
            statusMessageElement.className = ''; // Просто информационное сообщение
        }
    });

    // Клик по кнопке "Новая игра"
    newGameButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Новая игра'");
        stopTimer(); // Останавливаем таймер перед показом модального окна
        showDifficultyModal();
    });

    // Обработчик для кнопки подсказки
    if (hintButton) {
        hintButton.addEventListener('click', provideHint);
    } else {
        console.error("Кнопка подсказки не найдена в DOM!");
    }

    // Обработка кликов внутри модального окна выбора сложности
    if(modalButtonsContainer) {
        modalButtonsContainer.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if(!target) return;

            if (target.classList.contains('difficulty-button')) {
                const difficulty = target.dataset.difficulty;
                if (difficulty) {
                    console.log(`Выбрана сложность: ${difficulty}`);
                    hideDifficultyModal();
                    // Запускаем игру ПОСЛЕ скрытия модального окна для плавности
                    setTimeout(() => initGame(difficulty), 50); // Небольшая задержка
                } else {
                     console.warn("Кнопка сложности без атрибута data-difficulty");
                }
            } else if (target.id === 'cancel-difficulty-button') {
                console.log("Выбор сложности отменен.");
                hideDifficultyModal();
                // Если текущая игра была, таймер нужно снова запустить (если он был остановлен и игра не решена)
                if (currentPuzzle && timerInterval === null && secondsElapsed > 0) {
                    let isSolved = true;
                    // Добавим проверку на существование userGrid
                    if (userGrid && userGrid.length === 9) {
                        for (let r = 0; r < 9; ++r) {
                            if (!userGrid[r]) { isSolved = false; break; } // Доп. проверка строки
                            for (let c = 0; c < 9; ++c) {
                                if (!userGrid[r][c] || userGrid[r][c].value === 0) { isSolved = false; break; }
                            }
                            if (!isSolved) break;
                        }
                    } else {
                         isSolved = false; // Считаем нерешенной, если сетки нет
                    }
                    if (!isSolved) startTimer();
                }
            }
        });
    } else {
        console.error("Контейнер кнопок модального окна не найден.");
    }

    // Клик по оверлею для закрытия модального окна
    if(modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            console.log("Клик по оверлею, закрытие модального окна.");
            hideDifficultyModal();
             // Та же логика восстановления таймера, что и при отмене
            if (currentPuzzle && timerInterval === null && secondsElapsed > 0) {
                 let isSolved = true;
                 if (userGrid && userGrid.length === 9) {
                    for (let r = 0; r < 9; ++r) {
                        if (!userGrid[r]) { isSolved = false; break; }
                        for (let c = 0; c < 9; ++c) {
                             if (!userGrid[r][c] || userGrid[r][c].value === 0) { isSolved = false; break; }
                        }
                        if (!isSolved) break;
                    }
                 } else {
                     isSolved = false;
                 }
                if (!isSolved) startTimer();
           }
        });
    } else {
        console.error("Оверлей модального окна не найден.");
    }

    // --- Инициализация Telegram Web App SDK ---
     try {
         if (window.Telegram && window.Telegram.WebApp) {
             window.Telegram.WebApp.ready();
             // window.Telegram.WebApp.expand(); // Раскомментируйте, если нужно развернуть Web App
             console.log("Telegram WebApp SDK инициализирован.");
         } else {
             console.log("Telegram WebApp SDK не найден (запуск вне Telegram?).");
         }
     } catch (e) {
         console.error("Ошибка инициализации Telegram WebApp SDK:", e);
     }

    // --- Первый запуск игры ---
    initGame("medium"); // Запускаем первую игру со средней сложностью

}); // Конец 'DOMContentLoaded'
