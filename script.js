// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCj56ZyZGEwHaMvQFD6kTQ3AQ-cE_saxiY",
  authDomain: "finwise-9cf55.firebaseapp.com",
  projectId: "finwise-9cf55",
  storageBucket: "finwise-9cf55.appspot.com",
  messagingSenderId: "46446867696",
  appId: "1:46446867696:web:2d240e8603eae9b0cbbe35",
  measurementId: "G-DXG5F24HQY"
};

// Initialize Firebase
let app, auth, db;
try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  alert('Failed to initialize the app. Please try again later.');
}

// App state management
const state = {
  expenses: [],
  baseCurrency: 'USD',
  darkMode: false,
  exchangeRates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.84,
    INR: 83.29
  },
  user: null
};

// DOM elements
const elements = {
  themeToggle: document.getElementById('theme-toggle'),
  baseCurrencySelect: document.getElementById('base-currency'),
  expenseForm: document.getElementById('expense-form'),
  expenseList: document.getElementById('expense-list'),
  totalBalance: document.getElementById('total-balance'),
  exchangeRate: document.getElementById('exchange-rate'),
  rateChange: document.getElementById('rate-change'),
  createAccountBtn: document.getElementById('create-account-btn'),
  headerControls: document.querySelector('.header-controls'),
  authModal: document.getElementById('auth-modal'),
  googleSigninBtn: document.getElementById('google-signin-btn'),
  closeModalBtn: document.getElementById('close-modal')
};

// Initialize the application
function init() {
  // Load UI preferences from localStorage
  const savedCurrency = localStorage.getItem('baseCurrency');
  const savedDarkMode = localStorage.getItem('darkMode');
  
  state.baseCurrency = savedCurrency || 'USD';
  state.darkMode = savedDarkMode === 'true';

  // Set up UI
  elements.baseCurrencySelect.value = state.baseCurrency;
  document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  elements.themeToggle.innerHTML = state.darkMode ? 
    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  
  // Set up auth state listener
  auth.onAuthStateChanged(handleAuthState);

  // Set up event listeners
  setupEventListeners();

  // Initial renders
  updateExchangeRateDisplay();
  toggleExpenseForm();
}

// Handle authentication state changes
async function handleAuthState(user) {
  if (user) {
    // User is signed in
    state.user = {
      uid: user.uid,
      name: user.displayName || 'User',
      email: user.email || '',
      initials: (user.displayName || 'US').slice(0, 2).toUpperCase()
    };
    
    // Load user preferences and expenses
    await loadUserPreferences();
    await loadExpenses();
    updateUserProfile();
    elements.authModal.style.display = 'none';
    toggleExpenseForm();
  } else {
    // User is signed out
    state.user = null;
    state.expenses = [];
    updateUserProfile();
    toggleExpenseForm();
    renderExpenses();
    updateBalance();
  }
}

// Firestore operations
async function loadUserPreferences() {
  try {
    const doc = await db.collection('users').doc(state.user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      state.baseCurrency = data.baseCurrency || 'USD';
      state.darkMode = data.darkMode || false;
      
      // Update UI elements
      elements.baseCurrencySelect.value = state.baseCurrency;
      document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
      elements.themeToggle.innerHTML = state.darkMode ? 
        '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

async function loadExpenses() {
  try {
    const snapshot = await db.collection('users')
      .doc(state.user.uid)
      .collection('expenses')
      .orderBy('date', 'desc')
      .get();

    state.expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    renderExpenses();
    updateBalance();
  } catch (error) {
    console.error('Error loading expenses:', error);
    alert('Failed to load expenses. Please try again.');
  }
}

async function addExpense(description, category, amount, currency) {
  try {
    const expenseData = {
      description,
      category,
      amount: parseFloat(amount),
      currency,
      date: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('users')
      .doc(state.user.uid)
      .collection('expenses')
      .add(expenseData);

    state.expenses.unshift({
      id: docRef.id,
      ...expenseData
    });
    
    renderExpenses();
    updateBalance();
  } catch (error) {
    console.error('Error adding expense:', error);
    alert('Failed to add expense. Please try again.');
  }
}

async function deleteExpense(id) {
  try {
    await db.collection('users')
      .doc(state.user.uid)
      .collection('expenses')
      .doc(id)
      .delete();

    state.expenses = state.expenses.filter(expense => expense.id !== id);
    renderExpenses();
    updateBalance();
  } catch (error) {
    console.error('Error deleting expense:', error);
    alert('Failed to delete expense. Please try again.');
  }
}

async function saveUserPreferences() {
  if (state.user) {
    try {
      await db.collection('users').doc(state.user.uid).set({
        baseCurrency: state.baseCurrency,
        darkMode: state.darkMode
      }, { merge: true });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }
  // Save to localStorage for non-auth users
  localStorage.setItem('baseCurrency', state.baseCurrency);
  localStorage.setItem('darkMode', state.darkMode);
}

// Update user profile display
function updateUserProfile() {
  const existingProfile = document.querySelector('.user-profile-container');
  if (existingProfile) existingProfile.remove();

  if (elements.createAccountBtn.parentElement) {
    elements.headerControls.removeChild(elements.createAccountBtn);
  }

  if (state.user) {
    const profileHTML = `
      <div class="user-profile-container">
        <div class="user-profile">
          <div class="user-avatar">${state.user.initials}</div>
          <div class="user-info">
            <div class="user-name">${state.user.name}</div>
            ${state.user.email ? `<div class="user-email">${state.user.email}</div>` : ''}
          </div>
          <button class="btn btn-link logout-btn" title="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    `;
    
    elements.headerControls.insertAdjacentHTML('beforeend', profileHTML);
    document.querySelector('.logout-btn').addEventListener('click', logoutUser);
  } else {
    elements.headerControls.appendChild(elements.createAccountBtn);
  }
}

// Toggle expense form state
function toggleExpenseForm() {
  const isDisabled = !state.user;
  Array.from(elements.expenseForm.elements).forEach(element => {
    element.disabled = isDisabled;
  });
  elements.expenseForm.classList.toggle('disabled', isDisabled);
}

// Event listeners and UI functions
function setupEventListeners() {
  elements.themeToggle.addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    elements.themeToggle.innerHTML = state.darkMode ? 
      '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    saveUserPreferences();
  });

  elements.baseCurrencySelect.addEventListener('change', () => {
    state.baseCurrency = elements.baseCurrencySelect.value;
    saveUserPreferences();
    renderExpenses();
    updateBalance();
  });

  elements.expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.user) return alert('Please sign in to add expenses!');

    const description = document.getElementById('expense-description').value.trim();
    const category = document.getElementById('expense-category').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    
    if (description && !isNaN(amount) && amount > 0) {
      await addExpense(description, category, amount, currency);
      elements.expenseForm.reset();
    }
  });

  elements.expenseList.addEventListener('click', (e) => {
    const deleteButton = e.target.closest('.expense-delete');
    if (deleteButton && state.user) {
      deleteExpense(deleteButton.dataset.id);
    }
  });

  elements.createAccountBtn.addEventListener('click', () => {
    elements.authModal.style.display = 'flex';
  });

  elements.googleSigninBtn.addEventListener('click', signInWithGoogle);
  elements.closeModalBtn.addEventListener('click', () => {
    elements.authModal.style.display = 'none';
  });
}

// Authentication functions
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    let message = 'Sign-in failed. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') message = 'Sign-in window closed.';
    if (error.code === 'auth/network-request-failed') message = 'Network error.';
    alert(message);
  }
}

function logoutUser() {
  auth.signOut().catch(error => {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  });
}

// Expense rendering and calculations
function renderExpenses() {
  elements.expenseList.innerHTML = state.expenses.map(expense => {
    const convertedAmount = convertCurrency(
      expense.amount,
      expense.currency,
      state.baseCurrency
    ).toFixed(2);

    const category = getCategoryDetails(expense.category);
    const date = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);

    return `
      <li class="expense-item">
        <div class="expense-category">
          <div class="category-icon" style="background-color: ${category.color}">
            <i class="fas ${category.icon}"></i>
          </div>
          <div>
            <div class="expense-description">${expense.description}</div>
            <div class="expense-date">${date.toLocaleDateString()}</div>
          </div>
        </div>
        <div class="expense-amount">${expense.currency}${expense.amount.toFixed(2)}</div>
        <div class="expense-converted">≈ ${state.baseCurrency}${convertedAmount}</div>
        <div class="expense-actions">
          <button class="expense-delete" data-id="${expense.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
    `;
  }).join('') || `<div class="no-expenses">No expenses recorded yet</div>`;
}

function updateBalance() {
  const total = state.expenses.reduce((sum, expense) => {
    return sum + convertCurrency(expense.amount, expense.currency, state.baseCurrency);
  }, 0);
  elements.totalBalance.textContent = `${state.baseCurrency}${total.toFixed(2)}`;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  return (amount / state.exchangeRates[fromCurrency]) * state.exchangeRates[toCurrency];
}

function updateExchangeRateDisplay() {
  elements.exchangeRate.textContent = state.exchangeRates.EUR.toFixed(4);
}

function getCategoryDetails(category) {
  const categories = {
    food: { icon: 'fa-utensils', color: '#4cc9f0' },
    transport: { icon: 'fa-bus', color: '#4361ee' },
    entertainment: { icon: 'fa-film', color: '#f8961e' },
    utilities: { icon: 'fa-bolt', color: '#f72585' },
    shopping: { icon: 'fa-shopping-bag', color: '#3f37c9' }
  };
  return categories[category] || { icon: 'fa-question', color: '#6c757d' };
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
