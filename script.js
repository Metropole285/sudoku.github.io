// Убедитесь, что файл sudoku.js (или sudoku.min.js) подключен в index.html ПЕРЕД этим скриптом.
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
    let currentPuzzle = null; // Головоломка в виде строки
    let currentSolution = null; // Решение головоломки в виде строки
    let userGrid = []; // Массив 9x9 объектов { value: number, notes: Set<number> }
    let selectedCell = null; // Ссылка на выбранный DOM-элемент ячейки (<div>)
    let selectedRow = -1;    // Индекс строки выбранной ячейки
    let selectedCol = -1;    // Индекс колонки выбранной ячейки
    let isNoteMode = false; // Флаг: включен ли режим ввода заметок

    // --- Инициализация новой игры ---
    function initGame() {
        console.log("Запуск initGame...");
        try {
            // Проверка наличия библиотеки
            if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                throw new Error("Библиотека sudoku.js не загружена или неисправна.");
            }
            console.log("Библиотека sudoku найдена.");

            // Генерация и решение
            currentPuzzle = sudoku.generate("medium"); // Можно выбрать сложность
            if (!currentPuzzle) throw new Error("Генерация не удалась");
            currentSolution = sudoku.solve(currentPuzzle);
            if (!currentSolution) throw new Error("Не удалось найти решение");

            // Инициализация userGrid объектами
            userGrid = boardStringToObjectArray(currentPuzzle);

            renderBoard(); // Полная отрисовка доски
            clearSelection(); // Сброс выделения
            statusMessageElement.textContent = ''; // Очистка статуса
            statusMessageElement.className = '';
            isNoteMode = false; // Выключаем режим заметок по умолчанию
            updateNoteToggleButtonState(); // Обновляем вид кнопки заметок
            console.log("Новая игра успешно инициализирована.");

        } catch (error) {
            console.error("ОШИБКА в initGame:", error);
            statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message;
            statusMessageElement.className = 'incorrect-msg';
            boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>';
        }
    }

    // --- Преобразование строки головоломки в массив объектов ---
    function boardStringToObjectArray(boardString) {
        const grid = [];
        for (let r = 0; r < 9; r++) {
            grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const char = boardString[r * 9 + c];
                const value = (char === '.' || char === '0') ? 0 : parseInt(char);
                // Каждая ячейка - объект со значением и набором заметок
                grid[r][c] = {
                    value: value,
                    notes: new Set() // Изначально заметки пустые
                };
            }
        }
        return grid;
    }

    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() {
        boardElement.innerHTML = ''; // Очищаем старую доску
        if (!userGrid || userGrid.length !== 9) {
             console.error("renderBoard: Некорректные данные userGrid.");
             return;
        }
        // Создаем и добавляем каждую ячейку
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
        // Создаем основной div ячейки
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = r;
        cell.dataset.col = c;

        const cellData = userGrid[r][c]; // Данные {value, notes} для этой ячейки

        // Создаем контейнер для основного значения
        const valueContainer = document.createElement('div');
        valueContainer.classList.add('cell-value-container');

        // Создаем контейнер для сетки заметок
        const notesContainer = document.createElement('div');
        notesContainer.classList.add('cell-notes-container');

        // Определяем, что показывать: значение или заметки
        if (cellData.value !== 0) { // Приоритет у основного значения
            valueContainer.textContent = cellData.value;
            valueContainer.style.display = 'flex'; // Показать контейнер значения
            notesContainer.style.display = 'none';  // Скрыть контейнер заметок
            // Отмечаем, если это изначальная цифра
            const puzzleChar = currentPuzzle[r * 9 + c];
            if (puzzleChar !== '.' && puzzleChar !== '0') {
                cell.classList.add('given');
            }
        } else if (cellData.notes.size > 0) { // Если нет значения, но есть заметки
            valueContainer.style.display = 'none';  // Скрыть контейнер значения
            notesContainer.style.display = 'grid'; // Показать контейнер заметок
            // Заполняем сетку 3x3 для заметок
            notesContainer.innerHTML = ''; // Очищаем предыдущие заметки
            for (let n = 1; n <= 9; n++) {
                const noteDigit = document.createElement('div');
                noteDigit.classList.add('note-digit');
                noteDigit.textContent = cellData.notes.has(n) ? n : ''; // Показать цифру, если она есть в Set
                notesContainer.appendChild(noteDigit);
            }
        } else { // Пустая ячейка (ни значения, ни заметок)
            valueContainer.textContent = '';
            valueContainer.style.display = 'flex'; // Показать пустой контейнер значения
            notesContainer.style.display = 'none';  // Скрыть контейнер заметок
        }

        // Добавляем оба контейнера (один из них будет скрыт через CSS)
        cell.appendChild(valueContainer);
        cell.appendChild(notesContainer);

        // Добавляем классы для толстых границ блоков
        cell.classList.remove('thick-border-bottom', 'thick-border-right');
        if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right');
        if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom');

        return cell; // Возвращаем созданный элемент
    }

    // --- Перерисовка только ОДНОЙ измененной ячейки ---
    function renderCell(r, c) {
        // Находим старый DOM-элемент ячейки
        const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
        if (oldCell) {
            // Создаем новый DOM-элемент с актуальными данными
            const newCell = createCellElement(r, c);
            // Копируем классы состояний (selected, incorrect), если они были
            if (oldCell.classList.contains('selected')) newCell.classList.add('selected');
            if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect');
            // Если эта ячейка была выбрана, обновляем ссылку selectedCell
            if (selectedRow === r && selectedCol === c) {
                selectedCell = newCell;
            }
            // Заменяем старый элемент новым в DOM
            oldCell.replaceWith(newCell);
        } else {
            console.warn(`renderCell: Не найдена ячейка [${r}, ${c}] для перерисовки.`);
        }
    }

    // --- Вспомогательные функции ---

    // Получение правильного значения из строки-решения
    function getSolutionValue(row, col) {
        if (!currentSolution) return null;
        const char = currentSolution[row * 9 + col];
        return (char === '.' || char === '0') ? 0 : parseInt(char);
    }

    // Снятие выделения с ячейки
    function clearSelection() {
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        selectedCell = null;
        selectedRow = -1;
        selectedCol = -1;
    }

    // Очистка подсветки ошибок
    function clearErrors() {
        boardElement.querySelectorAll('.cell.incorrect').forEach(cell => {
            cell.classList.remove('incorrect');
        });
        statusMessageElement.textContent = '';
        statusMessageElement.className = '';
    }

    // Обновление вида кнопки режима заметок
    function updateNoteToggleButtonState() {
        if (isNoteMode) {
            noteToggleButton.classList.add('active'); // Добавляем класс для CSS
            noteToggleButton.title = "Режим заметок (ВКЛ)"; // Всплывающая подсказка
        } else {
            noteToggleButton.classList.remove('active'); // Убираем класс
            noteToggleButton.title = "Режим заметок (ВЫКЛ)";
        }
    }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки)
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell'); // Ищем ячейку, даже если кликнули на дочерний элемент
        if (!target) { // Клик мимо ячеек
             clearSelection();
             return;
        }

        // Проверяем, что ячейка не изначальная
        if (!target.classList.contains('given')) {
            clearSelection(); // Снять старое выделение
            selectedCell = target; // Запомнить новую
            selectedRow = parseInt(target.dataset.row);
            selectedCol = parseInt(target.dataset.col);
            selectedCell.classList.add('selected'); // Выделить
            clearErrors();
        } else {
            // Кликнули на изначальную цифру
            clearSelection(); // Просто снять выделение
        }
    });

    // Клик по цифровой панели
    numpad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return; // Клик мимо кнопки

        // --- Обработка кнопки переключения режима ---
        if (button.id === 'note-toggle-button') {
            isNoteMode = !isNoteMode; // Переключаем режим
            updateNoteToggleButtonState(); // Обновляем вид кнопки
            console.log("Режим заметок:", isNoteMode ? "ВКЛ" : "ВЫКЛ");
            return; // Больше ничего не делаем
        }

        // --- Обработка остальных кнопок (только если ячейка выбрана) ---
        if (!selectedCell) {
            console.log("Клик по кнопке, но ячейка не выбрана.");
            return;
        }

        clearErrors(); // Убираем ошибки при любом действии с ячейкой
        const cellData = userGrid[selectedRow][selectedCol]; // Получаем данные {value, notes}
        let needsRender = false; // Флаг, нужно ли перерисовывать ячейку

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
        if (!selectedCell) return; // Игнорируем, если ячейка не выбрана

        const cellData = userGrid[selectedRow][selectedCol];
        let needsRender = false; // Флаг для перерисовки

        // Цифры 1-9
        if (event.key >= '1' && event.key <= '9') {
            clearErrors();
            const num = parseInt(event.key);
            if (isNoteMode) {
                // Режим заметок
                if (cellData.value === 0) { // Только если нет основного значения
                    if (cellData.notes.has(num)) cellData.notes.delete(num);
                    else cellData.notes.add(num);
                    needsRender = true;
                }
            } else {
                // Обычный режим
                if (cellData.value !== num) { // Ставим новое значение
                     cellData.value = num;
                     // НЕ стираем заметки
                     needsRender = true;
                } else { // Повторное нажатие той же цифры - стираем
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
        // Переключение режима заметок клавишей 'N' или 'Т' (русская)
        else if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') {
             isNoteMode = !isNoteMode;
             updateNoteToggleButtonState();
             event.preventDefault(); // Предотвратить ввод буквы, если фокус на input (не наш случай)
             console.log("Режим заметок переключен клавиатурой:", isNoteMode ? "ВКЛ" : "ВЫКЛ");
        }
        // Стрелки можно добавить для навигации позже
        // else if (event.key.startsWith('Arrow')) { ... }

        // Перерисовываем ячейку, если были изменения
        if (needsRender) {
            renderCell(selectedRow, selectedCol);
        }
    });

    // Клик по кнопке "Проверить" (проверяет только основные значения)
    checkButton.addEventListener('click', () => {
        console.log("Нажата кнопка 'Проверить'");
        clearErrors(); // Сначала убираем старую подсветку ошибок
        if (!currentSolution || !userGrid) {
             console.error("Нет данных для проверки!");
             statusMessageElement.textContent = "Ошибка: нет данных для проверки.";
             statusMessageElement.className = 'incorrect-msg';
             return;
        }

        let allCorrect = true; // Флаг: все ли заполненные ячейки верны
        let boardComplete = true; // Флаг: все ли ячейки заполнены (основным значением)

        // Проходим по всем ячейкам доски
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellData = userGrid[r][c]; // Получаем объект
                const userValue = cellData.value; // Проверяем только основное значение
                const cellElement = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (!cellElement) continue; // На всякий случай

                // Ячейка считается незаполненной, если нет основного значения
                if (userValue === 0) {
                    boardComplete = false;
                    // Заметки не влияют на завершенность
                } else if (!cellElement.classList.contains('given')) {
                    // Если ячейка заполнена пользователем (не изначальная)
                    const solutionValue = getSolutionValue(r, c); // Получаем правильное значение
                    if (userValue !== solutionValue) {
                        // Если значения не совпадают - это ошибка
                        cellElement.classList.add('incorrect'); // Подсвечиваем ячейку
                        allCorrect = false; // Ставим флаг, что есть ошибки
                    }
                }
            }
        }

        // Вывод результата проверки
        if (allCorrect && boardComplete) {
            statusMessageElement.textContent = "Поздравляем! Судоку решено верно!";
            statusMessageElement.className = 'correct'; // Зеленый цвет
            clearSelection(); // Снимаем выделение при полном успехе
        } else if (!allCorrect) {
            statusMessageElement.textContent = "Найдены ошибки. Неверные ячейки выделены.";
            statusMessageElement.className = 'incorrect-msg'; // Красный цвет
        } else { // allCorrect = true, но boardComplete = false
             statusMessageElement.textContent = "Пока все верно, но поле не заполнено до конца.";
             statusMessageElement.className = ''; // Обычный цвет
        }
    });

    // Клик по кнопке "Новая игра"
    newGameButton.addEventListener('click', () => {
        // Спрашиваем подтверждение у пользователя
        if (window.confirm("Начать новую игру? Текущий прогресс будет потерян.")) {
            console.log("Нажата кнопка 'Новая игра'");
            initGame(); // Запускаем инициализацию заново
        } else {
            console.log("Новая игра отменена пользователем.");
        }
    });

    // --- Инициализация Telegram Web App SDK (если используется) ---
     try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready(); // Сообщаем Telegram, что приложение готово
            // window.Telegram.WebApp.expand(); // Раскомментируйте, если хотите развернуть на весь экран
            console.log("Telegram WebApp SDK инициализирован.");
        } else {
            // Это нормально, если вы запускаете не внутри Telegram
            console.log("Telegram WebApp SDK не найден (запуск вне Telegram?).");
        }
     } catch (e) {
         // Обработка возможных ошибок инициализации SDK
         console.error("Ошибка инициализации Telegram WebApp SDK:", e);
     }

    // --- Первый запуск игры при загрузке страницы ---
    initGame();

}); // Конец обработчика 'DOMContentLoaded'
