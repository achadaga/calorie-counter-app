// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleSwitch, historyBtns,
    aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay,
    achievementsGrid, streakDays, streakCounter, tabButtons, tabContents,
    achievementToast, toastIcon, toastName,
    chatContainer, chatInput, chatSendBtn, quickRepliesContainer, calorieHistoryChartEl, weightHistoryChartEl;

const userProfile = {
    name: 'User',
    startWeight: 87.5,
    goalWeight: 76,
    calorieTarget: 1850
};
let dailyItems = {};
let calorieHistoryData = {};
let weightHistoryData = [];
let calorieHistoryChart = null;
let weightHistoryChart = null;
let healthDataSummary = "No data available yet.";
let chatHistory = [];
let unlockedAchievements = [];

const achievements = {
    firstLog: { name: 'First Step', icon: '🎉', description: 'Log your first meal.' },
    streak3: { name: 'On a Roll', icon: '🔥', description: 'Maintain a 3-day streak.' },
    goalReached: { name: 'Goal Getter', icon: '🎯', description: 'Reach your weight goal.' },
    tenLogs: { name: 'Food Explorer', icon: '🍲', description: 'Log 10 different items.' },
    firstWeightLog: { name: 'Weight Watcher', icon: '⚖️', description: 'Log your weight for the first time.' }
};

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
    
    const initialAiMessage = "Hello! I'm your AI health assistant. Tell me what you ate (e.g., 'I had 2 idlis and a coffee'), or ask for your progress.";
    chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify({type: 'text', payload: {message: initialAiMessage}})}] });
    appendMessage({ type: 'text', payload: { message: initialAiMessage } }, 'ai');


    loadUnlockedAchievements();
    renderAchievements();
    getTodaysLog();
    getWeightHistory();
    updateStreak();
    
    renderWeightChart(weightHistoryData);
    fetchCalorieHistory(7); 
    
    handleTabSwitch(document.querySelector('.tab-btn[data-tab="today"]'));
    checkAndUnlockAchievements();
}

// --- TAB NAVIGATION ---
function handleTabSwitch(button) {
    const tab = button.dataset.tab;
    const activeClass = 'bg-brand-secondary';
    const darkActiveClass = 'dark:bg-dark-secondary';

    tabButtons.forEach(btn => {
        btn.classList.remove('active', activeClass, darkActiveClass);
        btn.classList.add('text-gray-400');
    });
    button.classList.add('active', activeClass, darkActiveClass);
    button.classList.remove('text-gray-400');
    tabContents.forEach(content => {
        content.id === `${tab}-tab-content` ? content.classList.remove('hidden') : content.classList.add('hidden');
    });
}


// --- LOCAL STORAGE DATA HANDLING ---
function getTodaysDateEDT() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
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
    const foodId = (foodItem.foodName || 'unknown').replace(/\s+/g, '-').toLowerCase();
    if (dailyItems[foodId]) {
        dailyItems[foodId].quantity += foodItem.quantity;
    } else {
        dailyItems[foodId] = { ...foodItem, id: foodId };
    }
    saveData();
    renderLog();
    checkAndUnlockAchievements();
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
            data: { labels, datasets: [ { label: 'Calories', data: values }, { label: 'Average', data: averageData, type: 'line', pointRadius: 0, borderWidth: 2, borderDash: [5, 5] } ] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
    updateChartAppearance(calorieHistoryChart);
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
            data: { labels, datasets: [{ label: 'Weight (kg)', data: values, tension: 0.4 }] },
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

    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = ticksColor;
    chart.options.scales.y.ticks.color = ticksColor;
    
    chart.data.datasets.forEach(dataset => {
        if (dataset.type === 'line') {
            dataset.borderColor = isDarkMode ? '#F59E0B' : '#F97316';
        } else {
            dataset.borderColor = primaryColor;
            dataset.backgroundColor = primaryColor;
        }
    });

    if (chart.config.type === 'line') {
        chart.data.datasets[0].backgroundColor = primaryBgColor;
        chart.data.datasets[0].fill = true;
    }
    chart.update();
}


function handleHistoryButtonClick(btn) {
    const days = parseInt(btn.dataset.days);
    const activeClass = 'bg-brand-secondary';
    const darkActiveClass = 'dark:bg-dark-secondary';
    fetchCalorieHistory(days);
    historyBtns.forEach(b => b.classList.remove(activeClass, darkActiveClass));
    btn.classList.add(activeClass, darkActiveClass);
}

function handleLogWeight() {
    const weight = weightInput.value;
    if (weight && !isNaN(weight)) logWeightToDB(weight);
}

// --- GAMIFICATION ---
function checkAndUnlockAchievements() {
    // First log
    if (Object.keys(dailyItems).length > 0) {
        unlockAchievement('firstLog');
    }
    // Ten unique logs
    const allLogs = Object.keys(localStorage).filter(k => k.startsWith('log_'));
    const uniqueFoods = new Set();
    allLogs.forEach(logKey => {
        const log = JSON.parse(localStorage.getItem(logKey) || '{}');
        Object.keys(log).forEach(foodId => uniqueFoods.add(foodId));
    });
    if (uniqueFoods.size >= 10) {
        unlockAchievement('tenLogs');
    }
    // Weight goal reached
    if (weightHistoryData.length > 0 && weightHistoryData[weightHistoryData.length - 1].weight <= userProfile.goalWeight) {
        unlockAchievement('goalReached');
    }
    // First weight log
    if (weightHistoryData.length > 0) {
        unlockAchievement('firstWeightLog');
    }
    // 3-day streak
    if (calculateStreak() >= 3) {
        unlockAchievement('streak3');
    }
}

function unlockAchievement(id) {
    if (!unlockedAchievements.includes(id)) {
        unlockedAchievements.push(id);
        localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
        showAchievementToast(id);
        renderAchievements();
    }
}

function loadUnlockedAchievements() {
    const saved = localStorage.getItem('unlockedAchievements');
    unlockedAchievements = saved ? JSON.parse(saved) : [];
}

function renderAchievements() {
    achievementsGrid.innerHTML = '';
    for (const id in achievements) {
        const achievement = achievements[id];
        const isUnlocked = unlockedAchievements.includes(id);
        const badge = document.createElement('div');
        badge.className = `achievement-badge p-4 rounded-xl flex flex-col items-center justify-center ${isUnlocked ? 'unlocked' : ''}`;
        badge.innerHTML = `
            <div class="text-4xl mb-2">${achievement.icon}</div>
            <p class="font-semibold text-sm">${achievement.name}</p>
        `;
        badge.title = achievement.description;
        achievementsGrid.appendChild(badge);
    }
}

function showAchievementToast(id) {
    const achievement = achievements[id];
    toastIcon.textContent = achievement.icon;
    toastName.textContent = achievement.name;
    achievementToast.classList.add('show');
    setTimeout(() => {
        achievementToast.classList.remove('show');
    }, 4000);
}

function calculateStreak() {
    let streak = 0;
    let daysChecked = 0;
    const today = new Date();
    
    while (true) {
        const d = new Date(today);
        d.setDate(d.getDate() - daysChecked);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        const log = localStorage.getItem(`log_${dateString}`);
        if (log && Object.keys(JSON.parse(log)).length > 0) {
            streak++;
            daysChecked++;
        } else {
            break;
        }
    }
    return streak;
}

function updateStreak() {
    const currentStreak = calculateStreak();
    if (currentStreak > 0) {
        streakDays.textContent = `${currentStreak} day${currentStreak > 1 ? 's' : ''}`;
        streakCounter.classList.remove('hidden');
    } else {
        streakCounter.classList.add('hidden');
    }
}

// --- API LOGIC (SECURE) ---
async function fetchHealthDataSummary() {
    const totalCaloriesToday = Object.values(dailyItems).reduce((sum, item) => sum + (item.calories * item.quantity), 0);
    const currentWeight = weightHistoryData.length > 0 ? weightHistoryData[weightHistoryData.length - 1].weight : userProfile.startWeight;
    healthDataSummary = `
        Today's calories: ${Math.round(totalCaloriesToday)} / ${userProfile.calorieTarget} kcal.
        Current weight: ${currentWeight} kg.
        Goal weight: ${userProfile.goalWeight} kg.
        Streak: ${calculateStreak()} days.
    `;
}

async function getAICoachTip() {
    aiResponseEl.classList.add('hidden');
    aiLoader.classList.remove('hidden');
    getAiTipBtn.disabled = true;

    await fetchHealthDataSummary();

    const prompt = `You are a friendly and encouraging AI nutrition coach. Based on the user's current health data, provide a short (1-2 sentences), actionable, and motivational tip. Do not repeat the user's data back to them. Health Data: ${healthDataSummary}.`;

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: prompt })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        const tip = result.candidates[0].content.parts[0].text;
        aiResponseEl.textContent = tip;
    } catch (error) {
        console.error("AI Coach Tip Error:", error);
        aiResponseEl.textContent = "Could not get a tip right now. Please check your connection and try again.";
    } finally {
        aiResponseEl.classList.remove('hidden');
        aiLoader.classList.add('hidden');
        getAiTipBtn.disabled = false;
    }
}

async function handleChatSend() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    appendMessage({ type: 'text', payload: { message: userMessage }}, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    chatInput.value = '';
    chatSendBtn.disabled = true;
    quickRepliesContainer.innerHTML = '';

    const typingId = `typing-${Date.now()}`;
    appendMessage({ type: 'typing_indicator', id: typingId }, 'ai');

    await fetchHealthDataSummary();

    const system_instruction = {
        parts: [{ text: `
            You are a "Smart AI Health Assistant". Your primary role is to help a user track their health and diet through conversation.
            The user's health data summary is: ${healthDataSummary}.
            You MUST respond with only a single, raw JSON object, with no other text, comments, or markdown formatting around it.
            Your response must be perfectly formatted JSON.

            Available types:
            1. "text": For a standard chat response or to answer a question. payload: { "message": "Your text here" }.
            2. "food_log": When the user logs food. Analyze their message (e.g., "I ate two rotis and dal"). Estimate the total calories. Respond with a food_log. payload: { "foodName": "User's description (e.g., Two rotis and dal)", "calories": ESTIMATED_CALORIES, "quantity": 1 }.
            3. "confirmation": To ask a clarifying question. payload: { "message": "Your question?", "quick_replies": ["Yes", "No", "Cancel"] }.

            Analyze the user's message ("${userMessage}"), determine the intent (log food, ask question, or just chat), and generate the correct JSON response.
        `}]
    };

    try {
        const payload = { contents: chatHistory, system_instruction };
        
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: payload })
        });
        
        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorDetails}`);
        }
        
        const result = await response.json();
        const aiResponseText = result.candidates[0].content.parts[0].text;
        
        document.getElementById(typingId)?.closest('.message-bubble-wrapper')?.remove();

        try {
            const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            
            const aiResponseJSON = JSON.parse(jsonMatch[0]);
            chatHistory.push({ role: 'model', parts: [{ text: jsonMatch[0] }] });
            
            if (aiResponseJSON.type === 'food_log' && aiResponseJSON.payload) {
                addFoodToDB(aiResponseJSON.payload);
                appendMessage({ type: 'food_log_card', payload: aiResponseJSON.payload }, 'ai');
            } else {
                 appendMessage(aiResponseJSON, 'ai');
            }
           
            if(aiResponseJSON.type === 'confirmation' && aiResponseJSON.payload.quick_replies) {
                renderQuickReplies(aiResponseJSON.payload.quick_replies);
            }
        } catch (e) {
             console.error("JSON Parsing Error or invalid structure:", e, "Raw Response:", aiResponseText);
             chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify({type:'text', payload:{message: aiResponseText}})}] });
             appendMessage({ type: 'text', payload: { message: "I received a response I couldn't understand. Can you rephrase?" } }, 'ai');
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        document.getElementById(typingId)?.closest('.message-bubble-wrapper')?.remove();
        appendMessage({ type: 'text', payload: { message: "Sorry, I couldn't connect. Please try again." } }, 'ai');
    } finally {
        chatSendBtn.disabled = false;
        chatInput.focus();
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// --- UI RENDERING ---
function renderLog() {
    dailyLog.innerHTML = '';
    let total = 0;
    const items = Object.values(dailyItems);
    emptyLogMessage.classList.toggle('hidden', items.length === 0);
    
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'p-3 bg-brand-bg dark:bg-dark-bg rounded-xl flex justify-between items-center';
        listItem.innerHTML = `
            <div>
                <p class="font-semibold capitalize">${item.foodName || item.name}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${item.calories} kcal</p>
            </div>
            <div class="font-bold text-lg text-brand-text dark:text-dark-text">x${item.quantity}</div>
        `;
        dailyLog.appendChild(listItem);
        total += item.calories * item.quantity;
    });
    totalCaloriesSpan.textContent = Math.round(total);
    const percentage = userProfile.calorieTarget > 0 ? Math.min((total / userProfile.calorieTarget) * 100, 100) : 0;
    calorieProgressCircle.style.strokeDasharray = `${percentage}, 100`;
}

function renderQuickReplies(replies) {
    quickRepliesContainer.innerHTML = '';
    replies.forEach(reply => {
        const button = document.createElement('button');
        button.className = 'quick-reply-btn bg-brand-secondary dark:bg-dark-secondary text-brand-text dark:text-dark-text px-3 py-1 rounded-full text-sm';
        button.textContent = reply;
        quickRepliesContainer.appendChild(button);
    });
}

function appendMessage(data, sender) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-bubble-wrapper flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble max-w-xs md:max-w-md p-4 rounded-2xl ${
        sender === 'user'
            ? 'bg-brand-primary text-white rounded-br-lg'
            : 'bg-brand-surface dark:bg-dark-surface rounded-bl-lg'
    }`;

    switch (data.type) {
        case 'text':
            bubble.textContent = data.payload.message;
            break;
        case 'food_log_card':
            bubble.innerHTML = `
                <p class="font-semibold">Logged!</p>
                <p class="capitalize">${data.payload.foodName}</p>
                <p class="font-bold">${data.payload.calories} kcal</p>
            `;
            break;
        case 'confirmation':
            bubble.textContent = data.payload.message;
            break;
        case 'typing_indicator':
            bubble.id = data.id;
            bubble.innerHTML = `
                <div class="typing-loader">
                    <span></span><span></span><span></span>
                </div>
            `;
            break;
        default:
            bubble.textContent = 'Received an unknown message type.';
    }

    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
