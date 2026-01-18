const state = {
    questions: [],
    currentIndex: 0,
    score: 0,
    timer: null,
    timeLeft: 15,
    userAnswers: [],
    username: '',
    isGameOver: false
};

const elements = {
    startScreen: document.getElementById('start-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultScreen: document.getElementById('result-screen'),
    loadingShim: document.getElementById('loading-spinner'),

    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    categorySelect: document.getElementById('category-select'),
    diffSelect: document.getElementById('difficulty-select'),
    highScoreDisplay: document.getElementById('high-score'),

    playerName: document.getElementById('player-name-display'),
    questionText: document.getElementById('question-text'),
    currentQNum: document.getElementById('current-q-num'),
    optionsList: document.getElementById('options-container'),
    scoreDisplay: document.getElementById('score-display'),
    timeLeft: document.getElementById('time-left'),
    progressFill: document.getElementById('quiz-progress-fill'),
    questionCount: document.getElementById('question-count'),

    skipBtn: document.getElementById('skip-btn'),
    nextBtn: document.getElementById('next-btn'),
    restartBtn: document.getElementById('restart-btn'),

    finalScore: document.getElementById('final-score'),
    greetingMsg: document.getElementById('greeting-msg'),
    achievementBadge: document.getElementById('achievement-badge'),
    achievementTitle: document.getElementById('achievement-title'),
    resultSummary: document.getElementById('result-summary'),

    soundCorrect: document.getElementById('sound-correct'),
    soundWrong: document.getElementById('sound-wrong')
};

const TIMER_DURATION = 15;
const STORAGE_KEY_SCORE = 'trivia_high_score';
const STORAGE_KEY_NAME = 'trivia_username';

document.addEventListener('DOMContentLoaded', async () => {
    loadPersistedData();
    await fetchCategories();
    setupEventListeners();
});

function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.skipBtn.addEventListener('click', () => handleSkip());
    elements.nextBtn.addEventListener('click', () => nextQuestion());
    elements.restartBtn.addEventListener('click', () => location.reload());
}

function loadPersistedData() {
    const savedName = localStorage.getItem(STORAGE_KEY_NAME);
    const savedScore = localStorage.getItem(STORAGE_KEY_SCORE) || 0;
    if (savedName) elements.usernameInput.value = savedName;
    elements.highScoreDisplay.textContent = savedScore;
}

async function fetchCategories() {
    try {
        const res = await fetch('https://opentdb.com/api_category.php');
        const data = await res.json();
        data.trivia_categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            elements.categorySelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('Categories failed', e);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const name = elements.usernameInput.value.trim();
    if (!name) return;

    state.username = name;
    localStorage.setItem(STORAGE_KEY_NAME, name);
    elements.playerName.textContent = name;

    startQuiz(elements.categorySelect.value, elements.diffSelect.value);
}

async function startQuiz(category, difficulty) {
    switchScreen(elements.startScreen, elements.loadingShim);

    try {
        let url = `https://opentdb.com/api.php?amount=10&type=multiple`;
        if (category) url += `&category=${category}`;
        if (difficulty) url += `&difficulty=${difficulty}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            state.questions = data.results;
            state.score = 0;
            state.currentIndex = 0;
            state.userAnswers = [];

            setTimeout(() => {
                switchScreen(elements.loadingShim, elements.quizScreen);
                showQuestion();
            }, 1500);
        } else {
            throw new Error('No results');
        }
    } catch (err) {
        alert('Failed to load quiz. Please try again.');
        location.reload();
    }
}

function switchScreen(from, to) {
    from.classList.remove('active');
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.classList.add('active');
}

function showQuestion() {
    state.isGameOver = false;
    const q = state.questions[state.currentIndex];

    elements.nextBtn.classList.add('hidden');
    elements.skipBtn.classList.remove('hidden');

    elements.questionCount.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    elements.currentQNum.textContent = state.currentIndex + 1;
    elements.progressFill.style.width = `${((state.currentIndex) / state.questions.length) * 100}%`;
    elements.scoreDisplay.textContent = state.score;

    elements.questionText.innerHTML = q.question;

    const allOpts = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
    elements.optionsList.innerHTML = '';

    allOpts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = opt;
        btn.onclick = () => handleAnswer(opt, btn);
        elements.optionsList.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timeLeft = TIMER_DURATION;
    updateTimerUI();

    state.timer = setInterval(() => {
        state.timeLeft--;
        updateTimerUI();
        if (state.timeLeft <= 0) handleSkip(true);
    }, 1000);
}

function updateTimerUI() {
    elements.timeLeft.textContent = state.timeLeft;
    if (state.timeLeft <= 5) {
        elements.timeLeft.parentElement.style.color = '#ef4444';
        elements.timeLeft.parentElement.style.animation = 'pulse 0.5s ease-in-out infinite';
    } else {
        elements.timeLeft.parentElement.style.color = '';
        elements.timeLeft.parentElement.style.animation = '';
    }
}

function handleAnswer(selected, btn) {
    if (state.isGameOver) return;
    completeQuestion(selected, btn);
}

function handleSkip(isTimeout = false) {
    if (state.isGameOver) return;
    completeQuestion(isTimeout ? 'TIMEOUT' : 'SKIPPED', null);
}

function completeQuestion(selection, selectedBtn) {
    state.isGameOver = true;
    clearInterval(state.timer);

    const q = state.questions[state.currentIndex];
    const isCorrect = selection === q.correct_answer;

    if (isCorrect) {
        state.score++;
        elements.soundCorrect.play();
    } else {
        elements.soundWrong.play();
    }

    const buttons = elements.optionsList.querySelectorAll('.option-btn');
    buttons.forEach(b => {
        b.disabled = true;
        if (b.innerHTML === q.correct_answer) b.classList.add('correct');
        if (selectedBtn && b === selectedBtn && !isCorrect) b.classList.add('wrong');
    });

    state.userAnswers.push({
        correct: isCorrect,
        skipped: selection === 'SKIPPED' || selection === 'TIMEOUT'
    });

    elements.skipBtn.classList.add('hidden');
    elements.nextBtn.classList.remove('hidden');
    elements.scoreDisplay.textContent = state.score;
}

function nextQuestion() {
    state.currentIndex++;
    if (state.currentIndex < state.questions.length) {
        showQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    switchScreen(elements.quizScreen, elements.resultScreen);

    const percentage = (state.score / state.questions.length) * 100;
    let achievement = getAchievement(percentage);

    elements.achievementBadge.querySelector('.badge-icon').textContent = achievement.icon;
    elements.achievementTitle.textContent = achievement.title;
    elements.finalScore.textContent = state.score;

    const currentHigh = localStorage.getItem(STORAGE_KEY_SCORE) || 0;
    if (state.score > currentHigh) {
        localStorage.setItem(STORAGE_KEY_SCORE, state.score);
        elements.greetingMsg.textContent = `🎉 New Record, ${state.username}!`;
    } else {
        elements.greetingMsg.textContent = achievement.message.replace('{name}', state.username);
    }

    renderSummary();
}

function getAchievement(percentage) {
    if (percentage === 100) {
        return { icon: '👑', title: 'Perfect Score!', message: 'Flawless, {name}! You\'re a genius!' };
    } else if (percentage >= 80) {
        return { icon: '🌟', title: 'Outstanding!', message: 'Brilliant work, {name}!' };
    } else if (percentage >= 60) {
        return { icon: '🎯', title: 'Great Job!', message: 'Well done, {name}!' };
    } else if (percentage >= 40) {
        return { icon: '💪', title: 'Good Effort!', message: 'Nice try, {name}!' };
    } else {
        return { icon: '🌱', title: 'Keep Learning!', message: 'Practice makes perfect, {name}!' };
    }
}

function renderSummary() {
    const correctItems = state.userAnswers.filter(a => a.correct).length;
    const skippedItems = state.userAnswers.filter(a => a.skipped).length;
    const incorrectItems = state.questions.length - correctItems - skippedItems;

    elements.resultSummary.innerHTML = `
        <div class="stat-card stat-correct">
            <span class="label">✓ Correct</span>
            <span class="value">${correctItems}</span>
        </div>
        <div class="stat-card stat-incorrect">
            <span class="label">✗ Incorrect</span>
            <span class="value">${incorrectItems}</span>
        </div>
        <div class="stat-card stat-skipped">
            <span class="label">⊘ Skipped</span>
            <span class="value">${skippedItems}</span>
        </div>
    `;
}
