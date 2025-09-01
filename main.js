// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, searchInput, searchResults, searchLoader, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressBar, logLoader, emptyLogMessage,
    themeSwitch, historyBtns, calorieChartLoader,
    calorieChartContainer, aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay, goalDateDisplay,
    weightChartLoader, weightChartContainer, welcomeMessage, manualNameInput,
    manualCaloriesInput, addManualBtn, aiChatModal, openChatBtn, closeChatBtn,
    chatContainer, chatInput, chatSendBtn;

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
    calorieProgressBar = document.getElementById('calorie-progress-bar');
    logLoader = document.getElementById('log-loader');
    emptyLogMessage = document.getElementById('empty-log-message');
    themeSwitch = document.getElementById('theme-switch');
    historyBtns = document.querySelectorAll('.history-btn');
    calorieChartLoader = document.getElementById('calorie-chart-loader');
    calorieChartContainer = document.getElementById('calorieChartContainer');
    aiResponseEl = document.getElementById('ai-response');
    getAiTipBtn = document.getElementById('get-ai-tip-btn');
    aiLoader = document.getElementById('ai-loader');
    weightInput = document.getElementById('weightInput');
    logWeightBtn = document.getElementById('log-weight-btn');
    currentWeightDisplay = document.getElementById('current-weight-display');
    goalWeightDisplay = document.getElementById('goal-weight-display');
    goalDateDisplay = document.getElementById('goal-date-display');
    weightChartLoader = document.getElementById('weight-chart-loader');
    weightChartContainer = document.getElementById('weightChartContainer');
    welcomeMessage = document.getElementById('welcome-message');
    manualNameInput = document.getElementById('manualNameInput');
    manualCaloriesInput = document.getElementById('manualCaloriesInput');
    addManualBtn = document.getElementById('add-manual-btn');
    aiChatModal = document.getElementById('ai-chat-modal');
    openChatBtn = document.getElementById('open-chat-btn');
    closeChatBtn = document.getElementById('close-chat-btn');
    chatContainer = document.getElementById('chat-container');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');

    // Set up event listeners
    themeSwitch.addEventListener('change', handleThemeToggle);
    historyBtns.forEach(btn => btn.addEventListener('click', () => handleHistoryButtonClick(btn)));
    logWeightBtn.addEventListener('click', handleLogWeight);
    getAiTipBtn.addEventListener('click', getAICoachTip);
    searchInput.addEventListener('input', handleSearchInput);
    dailyLog.addEventListener('click', handleLogInteraction);
    addManualBtn.addEventListener('click', handleManualAdd);
    openChatBtn.addEventListener('click', () => aiChatModal.classList.remove('hidden'));
    closeChatBtn.addEventListener('click', () => aiChatModal.classList.add('hidden'));
    chatSendBtn.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChatSend(); });

    // Start the app
    initializeAppData();
});


// --- THEME TOGGLE LOGIC ---
function handleThemeToggle() {
    if (themeSwitch.checked) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
    if (calorieHistoryChart) updateChartAppearance(calorieHistoryChart);
    if (weightHistoryChart) updateChartAppearance(weightHistoryChart, true);
}

function initializeTheme() {
    if (document.documentElement.classList.contains('dark')) {
        themeSwitch.checked = true;
    } else {
        themeSwitch.checked = false;
    }
}

// --- APP INITIALIZATION ---
function initializeAppData() {
    mainContainer.classList.remove('hidden');
    welcomeMessage.textContent = `Welcome, ${userProfile.name}!`;
    goalWeightDisplay.textContent = `${userProfile.goalWeight} kg`;
    calorieTargetSpan.textContent = userProfile.calorieTarget;
    
    const initialAiMessage = "Hello! I'm your AI nutrition coach. Ask me anything about your diet, meal ideas, or how to reach your goals. How can I help you today?";
    chatHistory = [{ role: 'model', parts: [{ text: initialAiMessage }] }];
    
    initializeTheme();
    getTodaysLog();
    getWeightHistory();
    fetchCalorieHistory(7);
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
    logLoader.classList.remove('hidden');
    const today = getTodaysDateEDT();
    const savedLog = localStorage.getItem(`log_${today}`);
    dailyItems = savedLog ? JSON.parse(savedLog) : {};
    renderLog();
    logLoader.classList.add('hidden');
}

function getWeightHistory() {
    const savedHistory = localStorage.getItem('weightHistory');
    weightHistoryData = savedHistory ? JSON.parse(savedHistory) : [];
    renderWeightChart(weightHistoryData);
    updateCurrentWeightDisplay();
}

function saveData() {
    const today = getTodaysDateEDT();
    localStorage.setItem(`log_${today}`, JSON.stringify(dailyItems));
    localStorage.setItem('weightHistory', JSON.stringify(weightHistoryData));
}

// --- UI & DATA MANIPULATION ---
function addFoodToDB(foodItem) {
    const foodId = foodItem.name.replace(/[^a-zA-Z0-9]/g, '');
    if (dailyItems[foodId]) {
        dailyItems[foodId].quantity++;
    } else {
        dailyItems[foodId] = { ...foodItem, quantity: 1 };
    }
    saveData();
    renderLog();
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
    calorieChartLoader.classList.remove('hidden');
    calorieChartContainer.classList.add('hidden');

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
    calculateAndDisplayGoalDate();
    calorieChartLoader.classList.add('hidden');
    calorieChartContainer.classList.remove('hidden');
}

function calculateAndDisplayGoalDate() {
    if (!userProfile.calorieTarget || Object.keys(calorieHistoryData).length < 3) {
        goalDateDisplay.textContent = "More data needed";
        return;
    }

    const latestWeight = weightHistoryData.length > 0 ? weightHistoryData[weightHistoryData.length-1].weight : userProfile.startWeight;
    const weightToLose = latestWeight - userProfile.goalWeight;

    if (weightToLose <= 0) {
        goalDateDisplay.textContent = "Goal Reached! 🎉";
        return;
    }

    const totalDeficitNeeded = weightToLose * 7700;
    
    const historicalIntake = Object.values(calorieHistoryData).filter(cals => cals > 0);
    if (historicalIntake.length < 3) {
        goalDateDisplay.textContent = "More data needed";
        return;
    }
    const averageIntake = historicalIntake.reduce((a, b) => a + b, 0) / historicalIntake.length;
    
    const averageDailyDeficit = userProfile.calorieTarget - averageIntake;

    if (averageDailyDeficit <= 100) {
        goalDateDisplay.textContent = "Maintain deficit";
        return;
    }

    const daysToGoal = Math.round(totalDeficitNeeded / averageDailyDeficit);
    
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + daysToGoal);

    goalDateDisplay.textContent = goalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderCalorieHistoryChart(data) {
    const sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = sortedDates.map(date => data[date]);

    if (calorieHistoryChart) {
        calorieHistoryChart.data.labels = labels;
        calorieHistoryChart.data.datasets[0].data = values;
        calorieHistoryChart.update();
    } else {
        const ctx = document.getElementById('calorieHistoryChart').getContext('2d');
        calorieHistoryChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Calories', data: values, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1, borderRadius: 5 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
    updateChartAppearance(calorieHistoryChart);
}

function renderWeightChart(data) {
    const labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = data.map(d => d.weight);

    if (weightHistoryChart) {
        weightHistoryChart.data.labels = labels;
        weightHistoryChart.data.datasets[0].data = values;
        weightHistoryChart.update();
    } else {
        const ctx = document.getElementById('weightChart').getContext('2d');
        weightHistoryChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Weight (kg)', data: values, borderColor: 'rgb(22, 163, 74)', backgroundColor: 'rgba(22, 163, 74, 0.1)', fill: true, tension: 0.1 }] },
            options: {
                responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } },
                plugins: { legend: { display: false }, annotation: { annotations: { goalLine: { type: 'line', yMin: userProfile.goalWeight, yMax: userProfile.goalWeight, borderColor: 'rgb(239, 68, 68)', borderWidth: 2, borderDash: [6, 6], label: { content: 'Goal', enabled: true, position: 'end', backgroundColor: 'rgba(239, 68, 68, 0.8)' } } } } }
            }
        });
    }
    updateChartAppearance(weightHistoryChart, true);
}

function updateChartAppearance(chart, isWeightChart = false) {
    if (!chart) return;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const ticksColor = isDarkMode ? '#d1d5db' : '#4b5563';

    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = ticksColor;
    chart.options.scales.y.ticks.color = ticksColor;

    if (isWeightChart) {
        const goalLineColor = isDarkMode ? 'rgba(132, 204, 22, 0.7)' : 'rgb(239, 68, 68)';
        chart.options.plugins.annotation.annotations.goalLine.borderColor = goalLineColor;
        chart.options.plugins.annotation.annotations.goalLine.label.backgroundColor = goalLineColor;
    }

    chart.update();
}

function handleHistoryButtonClick(btn) {
    const days = parseInt(btn.dataset.days);
    fetchCalorieHistory(days);
    historyBtns.forEach(b => b.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300'));
    btn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300');
}

function handleLogWeight() {
    const weight = weightInput.value;
    if (weight) logWeightToDB(weight);
}

// --- GEMINI AI & EDAMAM API LOGIC (SECURE) ---
async function getAICoachTip() {
    aiResponseEl.classList.add('hidden');
    aiLoader.classList.remove('hidden');
    getAiTipBtn.disabled = true;

    await fetchHealthDataSummary(); // Ensure summary is up to date

    const prompt = `
        You are a friendly and encouraging AI nutrition coach specializing in modern, healthy Indian cuisine.
        The user's health data summary is: ${healthDataSummary}
        Based on this data, provide a short (2-4 sentences), motivational, and practical tip.
        Your advice should be non-judgmental and MUST focus on one of these topics:
        1. A low-calorie Indian meal suggestion.
        2. A simple, protein-rich shake idea.
        3. A meal idea incorporating their preferred proteins (egg, tofu, shrimp).
        Address the user directly by their name and keep the tone positive.
    `;

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ai', query: prompt })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        aiResponseEl.textContent = result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API error:", error);
        aiResponseEl.textContent = "Sorry, I couldn't generate a tip right now. Please try again later.";
    } finally {
        aiResponseEl.classList.remove('hidden');
        aiLoader.classList.add('hidden');
        getAiTipBtn.disabled = false;
    }
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
        searchResults.innerHTML = `<div class="p-4 text-center text-gray-600 dark:text-gray-400">Could not fetch results. Check API keys in Vercel.</div>`;
    } finally {
        searchLoader.classList.add('hidden');
    }
}

// --- UI RENDERING & EVENT LISTENERS ---
function displaySearchResults(foods) {
    searchResults.innerHTML = '';
    if (!foods || foods.length === 0) {
        searchResults.innerHTML = `<div class="p-4 text-center text-gray-500 dark:text-gray-400">No results found.</div>`;
        return;
    }
    foods.slice(0, 10).forEach(item => {
        const food = item.food;
        const foodName = food.label;
        const calories = food.nutrients.ENERC_KCAL ? Math.round(food.nutrients.ENERC_KCAL) : 0;
        const resultDiv = document.createElement('div');
        resultDiv.className = 'p-4 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center border-t border-gray-100 dark:border-gray-700';
        resultDiv.innerHTML = `<div><p class="font-semibold text-gray-800 dark:text-gray-200">${foodName}</p><p class="text-sm text-gray-500 dark:text-gray-400">${calories} calories</p></div><button class="text-blue-600 dark:text-blue-400 font-bold text-2xl">+</button>`;
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
    const items = Object.entries(dailyItems);
    emptyLogMessage.classList.toggle('hidden', items.length > 0);
    
    items.forEach(([foodId, item]) => {
        const listItem = document.createElement('li');
        listItem.className = 'p-4 bg-gray-100 dark:bg-gray-700 rounded-xl flex justify-between items-center';
        listItem.innerHTML = `
            <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">${item.name}</p>
                <p class="text-sm text-blue-600 dark:text-blue-400 font-semibold">${item.calories} calories each</p>
            </div>
            <div class="flex items-center gap-2">
                <button data-id="${foodId}" data-action="decrease" class="quantity-btn text-lg font-bold w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600">-</button>
                <span class="font-bold text-lg w-8 text-center">${item.quantity}</span>
                <button data-id="${foodId}" data-action="increase" class="quantity-btn text-lg font-bold w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600">+</button>
                <button data-id="${foodId}" data-action="remove" class="remove-btn text-red-500 hover:text-red-700 font-bold text-xl ml-2">&times;</button>
            </div>
        `;
        dailyLog.appendChild(listItem);
        total += item.calories * item.quantity;
    });
    totalCaloriesSpan.textContent = total;

    const target = userProfile.calorieTarget || 0;
    calorieTargetSpan.textContent = target;
    const percentage = target > 0 ? Math.min((total / target) * 100, 100) : 0;
    calorieProgressBar.style.width = `${percentage}%`;

    calorieProgressBar.classList.remove('bg-blue-600', 'bg-orange-500', 'bg-red-600');
    if (total > target) {
        calorieProgressBar.classList.add('bg-red-600');
    } else if (percentage > 85) {
        calorieProgressBar.classList.add('bg-orange-500');
    } else {
        calorieProgressBar.classList.add('bg-blue-600');
    }
    calculateAndDisplayGoalDate();
}

function handleLogInteraction(e) {
    const target = e.target;
    const foodId = target.dataset.id;
    const action = target.dataset.action;

    if (!foodId || !action) return;

    const item = dailyItems[foodId];
    if (!item) return;

    if (action === 'increase') {
        updateFoodQuantityInDB(foodId, item.quantity + 1);
    } else if (action === 'decrease') {
        updateFoodQuantityInDB(foodId, item.quantity - 1);
    } else if (action === 'remove') {
        updateFoodQuantityInDB(foodId, 0); // Setting quantity to 0 removes it
    }
}

function handleManualAdd() {
    const name = manualNameInput.value || 'Manual Entry';
    const calories = parseInt(manualCaloriesInput.value);

    if (!calories || calories <= 0) {
        alert("Please enter a valid calorie amount.");
        return;
    }

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

    // Show AI typing indicator
    appendMessage('<div class="loader chat-loader"></div>', 'ai');
    const aiBubble = chatContainer.querySelector('.ai-message-bubble:last-child');

    await fetchHealthDataSummary();

    const systemInstruction = {
        parts: [{ text: `
            You are a friendly and encouraging AI nutrition coach specializing in modern, healthy Indian cuisine.
            The user is predominantly vegetarian but also eats eggs, tofu, and shrimp for protein.
            Here is the user's current health data summary, which you should use as context for your answers:
            ${healthDataSummary}
            Keep your responses conversational and focused on their questions.
        `}]
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
        chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
        aiBubble.innerHTML = `<p>${aiResponse}</p>`;
    } catch (error) {
        console.error("Gemini API error:", error);
        aiBubble.innerHTML = `<p>Sorry, I'm having trouble connecting right now. Please try again in a moment.</p>`;
    } finally {
        chatSendBtn.disabled = false;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function appendMessage(message, sender) {
    const messageDiv = document.createElement('div');
    if (sender === 'user') {
        messageDiv.className = 'flex items-start gap-3 justify-end';
        messageDiv.innerHTML = `
            <div class="bg-blue-600 text-white p-4 rounded-lg rounded-br-none max-w-xs md:max-w-md">
                <p>${message}</p>
            </div>
            <div class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-2 rounded-full h-8 w-8 flex items-center justify-center font-bold">U</div>
        `;
    } else { // AI
        messageDiv.className = 'flex items-start gap-3';
        messageDiv.innerHTML = `
            <div class="bg-blue-500 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center font-bold">A</div>
            <div class="ai-message-bubble bg-gray-200 dark:bg-gray-700 p-4 rounded-lg rounded-tl-none max-w-xs md:max-w-md">
                ${message}
            </div>
        `;
    }
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function fetchHealthDataSummary() {
    let calorieHistory = "Recent calorie history:\n";
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        const savedLog = localStorage.getItem(`log_${dateString}`);
        const items = savedLog ? JSON.parse(savedLog) : {};
        const total = Object.values(items).reduce((sum, item) => sum + (item.calories * item.quantity), 0);
        calorieHistory += `- ${dateString}: ${total} kcal\n`;
    }
    
    const savedWeightHistory = localStorage.getItem('weightHistory');
    const weights = savedWeightHistory ? JSON.parse(savedWeightHistory) : [];
    let weightHistory = "Recent weight history:\n";
    weights.forEach(w => {
        weightHistory += `- ${w.date}: ${w.weight} kg\n`;
    });
    
    const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : userProfile.startWeight;

    healthDataSummary = `
        User Profile and Goals:
        - Name: ${userProfile.name}
        - Starting Weight: ${userProfile.startWeight} kg
        - Current Weight: ${latestWeight} kg
        - Goal Weight: ${userProfile.goalWeight} kg
        - Daily Calorie Target: ${userProfile.calorieTarget} kcal
        
        ${calorieHistory}
        ${weightHistory}
    `;
}

