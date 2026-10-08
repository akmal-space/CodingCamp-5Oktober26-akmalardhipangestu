/* ============================================================
   app.js  —  Dashboard logic
   Sections:
     1. Greeting & Clock
     2. Focus Timer
     3. To-Do List
     4. Quick Links
   All persistent data stored in localStorage.
   ============================================================ */

'use strict';

/* ============================================================
   0. THEME TOGGLE  (dark ↔ light)
   ============================================================ */

const THEME_KEY      = 'dashboard_theme';
const themeToggleBtn = document.getElementById('theme-toggle');

/**
 * Applies the given theme ('dark' | 'light') to <body>
 * and updates the toggle button label + icon.
 */
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
    // Button shows current state "Light" with sun on the right
    themeToggleBtn.innerHTML = 'Light <span aria-hidden="true">☀️</span>';
  } else {
    document.body.classList.remove('light');
    // Button shows current state "Dark" with moon on the left
    themeToggleBtn.innerHTML = '<span aria-hidden="true">🌙</span> Dark';
  }
  themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
}

/** Toggles between dark and light, persists to localStorage. */
function toggleTheme() {
  const current = document.body.classList.contains('light') ? 'light' : 'dark';
  const next    = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

themeToggleBtn.addEventListener('click', toggleTheme);

// Load saved theme on startup (default: dark)
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

/* ============================================================
   1. GREETING & CLOCK
   ============================================================ */

const clockEl    = document.getElementById('clock');
const greetingEl = document.getElementById('greeting');     // the <p> wrapper
const greetingTextEl = document.getElementById('greeting-text'); // static part only
const dateEl     = document.getElementById('date-display');

// Name customization elements
const NAME_KEY        = 'dashboard_user_name';
const nameInputEl     = document.getElementById('greeting-name-input');
const editNameBtnEl   = document.getElementById('greeting-edit-btn');
const saveNameBtnEl   = document.getElementById('greeting-save-btn');

/** Loads the saved name from localStorage (empty string if none). */
function loadName() {
  return localStorage.getItem(NAME_KEY) || '';
}

/** Saves the name to localStorage. */
function saveName(name) {
  localStorage.setItem(NAME_KEY, name);
}

/**
 * Returns the static greeting prefix based on the hour.
 * e.g. "☀️  Good morning," — the name lives in the input next to it.
 */
function getGreetingText(hour) {
  if (hour >= 5  && hour < 12) return '☀️  Good morning,';
  if (hour >= 12 && hour < 17) return '🌤  Good afternoon,';
  if (hour >= 17 && hour < 21) return '🌆  Good evening,';
  return '🌙  Good night,';
}

/** Formats a number to always be 2 digits (e.g. 9 → "09"). */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** Sizes the name input to exactly hug its content (or placeholder). */
function resizeNameInput() {
  const text = nameInputEl.value || nameInputEl.placeholder;
  // Copy the input's real computed font so the ruler measures correctly
  const cs = getComputedStyle(nameInputEl);
  const ruler = document.createElement('span');
  ruler.style.cssText = [
    'position:absolute',
    'top:-9999px',
    'left:-9999px',
    'visibility:hidden',
    'white-space:pre',
    `font-size:${cs.fontSize}`,
    `font-family:${cs.fontFamily}`,
    `font-weight:${cs.fontWeight}`,
    `letter-spacing:${cs.letterSpacing}`,
  ].join(';');
  ruler.textContent = text;
  document.body.appendChild(ruler);
  const w = ruler.offsetWidth;
  document.body.removeChild(ruler);
  nameInputEl.style.width = (w + 8) + 'px'; // +8px: padding + caret room
}

/** Updates the clock, static greeting text, and date every second. */
function updateClock() {
  const now  = new Date();
  const hour = now.getHours();
  const min  = now.getMinutes();
  const sec  = now.getSeconds();

  clockEl.textContent        = `${pad(hour)}:${pad(min)}:${pad(sec)}`;
  greetingTextEl.textContent = getGreetingText(hour);
  dateEl.textContent         = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

/** Switches the name input into edit mode. */
function enableNameEdit() {
  nameInputEl.removeAttribute('readonly');
  nameInputEl.focus();
  nameInputEl.select();
  editNameBtnEl.classList.add('hidden');
  saveNameBtnEl.classList.remove('hidden');
}

/** Saves the name and returns input to read-only mode. */
function confirmNameSave() {
  const name = nameInputEl.value.trim();
  saveName(name);
  nameInputEl.value = name;
  nameInputEl.setAttribute('readonly', '');
  saveNameBtnEl.classList.add('hidden');
  editNameBtnEl.classList.remove('hidden');
  resizeNameInput();
}

editNameBtnEl.addEventListener('click', enableNameEdit);
saveNameBtnEl.addEventListener('click', confirmNameSave);
nameInputEl.addEventListener('input', resizeNameInput);
nameInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter')  confirmNameSave();
  if (e.key === 'Escape') {
    // Revert to saved value without saving
    nameInputEl.value = loadName();
    nameInputEl.setAttribute('readonly', '');
    saveNameBtnEl.classList.add('hidden');
    editNameBtnEl.classList.remove('hidden');
    resizeNameInput();
  }
});

// Initialise name input with saved value and correct width
nameInputEl.value = loadName();
// Delay resize until fonts are loaded
requestAnimationFrame(resizeNameInput);

// Initialise clock immediately, then tick every second.
updateClock();
setInterval(updateClock, 1000);


/* ============================================================
   2. FOCUS TIMER
   ============================================================ */

const TIMER_DURATION = 25 * 60; // 25 minutes in seconds

const timerDisplayEl = document.getElementById('timer-display');
const timerStatusEl  = document.getElementById('timer-status');
const btnStart       = document.getElementById('btn-start');
const btnStop        = document.getElementById('btn-stop');
const btnReset       = document.getElementById('btn-reset');
const btnMinus5      = document.getElementById('btn-minus5');
const btnPlus5       = document.getElementById('btn-plus5');

let timerInterval  = null; // setInterval handle
let timeRemaining  = TIMER_DURATION;
let timerRunning   = false;

/** Renders `timeRemaining` into the display element. */
function renderTimer() {
  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  timerDisplayEl.textContent = `${pad(m)}:${pad(s)}`;
}

/** Ticks the timer down by one second. */
function timerTick() {
  if (timeRemaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning  = false;
    timerDisplayEl.classList.remove('running');
    timerDisplayEl.classList.add('done');
    timerStatusEl.textContent = '🎉 Session complete! Great work!';
    // Browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification('Focus session complete!', {
        body: 'Your 25-minute focus session is done. Time for a break!',
      });
    }
    return;
  }
  timeRemaining -= 1;
  renderTimer();
}

/** Starts the timer. */
function startTimer() {
  if (timerRunning) return;
  // Request notification permission lazily
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  timerRunning = true;
  timerDisplayEl.classList.add('running');
  timerDisplayEl.classList.remove('done');
  timerStatusEl.textContent = '🔥 Stay focused…';
  timerInterval = setInterval(timerTick, 1000);
}

/** Stops (pauses) the timer. */
function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  timerDisplayEl.classList.remove('running');
  timerStatusEl.textContent = '⏸ Paused';
}

/** Resets the timer back to 25:00. */
function resetTimer() {
  stopTimer();
  timeRemaining = TIMER_DURATION;
  renderTimer();
  timerDisplayEl.classList.remove('running', 'done');
  timerStatusEl.textContent = 'Ready to focus';
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  stopTimer);
btnReset.addEventListener('click', resetTimer);

/**
 * Adjusts the remaining time by `delta` seconds.
 * Minimum 1 minute (60 s); no upper cap enforced.
 * Works whether the timer is running or paused.
 */
function adjustTimer(deltaMinutes) {
  const delta = deltaMinutes * 60;
  timeRemaining = Math.max(60, timeRemaining + delta);
  renderTimer();
  // If already done, un-mark done state after adjustment
  timerDisplayEl.classList.remove('done');
  if (timerRunning) timerDisplayEl.classList.add('running');
}

btnMinus5.addEventListener('click', () => adjustTimer(-5));
btnPlus5.addEventListener('click',  () => adjustTimer(+5));

// Initial render
renderTimer();


/* ============================================================
   3. TO-DO LIST
   ============================================================ */

const TODOS_KEY      = 'dashboard_todos';
const todoListEl     = document.getElementById('todo-list');
const todoInputEl    = document.getElementById('todo-input');
const todoAddBtnEl   = document.getElementById('todo-add-btn');
const todoEmptyEl    = document.getElementById('todo-empty');
const todoWarningEl  = document.getElementById('todo-warning');

// Edit modal elements
const editModalEl    = document.getElementById('edit-modal');
const editInputEl    = document.getElementById('edit-input');
const editSaveBtnEl  = document.getElementById('edit-save-btn');
const editCancelBtnEl = document.getElementById('edit-cancel-btn');

let todos       = loadTodos();
let editingId   = null; // id of the task currently being edited

/** Loads todos from localStorage; returns an array. */
function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(TODOS_KEY)) || [];
  } catch {
    return [];
  }
}

/** Saves the current todos array to localStorage. */
function saveTodos() {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

/** Generates a simple unique id. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Shows the duplicate-task warning, auto-hides after 3 s. */
let warningTimeout = null;
function showTodoWarning(text) {
  todoWarningEl.querySelector('#todo-warning-text').textContent = text;
  todoWarningEl.classList.add('visible');
  todoInputEl.classList.add('border-yellow-500');
  clearTimeout(warningTimeout);
  warningTimeout = setTimeout(hideTodoWarning, 3000);
}

function hideTodoWarning() {
  todoWarningEl.classList.remove('visible');
  todoInputEl.classList.remove('border-yellow-500');
}

/** Adds a new task, rejecting duplicates (case-insensitive). */
function addTodo() {
  const text = todoInputEl.value.trim();
  if (!text) return;

  // Duplicate check — compare case-insensitively
  const isDuplicate = todos.some(
    t => t.text.toLowerCase() === text.toLowerCase()
  );
  if (isDuplicate) {
    showTodoWarning(`"${text}" already exists in your list.`);
    todoInputEl.select();
    return;
  }

  hideTodoWarning();
  todos.push({ id: uid(), text, done: false });
  saveTodos();
  renderTodos();
  todoInputEl.value = '';
  todoInputEl.focus();
}

/** Toggles the done state of a task. */
function toggleTodo(id) {
  const task = todos.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTodos();
  renderTodos();
}

/** Deletes a task. */
function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

/** Opens the edit modal for a task. */
function openEditModal(id) {
  const task = todos.find(t => t.id === id);
  if (!task) return;
  editingId        = id;
  editInputEl.value = task.text;
  editModalEl.classList.remove('hidden');
  editInputEl.focus();
  editInputEl.select();
}

/** Closes the edit modal. */
function closeEditModal() {
  editingId = null;
  editModalEl.classList.add('hidden');
}

/** Saves the edited task text. */
function saveEdit() {
  const newText = editInputEl.value.trim();
  if (!newText || !editingId) return;
  const task = todos.find(t => t.id === editingId);
  if (task) {
    task.text = newText;
    saveTodos();
    renderTodos();
  }
  closeEditModal();
}

/** Builds and renders the todo list into the DOM. */
function renderTodos() {
  todoListEl.innerHTML = '';

  if (todos.length === 0) {
    todoEmptyEl.classList.remove('hidden');
    return;
  }
  todoEmptyEl.classList.add('hidden');

  todos.forEach(task => {
    const li = document.createElement('li');
    li.className  = 'todo-item';
    li.dataset.id = task.id;

    // Checkbox
    const cb = document.createElement('input');
    cb.type      = 'checkbox';
    cb.className = 'todo-checkbox';
    cb.checked   = task.done;
    cb.setAttribute('aria-label', `Mark "${task.text}" as done`);
    cb.addEventListener('change', () => toggleTodo(task.id));

    // Text
    const span = document.createElement('span');
    span.className = 'todo-text' + (task.done ? ' done' : '');
    span.textContent = task.text;

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit task';
    editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn delete';
    delBtn.textContent = '🗑️';
    delBtn.title = 'Delete task';
    delBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
    delBtn.addEventListener('click', () => deleteTodo(task.id));

    actions.append(editBtn, delBtn);
    li.append(cb, span, actions);
    todoListEl.appendChild(li);
  });
}

// Event listeners
todoAddBtnEl.addEventListener('click', addTodo);
todoInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
todoInputEl.addEventListener('input',   hideTodoWarning);

editSaveBtnEl.addEventListener('click',  saveEdit);
editCancelBtnEl.addEventListener('click', closeEditModal);
editInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter')  saveEdit();
  if (e.key === 'Escape') closeEditModal();
});
// Close modal when clicking the backdrop
editModalEl.addEventListener('click', e => {
  if (e.target === editModalEl) closeEditModal();
});

// Initial render
renderTodos();


/* ============================================================
   4. QUICK LINKS
   ============================================================ */

const LINKS_KEY        = 'dashboard_links';
const addLinkBtnEl     = document.getElementById('add-link-btn');
const linkFormEl       = document.getElementById('link-form');
const linkNameInputEl  = document.getElementById('link-name-input');
const linkUrlInputEl   = document.getElementById('link-url-input');
const linkSaveBtnEl    = document.getElementById('link-save-btn');
const linkCancelBtnEl  = document.getElementById('link-cancel-btn');
const linksGridEl      = document.getElementById('links-grid');
const linksEmptyEl     = document.getElementById('links-empty');

let links = loadLinks();

/** Loads links from localStorage; returns an array. */
function loadLinks() {
  try {
    return JSON.parse(localStorage.getItem(LINKS_KEY)) || [];
  } catch {
    return [];
  }
}

/** Saves the current links array to localStorage. */
function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

/** Ensures a URL has a scheme. */
function normaliseUrl(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

/** Saves a new link from the form inputs. */
function saveLink() {
  const name = linkNameInputEl.value.trim();
  const url  = normaliseUrl(linkUrlInputEl.value.trim());

  if (!name || !url) {
    alert('Please enter both a label and a URL.');
    return;
  }

  links.push({ id: uid(), name, url });
  saveLinks();
  renderLinks();
  hideLinkForm();
}

/** Deletes a link by id. */
function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

/** Shows the add-link form. */
function showLinkForm() {
  linkFormEl.classList.remove('hidden');
  linkNameInputEl.value = '';
  linkUrlInputEl.value  = '';
  linkNameInputEl.focus();
}

/** Hides the add-link form. */
function hideLinkForm() {
  linkFormEl.classList.add('hidden');
}

/** Renders all link chips into the grid. */
function renderLinks() {
  linksGridEl.innerHTML = '';

  if (links.length === 0) {
    linksEmptyEl.classList.remove('hidden');
    return;
  }
  linksEmptyEl.classList.add('hidden');

  links.forEach(link => {
    // Wrapper chip (acts as anchor + delete container)
    const chip = document.createElement('div');
    chip.className  = 'link-chip';
    chip.dataset.id = link.id;

    // Clickable anchor
    const anchor = document.createElement('a');
    anchor.href          = link.url;
    anchor.target        = '_blank';
    anchor.rel           = 'noopener noreferrer';
    anchor.textContent   = link.name;
    anchor.className     = 'flex-1';
    anchor.style.color   = 'inherit';
    anchor.style.textDecoration = 'none';

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className   = 'link-chip-delete';
    delBtn.textContent = '✕';
    delBtn.title       = `Remove ${link.name}`;
    delBtn.setAttribute('aria-label', `Remove link: ${link.name}`);
    delBtn.addEventListener('click', e => {
      e.preventDefault();
      deleteLink(link.id);
    });

    chip.append(anchor, delBtn);
    linksGridEl.appendChild(chip);
  });
}

// Event listeners
addLinkBtnEl.addEventListener('click',   showLinkForm);
linkCancelBtnEl.addEventListener('click', hideLinkForm);
linkSaveBtnEl.addEventListener('click',  saveLink);
linkUrlInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') saveLink(); });
linkNameInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') linkUrlInputEl.focus(); });

// Initial render
renderLinks();
