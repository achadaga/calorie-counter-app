// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, searchInput, searchResults, searchLoader, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleSwitch, historyBtns, calorieChartLoader,
    calorieChartContainer, aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay,
    weightChartContainer, welcomeMessage, manualNameInput,
    manualCaloriesInput, addManualBtn, aiChatModal, openChatBtn, closeChatBtn,
    chatContainer, chatInput, chatSendBtn, achievementsGrid, streakDays, streakCounter, tabButtons, tabContents;

const userProfile = {
    name: 'User',
    startWeight: 87.5,
    goalWeight: 76,
    calorieTarget: 1850
};
let dailyItems = {};
let calorieHistoryData = {};
let weightHistoryData = [];
let searchTimeout;
let calorieHistoryChart = null;
let weightHistoryChart = null;
let healthDataSummary = "No data available yet.";
let chatHistory = [];
let unlockedAchievements = [];

// --- 2. WAIT FOR DOM TO LOAD, THEN INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign all UI elements
    mainContainer = document.getElementById('main-container');
    searchInput = document.getElementById('searchInput');
    searchResults = document.getElementById('searchResults');
    searchLoader = document.getElementById('search-loader');
    dailyLog = document.getElementById('dailyLog');
    totalCaloriesSpan = document.getElementById('totalCalories');
    calorieTargetSpan = document.getElementById('calorieTarget');
    calorieProgressCircle = document.getElementById('calorie-progress-circle');
    logLoader = document.getElementById('log-loader');
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
    weightChartContainer = document.getElementById('weightHistoryChart'); 
    calorieChartContainer = document.getElementById('calorieHistoryChart');
    achievementsGrid = document.getElementById('achievements-grid');
    streakDays = document.getElementById('streak-days');
    streakCounter = document.getElementById('streak-counter');
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    manualNameInput = document.getElementById('manualNameInput');
    manualCaloriesInput = document.getElementById('manualCaloriesInput');
    addManualBtn = document.getElementById('add-manual-btn');
    aiChatModal = document.getElementById('ai-chat-modal');
    openChatBtn = document.getElementById('open-chat-btn');
    closeChatBtn = document.getElementById('close-chat-btn');
    chatContainer = document.getElementById('chat-container');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    achievementToast = document.getElementById('achievement-toast');
    toastIcon = document.getElementById('toast-icon');
    toastName = document.getElementById('toast-name');
    
    // Set up event listeners
    themeToggleSwitch.addEventListener('change', handleThemeToggle);
    tabButtons.forEach(button => button.addEventListener('click', () => handleTabSwitch(button)));
    historyBtns.forEach(btn => btn.addEventListener('click', () => handleHistoryButtonClick(btn)));
    logWeightBtn.addEventListener('click', handleLogWeight);
    getAiTipBtn.addEventListener('click', getAICoachTip);
    searchInput.addEventListener('input', handleSearchInput);
    dailyLog.addEventListener('click', handleLogInteraction);
    addManualBtn.addEventListener('click', handleManualAdd);
    openChatBtn.addEventListener('click', handleOpenChat);
    closeChatBtn.addEventListener('click', () => aiChatModal.classList.add('hidden'));
    chatSendBtn.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChatSend(); });

    // Start the app
    initializeAppData();
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
}

// --- APP INITIALIZATION ---
function initializeAppData() {
    mainContainer.classList.remove('hidden');
    
    if (document.documentElement.classList.contains('dark')) {
        themeToggleSwitch.checked = true;
    }

    goalWeightDisplay.textContent = `${userProfile.goalWeight} kg`;
    calorieTargetSpan.textContent = `/ ${userProfile.calorieTarget} Kcal`;
    
    const initialAiMessage = "Hello! I'm your AI nutrition coach. Ask me anything about your diet, meal ideas, or how to reach your goals. How can I help you today?";
    chatHistory = [{ role: 'model', parts: [{ text: initialAiMessage }] }];

    loadUnlockedAchievements();
    getTodaysLog();
    getWeightHistory();
    updateStreak();
    
    renderWeightChart(weightHistoryData);
    fetchCalorieHistory(7); 
    
    handleTabSwitch(document.querySelector('.tab-btn[data-tab="today"]'));
    checkAndUnlockAchievements(); // Initial check on load
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
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(now);
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
    const foodId = foodItem.name.replace(/\s+/g, '-').toLowerCase();
    if (dailyItems[foodId]) {
        dailyItems[foodId].quantity++;
    } else {
        dailyItems[foodId] = { ...foodItem, quantity: 1, id: foodId };
    }
    saveData();
    renderLog();
    checkAndUnlockAchievements();
}

function updateFoodQuantityInDB(foodId, newQuantity) {
    if (dailyItems[foodId]) {
        if (newQuantity > 0) {
            dailyItems[foodId].quantity = newQuantity;
        } else {
            delete dailyItems[foodId];
        }
        saveData();
        renderLog();
    }
}

function logWeightToDB(weight) {
    const today = getTodaysDateEDT();
    const todayEntryIndex = weightHistoryData.findIndex(entry => entry.date === today);
    if (todayEntryIndex > -1) {
        weightHistoryData[todayEntryIndex].weight = parseFloat(weight);
    } else {
        weightHistoryData.push({ date: today, weight: parseFloat(weight) });
    }
    weightHistoryData.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveData();
    renderWeightChart(weightHistoryData);
    updateCurrentWeightDisplay();
    checkAndUnlockAchievements();
    weightInput.value = '';
}

function updateCurrentWeightDisplay() {
     if (weightHistoryData.length > 0) {
        currentWeightDisplay.textContent = `${weightHistoryData[weightHistoryData.length - 1].weight} kg`;
    } else {
        currentWeightDisplay.textContent = `${userProfile.startWeight} kg`;
    }
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


function renderCalorieHistoryChart(data) {
    const sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = sortedDates.map(date => data[date]);
    const ctx = document.getElementById('calorieHistoryChart').getContext('2d');

    if (calorieHistoryChart) {
        calorieHistoryChart.data.labels = labels;
        calorieHistoryChart.data.datasets[0].data = values;
        calorieHistoryChart.update();
    } else {
        calorieHistoryChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Calories', data: values }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
    updateChartAppearance(calorieHistoryChart);
}

function renderWeightChart(data) {
    const labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = data.map(d => d.weight);
    const ctx = document.getElementById('weightHistoryChart').getContext('2d');

    if (weightHistoryChart) {
        weightHistoryChart.data.labels = labels;
        weightHistoryChart.data.datasets[0].data = values;
        weightHistoryChart.update();
    } else {
        weightHistoryChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Weight (kg)', data: values, tension: 0.4 }] },
            options: {
                responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } },
                plugins: { legend: { display: false } }
            }
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

    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = ticksColor;
    chart.options.scales.y.ticks.color = ticksColor;
    
    chart.data.datasets[0].borderColor = primaryColor;
    chart.data.datasets[0].backgroundColor = primaryBgColor;

    if (chart.config.type === 'bar') {
        chart.data.datasets[0].backgroundColor = primaryColor;
    }

    chart.update();
}

function handleHistoryButtonClick(btn) {
    const days = parseInt(btn.dataset.days);
    fetchCalorieHistory(days);
    historyBtns.forEach(b => b.classList.remove('bg-brand-secondary', 'dark:bg-dark-secondary'));
    btn.classList.add('bg-brand-secondary', 'dark:bg-dark-secondary');
}

function handleLogWeight() {
    const weight = weightInput.value;
    if (weight) logWeightToDB(weight);
}


function handleSearchInput() {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (query.length < 3) {
        searchResults.innerHTML = '';
        return;
    }
    searchTimeout = setTimeout(() => searchFoodAPI(query), 500);
}

// --- GAMIFICATION ---
const achievements = [
    { id: 'log1', name: 'First Log', icon: '📝', condition: () => Object.keys(localStorage).some(k => k.startsWith('log_')) },
    { id: 'streak3', name: '3-Day Streak', icon: '🔥', condition: () => calculateStreak() >= 3 },
    { id: 'streak7', name: '7-Day Streak', icon: '🏆', condition: () => calculateStreak() >= 7 },
    { id: 'streak14', name: '14-Day Streak', icon: '🏅', condition: () => calculateStreak() >= 14 },
    { id: 'streak30', name: '30-Day Streak', icon: '🎉', condition: () => calculateStreak() >= 30 },
    { id: 'week1', name: 'First Week', icon: '📅', condition: () => Object.keys(localStorage).filter(k => k.startsWith('log_')).length >= 7 },
    { id: 'lose1kg', name: 'Lost 1kg', icon: '💪', condition: () => weightHistoryData.length > 0 && userProfile.startWeight - weightHistoryData[weightHistoryData.length - 1].weight >= 1 },
    { id: 'lose5kg', name: 'Lost 5kg', icon: '🎉', condition: () => weightHistoryData.length > 0 && userProfile.startWeight - weightHistoryData[weightHistoryData.length - 1].weight >= 5 },
    { id: 'halfway', name: 'Halfway There', icon: '🏁', condition: () => weightHistoryData.length > 0 && (userProfile.startWeight - weightHistoryData[weightHistoryData.length - 1].weight) >= (userProfile.startWeight - userProfile.goalWeight) / 2 },
    { id: 'goal', name: 'Goal Getter', icon: '🥇', condition: () => weightHistoryData.length > 0 && weightHistoryData[weightHistoryData.length - 1].weight <= userProfile.goalWeight },
    { id: 'weightLog1', name: 'First Weigh-in', icon: '⚖️', condition: () => weightHistoryData.length >= 1 },
    { id: 'weightLog5', name: 'Consistent Weigher', icon: '📈', condition: () => weightHistoryData.length >= 5 },
    { id: 'perfectDay', name: 'Perfect Day', icon: '🎯', condition: () => { const today = getTodaysDateEDT(); const log = localStorage.getItem(`log_${today}`); if (!log) return false; const items = JSON.parse(log); const total = Object.values(items).reduce((sum, item) => sum + (item.calories * item.quantity), 0); return total > 0 && total <= userProfile.calorieTarget; }},
    { id: 'explorer', name: 'Explorer', icon: '🗺️', condition: () => getTotalUniqueFoods() >= 10 },
    { id: 'foodCritic', name: 'Food Critic', icon: '🧐', condition: () => getTotalUniqueFoods() >= 50 },
    { id: 'librarian', name: 'Librarian', icon: '📚', condition: () => getTotalUniqueFoods() >= 100 },
    { id: 'manualMaster', name: 'Manual Master', icon: '✍️', condition: () => localStorage.getItem('manualEntryCount') >= 1 },
    { id: 'chat1', name: 'Curious Mind', icon: '💬', condition: () => chatHistory.length > 2 },
];

function loadUnlockedAchievements() {
    const saved = localStorage.getItem('unlockedAchievements');
    unlockedAchievements = saved ? JSON.parse(saved) : [];
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
}

function renderAchievements() {
    achievementsGrid.innerHTML = '';
    const unlocked = getUnlockedAchievements();

    if (unlocked.length === 0) {
        achievementsGrid.innerHTML = `<p class="col-span-3 text-center text-gray-500">Log your progress to unlock achievements!</p>`;
        return;
    }

    unlocked.forEach(ach => {
        const div = document.createElement('div');
        div.className = `achievement-badge unlocked p-4 bg-brand-bg dark:bg-dark-bg rounded-2xl flex flex-col items-center justify-center gap-2`;
        div.innerHTML = `
            <span class="text-4xl">${ach.icon}</span>
            <span class="text-xs font-semibold">${ach.name}</span>
        `;
        achievementsGrid.appendChild(div);
    });
}

function getUnlockedAchievements() {
    return achievements.filter(ach => unlockedAchievements.includes(ach.id));
}

function getTotalUniqueFoods() {
    const allLogs = Object.keys(localStorage).filter(k => k.startsWith('log_'));
    const uniqueFoods = new Set();
    allLogs.forEach(key => {
        const log = JSON.parse(localStorage.getItem(key));
        Object.keys(log).forEach(foodId => uniqueFoods.add(foodId));
    });
    return uniqueFoods.size;
}


function calculateStreak() {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
        
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
        streakDays.textContent = `${streak} Day Streak!`;
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

    const prompt = `You are a friendly AI nutrition coach specializing in healthy Indian cuisine. The user's health data is: ${healthDataSummary}. Provide a short, motivational tip (2-4 sentences) about a low-calorie Indian meal, a protein shake, or a meal with their preferred proteins (egg, tofu, shrimp). Address the user by name.`;

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: { contents: [{ parts: [{ text: prompt }] }] } })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        aiResponseEl.textContent = result.candidates[0].content.parts[0].text;
    } catch (error) {
        aiResponseEl.textContent = "Could not get tip. Check API keys in Vercel.";
    } finally {
        aiResponseEl.classList.remove('hidden');
        aiLoader.classList.add('hidden');
        getAiTipBtn.disabled = false;
    }
}

async function searchFoodAPI(query) {
    searchLoader.classList.remove('hidden');
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'food', query: query })
        });
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        displaySearchResults(data.hints);
    } catch (error) {
        searchResults.innerHTML = `<div class="p-2 text-center text-sm">Could not fetch results.</div>`;
    } finally {
        searchLoader.classList.add('hidden');
    }
}

// --- UI RENDERING ---
function displaySearchResults(foods) {
    searchResults.innerHTML = '';
    if (!foods || foods.length === 0) {
        searchResults.innerHTML = `<div class="p-2 text-center text-sm">No results found.</div>`;
        return;
    }
    foods.slice(0, 5).forEach(item => {
        const food = item.food;
        const foodName = food.label;
        const calories = food.nutrients.ENERC_KCAL ? Math.round(food.nutrients.ENERC_KCAL) : 0;
        const resultDiv = document.createElement('div');
        resultDiv.className = 'p-3 hover:bg-brand-secondary dark:hover:bg-dark-secondary cursor-pointer flex justify-between items-center border-t border-brand-subtle dark:border-dark-subtle';
        resultDiv.innerHTML = `<div><p class="font-semibold">${foodName}</p><p class="text-sm">${calories} calories</p></div><button class="text-brand-primary dark:text-dark-primary font-bold text-2xl">+</button>`;
        resultDiv.addEventListener('click', () => {
            addFoodToDB({ name: foodName, calories: calories });
            searchInput.value = '';
            searchResults.innerHTML = '';
        });
        searchResults.appendChild(resultDiv);
    });
}

function renderLog() {
    dailyLog.innerHTML = '';
    let total = 0;
    const items = Object.values(dailyItems);
    emptyLogMessage.classList.toggle('hidden', items.length > 0);
    
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'p-3 bg-brand-bg dark:bg-dark-bg rounded-xl flex justify-between items-center';
        listItem.innerHTML = `
            <div>
                <p class="font-semibold">${item.name}</p>
                <p class="text-sm">${item.calories} kcal</p>
            </div>
            <div class="flex items-center gap-2">
                <button data-id="${item.id}" data-action="decrease" class="quantity-btn text-lg font-bold w-7 h-7 rounded-full bg-brand-secondary dark:bg-dark-secondary">-</button>
                <span class="font-bold text-lg w-8 text-center">${item.quantity}</span>
                <button data-id="${item.id}" data-action="increase" class="quantity-btn text-lg font-bold w-7 h-7 rounded-full bg-brand-secondary dark:bg-dark-secondary">+</button>
            </div>
        `;
        dailyLog.appendChild(listItem);
        total += item.calories * item.quantity;
    });
    totalCaloriesSpan.textContent = Math.round(total);
    
    const percentage = userProfile.calorieTarget > 0 ? Math.min((total / userProfile.calorieTarget) * 100, 100) : 0;
    calorieProgressCircle.style.strokeDasharray = `${percentage}, 100`;
}

function handleLogInteraction(e) {
    const target = e.target.closest('.quantity-btn');
    if (!target) return;
    
    const foodId = target.dataset.id;
    const action = target.dataset.action;
    const item = dailyItems[foodId];

    if (!item) return;

    if (action === 'increase') {
        updateFoodQuantityInDB(foodId, item.quantity + 1);
    } else if (action === 'decrease') {
        updateFoodQuantityInDB(foodId, item.quantity - 1);
    }
}

function handleManualAdd() {
    const name = manualNameInput.value || 'Manual Entry';
    const calories = parseInt(manualCaloriesInput.value);

    if (!calories || calories <= 0) {
        alert("Please enter a valid calorie amount.");
        return;
    }
    
    // Track manual entry for achievement
    let manualCount = parseInt(localStorage.getItem('manualEntryCount')) || 0;
    localStorage.setItem('manualEntryCount', ++manualCount);

    addFoodToDB({ name, calories });
    manualNameInput.value = '';
    manualCaloriesInput.value = '';
}

async function handleChatSend() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    appendMessage(userMessage, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    chatInput.value = '';
    chatSendBtn.disabled = true;

    const typingId = `typing-${Date.now()}`;
    appendMessage(`<div class="typing-loader" id="${typingId}"><span></span><span></span><span></span></div>`, 'ai');

    await fetchHealthDataSummary();

    const systemInstruction = {
        parts: [{ text: `You are a friendly AI nutrition coach specializing in healthy Indian cuisine. The user is predominantly vegetarian but also eats eggs, tofu, and shrimp. Here is the user's current health data summary: ${healthDataSummary}. Keep your responses conversational and focused on their questions.` }]
    };

    try {
        const payload = {
            contents: chatHistory,
            systemInstruction: systemInstruction
        };
        
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: payload })
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        
        const result = await response.json();
        const aiResponse = result.candidates[0].content.parts[0].text;
        
        document.getElementById(typingId).closest('.message-bubble-wrapper').remove();
        appendMessage(aiResponse, 'ai');
        chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
        checkAndUnlockAchievements();

    } catch (error) {
        console.error("Gemini API error:", error);
        document.getElementById(typingId).closest('.message-bubble-wrapper').remove();
        appendMessage("Sorry, I'm having trouble connecting right now. Please try again.", 'ai');
    } finally {
        chatSendBtn.disabled = false;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function handleOpenChat() {
    chatContainer.innerHTML = ''; 
    chatHistory.forEach(msg => {
        const sender = msg.role === 'user' ? 'user' : 'ai';
        const message = msg.parts[0].text;
        appendMessage(message, sender);
    });
    aiChatModal.classList.remove('hidden');
}


function appendMessage(message, sender) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message-bubble-wrapper flex items-start gap-3';
    
    if (sender === 'user') {
        messageWrapper.classList.add('justify-end');
        messageWrapper.innerHTML = `
            <div class="bg-brand-primary text-white p-4 rounded-2xl rounded-br-none max-w-xs md:max-w-md message-bubble">
                <p>${message}</p>
            </div>
            <div class="bg-brand-subtle dark:bg-dark-subtle text-brand-text dark:text-dark-text p-2 rounded-full h-8 w-8 flex items-center justify-center font-bold flex-shrink-0">U</div>
        `;
    } else { // AI
        messageWrapper.classList.add('justify-start');
        messageWrapper.innerHTML = `
            <div class="bg-brand-primary text-white p-2 rounded-full h-8 w-8 flex items-center justify-center font-bold flex-shrink-0">A</div>
            <div class="ai-message-bubble bg-brand-secondary dark:bg-dark-secondary p-4 rounded-2xl rounded-bl-none max-w-xs md:max-w-md message-bubble">
                ${message}
            </div>
        `;
    }
    chatContainer.appendChild(messageWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

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
        weightHistoryText += `- ${w.date}: ${w.weight} kg\n`;
    });
    
    const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : userProfile.startWeight;

    healthDataSummary = `
        User Profile and Goals:
        - Name: ${userProfile.name}
        - Starting Weight: ${userProfile.startWeight} kg
        - Current Weight: ${latestWeight} kg
        - Goal Weight: ${userProfile.goalWeight} kg
        - Daily Calorie Target: ${userProfile.calorieTarget} kcal
        
        ${calorieHistoryText}
        ${weightHistoryText}
    `;
}

