// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, searchInput, searchResults, searchLoader, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressBar, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleButton, lightIcon, darkIcon, historyBtns, calorieChartLoader,
    calorieChartContainer, aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay, goalDateDisplay,
    weightChartLoader, weightChartContainer, welcomeMessage, manualNameInput,
    manualCaloriesInput, addManualBtn, aiChatModal, openChatBtn, closeChatBtn,
    chatContainer, chatInput, chatSendBtn, achievementsGrid, streakDays, tabButtons, tabContents;

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
    dailyLog = document.getElementById('dailyLog');
    totalCaloriesSpan = document.getElementById('totalCalories');
    calorieTargetSpan = document.getElementById('calorieTarget');
    calorieProgressCircle = document.getElementById('calorie-progress-circle');
    emptyLogMessage = document.getElementById('empty-log-message');
    historyBtns = document.querySelectorAll('.history-btn');
    weightInput = document.getElementById('weightInput');
    logWeightBtn = document.getElementById('log-weight-btn');
    currentWeightDisplay = document.getElementById('current-weight-display');
    goalWeightDisplay = document.getElementById('goal-weight-display');
    weightChartContainer = document.getElementById('weightHistoryChart'); // Corrected ID
    achievementsGrid = document.getElementById('achievements-grid');
    streakDays = document.getElementById('streak-days');
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    
    // Set up event listeners
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;

            // Handle button active states
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.add('text-gray-400');
            });
            button.classList.add('active');
            button.classList.remove('text-gray-400');

            // Handle content visibility
            tabContents.forEach(content => {
                if (content.id === `${tab}-tab-content`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });

    // Start the app
    initializeAppData();
});


// --- APP INITIALIZATION ---
function initializeAppData() {
    goalWeightDisplay.textContent = `${userProfile.goalWeight} kg`;
    calorieTargetSpan.textContent = `/ ${userProfile.calorieTarget} Kcal`;
    
    getTodaysLog();
    getWeightHistory();
    renderAchievements();
    updateStreak();
    
    // Initial chart rendering
    renderWeightChart([]); 
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
    renderWeightChart(weightHistoryData);
    updateCurrentWeightDisplay();
}

function saveData() {
    const today = getTodaysDateEDT();
    localStorage.setItem(`log_${today}`, JSON.stringify(dailyItems));
    localStorage.setItem('weightHistory', JSON.stringify(weightHistoryData));
}

// --- UI & DATA MANIPULATION ---
function renderLog() {
    let total = 0;
    const items = Object.values(dailyItems);
    
    items.forEach(item => {
        total += item.calories * item.quantity;
    });

    totalCaloriesSpan.textContent = Math.round(total);
    
    // Update circular progress bar
    const percentage = userProfile.calorieTarget > 0 ? Math.min((total / userProfile.calorieTarget), 1) : 0;
    const circumference = 100; // Corresponds to the dash array
    const dashoffset = circumference * (1 - percentage);
    calorieProgressCircle.setAttribute('stroke-dasharray', `${circumference * percentage}, ${circumference}`);
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
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data: values,
                    borderColor: '#86A789', // brand-primary
                    backgroundColor: 'rgba(134, 167, 137, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: false, grid: { color: '#E9E5E0' }, ticks: { color: '#4F6F52' } },
                    x: { grid: { display: false }, ticks: { color: '#4F6F52' } }
                }
            }
        });
    }
}

function updateCurrentWeightDisplay() {
     if (weightHistoryData.length > 0) {
        currentWeightDisplay.textContent = `${weightHistoryData[weightHistoryData.length - 1].weight} kg`;
    } else {
        currentWeightDisplay.textContent = `${userProfile.startWeight} kg`;
    }
}

// --- GAMIFICATION ---
function renderAchievements() {
    const achievements = [
        { id: 'log1', name: 'First Log', icon: '📝', unlocked: Object.keys(localStorage).some(k => k.startsWith('log_')) },
        { id: 'streak3', name: '3-Day Streak', icon: '🔥', unlocked: calculateStreak() >= 3 },
        { id: 'week1', name: 'First Week', icon: '📅', unlocked: Object.keys(localStorage).filter(k => k.startsWith('log_')).length >= 7 },
        { id: 'lose1kg', name: 'Lost 1kg', icon: '💪', unlocked: weightHistoryData.length > 0 && userProfile.startWeight - weightHistoryData[weightHistoryData.length - 1].weight >= 1 },
        { id: 'water7', name: 'Hydration Goal', icon: '💧', unlocked: false }, // Example for future
        { id: 'perfectDay', name: 'Perfect Day', icon: '🎯', unlocked: false } // Example for future
    ];

    achievementsGrid.innerHTML = '';
    achievements.forEach(ach => {
        const div = document.createElement('div');
        div.className = `achievement-badge p-4 bg-brand-bg dark:bg-dark-bg rounded-2xl flex flex-col items-center justify-center gap-2 ${ach.unlocked ? 'unlocked' : ''}`;
        div.innerHTML = `
            <span class="text-4xl">${ach.icon}</span>
            <span class="text-xs font-semibold">${ach.name}</span>
        `;
        achievementsGrid.appendChild(div);
    });
}

function calculateStreak() {
    let streak = 0;
    let daysChecked = 0;
    const maxDaysToCheck = 365; // Prevent infinite loops

    for (let i = 0; i < maxDaysToCheck; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d).split(', ')[0];
        
        if (localStorage.getItem(`log_${dateString}`)) {
            streak++;
        } else {
            // Stop counting after the first missed day (if it's not today)
            if (i > 0) break;
        }
    }
    return streak;
}


function updateStreak() {
    const streak = calculateStreak();
    if (streak > 0) {
        streakDays.textContent = `${streak} Day Streak!`;
        streakDays.classList.remove('hidden');
    } else {
        streakDays.classList.add('hidden');
    }
}


// --- DUMMY EVENT HANDLERS (to be connected to API later) ---
function handleHistoryButtonClick(btn) {
    console.log(`History button for ${btn.dataset.days} days clicked.`);
}

function handleLogWeight() {
    const weight = parseFloat(weightInput.value);
    if (weight) {
        logWeightToDB(weight);
    }
}

function getAICoachTip() {
    console.log("Get AI Coach Tip clicked.");
}

function handleSearchInput() {
    console.log("Searching for:", searchInput.value);
}

function handleLogInteraction(e) {
    console.log("Log interaction:", e.target.dataset.action, e.target.dataset.id);
}

function handleManualAdd() {
    console.log("Manual add:", manualNameInput.value, manualCaloriesInput.value);
}

function handleChatSend() {
    console.log("Chat message sent:", chatInput.value);
}

