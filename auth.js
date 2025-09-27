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
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. FIREBASE SETUP ---
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


// --- 2. DOM ELEMENT ASSIGNMENTS ---
let loginView, registerView, resetPasswordView,
    showRegister, showLoginFromRegister, showLoginFromReset, showReset,
    loginEmail, loginPassword, loginBtn,
    registerEmail, registerPassword, registerBtn,
    googleSigninBtn, appleSigninBtn,
    resetEmail, resetBtn,
    authError;

document.addEventListener('DOMContentLoaded', () => {
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

    // Setup auth event listeners
    showRegister.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('register'); });
    showLoginFromRegister.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('login'); });
    showLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('login'); });
    showReset.addEventListener('click', (e) => { e.preventDefault(); toggleAuthView('reset'); });

    loginBtn.addEventListener('click', handleEmailLogin);
    registerBtn.addEventListener('click', handleEmailRegister);
    googleSigninBtn.addEventListener('click', handleGoogleSignIn);
    appleSigninBtn.addEventListener('click', handleAppleSignIn);
    resetBtn.addEventListener('click', handlePasswordReset);

    // Initialize Auth State Listener
    initializeAuthListener();
});


// --- 3. AUTHENTICATION LOGIC ---

function initializeAuthListener() {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        onAuthStateChanged(auth, user => {
            if (user) {
                // If user is logged in, redirect to the main app
                window.location.href = 'app.html';
            }
            // If no user, do nothing and stay on the login page.
        });
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
      });
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
    authError.textContent = '';
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
    authError.textContent = '';
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
    authError.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleGoogleSignIn() {
    authError.textContent = '';
    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(auth, provider);
        await handleAuthSuccess(userCredential);
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleAppleSignIn() {
    authError.textContent = '';
    const provider = new OAuthProvider('apple.com');
    try {
        const userCredential = await signInWithPopup(auth, provider);
        await handleAuthSuccess(userCredential);
    } catch (error) {
        authError.textContent = error.message;
    }
}

// --- 4. DATA MIGRATION ---
async function migrateLocalDataToFirestore(userId) {
    const migrationComplete = localStorage.getItem(`migrationComplete_${userId}`);
    if (migrationComplete) return;

    const batch = writeBatch(db);
    let localDataFound = false;

    // Migrate weight history
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

    // Migrate calorie logs
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

