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
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal.querySelector('.modal-buttons');
    const cancelDifficultyButton = document.getElementById('cancel-difficulty-button');
    const controlsElement = document.getElementById('controls'); // Добавим получение #controls

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = [];
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium") {
        console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`);
        try {
            if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
                throw new Error("Библиотека sudoku.js не загружена или неисправна.");
            }
            currentPuzzle = sudoku.generate(difficulty);
            if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`);
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

    // --- Функции для модального окна ---
    function showDifficultyModal() { /* ... (код без изменений) ... */ }
    function hideDifficultyModal() { /* ... (код без изменений) ... */ }
    // --- Преобразование строки в массив объектов ---
    function boardStringToObjectArray(boardString) { /* ... (код без изменений) ... */ }
    // --- Отрисовка ВСЕЙ доски ---
    function renderBoard() { /* ... (код без изменений) ... */ }
    // --- Создание DOM-элемента для ОДНОЙ ячейки ---
    function createCellElement(r, c) { /* ... (код без изменений) ... */ }
    // --- Перерисовка ОДНОЙ ячейки ---
    function renderCell(r, c) { /* ... (код без изменений) ... */ }
    // --- Вспомогательные функции ---
    function getSolutionValue(row, col) { /* ... (код без изменений) ... */ }
    function clearSelection() { /* ... (код без изменений) ... */ }
    function clearErrors() { /* ... (код без изменений) ... */ }
    function updateNoteToggleButtonState() { /* ... (код без изменений) ... */ }

    // --- Обработчики событий ---

    // Клик по доске (выбор ячейки + подсветка строки/столбца)
    // ! УПРОЩЕННАЯ ВЕРСИЯ (без обработки повторного клика здесь)
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell'); // Ищем ячейку
        if (!target) {
            // Клик внутри доски, но мимо ячейки - ничего не делаем
            return;
        }

        // --- Клик по ЛЮБОЙ ячейке (новой или старой - разберется clearSelection и document click) ---
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

        // Если кликнули по той же, выделение снимется обработчиком документа,
        // но нам нужно избежать повторной подсветки.
        if (selectedCell === target) {
             return;
        }

        // Снять старое выделение И подсветку строки/столбца
        clearSelection();

        // Запомнить новую ячейку и ее координаты
        selectedCell = target;
        selectedRow = r;
        selectedCol = c;

        // Добавляем класс .selected только если ячейка НЕ 'given'
        if (!selectedCell.classList.contains('given')) {
            selectedCell.classList.add('selected');
        }

        // Добавить класс .highlighted ко всем ячейкам в той же строке и столбце
        boardElement.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);
            if (cellRow === r || cellCol === c) {
                cell.classList.add('highlighted');
            }
        });

        clearErrors(); // Убрать подсветку ошибок при выборе
    });


    // Клик по цифровой панели (без изменений)
    numpad.addEventListener('click', (event) => { /* ... (код без изменений) ... */ });

     // Обработка нажатий клавиш (без изменений)
    document.addEventListener('keydown', (event) => { /* ... (код без изменений) ... */ });

    // --- Клик по документу для снятия выделения ---
    // ! УПРОЩЕННАЯ ЛОГИКА (без capturing phase)
    document.addEventListener('click', (event) => {
        // Если клик произошел ВНУТРИ доски или ВНУТРИ цифровой панели - ничего не делаем
        if (boardElement.contains(event.target) || numpad.contains(event.target)) {
            return;
        }

        // Дополнительно: если модальное окно открыто, не снимаем выделение при клике вне его
        // Это нужно, чтобы клик по оверлею не снял выделение ячейки ДО того, как сработает его собственный обработчик
        if (modalOverlay.style.display === 'block' || difficultyModal.style.display === 'block') {
            // Если клик был не по оверлею и не по модалке - тоже не снимаем выделение
             if(!modalOverlay.contains(event.target) && !difficultyModal.contains(event.target)){
                 return;
             }
             // Если клик был по оверлею или модалке - их собственные обработчики сработают
        }


        // Если клик был ВНЕ доски и ВНЕ numpad (и вне открытой модалки/оверлея)
        console.log("Клик вне доски/numpad/modal, снимаем выделение.");
        clearSelection();

    }); // Убрали 'true'


    // Клик по кнопке "Проверить" (без изменений)
    checkButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });
    // Клик по кнопке "Новая игра" -> Показать модальное окно (без изменений)
    newGameButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });
    // Обработка кликов внутри модального окна (без изменений)
    modalButtonsContainer.addEventListener('click', (event) => { /* ... (код без изменений) ... */ });
    // Клик по оверлею для закрытия модального окна (без изменений)
    modalOverlay.addEventListener('click', () => { /* ... (код без изменений) ... */ });
    // --- Инициализация Telegram Web App SDK --- (без изменений)
     try { /* ... */ } catch (e) { /* ... */ }
    // --- Первый запуск игры при загрузке страницы ---
    initGame();

}); // Конец 'DOMContentLoaded'


// --- КОД НЕИЗМЕНЕННЫХ ФУНКЦИЙ (ДЛЯ ПОЛНОТЫ) ---
function initGame(difficulty = "medium") { console.log(`Запуск initGame с уровнем сложности: ${difficulty}...`); try { if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') { throw new Error("Библиотека sudoku.js не загружена или неисправна."); } currentPuzzle = sudoku.generate(difficulty); if (!currentPuzzle) throw new Error(`Генерация (${difficulty}) не удалась`); currentSolution = sudoku.solve(currentPuzzle); if (!currentSolution) throw new Error("Не удалось найти решение"); userGrid = boardStringToObjectArray(currentPuzzle); renderBoard(); clearSelection(); statusMessageElement.textContent = ''; statusMessageElement.className = ''; isNoteMode = false; updateNoteToggleButtonState(); console.log("Новая игра успешно инициализирована."); } catch (error) { console.error("ОШИБКА в initGame:", error); statusMessageElement.textContent = "Ошибка генерации судоку! " + error.message; statusMessageElement.className = 'incorrect-msg'; boardElement.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить игру.</p>'; } }
function showDifficultyModal() { modalOverlay.style.display = 'block'; difficultyModal.style.display = 'block'; requestAnimationFrame(() => { modalOverlay.classList.add('visible'); difficultyModal.classList.add('visible'); }); console.log("Модальное окно выбора сложности показано."); }
function hideDifficultyModal() { modalOverlay.classList.remove('visible'); difficultyModal.classList.remove('visible'); setTimeout(() => { modalOverlay.style.display = 'none'; difficultyModal.style.display = 'none'; console.log("Модальное окно скрыто."); }, 300); }
function boardStringToObjectArray(boardString) { const grid = []; for (let r = 0; r < 9; r++) { grid[r] = []; for (let c = 0; c < 9; c++) { const char = boardString[r * 9 + c]; const value = (char === '.' || char === '0') ? 0 : parseInt(char); grid[r][c] = { value: value, notes: new Set() }; } } return grid; }
function renderBoard() { boardElement.innerHTML = ''; if (!userGrid || userGrid.length !== 9) return; for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) { const cellElement = createCellElement(r, c); boardElement.appendChild(cellElement); } } console.log("Доска перерисована."); }
function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cell
