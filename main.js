// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleSwitch, historyBtns,
    aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay,
    achievementsGrid, streakDays, streakCounter, tabButtons, tabContents,
    achievementToast, toastIcon, toastName,
    chatContainer, chatInput, chatSendBtn, quickRepliesContainer, calorieHistoryChartEl, weightHistoryChartEl,
    nutritionChartEl, nutritionNoticeEl, nutritionChartPlaceholder, macroHistoryChartEl,
    headerAuthBtn, authCloseBtn; // New elements

let userProfile = {
    name: 'User',
    startWeight: 0,
    goalWeight: 0,
    calorieTarget: 0,
    macroTargets: {
        protein: 0,
        carbs: 0,
        fats: 0
    }
};

function loadUserProfile() {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
        userProfile = JSON.parse(saved);
        return true;
    }
    return false;
}

const achievements = [
    { id: 'log1', name: 'First Log', icon: '📝', condition: () => Object.keys(localStorage).some(k => k.startsWith('log_')) },
    { id: 'streak3', name: '3-Day Streak', icon: '🔥', condition: () => calculateStreak() >= 3 },
    { id: 'streak7', name: '7-Day Streak', icon: '🏆', condition: () => calculateStreak() >= 7 },
    { id: 'lose2lb', name: 'Lost 2lb', icon: '💪', condition: () => weightHistoryData.length > 0 && userProfile.startWeight - weightHistoryData[weightHistoryData.length - 1].weight >= 2 },
    { id: 'goal', name: 'Goal Getter', icon: '🥇', condition: () => weightHistoryData.length > 0 && weightHistoryData[weightHistoryData.length - 1].weight <= userProfile.goalWeight },
    { id: 'weightLog1', name: 'First Weigh-in', icon: '⚖️', condition: () => weightHistoryData.length >= 1 },
    { id: 'perfectDay', name: 'Perfect Day', icon: '🎯', condition: () => { const today = getTodaysDateEDT(); const log = localStorage.getItem(`log_${today}`); if (!log) return false; const items = JSON.parse(log); const total = Object.values(items).reduce((sum, item) => sum + (item.calories * item.quantity), 0); return total > 0 && total <= userProfile.calorieTarget; } },
    { id: 'chat1', name: 'Curious Mind', icon: '💬', condition: () => chatHistory.length > 2 },
];

let dailyItems = {};
let calorieHistoryData = {};
let weightHistoryData = [];
let calorieHistoryChart = null;
let weightHistoryChart = null;
let nutritionChart = null;
let macroHistoryChart = null;
let healthDataSummary = "No data available yet.";
let chatHistory = [];
let unlockedAchievements = [];

// --- 2. WAIT FOR DOM TO LOAD, THEN INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign all UI elements
    mainContainer = document.getElementById('main-container');
    dailyLog = document.getElementById('dailyLog');
    totalCaloriesSpan = document.getElementById('totalCalories');
    calorieTargetSpan = document.getElementById('calorieTarget');
    calorieProgressCircle = document.getElementById('calorie-progress-circle');
    emptyLogMessage = document.getElementById('empty-log-message');
    themeToggleSwitch = document.getElementById('theme-toggle-switch');
    historyBtns = document.querySelectorAll('.history-btn');
    aiResponseEl = document.getElementById('ai-response');
    getAiTipBtn = document.getElementById('get-ai-tip-btn');
    aiLoader = document.getElementById('ai-loader');
    weightInput = document.getElementById('weightInput');
    logWeightBtn = document.getElementById('log-weight-btn');
    currentWeightDisplay = document.getElementById('current-weight-display');
    goalWeightDisplay = document.getElementById('goal-weight-display');
    achievementsGrid = document.getElementById('achievements-grid');
    streakDays = document.getElementById('streak-days');
    streakCounter = document.getElementById('streak-counter');
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    chatContainer = document.getElementById('chat-container');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    achievementToast = document.getElementById('achievement-toast');
    toastIcon = document.getElementById('toast-icon');
    toastName = document.getElementById('toast-name');
    quickRepliesContainer = document.getElementById('quick-replies-container');
    calorieHistoryChartEl = document.getElementById('calorieHistoryChart');
    weightHistoryChartEl = document.getElementById('weightHistoryChart');
    nutritionChartEl = document.getElementById('nutrition-chart');
    nutritionNoticeEl = document.getElementById('nutrition-notice');
    nutritionChartPlaceholder = document.getElementById('nutrition-chart-placeholder');
    macroHistoryChartEl = document.getElementById('macroHistoryChart'); // New
    headerAuthBtn = document.getElementById('header-auth-btn');
    authCloseBtn = document.getElementById('auth-close-btn');

    // Set up event listeners
    themeToggleSwitch.addEventListener('change', handleThemeToggle);
    tabButtons.forEach(button => button.addEventListener('click', () => handleTabSwitch(button)));
    historyBtns.forEach(btn => btn.addEventListener('click', () => handleHistoryButtonClick(btn)));
    logWeightBtn.addEventListener('click', handleLogWeight);
    getAiTipBtn.addEventListener('click', getAICoachTip);
    chatSendBtn.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatSend();
        }
    });
    quickRepliesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            chatInput.value = e.target.textContent;
            handleChatSend();
        }
    });

    dailyLog.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const foodId = deleteButton.dataset.id;
            deleteFoodFromDB(foodId);
        }
    });

    headerAuthBtn.addEventListener('click', () => {
        if (currentUser) {
            auth.signOut();
        } else {
            const authOverlay = document.getElementById('auth-overlay');
            authOverlay.classList.remove('hidden');
            setTimeout(() => {
                authOverlay.classList.remove('opacity-0');
                authOverlay.style.opacity = '1';
            }, 10);
            authCloseBtn.classList.remove('hidden');
        }
    });

    authCloseBtn.addEventListener('click', () => {
        const authOverlay = document.getElementById('auth-overlay');
        authOverlay.classList.add('opacity-0');
        authOverlay.style.opacity = '0';
        setTimeout(() => {
            authOverlay.classList.add('hidden');
        }, 500);
    });

    // Initialize Auth and then App
    initAuthAndApp();
});


// --- THEME TOGGLE LOGIC ---
function handleThemeToggle() {
    if (themeToggleSwitch.checked) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
    if (calorieHistoryChart) updateChartAppearance(calorieHistoryChart);
    if (weightHistoryChart) updateChartAppearance(weightHistoryChart);
    if (nutritionChart) updateChartAppearance(nutritionChart);
    if (macroHistoryChart) updateChartAppearance(macroHistoryChart); // New
}

// --- APP INITIALIZATION ---
function initializeAppData() {
    mainContainer.classList.remove('hidden');

    // Reset chat state on initialization (fixes duplicate welcome messages on re-login)
    chatContainer.innerHTML = '';
    chatHistory = [];

    if (document.documentElement.classList.contains('dark')) {
        themeToggleSwitch.checked = true;
    }

    goalWeightDisplay.textContent = `${userProfile.goalWeight} lb`;
    calorieTargetSpan.textContent = `/ ${userProfile.calorieTarget} Kcal`;

    const initialAiMessage = "Hello! I'm your AI health assistant. Tell me what you ate (e.g., 'I had a cheese burger and fries'), or ask for your progress.";
    const initialAiPayload = { type: 'text', payload: { message: initialAiMessage } };
    const initialHistoryEntry = { role: 'model', parts: [{ text: JSON.stringify(initialAiPayload) }] };

    // Do not push initial message to chatHistory to avoid consecutive model messages

    appendMessage(initialAiPayload, 'ai');

    loadUnlockedAchievements();
    getTodaysLog();
    getWeightHistory();

    // NEW: Set initial macro targets based on latest weight
    const latestWeight = weightHistoryData.length > 0 ? weightHistoryData[weightHistoryData.length - 1].weight : userProfile.startWeight;
    updateMacroTargets(latestWeight);

    updateStreak();

    renderWeightChart(weightHistoryData);
    fetchCalorieHistory(7);
    fetchMacroHistory(7); // New

    handleTabSwitch(document.querySelector('.tab-btn[data-tab="today"]'));
    checkAndUnlockAchievements();
}

// --- TAB NAVIGATION ---
function handleTabSwitch(button) {
    const tab = button.dataset.tab;
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('text-gray-400');
    });
    button.classList.add('active');
    button.classList.remove('text-gray-400');
    tabContents.forEach(content => {
        content.id === `${tab}-tab-content` ? content.classList.remove('hidden') : content.classList.add('hidden');
    });
}

// --- LOCAL STORAGE DATA HANDLING ---
function getTodaysDateEDT() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(now).split('T')[0];
}

function getTodaysLog() {
    const today = getTodaysDateEDT();
    const savedLog = localStorage.getItem(`log_${today}`);
    dailyItems = savedLog ? JSON.parse(savedLog) : {};
    renderLog();
}

function getWeightHistory() {
    const savedHistory = localStorage.getItem('weightHistory');
    weightHistoryData = savedHistory ? JSON.parse(savedHistory) : [];
    updateCurrentWeightDisplay();
}

function saveData() {
    const today = getTodaysDateEDT();
    localStorage.setItem(`log_${today}`, JSON.stringify(dailyItems));
    localStorage.setItem('weightHistory', JSON.stringify(weightHistoryData));
}

// --- UI & DATA MANIPULATION ---
function addFoodToDB(foodItem) {
    // More robust safety check
    if (!foodItem || typeof foodItem.foodName !== 'string' || typeof foodItem.calories !== 'number') {
        console.error("Attempted to log invalid food item:", foodItem);
        return; // Fail silently if data is malformed
    }
    const foodId = (foodItem.foodName.replace(/\s+/g, '-').toLowerCase() || 'entry') + '-' + Date.now();
    dailyItems[foodId] = { ...foodItem, id: foodId };
    saveData();
    renderLog();
    checkAndUnlockAchievements();
}

function deleteFoodFromDB(foodId) {
    if (dailyItems[foodId]) {
        delete dailyItems[foodId];
        saveData();
        renderLog();
    }
}

function logWeightToDB(weight) {
    const newWeight = parseFloat(weight);
    if (!newWeight) return;

    const today = getTodaysDateEDT();
    const todayEntryIndex = weightHistoryData.findIndex(entry => entry.date === today);

    if (todayEntryIndex > -1) {
        weightHistoryData[todayEntryIndex].weight = newWeight;
    } else {
        weightHistoryData.push({ date: today, weight: newWeight });
    }

    weightHistoryData.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveData();

    // NEW: Update macro targets based on the new weight
    updateMacroTargets(newWeight);

    // Update UI
    renderWeightChart(weightHistoryData);
    updateCurrentWeightDisplay();
    checkAndUnlockAchievements();
    renderLog(); // Re-render log to update chart legends
    weightInput.value = '';
}

function updateCurrentWeightDisplay() {
    if (weightHistoryData.length > 0) {
        currentWeightDisplay.textContent = `${weightHistoryData[weightHistoryData.length - 1].weight} lb`;
    } else {
        currentWeightDisplay.textContent = `${userProfile.startWeight} lb`;
    }
}

// NEW: Function to dynamically update macro targets
function updateMacroTargets(currentWeight) {
    // Using 0.8g/lb for protein (weight loss), 1.1g/lb for carbs, 0.36g/lb for fats
    userProfile.macroTargets.protein = Math.round(currentWeight * 0.8);
    userProfile.macroTargets.carbs = Math.round(currentWeight * 1.1);
    userProfile.macroTargets.fats = Math.round(currentWeight * 0.36);
}

// --- HISTORY & CHARTING ---
function fetchCalorieHistory(days) {
    const data = {};
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        const savedLog = localStorage.getItem(`log_${dateString}`);
        const items = savedLog ? JSON.parse(savedLog) : {};
        const total = Object.values(items).reduce((sum, item) => sum + (item.calories * item.quantity), 0);
        data[dateString] = total;
    }
    calorieHistoryData = data;
    renderCalorieHistoryChart(data);
}

// NEW: Fetch Macro History
function fetchMacroHistory(days) {
    const data = {};
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        const savedLog = localStorage.getItem(`log_${dateString}`);
        const items = savedLog ? JSON.parse(savedLog) : {};
        const dailyMacros = { protein: 0, carbs: 0, fats: 0 };
        Object.values(items).forEach(item => {
            dailyMacros.protein += (item.protein || 0) * (item.quantity || 1);
            dailyMacros.carbs += (item.carbs || 0) * (item.quantity || 1);
            dailyMacros.fats += (item.fats || 0) * (item.quantity || 1);
        });
        data[dateString] = dailyMacros;
    }
    renderMacroHistoryChart(data);
}

function renderCalorieHistoryChart(data) {
    const sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = sortedDates.map(date => data[date]);
    const ctx = calorieHistoryChartEl.getContext('2d');
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const averageData = Array(values.length).fill(average);

    if (calorieHistoryChart) {
        calorieHistoryChart.data.labels = labels;
        calorieHistoryChart.data.datasets[0].data = values;
        calorieHistoryChart.data.datasets[1].data = averageData;
        calorieHistoryChart.update();
    } else {
        calorieHistoryChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Calories', data: values }, { label: 'Average', data: averageData, type: 'line', pointRadius: 0, borderWidth: 2, borderDash: [5, 5] }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
    updateChartAppearance(calorieHistoryChart);
}

// NEW: Render Macro History Chart
function renderMacroHistoryChart(data) {
    const sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const proteinData = sortedDates.map(date => data[date].protein);
    const carbsData = sortedDates.map(date => data[date].carbs);
    const fatsData = sortedDates.map(date => data[date].fats);

    const ctx = macroHistoryChartEl.getContext('2d');

    if (macroHistoryChart) {
        macroHistoryChart.data.labels = labels;
        macroHistoryChart.data.datasets[0].data = proteinData;
        macroHistoryChart.data.datasets[1].data = carbsData;
        macroHistoryChart.data.datasets[2].data = fatsData;
        macroHistoryChart.update();
    } else {
        macroHistoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Protein', data: proteinData },
                    { label: 'Carbs', data: carbsData },
                    { label: 'Fats', data: fatsData },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }
    updateChartAppearance(macroHistoryChart);
}


function renderWeightChart(data) {
    const labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = data.map(d => d.weight);
    const ctx = weightHistoryChartEl.getContext('2d');

    if (weightHistoryChart) {
        weightHistoryChart.data.labels = labels;
        weightHistoryChart.data.datasets[0].data = values;
        weightHistoryChart.update();
    } else {
        weightHistoryChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Weight (lb)', data: values, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } }, plugins: { legend: { display: false } } }
        });
    }
    updateChartAppearance(weightHistoryChart);
}

function updateChartAppearance(chart) {
    if (!chart) return;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E9E5E0';
    const ticksColor = isDarkMode ? '#EAEAEA' : '#4F6F52';
    const primaryColor = isDarkMode ? '#A8D08D' : '#86A789';
    const primaryBgColor = isDarkMode ? 'rgba(168, 208, 141, 0.1)' : 'rgba(134, 167, 137, 0.1)';
    const legendColor = isDarkMode ? '#EAEAEA' : '#4F6F52';

    if (chart.options.scales) {
        if (chart.options.scales.x) {
            if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
            if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = ticksColor;
        }
        if (chart.options.scales.y) {
            if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
            if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = ticksColor;
        }
    }

    if (chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = legendColor;
    }

    // Assign colors based on chart type or specific dataset properties
    const macroColors = isDarkMode
        ? ['#e879f9', '#38bdf8', '#fbbf24']
        : ['#c026d3', '#0284c7', '#d97706'];

    if (chart === macroHistoryChart) {
        chart.data.datasets.forEach((dataset, index) => {
            dataset.backgroundColor = macroColors[index];
        });
    } else {
        chart.data.datasets.forEach(dataset => {
            if (chart.config.type === 'doughnut') {
                dataset.backgroundColor = macroColors;
                dataset.borderColor = isDarkMode ? '#2C3333' : '#FBF9F6';
            }
            else if (dataset.type === 'line') {
                dataset.borderColor = isDarkMode ? '#F59E0B' : '#F97316';
                if (chart === weightHistoryChart) dataset.backgroundColor = primaryBgColor;
            } else {
                dataset.borderColor = primaryColor;
                dataset.backgroundColor = primaryColor;
            }
        });
    }
    chart.update();
}

function handleHistoryButtonClick(btn) {
    const days = parseInt(btn.dataset.days);
    historyBtns.forEach(b => b.classList.remove('bg-brand-secondary', 'dark:bg-dark-secondary'));
    btn.classList.add('bg-brand-secondary', 'dark:bg-dark-secondary');

    fetchCalorieHistory(days);
    fetchMacroHistory(days);
}

function handleLogWeight() {
    const weight = weightInput.value;
    if (weight) logWeightToDB(weight);
}

// --- GAMIFICATION ---
function loadUnlockedAchievements() {
    const saved = localStorage.getItem('unlockedAchievements');
    unlockedAchievements = saved ? JSON.parse(saved) : [];
    renderAchievements();
}

function saveUnlockedAchievements() {
    localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
}

function checkAndUnlockAchievements() {
    achievements.forEach(ach => {
        if (!unlockedAchievements.includes(ach.id)) {
            if (ach.condition()) {
                unlockedAchievements.push(ach.id);
                saveUnlockedAchievements();
                showAchievementToast(ach);
            }
        }
    });
    renderAchievements();
    updateStreak();
}

function renderAchievements() {
    achievementsGrid.innerHTML = '';
    achievements.forEach(ach => {
        const isUnlocked = unlockedAchievements.includes(ach.id);
        const div = document.createElement('div');
        div.className = `achievement-badge ${isUnlocked ? 'unlocked' : ''} p-4 bg-brand-bg dark:bg-dark-bg rounded-2xl flex flex-col items-center justify-center gap-2`;
        div.innerHTML = `
            <span class="text-4xl">${ach.icon}</span>
            <span class="text-xs font-semibold text-center">${ach.name}</span>
        `;
        achievementsGrid.appendChild(div);
    });
}

function calculateStreak() {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d).split('T')[0];
        const log = localStorage.getItem(`log_${dateString}`);
        if (log && Object.keys(JSON.parse(log)).length > 0) {
            streak++;
        } else {
            if (i > 0) break;
        }
    }
    return streak;
}

function updateStreak() {
    const streak = calculateStreak();
    if (streak > 0) {
        streakDays.textContent = `${streak}-Day Streak`;
        streakCounter.classList.remove('hidden');
    } else {
        streakCounter.classList.add('hidden');
    }
}

function showAchievementToast(achievement) {
    toastIcon.textContent = achievement.icon;
    toastName.textContent = achievement.name;
    achievementToast.classList.add('show');
    setTimeout(() => {
        achievementToast.classList.remove('show');
    }, 4000);
}


// --- API LOGIC (SECURE) ---
async function getAICoachTip() {
    aiResponseEl.classList.add('hidden');
    aiLoader.classList.remove('hidden');
    getAiTipBtn.disabled = true;

    await fetchHealthDataSummary();

    const prompt = `You are a friendly AI nutrition coach. The user's health data is: ${healthDataSummary}. Provide a short, motivational tip.`;

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: prompt })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;

        try {
            const parsed = JSON.parse(text);
            aiResponseEl.textContent = parsed.payload.message;
        } catch (e) {
            aiResponseEl.textContent = text;
        }

    } catch (error) {
        aiResponseEl.textContent = "Could not get tip. Please try again.";
    } finally {
        aiResponseEl.classList.remove('hidden');
        aiLoader.classList.add('hidden');
        getAiTipBtn.disabled = false;
    }
}

async function handleChatSend() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    appendMessage({ type: 'text', payload: { message: userMessage } }, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    chatInput.value = '';
    chatSendBtn.disabled = true;
    quickRepliesContainer.innerHTML = '';

    const typingId = `typing-${Date.now()}`;
    appendMessage({ type: 'typing_indicator', id: typingId }, 'ai');

    await fetchHealthDataSummary();

    const instructionText = `
        You are a "Smart AI Health Assistant". Your primary role is to help a user track their health and diet through conversation.
        The user's health data summary is: ${healthDataSummary}.
        You MUST respond with only a single, raw JSON object, with no other text, comments, or markdown formatting around it.

        Available types:
        1. "text": For a standard chat response. payload: { "message": "Your text here" }.
        2. "food_log": When the user logs food. Analyze their message (e.g., "I ate two rotis and dal"). Estimate the total calories AND macronutrients. Respond with a food_log. payload: { "foodName": "User's description", "calories": ESTIMATED_CALORIES, "quantity": 1, "protein": ESTIMATED_PROTEIN_GRAMS, "carbs": ESTIMATED_CARBS_GRAMS, "fats": ESTIMATED_FATS_GRAMS }.
        3. "confirmation": To ask a clarifying question. payload: { "message": "Your question?", "quick_replies": ["Yes", "No"] }.

        Analyze the user's message ("${userMessage}"), determine the intent, and generate the correct JSON response.
    `;

    const apiHistory = [
        { role: 'user', parts: [{ text: instructionText }] },
        { role: 'model', parts: [{ text: JSON.stringify({ type: 'text', payload: { message: 'Understood. I will respond in the required JSON format with macronutrient estimates.' } }) }] },
        ...chatHistory
    ];

    const payload = { contents: apiHistory };

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: payload })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
            throw new Error(`API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const aiResponseText = result.candidates[0].content.parts[0].text;

        document.getElementById(typingId)?.closest('.message-bubble-wrapper')?.remove();

        try {
            const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Response is not JSON");

            const aiResponseJSON = JSON.parse(jsonMatch[0]);
            chatHistory.push({ role: 'model', parts: [{ text: jsonMatch[0] }] });

            if (aiResponseJSON.type === 'food_log' && aiResponseJSON.payload) {
                addFoodToDB(aiResponseJSON.payload);
            } else {
                appendMessage(aiResponseJSON, 'ai');
            }

            if (aiResponseJSON.type === 'confirmation' && aiResponseJSON.payload.quick_replies) {
                renderQuickReplies(aiResponseJSON.payload.quick_replies);
            }
        } catch (e) {
            chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });
            if (!aiResponseText.includes('"type":"food_log"')) {
                appendMessage({ type: 'text', payload: { message: "Sorry, I had trouble understanding that. Could you try again?" } }, 'ai');
            }
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        document.getElementById(typingId)?.closest('.message-bubble-wrapper')?.remove();
        appendMessage({ type: 'text', payload: { message: "Sorry, I couldn't connect. Please try again." } }, 'ai');
    } finally {
        chatSendBtn.disabled = false;
        chatContainer.scrollTop = chatContainer.scrollHeight;
        checkAndUnlockAchievements();
    }
}

// --- UI RENDERING ---
function renderLog() {
    dailyLog.innerHTML = '';
    let total = 0;
    let totalMacros = { protein: 0, carbs: 0, fats: 0 };

    const items = Object.values(dailyItems);
    emptyLogMessage.classList.toggle('hidden', items.length > 0);

    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'p-3 bg-brand-bg dark:bg-dark-bg rounded-xl flex justify-between items-center';
        listItem.innerHTML = `
            <div class="flex-grow">
                <p class="font-semibold">${item.foodName || item.name}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.calories} kcal &times; ${item.quantity}</p>
            </div>
            <button data-id="${item.id}" class="delete-btn text-red-500 hover:text-red-700 p-2 rounded-full transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"></path></svg>
            </button>
        `;
        dailyLog.appendChild(listItem);
        total += (item.calories || 0) * (item.quantity || 1);
        totalMacros.protein += (item.protein || 0) * (item.quantity || 1);
        totalMacros.carbs += (item.carbs || 0) * (item.quantity || 1);
        totalMacros.fats += (item.fats || 0) * (item.quantity || 1);
    });
    totalCaloriesSpan.textContent = Math.round(total);
    const percentage = userProfile.calorieTarget > 0 ? Math.min((total / userProfile.calorieTarget) * 100, 100) : 0;
    calorieProgressCircle.style.strokeDasharray = `${percentage}, 100`;

    renderNutritionChart(totalMacros);
    updateNutritionNotice(totalMacros);
}

// --- NEW NUTRITION CHART & NOTICE FUNCTIONS ---
function renderNutritionChart(macros) {
    const totalMacros = macros.protein + macros.carbs + macros.fats;

    if (totalMacros > 0) {
        nutritionChartPlaceholder.classList.add('hidden');
        nutritionChartEl.classList.remove('hidden');

        const ctx = nutritionChartEl.getContext('2d');
        const chartData = [Math.round(macros.protein), Math.round(macros.carbs), Math.round(macros.fats)];
        const originalLabels = ['Protein', 'Carbs', 'Fats'];
        const targets = [userProfile.macroTargets.protein, userProfile.macroTargets.carbs, userProfile.macroTargets.fats];

        const generateLabelsConfig = function (chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
                const { labels: { pointStyle } } = chart.legend.options;
                return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    const current = data.datasets[0].data[i];
                    const target = targets[i];

                    return {
                        text: `${label}: ${current}g / ${target}g`,
                        fillStyle: style.backgroundColor,
                        strokeStyle: style.borderColor,
                        lineWidth: style.borderWidth,
                        hidden: !chart.getDataVisibility(i),
                        index: i,
                        pointStyle: pointStyle
                    };
                });
            }
            return [];
        };

        if (nutritionChart) {
            nutritionChart.data.datasets[0].data = chartData;
            nutritionChart.options.plugins.legend.labels.generateLabels = generateLabelsConfig;
            nutritionChart.update();
        } else {
            nutritionChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: originalLabels,
                    datasets: [{
                        data: chartData,
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 10,
                                font: { size: 10 },
                                generateLabels: generateLabelsConfig
                            }
                        }
                    }
                }
            });
        }
        updateChartAppearance(nutritionChart);
    } else {
        nutritionChartPlaceholder.classList.remove('hidden');
        nutritionChartEl.classList.add('hidden');
        if (nutritionChart) {
            nutritionChart.destroy();
            nutritionChart = null;
        }
    }
}


function updateNutritionNotice(macros) {
    const { protein, carbs, fats } = macros;
    const { macroTargets } = userProfile;
    let notice = '';

    if (protein > 0 && protein < macroTargets.protein * 0.5) {
        notice = 'Your protein intake is a bit low today. Consider adding a protein-rich snack!';
    } else if (carbs > macroTargets.carbs * 1.2) {
        notice = 'You are over your carbohydrate goal for today. Focus on protein and fats for your next meal.';
    } else if (fats > macroTargets.fats * 1.2) {
        notice = 'You have exceeded your healthy fats goal for the day.';
    }

    if (!notice) {
        const macroHistory = getMacroHistory(3);
        if (macroHistory.length >= 3) {
            const highCarbDays = macroHistory.filter(day => (day.carbs * 4) / day.totalCalories > 0.6).length;
            const lowProteinDays = macroHistory.filter(day => (day.protein * 4) / day.totalCalories < 0.15).length;

            if (highCarbDays >= 2) {
                notice = "Reminder: Your carb intake has been high the last few days. Ensure you're getting enough protein and fats.";
            } else if (lowProteinDays >= 2) {
                notice = "We've noticed a trend of low protein intake. Let's try to include a good protein source in every meal.";
            }
        }
    }

    if (notice) {
        nutritionNoticeEl.textContent = notice;
        nutritionNoticeEl.classList.remove('hidden');
    } else {
        nutritionNoticeEl.classList.add('hidden');
    }
}

function getMacroHistory(days) {
    const history = [];
    for (let i = 1; i <= days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d).split('T')[0];
        const log = localStorage.getItem(`log_${dateString}`);
        if (log) {
            const items = JSON.parse(log);
            const dailyMacros = { protein: 0, carbs: 0, fats: 0, totalCalories: 0 };
            Object.values(items).forEach(item => {
                dailyMacros.protein += (item.protein || 0) * item.quantity;
                dailyMacros.carbs += (item.carbs || 0) * item.quantity;
                dailyMacros.fats += (item.fats || 0) * item.quantity;
                dailyMacros.totalCalories += (item.calories || 0) * item.quantity;
            });
            if (dailyMacros.totalCalories > 0) {
                history.push(dailyMacros);
            }
        }
    }
    return history;
}

// --- HELPER & UI FUNCTIONS (RESTORED) ---
async function fetchHealthDataSummary() {
    let calorieHistoryText = "Recent calorie history:\n";
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
        const savedLog = localStorage.getItem(`log_${dateString}`);
        const items = savedLog ? JSON.parse(savedLog) : {};
        const total = Object.values(items).reduce((sum, item) => sum + (item.calories * item.quantity), 0);
        calorieHistoryText += `- ${dateString}: ${total} kcal\n`;
    }

    const savedWeightHistory = localStorage.getItem('weightHistory');
    const weights = savedWeightHistory ? JSON.parse(savedWeightHistory) : [];
    let weightHistoryText = "Recent weight history:\n";
    weights.forEach(w => {
        weightHistoryText += `- ${w.date}: ${w.weight} lb\n`;
    });

    const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : userProfile.startWeight;

    healthDataSummary = `
        User Profile and Goals:
        - Name: ${userProfile.name}
        - Starting Weight: ${userProfile.startWeight} lb
        - Current Weight: ${latestWeight} lb
        - Goal Weight: ${userProfile.goalWeight} lb
        - Daily Calorie Target: ${userProfile.calorieTarget} kcal
        
        ${calorieHistoryText}
        ${weightHistoryText}
    `;
}

function renderQuickReplies(replies) {
    quickRepliesContainer.innerHTML = '';
    replies.forEach(reply => {
        const button = document.createElement('button');
        button.className = 'quick-reply-btn';
        button.textContent = reply;
        quickRepliesContainer.appendChild(button);
    });
}

function appendMessage(data, sender) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message-bubble-wrapper flex items-start gap-3 w-full';

    if (sender === 'user') {
        messageWrapper.classList.add('justify-end');
        messageWrapper.innerHTML = `
            <div class="bg-brand-primary text-white p-4 rounded-2xl rounded-br-none max-w-xs md:max-w-md message-bubble">
                <p>${data.payload.message}</p>
            </div>
        `;
    } else { // AI
        messageWrapper.classList.add('justify-start');
        let contentHTML = '';

        switch (data.type) {
            case 'text':
                contentHTML = `<p>${data.payload.message}</p>`;
                break;
            case 'typing_indicator':
                contentHTML = `<div class="typing-loader" id="${data.id}"><span></span><span></span><span></span></div>`;
                break;
            case 'food_log_card':
                // This case is no longer used to display a message, but is kept for potential future use.
                return;
            case 'confirmation':
                contentHTML = `<p>${data.payload.message}</p>`;
                break;
            default:
                contentHTML = `<p>Received an unknown message type.</p>`
        }

        messageWrapper.innerHTML = `
            <div class="ai-message-bubble bg-brand-secondary dark:bg-dark-secondary p-4 rounded-2xl rounded-bl-none max-w-xs md:max-w-md message-bubble">
                ${contentHTML}
            </div>
        `;
    }
    chatContainer.appendChild(messageWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- AUTHENTICATION LOGIC ---
let firebaseApp, auth, firestore;
let currentUser = null;

async function initAuthAndApp() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(config);
        } else {
            firebaseApp = firebase.app();
        }

        auth = firebase.auth();

        const authOverlay = document.getElementById('auth-overlay');
        const authForm = document.getElementById('auth-form');
        const authEmail = document.getElementById('auth-email');
        const authPassword = document.getElementById('auth-password');
        const authLoginBtn = document.getElementById('auth-login-btn');
        const authRegisterBtn = document.getElementById('auth-register-btn');
        const authGoogleBtn = document.getElementById('auth-google-btn');
        const errorMsg = document.getElementById('auth-error-msg');
        const loadingMsg = document.getElementById('auth-loading-msg');
        const optInCheck = document.getElementById('auth-opt-in');

        const showError = (msg) => {
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
            loadingMsg.classList.add('hidden');
        };

        const showLoading = (msg) => {
            loadingMsg.textContent = msg || 'Processing...';
            loadingMsg.classList.remove('hidden');
            errorMsg.classList.add('hidden');
        };

        const hideMessages = () => {
            errorMsg.classList.add('hidden');
            loadingMsg.classList.add('hidden');
        };

        // Listen for Auth state changes
        auth.onAuthStateChanged(user => {
            const localAuthCloseBtn = document.getElementById('auth-close-btn');
            if (user) {
                currentUser = user;

                // Block access until email is verified
                if (!user.emailVerified) {
                    showError('Please verify your email address. A verification link has been sent to your inbox. Check your spam folder if you don\'t see it.');
                    loadingMsg.classList.add('hidden');
                    
                    let refreshBtn = document.getElementById('auth-refresh-btn');
                    if (!refreshBtn) {
                        refreshBtn = document.createElement('button');
                        refreshBtn.id = 'auth-refresh-btn';
                        refreshBtn.type = 'button';
                        refreshBtn.className = 'w-full bg-brand-secondary hover:bg-brand-primary text-white font-bold py-3 rounded-xl mt-4 transition-colors';
                        refreshBtn.textContent = 'I clicked the link - Refresh';
                        refreshBtn.onclick = async () => {
                            await auth.currentUser.reload();
                            if (auth.currentUser.emailVerified) {
                                // Force re-evaluation of auth state
                                auth.updateCurrentUser(auth.currentUser);
                            } else {
                                showError('Email still not verified. Please check your inbox.');
                            }
                        };
                        authForm.appendChild(refreshBtn);
                    }
                    refreshBtn.classList.remove('hidden');
                    return; // Stop initialization
                }

                const refreshBtn = document.getElementById('auth-refresh-btn');
                if (refreshBtn) refreshBtn.classList.add('hidden');

                authOverlay.classList.add('opacity-0');
                authOverlay.style.opacity = '0';
                setTimeout(() => authOverlay.classList.add('hidden'), 500);
                if (headerAuthBtn) headerAuthBtn.textContent = 'Logout';
                
                if (loadUserProfile() && userProfile.startWeight > 0) {
                    initializeAppData();
                } else {
                    const onboardingOverlay = document.getElementById('onboarding-overlay');
                    onboardingOverlay.classList.remove('hidden');
                    setTimeout(() => {
                        onboardingOverlay.classList.remove('opacity-0');
                        onboardingOverlay.style.opacity = '1';
                    }, 10);
                }
            } else {
                currentUser = null;
                if (headerAuthBtn) headerAuthBtn.textContent = 'Login';

                let firstUseDate = localStorage.getItem('firstUseDate');
                if (!firstUseDate) {
                    firstUseDate = getTodaysDateEDT();
                    localStorage.setItem('firstUseDate', firstUseDate);
                }

                const today = new Date(getTodaysDateEDT());
                const firstUse = new Date(firstUseDate);
                const diffTime = Math.abs(today - firstUse);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 3) {
                    // Trial expired, force login
                    authOverlay.classList.remove('hidden');
                    if (localAuthCloseBtn) localAuthCloseBtn.classList.add('hidden');
                    setTimeout(() => {
                        authOverlay.classList.remove('opacity-0');
                        authOverlay.style.opacity = '1';
                    }, 10);
                } else {
                    // Still in trial — hide auth overlay
                    authOverlay.classList.add('opacity-0');
                    authOverlay.style.opacity = '0';
                    setTimeout(() => authOverlay.classList.add('hidden'), 500);

                    // First visit ever: no profile yet — show onboarding before the app
                    if (!loadUserProfile() || userProfile.startWeight === 0) {
                        const onboardingOverlay = document.getElementById('onboarding-overlay');
                        onboardingOverlay.classList.remove('hidden');
                        setTimeout(() => {
                            onboardingOverlay.classList.remove('opacity-0');
                            onboardingOverlay.style.opacity = '1';
                        }, 10);
                    } else {
                        initializeAppData();
                    }
                }
            }
        });

        // Email Login
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMessages();
            showLoading('Logging in...');
            try {
                await auth.signInWithEmailAndPassword(authEmail.value, authPassword.value);
            } catch (error) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    showError("No account found with this email, or incorrect password. Please register first.");
                } else {
                    showError(error.message);
                }
            }
        });

        // Email Register
        authRegisterBtn.addEventListener('click', async () => {
            const emailValue = authEmail.value.trim();
            const passwordValue = authPassword.value;

            if (!emailValue || !passwordValue) {
                showError('Please enter email and password to register.');
                return;
            }

            // Client-side regex for strict validation
            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
            if (!emailRegex.test(emailValue)) {
                showError('Please enter a valid email address.');
                return;
            }

            hideMessages();
            showLoading('Registering...');
            try {
                const cred = await auth.createUserWithEmailAndPassword(emailValue, passwordValue);

                // Trigger standard Firebase Email Verification
                await cred.user.sendEmailVerification();

                // Call our server to trigger welcome email and save to Google Sheets
                await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: cred.user.email,
                        name: cred.user.displayName || 'New User',
                        optIn: optInCheck.checked
                    })
                });

            } catch (error) {
                showError(error.message);
            }
        });

        // Google Sign In
        authGoogleBtn.addEventListener('click', async () => {
            hideMessages();
            showLoading('Connecting to Google...');
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await auth.signInWithPopup(provider);
                if (result.additionalUserInfo?.isNewUser) {
                    await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: result.user.email,
                            name: result.user.displayName,
                            optIn: optInCheck.checked
                        })
                    });
                }
            } catch (error) {
                showError(error.message);
            }
        });

        // Onboarding Form Submit
        const onboardingForm = document.getElementById('onboarding-form');
        const onboardErrorMsg = document.getElementById('onboard-error-msg');
        if (onboardingForm) {
            onboardingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const age = parseInt(document.getElementById('onboard-age').value);
                const sex = document.getElementById('onboard-sex').value;
                const heightFt = parseInt(document.getElementById('onboard-height-ft').value);
                const heightIn = parseInt(document.getElementById('onboard-height-in').value);
                const weight = parseFloat(document.getElementById('onboard-weight').value);
                const goalWeight = parseFloat(document.getElementById('onboard-goal-weight').value);

                if (!age || !sex || isNaN(heightFt) || isNaN(heightIn) || !weight || !goalWeight) {
                    onboardErrorMsg.textContent = "Please fill out all fields.";
                    onboardErrorMsg.classList.remove('hidden');
                    return;
                }
                
                // Calculate Height in cm
                const totalInches = (heightFt * 12) + heightIn;
                const heightCm = totalInches * 2.54;
                const weightKg = weight * 0.453592;

                // Mifflin-St Jeor Equation for BMR
                let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
                if (sex === 'male') {
                    bmr += 5;
                } else {
                    bmr -= 161;
                }

                // TDEE estimate (Lightly active multiplier ~1.2)
                const tdee = bmr * 1.2;

                // Calculate Calorie Target (-500 for weight loss, +250 for gain)
                let targetCalories = Math.round(tdee);
                if (goalWeight < weight) {
                    targetCalories -= 500;
                } else if (goalWeight > weight) {
                    targetCalories += 250;
                }

                // Minimum calorie safety floor
                const minCalories = sex === 'male' ? 1500 : 1200;
                targetCalories = Math.max(targetCalories, minCalories);

                userProfile = {
                    name: auth.currentUser?.displayName || 'User',
                    startWeight: weight,
                    goalWeight: goalWeight,
                    calorieTarget: targetCalories,
                    macroTargets: {
                        protein: Math.round(weight * 0.8), // 0.8g per lb
                        fats: Math.round(weight * 0.35),   // 0.35g per lb
                        carbs: Math.max(0, Math.round((targetCalories - (Math.round(weight*0.8)*4) - (Math.round(weight*0.35)*9)) / 4))
                    }
                };

                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                
                // Seed initial weight in history if empty
                if (weightHistoryData.length === 0) {
                    weightHistoryData.push({ date: getTodaysDateEDT(), weight: weight });
                    saveData('weightHistory', weightHistoryData);
                }

                // Hide Onboarding Overlay
                const onboardingOverlay = document.getElementById('onboarding-overlay');
                onboardingOverlay.classList.add('opacity-0');
                setTimeout(() => {
                    onboardingOverlay.classList.add('hidden');
                    initializeAppData();
                }, 500);
            });
        }

    } catch (e) {
        console.error("Failed to load Firebase config", e);
    }
}

