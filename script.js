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

// Initialize Firebase services
let app, auth, db;
try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  console.log('Firebase services initialized');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  alert('Application failed to initialize. Please refresh the page.');
}

// Application state
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

// Initialize application
function init() {
  loadLocalPreferences();
  setupEventListeners();
  initializeUI();
  auth.onAuthStateChanged(handleAuthState);
}

function loadLocalPreferences() {
  state.baseCurrency = localStorage.getItem('baseCurrency') || 'USD';
  state.darkMode = localStorage.getItem('darkMode') === 'true';
}

function initializeUI() {
  elements.baseCurrencySelect.value = state.baseCurrency;
  document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  elements.themeToggle.innerHTML = state.darkMode ? 
    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  updateExchangeRateDisplay();
  toggleExpenseForm();
}

// Authentication handlers
async function handleAuthState(user) {
  if (user) {
    state.user = {
      uid: user.uid,
      name: user.displayName || 'User',
      email: user.email || '',
      initials: (user.displayName || 'US').slice(0, 2).toUpperCase()
    };
    
    await Promise.all([loadUserPreferences(), loadExpenses()]);
    updateUserInterface();
  } else {
    state.user = null;
    state.expenses = [];
    updateUserInterface();
  }
}

async function loadUserPreferences() {
  try {
    const doc = await db.collection('users').doc(state.user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      state.baseCurrency = data.baseCurrency || state.baseCurrency;
      state.darkMode = data.darkMode ?? state.darkMode;
      applyPreferencesToUI();
    }
  } catch (error) {
    console.error('Preferences load error:', error);
  }
}

function applyPreferencesToUI() {
  elements.baseCurrencySelect.value = state.baseCurrency;
  document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  elements.themeToggle.innerHTML = state.darkMode ? 
    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  localStorage.setItem('baseCurrency', state.baseCurrency);
  localStorage.setItem('darkMode', state.darkMode);
}

// Firestore operations
async function loadExpenses() {
  try {
    const snapshot = await db.collection('users')
      .doc(state.user.uid)
      .collection('expenses')
      .orderBy('date', 'desc')
      .get();

    state.expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...parseExpenseData(doc.data())
    }));
    
    renderExpenses();
    updateBalance();
  } catch (error) {
    handleDataError(error, 'load expenses');
  }
}

function parseExpenseData(data) {
  return {
    description: data.description || 'No description',
    category: data.category || 'other',
    amount: parseFloat(data.amount) || 0,
    currency: data.currency || 'USD',
    date: data.date?.toDate?.() || new Date(data.date)
  };
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
      ...parseExpenseData(expenseData)
    });
    
    renderExpenses();
    updateBalance();
  } catch (error) {
    handleDataError(error, 'add expense');
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
    handleDataError(error, 'delete expense');
  }
}

function handleDataError(error, operation) {
  console.error(`${operation} failed:`, error);
  const messages = {
    'permission-denied': 'You do not have permission for this operation',
    'unauthenticated': 'Please sign in to continue',
    'not-found': 'Data not found',
    'default': `Failed to ${operation}. Please try again.`
  };
  alert(messages[error.code] || messages.default);
}

// UI rendering
function updateUserInterface() {
  updateUserProfile();
  toggleExpenseForm();
  renderExpenses();
  updateBalance();
  elements.authModal.style.display = 'none';
}

function renderExpenses() {
  elements.expenseList.innerHTML = state.expenses.length > 0
    ? state.expenses.map(expense => createExpenseHTML(expense)).join('')
    : '<div class="no-expenses">No expenses recorded yet</div>';
}

function createExpenseHTML(expense) {
  const convertedAmount = convertCurrency(
    expense.amount,
    expense.currency,
    state.baseCurrency
  ).toFixed(2);

  const category = getCategoryDetails(expense.category);
  const date = expense.date.toLocaleDateString();

  return `
    <li class="expense-item">
      <div class="expense-category">
        <div class="category-icon" style="background-color: ${category.color}">
          <i class="fas ${category.icon}"></i>
        </div>
        <div>
          <div class="expense-description">${expense.description}</div>
          <div class="expense-date">${date}</div>
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
}

function updateBalance() {
  const total = state.expenses.reduce((sum, expense) => 
    sum + convertCurrency(expense.amount, expense.currency, state.baseCurrency), 0);
  elements.totalBalance.textContent = `${state.baseCurrency}${total.toFixed(2)}`;
}

// Helper functions
function convertCurrency(amount, from, to) {
  return from === to ? amount : (amount / state.exchangeRates[from]) * state.exchangeRates[to];
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

function updateUserProfile() {
  const profileContainer = document.querySelector('.user-profile-container');
  if (profileContainer) profileContainer.remove();

  if (state.user) {
    elements.headerControls.insertAdjacentHTML('beforeend', `
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
    `);
    document.querySelector('.logout-btn').addEventListener('click', logoutUser);
  } else {
    elements.headerControls.appendChild(elements.createAccountBtn);
  }
}

function toggleExpenseForm() {
  const isDisabled = !state.user;
  elements.expenseForm.classList.toggle('disabled', isDisabled);
  Array.from(elements.expenseForm.elements).forEach(element => {
    element.disabled = isDisabled;
  });
}

// Event handlers
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
    if (!state.user) return alert('Please sign in to add expenses');
    
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    
    if (description && !isNaN(amount) && amount > 0) {
      await addExpense(
        description,
        document.getElementById('expense-category').value,
        amount,
        document.getElementById('expense-currency').value
      );
      elements.expenseForm.reset();
    }
  });

  elements.expenseList.addEventListener('click', (e) => {
    const deleteButton = e.target.closest('.expense-delete');
    if (deleteButton && state.user) {
      deleteExpense(deleteButton.dataset.id);
    }
  });

  elements.googleSigninBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(provider).catch(handleAuthError);
  });

  elements.closeModalBtn.addEventListener('click', () => {
    elements.authModal.style.display = 'none';
  });
}

function handleAuthError(error) {
  const messages = {
    'auth/popup-closed-by-user': 'Sign-in window was closed',
    'auth/network-request-failed': 'Network error',
    'default': 'Authentication failed'
  };
  alert(messages[error.code] || messages.default);
}

async function saveUserPreferences() {
  if (state.user) {
    try {
      await db.collection('users').doc(state.user.uid).set({
        baseCurrency: state.baseCurrency,
        darkMode: state.darkMode
      }, { merge: true });
    } catch (error) {
      console.error('Preferences save failed:', error);
    }
  }
  localStorage.setItem('baseCurrency', state.baseCurrency);
  localStorage.setItem('darkMode', state.darkMode);
}

function logoutUser() {
  auth.signOut().catch(error => {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  });
}

// Start application
document.addEventListener('DOMContentLoaded', init);
