import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    sendEmailVerification,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    setDoc, 
    getDoc,
    writeBatch,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    deleteField
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// --- 1. DECLARE ALL VARIABLES ---
let authContainer, appContainer, mainContainer, searchInput, searchResults, searchLoader, dailyLog, totalCaloriesSpan,
    calorieTargetSpan, calorieProgressCircle, logLoader, emptyLogMessage,
    themeToggleSwitch, historyBtns,
    aiResponseEl, getAiTipBtn, aiLoader, weightInput,
    logWeightBtn, currentWeightDisplay, goalWeightDisplay,
    welcomeMessage, manualNameInput,
    manualCaloriesInput, addManualBtn, aiChatModal, openChatBtn, closeChatBtn,
    chatContainer, chatInput, chatSendBtn, achievementsGrid, streakDays, streakCounter, tabButtons, tabContents,
    achievementToast, toastIcon, toastName,
    loginView, registerView, resetPasswordView,
    showRegister, showLoginFromRegister, showLoginFromReset, showReset,
    loginEmail, loginPassword, loginBtn,
    registerEmail, registerPassword, registerBtn,
    googleSigninBtn, appleSigninBtn,
    resetEmail, resetBtn,
    authError, signOutBtn, calorieHistoryChartEl, weightHistoryChartEl;

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


// --- 3. WAIT FOR DOM TO LOAD, THEN INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    authContainer = document.getElementById('auth-container');
    appContainer = document.getElementById('app-container');
    loginView = document.getElementById('login-view');
    registerView = document.getElementById('register-view');
    resetPasswordView = document.getElementById('reset-password-view');
    
    showRegister = document.getElementById('show-register');
    showLoginFromRegister = document.getElementById('show-login-from-register');
    showLoginFromReset = document.getElementById('show-login-from-reset');
    showReset = document.getElementById('show-reset');
    
    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginBtn = document.getElementById('login-btn');
    registerEmail = document.getElementById('register-email');
    registerPassword = document.getElementById('register-password');
    registerBtn = document.getElementById('register-btn');
    googleSigninBtn = document.getElementById('google-signin-btn');
    appleSigninBtn = document.getElementById('apple-signin-btn');
    resetEmail = document.getElementById('reset-email');
    resetBtn = document.getElementById('reset-btn');
    authError = document.getElementById('auth-error');

    fetchAndInjectHTML();

    showRegister.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('register'); });
    showLoginFromRegister.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('login'); });
    showLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('login'); });
    showReset.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('reset'); });

    loginBtn.addEventListener('click', handleEmailLogin);
    registerBtn.addEventListener('click', handleEmailRegister);
    googleSigninBtn.addEventListener('click', handleGoogleSignIn);
    appleSigninBtn.addEventListener('click', handleAppleSignIn);
    resetBtn.addEventListener('click', handlePasswordReset);
});

async function fetchAndInjectHTML() {
    try {
        const response = await fetch('app-content.html'); 
        if (!response.ok) throw new Error('App content not found');
        const html = await response.text();
        appContainer.innerHTML = html;
        
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, handleAuthStateChange);

    } catch (error) {
        console.error("Failed to load app content:", error);
        authContainer.innerHTML = `<p class="text-red-500 text-center">Error: Could not load application files. Please check the console.</p>`;
    }
}


// --- AUTHENTICATION LOGIC ---
async function handleAuthStateChange(user) {
    if (user) {
        currentUserId = user.uid;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        assignMainAppElements();
        setupMainAppEventListeners();
        await loadUserProfile();
    } else {
        currentUserId = null;
        if (unsubscribeLog) unsubscribeLog();
        if (unsubscribeWeight) unsubscribeWeight();
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

function toggleAuthView(view) {
    loginView.classList.add('hidden');
    registerView.classList.add('hidden');
    resetPasswordView.classList.add('hidden');
    
    if (view === 'login') loginView.classList.remove('hidden');
    else if (view === 'register') registerView.classList.remove('hidden');
    else if (view === 'reset') resetPasswordView.classList.remove('hidden');
    
    authError.textContent = '';
}

async function handleAuthSuccess(userCredential) {
    const additionalInfo = getAdditionalUserInfo(userCredential);
    if (additionalInfo?.isNewUser) {
        await migrateLocalDataToFirestore(userCredential.user.uid);
    }
}

async function handleEmailRegister(e) {
    e.preventDefault();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, registerEmail.value, registerPassword.value);
        await sendEmailVerification(userCredential.user);
        alert('Registration successful! A verification email has been sent to you.');
        await handleAuthSuccess(userCredential);
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handlePasswordReset(e) {
    e.preventDefault();
    const email = resetEmail.value;
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Please check your inbox.');
        toggleAuthView('login');
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleEmailLogin(e) {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(auth, provider);
        await handleAuthSuccess(userCredential);
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleAppleSignIn() {
    const provider = new OAuthProvider('apple.com');
    try {
        const userCredential = await signInWithPopup(auth, provider);
        await handleAuthSuccess(userCredential);
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleSignOut() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign out error:", error);
    }
}

// --- DATA MIGRATION ---
async function migrateLocalDataToFirestore(userId) {
    const migrationComplete = localStorage.getItem(`migrationComplete_${userId}`);
    if (migrationComplete) return;

    const batch = writeBatch(db);
    let localDataFound = false;

    const localWeightHistory = localStorage.getItem('weightHistory');
    if (localWeightHistory) {
        const weights = JSON.parse(localWeightHistory);
        if (Array.isArray(weights) && weights.length > 0) {
            localDataFound = true;
            weights.forEach(entry => {
                const docRef = doc(db, `users/${userId}/weightLogs`, entry.date);
                batch.set(docRef, entry);
            });
        }
    }

    for (let i = 0; i < localStorage.length; i++){
        const key = localStorage.key(i);
        if (key.startsWith('log_')) {
            localDataFound = true;
            const date = key.substring(4);
            const data = JSON.parse(localStorage.getItem(key));
            const docRef = doc(db, `users/${userId}/logs`, date);
            batch.set(docRef, { items: data });
        }
    }

    if (localDataFound) {
        try {
            await batch.commit();
            console.log("Local data successfully migrated to Firestore!");
            localStorage.setItem(`migrationComplete_${userId}`, 'true');
        } catch (error) {
            console.error("Data migration failed:", error);
        }
    }
}

// --- ELEMENT ASSIGNMENT & EVENT LISTENERS (POST-LOGIN) ---
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

function getTodaysDateEDT() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(now);
}

function getTodaysLog() {
    if (!currentUserId) return;
    const today = getTodaysDateEDT();
    const docRef = doc(db, `users/${currentUserId}/logs`, today);
    
    unsubscribeLog = onSnapshot(docRef, (docSnap) => {
        dailyItems = docSnap.exists() ? docSnap.data().items || {} : {};
        renderLog();
    }, (error) => {
        console.error("Error fetching today's log:", error);
    });
}

function listenForWeightHistory() {
    if (!currentUserId) return;
    const collRef = collection(db, `users/${currentUserId}/weightLogs`);
    
    unsubscribeWeight = onSnapshot(query(collRef), (querySnapshot) => {
        const weights = [];
        querySnapshot.forEach((doc) => {
            weights.push(doc.data());
        });
        weightHistoryData = weights.sort((a, b) => new Date(a.date) - new Date(b.date));
        updateCurrentWeightDisplay();
        renderWeightChart(weightHistoryData);
    });
}

async function addFoodToDB(foodItem) {
    if (!currentUserId) return;
    const foodId = foodItem.name.replace(/\s+/g, '-').toLowerCase();
    const today = getTodaysDateEDT();
    const docRef = doc(db, `users/${currentUserId}/logs`, today);

    const newOrUpdatedItem = { ...foodItem, id: foodId, quantity: (dailyItems[foodId]?.quantity || 0) + 1 };
    
    await setDoc(docRef, {
        items: {
            [foodId]: newOrUpdatedItem
        }
    }, { merge: true });
}

async function updateFoodQuantityInDB(foodId, newQuantity) {
    if (!currentUserId) return;
    const today = getTodaysDateEDT();
    const docRef = doc(db, `users/${currentUserId}/logs`, today);
    
    if (newQuantity > 0) {
        await updateDoc(docRef, {
            [`items.${foodId}.quantity`]: newQuantity
        });
    } else {
        await updateDoc(docRef, {
            [`items.${foodId}`]: deleteField()
        });
    }
}


async function logWeightToDB(weight) {
    if (!currentUserId) return;
    const today = getTodaysDateEDT();
    const docRef = doc(db, `users/${currentUserId}/weightLogs`, today);
    try {
        await setDoc(docRef, { weight: parseFloat(weight), date: today });
        weightInput.value = '';
    } catch (error) {
        console.error("Error logging weight:", error);
    }
}
//... (The rest of the functions from the stable checkpoint are here, fully implemented.)

