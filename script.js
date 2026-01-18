const state = {
    questions: [],
    currentIndex: 0,
    score: 0,
    timer: null,
    timeLeft: 15,
    userAnswers: [],
    username: '',
    locked: false
};

const TIMER_DURATION = 15;
const STORAGE_KEY_SCORE = 'trivia_high_score';
const STORAGE_KEY_NAME = 'trivia_username';

const el = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    loading: document.getElementById('loading-spinner'),

    loginForm: document.getElementById('login-form'),
    username: document.getElementById('username'),
    category: document.getElementById('category-select'),
    difficulty: document.getElementById('difficulty-select'),
    highScore: document.getElementById('high-score'),

    playerName: document.getElementById('player-name-display'),
    questionText: document.getElementById('question-text'),
    currentNum: document.getElementById('current-q-num'),
    options: document.getElementById('options-container'),
    score: document.getElementById('score-display'),
    time: document.getElementById('time-left'),
    progress: document.getElementById('quiz-progress-fill'),
    count: document.getElementById('question-count'),

    skip: document.getElementById('skip-btn'),
    next: document.getElementById('next-btn'),
    restart: document.getElementById('restart-btn'),

    finalScore: document.getElementById('final-score'),
    greeting: document.getElementById('greeting-msg'),
    achievementTitle: document.getElementById('achievement-title'),
    achievementBadge: document.querySelector('.badge-icon'),

    summary: document.getElementById('result-summary'),

    soundCorrect: document.getElementById('sound-correct'),
    soundWrong: document.getElementById('sound-wrong')
};



document.addEventListener('DOMContentLoaded', async () => {
    loadLocalData();
    await loadCategories();
    bindEvents();
});

function bindEvents() {
    el.loginForm.addEventListener('submit', startQuizHandler);
    el.skip.addEventListener('click', () => finishQuestion('SKIPPED'));
    el.next.addEventListener('click', nextQuestion);
    el.restart.addEventListener('click', () => location.reload());
}

/* ---------------- UTILS ---------------- */

function decodeHTML(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

function switchScreen(from, to) {
    from.classList.remove('active');
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.classList.add('active');
}

/* ---------------- STORAGE ---------------- */

function loadLocalData() {
    el.username.value = localStorage.getItem(STORAGE_KEY_NAME) || '';
    el.highScore.textContent = localStorage.getItem(STORAGE_KEY_SCORE) || 0;
}

/* ---------------- API ---------------- */

async function loadCategories() {
    const res = await fetch('https://opentdb.com/api_category.php');
    const data = await res.json();
    data.trivia_categories.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        el.category.appendChild(o);
    });
}

/* ---------------- QUIZ FLOW ---------------- */

async function startQuizHandler(e) {
    e.preventDefault();

    state.username = el.username.value.trim();
    if (!state.username) return;

    localStorage.setItem(STORAGE_KEY_NAME, state.username);
    el.playerName.textContent = state.username;

    switchScreen(el.start, el.loading);

    let url = `https://opentdb.com/api.php?amount=10&type=multiple`;
    if (el.category.value) url += `&category=${el.category.value}`;
    if (el.difficulty.value) url += `&difficulty=${el.difficulty.value}`;

    const res = await fetch(url);
    const data = await res.json();

    state.questions = data.results;
    state.currentIndex = 0;
    state.score = 0;
    state.userAnswers = [];

    switchScreen(el.loading, el.quiz);
    showQuestion();
}

function showQuestion() {
    clearInterval(state.timer);
    state.locked = false;

    const q = state.questions[state.currentIndex];

    el.questionText.innerHTML = decodeHTML(q.question);
    el.currentNum.textContent = state.currentIndex + 1;
    el.count.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    el.score.textContent = state.score;

    el.progress.style.width =
        `${((state.currentIndex + 1) / state.questions.length) * 100}%`;

    el.options.innerHTML = '';
    el.next.classList.add('hidden');
    el.skip.classList.remove('hidden');

    const options = [...q.incorrect_answers, q.correct_answer]
        .map(decodeHTML)
        .sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => finishQuestion(opt, btn);
        el.options.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    state.timeLeft = TIMER_DURATION;
    el.time.textContent = state.timeLeft;

    state.timer = setInterval(() => {
        state.timeLeft--;
        el.time.textContent = state.timeLeft;
        if (state.timeLeft <= 0) finishQuestion('TIMEOUT');
    }, 1000);
}

function finishQuestion(answer, btn = null) {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.timer);

    const q = state.questions[state.currentIndex];
    const correct = decodeHTML(q.correct_answer);

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => {
        b.disabled = true;
        if (b.textContent === correct) b.classList.add('correct');
        if (btn && b === btn && b.textContent !== correct) b.classList.add('wrong');
    });

    if (answer === correct) {
        state.score++;
        el.soundCorrect.play();
    } else {
        el.soundWrong.play();
    }

    el.score.textContent = state.score;
    el.skip.classList.add('hidden');
    el.next.classList.remove('hidden');
}

function nextQuestion() {
    state.currentIndex++;
    state.currentIndex < state.questions.length ? showQuestion() : endGame();
}

/* ---------------- RESULT ---------------- */

function endGame() {
    switchScreen(el.quiz, el.result);
    el.finalScore.textContent = state.score;

    const high = localStorage.getItem(STORAGE_KEY_SCORE) || 0;
    if (state.score > high) {
        localStorage.setItem(STORAGE_KEY_SCORE, state.score);
        el.greeting.textContent = `🎉 New High Score, ${state.username}!`;
    }
}