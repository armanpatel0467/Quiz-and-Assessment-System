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

    summary: document.getElementById('result-summary')
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

    try {
        let url = `https://opentdb.com/api.php?amount=10&type=multiple`;
        if (el.category.value) url += `&category=${el.category.value}`;
        if (el.difficulty.value) url += `&difficulty=${el.difficulty.value}`;

        console.log('Fetching questions from:', url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
            signal: controller.signal,
            mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`API returned status ${res.status}`);
        }

        const data = await res.json();
        console.log('API Response:', data);

        if (!data.results || data.results.length === 0) {
            throw new Error('No questions received from API');
        }

        state.questions = data.results;
        state.currentIndex = 0;
        state.score = 0;
        state.userAnswers = [];

        setTimeout(() => {
            switchScreen(el.loading, el.quiz);
            showQuestion();
        }, 800);
    } catch (error) {
        console.error('Quiz loading error:', error);

        let errorMsg = 'Unable to load quiz questions. ';

        if (error.name === 'AbortError') {
            errorMsg += 'Request timed out. Please check your internet connection.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg += 'Cannot reach the quiz server. This may be due to:\n\n' +
                '• Network/Internet connection issues\n' +
                '• Opening from file:// - Try using a local server instead\n' +
                '• Firewall blocking the request\n\n' +
                'Try opening this quiz on a local web server (e.g., using Live Server extension in VS Code).';
        } else {
            errorMsg += error.message;
        }

        alert(errorMsg);
        switchScreen(el.loading, el.start);
    }
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
    const isSkipped = answer === 'SKIPPED' || answer === 'TIMEOUT';

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => {
        b.disabled = true;
        if (b.textContent === correct) b.classList.add('correct');
        if (btn && b === btn && b.textContent !== correct) b.classList.add('wrong');
    });

    const isCorrect = answer === correct;
    if (isCorrect) {
        state.score++;
    }

    state.userAnswers.push({ correct: isCorrect, skipped: isSkipped });

    el.score.textContent = state.score;
    el.skip.classList.add('hidden');
    el.next.classList.remove('hidden');
}

function nextQuestion() {
    state.currentIndex++;
    state.currentIndex < state.questions.length ? showQuestion() : endGame();
}

/* ---------------- RESULT ---------------- */

function getAchievement(percentage) {
    if (percentage === 100) return { icon: '👑', title: 'Perfect Score!' };
    if (percentage >= 80) return { icon: '🌟', title: 'Outstanding!' };
    if (percentage >= 60) return { icon: '🎯', title: 'Great Job!' };
    if (percentage >= 40) return { icon: '💪', title: 'Good Effort!' };
    return { icon: '🌱', title: 'Keep Learning!' };
}

function endGame() {
    switchScreen(el.quiz, el.result);

    const percentage = (state.score / state.questions.length) * 100;
    const achievement = getAchievement(percentage);

    el.achievementBadge.textContent = achievement.icon;
    el.achievementTitle.textContent = achievement.title;
    el.finalScore.textContent = state.score;

    const high = localStorage.getItem(STORAGE_KEY_SCORE) || 0;
    if (state.score > high) {
        localStorage.setItem(STORAGE_KEY_SCORE, state.score);
        el.greeting.textContent = `🎉 New High Score, ${state.username}!`;
    } else {
        el.greeting.textContent = `Great job, ${state.username}!`;
    }

    const correct = state.userAnswers.filter(a => a.correct).length;
    const skipped = state.userAnswers.filter(a => a.skipped).length;
    const wrong = state.questions.length - correct - skipped;

    el.summary.innerHTML = `
        <div class="stat-card stat-correct">
            <span class="label">✓ Correct</span>
            <span class="value">${correct}</span>
        </div>
        <div class="stat-card stat-incorrect">
            <span class="label">✗ Incorrect</span>
            <span class="value">${wrong}</span>
        </div>
        <div class="stat-card stat-skipped">
            <span class="label">⊘ Skipped</span>
            <span class="value">${skipped}</span>
        </div>
    `;
}
