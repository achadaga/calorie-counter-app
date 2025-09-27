import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    deleteField
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// --- 1. DECLARE ALL VARIABLES ---
let mainContainer, searchInput, searchResults, searchLoader, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleSwitch, historyBtns,
    aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay,
    welcomeMessage, manualNameInput,
    manualCaloriesInput, addManualBtn, aiChatModal, openChatBtn, closeChatBtn,
    chatContainer, chatInput, chatSendBtn, achievementsGrid, streakDays, streakCounter, tabButtons, tabContents,
    achievementToast, toastIcon, toastName, signOutBtn, calorieHistoryChartEl, weightHistoryChartEl;

let currentUserId = null;
let userProfile = {};
let dailyItems = {};
let calorieHistoryData = {};
let weightHistoryData = [];
let searchTimeout;
let calorieHistoryChart = null;
let weightHistoryChart = null;
let healthDataSummary = "No data available yet.";
let chatHistory = [];
let unlockedAchievements = [];
let unsubscribeLog, unsubscribeWeight;

// --- 2. FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyBZ1DcLq8Qmo9-lESbtai2O9LaixnDEChY",
  authDomain: "caloriecounter-daa8d.firebaseapp.com",
  projectId: "caloriecounter-daa8d",
  storageBucket: "caloriecounter-daa8d.firebasestorage.app",
  messagingSenderId: "194099333222",
  appId: "1:194099333222:web:950e780b316c195c0305a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// --- 3. APP INITIALIZATION ---
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        // The user is logged in, so we can initialize the main app
        assignMainAppElements();
        setupMainAppEventListeners();
        loadUserProfile();
    } else {
        // No user is signed in, redirect to the login page
        window.location.href = 'index.html';
    }
});

// --- ELEMENT ASSIGNMENT & EVENT LISTENERS ---
function assignMainAppElements() {
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
    weightHistoryChartEl = document.getElementById('weightHistoryChart'); 
    calorieHistoryChartEl = document.getElementById('calorieHistoryChart');
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
    signOutBtn = document.getElementById('sign-out-btn');
    welcomeMessage = document.getElementById('welcome-message');
}

function setupMainAppEventListeners() {
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
    signOutBtn.addEventListener('click', handleSignOut);
}

async function handleSignOut() {
    try {
        await signOut(auth);
        // The onAuthStateChanged listener will automatically redirect to index.html
    } catch (error) {
        console.error("Sign out error:", error);
    }
}

// --- APP LOGIC (POST-LOGIN) ---
async function loadUserProfile() {
    if (!currentUserId) return;
    const profileRef = doc(db, `users/${currentUserId}/profile`, 'settings');
    const docSnap = await getDoc(profileRef);

    if (docSnap.exists()) {
        userProfile = docSnap.data();
    } else {
        userProfile = {
            name: auth.currentUser.displayName || 'User',
            startWeight: 87.5,
            goalWeight: 76,
            calorieTarget: 1850
        };
        await setDoc(profileRef, userProfile);
    }
    initializeAppData();
}

function initializeAppData() {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
        if(themeToggleSwitch) themeToggleSwitch.checked = true;
    }
    
    if(goalWeightDisplay) goalWeightDisplay.textContent = `${userProfile.goalWeight} kg`;
    if(calorieTargetSpan) calorieTargetSpan.textContent = `/ ${userProfile.calorieTarget} Kcal`;
    if(welcomeMessage) welcomeMessage.textContent = `Welcome, ${userProfile.name}!`;

    const initialAiMessage = "Hello! I'm your AI nutrition coach. Ask me anything about your diet, meal ideas, or how to reach your goals. How can I help you today?";
    chatHistory = [{ role: 'model', parts: [{ text: initialAiMessage }] }];

    getTodaysLog();
    listenForWeightHistory();
    fetchCalorieHistory(7); 
    handleTabSwitch(document.querySelector('.tab-btn[data-tab="today"]'));
}
//... This file would contain all the other functions from our stable checkpoint
// (handleThemeToggle, getTodaysLog, renderLog, handleSearchInput, etc.),
// but they would all be adapted to use Firestore instead of localStorage.
// The code is omitted here for brevity but is necessary for full functionality.

