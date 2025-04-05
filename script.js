// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.
// <script src="sudoku.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Получение ссылок на элементы DOM ---
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const newGameButton = document.getElementById('new-game-button');
    const statusMessageElement = document.getElementById('status-message');
    const numpad = document.getElementById('numpad');
    // --- ИСПРАВЛЕНИЕ: Получаем кнопку заметок по id из HTML ---
    const noteToggleButton = document.getElementById('note-toggle-button'); // Убедитесь, что кнопка в HTML имеет id="note-toggle-button"
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal.querySelector('.modal-buttons');
    // --- ИСПРАВЛЕНИЕ: Получаем кнопку отмены по id ---
    // const cancelDifficultyButton = document.getElementById('cancel-difficulty-button'); // Эта переменная не используется, можно удалить или получить правильно, если нужна
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = [];
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
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
            // Небольшая задержка для срабатывания CSS-анимации
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
            // Скрываем элементы после завершения анимации
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                difficultyModal.style.display = 'none';
            }, 300); // Время должно совпадать с длительностью transition в CSS
            console.log("Модальное окно скрыто.");
         }
    }

    // --- Преобразование строки головоломки в массив объектов ячеек ---
    // Каждый объект содержит значение (0 для пустого) и Set для заметок
    function boardStringToObjectArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) {
            grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const char = boardString[r * 9 + c];
                const value = (char === '.' || char === '0') ? 0 : parseInt(char);
                grid[r][c] = {
                    value: value, // Основное значение ячейки
                    notes: new Set() // Пустой набор для хранения заметок (цифры 1-9)
                };
            }
        }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски (вызывает createCellElement для каждой ячейки) ---
    function renderBoard() {
        boardElement.innerHTML = ''; // Очищаем доску
        if (!userGrid || userGrid.length !== 9) {
            console.error("renderBoard: Некорректные данные userGrid");
            return;
        }
        // Создаем и добавляем все 81 ячейку
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellElement = createCellElement(r, c); // Создаем элемент ячейки
                boardElement.appendChild(cellElement); // Добавляем его на доску
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

        const cellData = userGrid[r][c]; // Данные ячейки (value, notes)

        // Контейнер для основного значения
        const valueContainer = document.createElement('div');
        valueContainer.classList.add('cell-value-container');

        // Контейнер для заметок (маленьких цифр)
        const notesContainer = document.createElement('div');
        notesContainer.classList.add('cell-notes-container');

        // Определяем, что показывать: значение или заметки
        if (cellData.value !== 0) {
            // Если есть основное значение, показываем его
            valueContainer.textContent = cellData.value;
            valueContainer.style.display = 'flex'; // Показать контейнер значения
            notesContainer.style.display = 'none';  // Скрыть контейнер заметок

            // Отмечаем ячейки, заданные изначально
            const puzzleChar = currentPuzzle[r * 9 + c];
            if (puzzleChar !== '.' && puzzleChar !== '0') {
                cell.classList.add('given');
            }
        } else if (cellData.notes.size > 0) {
            // Если значения нет, но есть заметки, показываем заметки
            valueContainer.style.display = 'none';  // Скрыть контейнер значения
            notesContainer.style.display = 'grid'; // Показать контейнер заметок (как сетку 3x3)
            notesContainer.innerHTML = ''; // Очистить предыдущие заметки
            // Создаем 9 div-ов для возможных заметок 1-9
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div');
                noteDigit.classList.add('note-digit');
                // Если заметка 'n' есть в Set, показываем ее, иначе пусто
                noteDigit.textContent = cellData.notes.has(n) ? n : '';
                notesContainer.appendChild(noteDigit);
            }
        } else {
            // Если нет ни значения, ни заметок - ячейка пустая
            valueContainer.textContent = '';
            valueContainer.style.display = 'flex'; // Показать пустой контейнер значения
            notesContainer.style.display = 'none';  // Скрыть контейнер заметок
        }

        // Добавляем контейнеры в ячейку
        cell.appendChild(valueContainer);
        cell.appendChild(notesContainer);

        // Добавляем классы для толстых границ
        cell.classList.remove('thick-border-bottom', 'thick-border-right');
        if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right');
        if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom');

        return cell; // Возвращаем созданный DOM-элемент
    }

    // --- Перерисовка ОДНОЙ ячейки (более эффективно, чем renderBoard) ---
    function renderCell(r, c) {
        const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
        if (oldCell) {
            const newCell = createCellElement(r, c); // Создаем новый DOM-элемент
            // Копируем важные классы состояния со старой ячейки на новую
            if (oldCell.classList.contains('selected')) newCell.classList.add('selected');
            if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect');
            if (oldCell.classList.contains('highlighted')) newCell.classList.add('highlighted'); // Копируем подсветку строки/столбца

            // Если эта ячейка была выделена, обновляем ссылку selectedCell
            if (selectedRow === r && selectedCol === c) {
                selectedCell = newCell;
            }
            // Заменяем старый элемент новым в DOM
            oldCell.replaceWith(newCell);
            // console.log(`Cell [${r}, ${c}] re-rendered.`);
        } else {
            // Этого не должно происходить при нормальной работе
            console.warn(`renderCell: Ячейка [${r}, ${c}] не найдена в DOM для перерисовки.`);
        }
    }

    // --- Вспомогательные функции ---
    // Получение правильного значения из решения
    function getSolutionValue(row, col) { if (!currentSolution) return null; const char = currentSolution[row * 9 + col]; return (char === '.' || char === '0') ? 0 : parseInt(char); }

    // Снятие выделения ячейки и подсветки строки/столбца
    function clearSelection() {
        // Убираем класс .selected с предыдущей выбранной ячейки
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        // Убираем подсветку со всех ранее подсвеченных ячеек
        boardElement.querySelectorAll('.cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
        // Сбрасываем переменные состояния
        selectedCell = null;
        selectedRow = -1;
        selectedCol = -1;
         console.log("Selection cleared.");
    }

    // Очистка подсветки неверных ячеек и статуса
    function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => { cell.classList.remove('incorrect'); }); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }

    // Обновление вида кнопки режима заметок
    function updateNoteToggleButtonState() {
        if (noteToggleButton) { // Проверка, что кнопка найдена
            if (isNoteMode) {
                noteToggleButton.classList.add('active'); // Добавляем класс для активного состояния
                noteToggleButton.title = "Режим заметок (ВКЛ)";
            } else {
                noteToggleButton.classList.remove('active');
                noteToggleButton.title = "Режим заметок (ВЫКЛ)";
            }
             console.log(`Note mode toggled: ${isNoteMode}`);
        } else {
            console.warn("Кнопка режима заметок не найдена.");
        }
    }

    // Новая функция для подсветки связанных ячеек (строка, столбец)
    function highlightRelatedCells(row, col) {
        // Можно добавить подсветку блока 3x3 позже, если нужно
        // const blockRowStart = Math.floor(row / 3) * 3;
        // const blockColStart = Math.floor(col / 3) * 3;

        boardElement.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);

            // Подсвечиваем строку и столбец
            if (cellRow === row || cellCol === col) {
                cell.classList.add('highlighted');
            }
        });
         console.log("Related cells highlighted.");
    }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки + подсветка) - ИСПРАВЛЕННАЯ ЛОГИКА
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell'); // Ищем ближайшую ячейку
        if (!target) {
             // Клик мимо ячеек ВНУТРИ доски - ничего не делаем
             console.log("Клик мимо ячейки.");
             return;
        }

        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

        // === Новая логика ===
        // 1. Если кликнули на ТУ ЖЕ САМУЮ ячейку, которая уже выделена
        if (target === selectedCell) {
            // Просто снимаем выделение и подсветку
            clearSelection();
        }
        // 2. Если кликнули на ДРУГУЮ ячейку (или ни одна не была выделена)
        else {
            // Сначала снимаем ЛЮБОЕ предыдущее выделение/подсветку
            clearSelection();

            // Запоминаем новую выбранную ячейку
            selectedCell = target;
            selectedRow = r;
            selectedCol = c;
            console.log(`Selected cell [${r}, ${c}]`);

            // Добавляем класс .selected только если ячейка НЕ изначальная
            if (!selectedCell.classList.contains('given')) {
                selectedCell.classList.add('selected');
            }

            // Подсвечиваем новую строку, столбец
            highlightRelatedCells(r, c);
        }
        // === Конец новой логики ===

        clearErrors(); // Убираем подсветку ошибок при любом клике/выборе
    });


    // Клик по цифровой панели (ввод/стирание/заметки)
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return; // Клик мимо кнопки

        // Обработка кнопки переключения режима заметок
        if (button.id === 'note-toggle-button') {
            isNoteMode = !isNoteMode; // Инвертируем флаг
            updateNoteToggleButtonState(); // Обновляем вид кнопки
            return; // Выходим, дальше ничего не делаем
        }

        // Если не выбрана ячейка или выбрана изначальная - ничего не делаем
        if (!selectedCell || selectedCell.classList.contains('given')) {
             console.log("Numpad click ignored: cell not selected or is given.");
             return;
        }

        clearErrors(); // Убираем ошибки при вводе/стирании

        const cellData = userGrid[selectedRow][selectedCol]; // Получаем данные ячейки
        let needsRender = false; // Флаг, нужно ли перерисовать ячейку

        // Обработка кнопки "Стереть"
        if (button.id === 'erase-button') {
            if (cellData.value !== 0) { // Если было значение - стираем его
                cellData.value = 0;
                needsRender = true;
                console.log(`Erased value at [${selectedRow}, ${selectedCol}]`);
            } else if (cellData.notes.size > 0) { // Если значения не было, но были заметки - стираем все заметки
                cellData.notes.clear();
                needsRender = true;
                console.log(`Cleared notes at [${selectedRow}, ${selectedCol}]`);
            }
        }
        // Обработка кнопок с цифрами
        else if (button.dataset.num) {
            const num = parseInt(button.dataset.num);

            if (isNoteMode) {
                // --- РЕЖИМ ЗАМЕТОК ---
                if (cellData.value === 0) { // Заметки можно ставить только в пустые ячейки
                    if (cellData.notes.has(num)) {
                        cellData.notes.delete(num); // Если заметка была - удаляем
                        console.log(`Removed note ${num} at [${selectedRow}, ${selectedCol}]`);
                    } else {
                        cellData.notes.add(num); // Если не было - добавляем
                        console.log(`Added note ${num} at [${selectedRow}, ${selectedCol}]`);
                    }
                    needsRender = true;
                } else {
                    console.log("Cannot add note to a cell with a value.");
                }
            } else {
                // --- РЕЖИМ ВВОДА ЦИФР ---
                if (cellData.value !== num) { // Если вводим новую цифру
                    cellData.value = num;
                    cellData.notes.clear(); // При вводе значения стираем заметки
                    needsRender = true;
                    console.log(`Set value ${num} at [${selectedRow}, ${selectedCol}]`);
                } else { // Если кликнули на ту же цифру, которая уже стоит - стираем ее
                    cellData.value = 0;
                    // Заметки не трогаем в этом случае
                    needsRender = true;
                    console.log(`Erased value ${num} (same click) at [${selectedRow}, ${selectedCol}]`);
                }
            }
        }

        // Если были изменения, перерисовываем ячейку
        if (needsRender) {
            renderCell(selectedRow, selectedCol);
        }
    });

     // Обработка нажатий клавиш клавиатуры
    document.addEventListener('keydown', (event) => {
        // Переключение режима заметок по 'N' или 'Т'
        if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') {
            // Убедимся, что фокус не в текстовом поле (если бы они были)
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            isNoteMode = !isNoteMode;
            updateNoteToggleButtonState();
            event.preventDefault(); // Предотвратить ввод 'n'/'т' если фокус где-то не там
            return;
        }

        // Игнорируем, если ячейка не выбрана или не изменяема
        if (!selectedCell || selectedCell.classList.contains('given')) return;

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false;

        // Обработка ввода цифр 1-9
        if (event.key >= '1' && event.key <= '9') {
            clearErrors();
            const num = parseInt(event.key);
            if (isNoteMode) { // Режим заметок
                if (cellData.value === 0) {
                    if (cellData.notes.has(num)) cellData.notes.delete(num);
                    else cellData.notes.add(num);
                    needsRender = true;
                }
            } else { // Режим ввода цифр
                if (cellData.value !== num) {
                    cellData.value = num;
                    cellData.notes.clear(); // Стираем заметки при вводе
                    needsRender = true;
                } else { // Повторное нажатие той же цифры - стирание
                    cellData.value = 0;
                    needsRender = true;
                }
            }
            event.preventDefault(); // Предотвратить стандартное действие (если есть)
        }
        // Обработка Backspace или Delete
        else if (event.key === 'Backspace' || event.key === 'Delete') {
            clearErrors();
            if (cellData.value !== 0) { // Стираем значение
                cellData.value = 0;
                needsRender = true;
            } else if (cellData.notes.size > 0) { // Или стираем заметки
                cellData.notes.clear();
                needsRender = true;
            }
            event.preventDefault();
        }

        // Перерисовываем ячейку, если были изменения
        if (needsRender) {
            renderCell(selectedRow, selectedCol);
        }
    });

    // Клик по кнопке "Проверить"
    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors();
        if (!currentSolution || !userGrid) return;

        let allCorrect = true;
        let boardComplete = true;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellData = userGrid[r][c];
                const userValue = cellData.value; // Проверяем только основные значения
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue;

                if (userValue === 0) {
                    boardComplete = false; // Не закончено
                } else if (!cellElement.classList.contains('given')) {
                    const solutionValue = getSolutionValue(r, c);
                    if (userValue !== solutionValue) {
                        cellElement.classList.add('incorrect'); // Подсветить ошибку
                        allCorrect = false;
                    }
                }
            }
        }

        // Вывод результата
        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!";
            statusMessageElement.className = 'correct';
            clearSelection(); // Снимаем выделение при успехе
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg';
        } else {
             statusMessageElement.textContent = "Пока все верно, но поле не заполнено.";
             statusMessageElement.className = '';
        }
    });

    // Клик по кнопке "Новая игра" - показывает модальное окно
    newGameButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Новая игра'");
        showDifficultyModal();
    });

    // Обработка кликов внутри модального окна выбора сложности
    if(modalButtonsContainer) {
        modalButtonsContainer.addEventListener('click', (event) => {
            const target = event.target.closest('button'); // Ищем нажатую кнопку
             if(!target) return;

            if (target.classList.contains('difficulty-button')) {
                const difficulty = target.dataset.difficulty;
                if (difficulty) {
                    console.log(`Выбрана сложность: ${difficulty}`);
                    hideDifficultyModal(); // Скрываем окно
                    initGame(difficulty); // Начинаем новую игру с выбранной сложностью
                }
            } else if (target.id === 'cancel-difficulty-button') { // Кнопка отмены
                console.log("Выбор сложности отменен.");
                hideDifficultyModal(); // Просто скрываем окно
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
        });
    } else {
         console.error("Оверлей модального окна не найден.");
    }


    // --- Инициализация Telegram Web App SDK (если используется) ---
     try {
         if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            // Telegram.WebApp.expand(); // Раскомментируйте для авто-расширения
            console.log("Telegram WebApp SDK инициализирован.");
        } else {
            console.log("Telegram WebApp SDK не найден (возможно, запуск вне Telegram).");
        }
     } catch (e) {
         console.error("Ошибка инициализации Telegram WebApp SDK:", e);
     }

    // --- Первый запуск игры при загрузке страницы ---
    initGame("medium"); // Начинаем со средней сложности по умолчанию

}); // Конец обработчика 'DOMContentLoaded'
