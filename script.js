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
    // Элементы модального окна
    const difficultyModal = document.getElementById('difficulty-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalButtonsContainer = difficultyModal.querySelector('.modal-buttons');
    const cancelDifficultyButton = document.getElementById('cancel-difficulty-button');

    // --- Переменные состояния игры ---
    let currentPuzzle = null;
    let currentSolution = null;
    let userGrid = []; // Массив 9x9 объектов { value: number, notes: Set<number> }
    let selectedCell = null;
    let selectedRow = -1;
    let selectedCol = -1;
    let isNoteMode = false;

    // --- Инициализация новой игры ---
    function initGame(difficulty = "medium") { /* ... (код без изменений) ... */ }

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
    boardElement.addEventListener('click', (event) => {
        const target = event.target.closest('.cell'); // Ищем ячейку
        if (!target) { // Клик мимо ячеек (внутри boardElement, но не на cell)
             // Не снимаем выделение здесь, чтобы можно было кликать на numpad
             // clearSelection(); // <- УБИРАЕМ это отсюда
             return;
        }

        // ! ИЗМЕНЕНИЕ: Проверяем, кликнули ли по УЖЕ выбранной ячейке
        if (selectedCell === target) {
            clearSelection(); // Снимаем выделение при повторном клике
            return; // Выходим
        }

        // --- Продолжаем, если клик был по НОВОЙ ячейке ---
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);

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

    // Клик по кнопке "Проверить" (без изменений)
    checkButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });

    // Клик по кнопке "Новая игра" -> Показать модальное окно (без изменений)
    newGameButton.addEventListener('click', () => { /* ... (код без изменений) ... */ });

    // Обработка кликов внутри модального окна (без изменений)
    modalButtonsContainer.addEventListener('click', (event) => { /* ... (код без изменений) ... */ });

    // Клик по оверлею для закрытия модального окна (без изменений)
    modalOverlay.addEventListener('click', () => { /* ... (код без изменений) ... */ });

    // ! НОВЫЙ ОБРАБОТЧИК: Клик по документу для снятия выделения
    document.addEventListener('click', (event) => {
        // Проверяем, есть ли вообще выделенная ячейка
        if (!selectedCell) {
            return;
        }

        // Проверяем, был ли клик ВНЕ доски и ВНЕ цифровой панели
        const isClickInsideBoard = boardElement.contains(event.target);
        const isClickInsideNumpad = numpad.contains(event.target);
        // Также не снимаем выделение, если кликнули на кнопки управления или статус
        const isClickInsideControls = checkButton.contains(event.target) || newGameButton.contains(event.target);
        const isClickInsideStatus = statusMessageElement.contains(event.target);
        // И не снимаем при клике на модалку или оверлей
        const isClickInsideModal = difficultyModal.contains(event.target) || modalOverlay.contains(event.target);

        if (!isClickInsideBoard && !isClickInsideNumpad && !isClickInsideControls && !isClickInsideStatus && !isClickInsideModal) {
            console.log("Клик вне целевых зон, снимаем выделение.");
            clearSelection();
        }
    });


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
function createCellElement(r, c) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; const cellData = userGrid[r][c]; const valueContainer = document.createElement('div'); valueContainer.classList.add('cell-value-container'); const notesContainer = document.createElement('div'); notesContainer.classList.add('cell-notes-container'); if (cellData.value !== 0) { valueContainer.textContent = cellData.value; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; const puzzleChar = currentPuzzle[r * 9 + c]; if (puzzleChar !== '.' && puzzleChar !== '0') { cell.classList.add('given'); } } else if (cellData.notes.size > 0) { valueContainer.style.display = 'none'; notesContainer.style.display = 'grid'; notesContainer.innerHTML = ''; for (let n = 1; n <= 9; n++) { const noteDigit = document.createElement('div'); noteDigit.classList.add('note-digit'); noteDigit.textContent = cellData.notes.has(n) ? n : ''; notesContainer.appendChild(noteDigit); } } else { valueContainer.textContent = ''; valueContainer.style.display = 'flex'; notesContainer.style.display = 'none'; } cell.appendChild(valueContainer); cell.appendChild(notesContainer); cell.classList.remove('thick-border-bottom', 'thick-border-right'); if ((c + 1) % 3 === 0 && c < 8) cell.classList.add('thick-border-right'); if ((r + 1) % 3 === 0 && r < 8) cell.classList.add('thick-border-bottom'); return cell; }
function renderCell(r, c) { const oldCell = boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`); if (oldCell) { const newCell = createCellElement(r, c); if (oldCell.classList.contains('selected')) newCell.classList.add('selected'); if (oldCell.classList.contains('incorrect')) newCell.classList.add('incorrect'); if (selectedRow === r && selectedCol === c) { selectedCell = newCell; } oldCell.replaceWith(newCell); } else { console.warn(`renderCell: Cell [${r}, ${c}] not found.`); } }
function getSolutionValue(row, col) { if (!currentSolution) return null; const char = currentSolution[row * 9 + col]; return (char === '.' || char === '0') ? 0 : parseInt(char); }
function clearErrors() { boardElement.querySelectorAll('.cell.incorrect').forEach(cell => { cell.classList.remove('incorrect'); }); statusMessageElement.textContent = ''; statusMessageElement.className = ''; }
function updateNoteToggleButtonState() { if (isNoteMode) { noteToggleButton.classList.add('active'); noteToggleButton.title = "Режим заметок (ВКЛ)"; } else { noteToggleButton.classList.remove('active'); noteToggleButton.title = "Режим заметок (ВЫКЛ)"; } }
// Обработчики для numpad, keydown, checkButton, newGameButton, modalButtonsContainer, modalOverlay - код уже включен в основной блок выше.
// Инициализация TWA SDK
try { if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); console.log("Telegram WebApp SDK initialized."); } else { console.log("Telegram WebApp SDK not found."); } } catch (e) { console.error("Error initializing TWA SDK:", e); }
// Запуск initGame() уже есть в основном блоке выше.
