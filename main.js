// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleSwitch, historyBtns,
    aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay,
    achievementsGrid, streakDays, streakCounter, tabButtons, tabContents,
    achievementToast, toastIcon, toastName,
    chatContainer, chatInput, chatSendBtn, quickRepliesContainer;

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

// --- 2. WAIT FOR DOM TO LOAD, THEN INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign all UI elements
    mainContainer = document.getElementById('main-container');
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
    
    // Set up event listeners
    themeToggleSwitch.addEventListener('change', handleThemeToggle);
    tabButtons.forEach(button => button.addEventListener('click', () => handleTabSwitch(button)));
    historyBtns.forEach(btn => btn.addEventListener('click', () => handleHistoryButtonClick(btn)));
    logWeightBtn.addEventListener('click', handleLogWeight);
    getAiTipBtn.addEventListener('click', getAICoachTip);
    chatSendBtn.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChatSend(); });
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
    chatHistory = [{ role: 'model', parts: [{ text: initialAiMessage }] }];
    appendMessage({ type: 'text', payload: { message: initialAiMessage } }, 'ai');


    loadUnlockedAchievements();
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
    const foodId = foodItem.foodName.replace(/\s+/g, '-').toLowerCase();
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
    const ctx = document.getElementById('calorieHistoryChart').getContext('2d');
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
    const ctx = document.getElementById('weightHistoryChart').getContext('2d');

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

// --- GAMIFICATION ---
// ... (Achievement logic remains the same)
function calculateStreak() { /* ... */ }
function updateStreak() { /* ... */ }
function checkAndUnlockAchievements() { /* ... */ }

// --- API LOGIC (SECURE) ---
async function getAICoachTip() {
    // ... (This function remains the same)
}

async function handleChatSend() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    appendMessage({ text: userMessage }, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    chatInput.value = '';
    chatSendBtn.disabled = true;
    quickRepliesContainer.innerHTML = '';

    const typingId = `typing-${Date.now()}`;
    appendMessage({ type: 'typing_indicator', id: typingId }, 'ai');

    await fetchHealthDataSummary();

    const systemInstruction = {
        parts: [{ text: `
            You are a "Smart AI Health Assistant". Your primary role is to help a user track their health and diet through conversation.
            The user's health data summary is: ${healthDataSummary}.
            You MUST respond in structured JSON format with a "type" and a "payload".

            Available types:
            1. "text": For a standard chat response. payload: { "message": "Your text here" }.
            2. "food_log": When the user logs food. Analyze their message (e.g., "I ate two rotis and dal"). Estimate the total calories. Respond with a food_log. payload: { "foodName": "User's description (e.g., Two rotis and dal)", "calories": ESTIMATED_CALORIES, "quantity": 1 }.
            3. "confirmation": To ask a clarifying question. payload: { "message": "Your question?", "quick_replies": ["Yes", "No"] }.

            Analyze the user's message ("${userMessage}"), determine the intent (log food or just chat), and generate the correct JSON response.
        `}]
    };

    try {
        const payload = { contents: chatHistory, systemInstruction: systemInstruction };
        
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: payload })
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        
        const result = await response.json();
        const aiResponseText = result.candidates[0].content.parts[0].text;
        
        document.getElementById(typingId)?.closest('.message-bubble-wrapper')?.remove();

        try {
            const aiResponseJSON = JSON.parse(aiResponseText);
            chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });
            
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
            appendMessage({ type: 'text', payload: { message: "I had trouble understanding that. Could you rephrase your meal?" } }, 'ai');
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        document.getElementById(typingId)?.closest('.message-bubble-wrapper')?.remove();
        appendMessage({ type: 'text', payload: { message: "Sorry, I couldn't connect. Please try again." } }, 'ai');
    } finally {
        chatSendBtn.disabled = false;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// --- UI RENDERING ---
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
                <p class="font-semibold">${item.foodName}</p>
                <p class="text-sm">${item.calories} kcal</p>
            </div>
            <div class="font-bold text-lg">x${item.quantity}</div>
        `;
        dailyLog.appendChild(listItem);
        total += item.calories * item.quantity;
    });
    totalCaloriesSpan.textContent = Math.round(total);
    const percentage = userProfile.calorieTarget > 0 ? Math.min((total / userProfile.calorieTarget) * 100, 100) : 0;
    calorieProgressCircle.style.strokeDasharray = `${percentage}, 100`;
}

function handleOpenChat() {
    chatContainer.innerHTML = ''; 
    chatHistory.forEach(msg => {
        let sender, data;
        try {
            data = JSON.parse(msg.parts[0].text);
            sender = msg.role === 'user' ? 'user' : 'ai';
        } catch(e) {
            data = { type: 'text', payload: { message: msg.parts[0].text } };
            sender = msg.role === 'user' ? 'user' : 'ai';
        }
        appendMessage(data, sender);
    });
    aiChatModal.classList.remove('hidden');
}

function appendMessage(data, sender) {
    // ... (This function is now updated to handle different card types)
}

