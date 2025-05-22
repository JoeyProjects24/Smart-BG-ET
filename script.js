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
let app, auth;
try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
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
  // Load previous state
  const savedExpenses = localStorage.getItem('expenses');
  const savedCurrency = localStorage.getItem('baseCurrency');
  const savedDarkMode = localStorage.getItem('darkMode');
  const savedUser = localStorage.getItem('user');
  
  // Initialize state
  state.expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
  state.baseCurrency = savedCurrency || 'USD';
  state.darkMode = savedDarkMode === 'true';
  state.user = savedUser ? JSON.parse(savedUser) : null;

  // Set up UI
  elements.baseCurrencySelect.value = state.baseCurrency;
  document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  elements.themeToggle.innerHTML = state.darkMode ? 
    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  
  // Set up event listeners
  setupEventListeners();

  // Set up auth state listener
  auth.onAuthStateChanged(handleAuthState);

  // Initial renders
  updateExchangeRateDisplay();
  renderExpenses();
  updateBalance();
}

// Handle authentication state changes
function handleAuthState(user) {
  if (user) {
    // User is signed in
    state.user = {
      name: user.displayName,
      email: user.email,
      initials: user.displayName.slice(0, 2).toUpperCase()
    };
    localStorage.setItem('user', JSON.stringify(state.user));
    renderUserProfile();
    elements.authModal.style.display = 'none';
  } else {
    // User is signed out
    state.user = null;
    localStorage.removeItem('user');
    removeUserProfile();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Currency change
  elements.baseCurrencySelect.addEventListener('change', () => {
    state.baseCurrency = elements.baseCurrencySelect.value;
    saveState();
    renderExpenses();
    updateBalance();
  });
  
  // Form submission
  elements.expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    const description = document.getElementById('expense-description').value.trim();
    const category = document.getElementById('expense-category').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    
    if (description && !isNaN(amount) && amount > 0) {
      addExpense(description, category, amount, currency);
      elements.expenseForm.reset();
    }
  });
  
  // Delete expense
  elements.expenseList.addEventListener('click', e => {
    const deleteButton = e.target.closest('.expense-delete');
    if (deleteButton) {
      const id = deleteButton.dataset.id;
      deleteExpense(id);
    }
  });

  // Create account button
  elements.createAccountBtn.addEventListener('click', () => {
    elements.authModal.style.display = 'flex';
  });

  // Google sign-in button
  elements.googleSigninBtn.addEventListener('click', signInWithGoogle);

  // Close modal button
  elements.closeModalBtn.addEventListener('click', () => {
    elements.authModal.style.display = 'none';
  });
}

// Google Sign-in function
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error('Sign-in error:', error);
    
    let errorMessage = 'Sign-in failed. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in window was closed. Please try again.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.';
    }
    
    alert(errorMessage);
  }
}

// Logout function
function logoutUser() {
  auth.signOut().catch(error => {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  });
}

// Render user profile
function renderUserProfile() {
  // First remove any existing profile
  removeUserProfile();

  // Remove create account button if it exists
  if (elements.createAccountBtn.parentElement) {
    elements.headerControls.removeChild(elements.createAccountBtn);
  }

  // Create user profile element with logout button
  const profileHTML = `
    <div class="user-profile">
      <div class="user-avatar">${state.user.initials}</div>
      <div class="user-info">
        <div class="user-name">${state.user.name}</div>
        <div class="user-email">${state.user.email}</div>
      </div>
      <button class="btn btn-link logout-btn" title="Logout">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>
  `;
  
  elements.headerControls.insertAdjacentHTML('beforeend', profileHTML);

  // Add logout event listener
  document.querySelector('.logout-btn').addEventListener('click', logoutUser);
}

// Remove user profile
function removeUserProfile() {
  document.querySelector('.user-profile')?.remove();
  if (!elements.createAccountBtn.parentElement && !state.user) {
    elements.headerControls.appendChild(elements.createAccountBtn);
  }
}

// Theme toggling
function toggleTheme() {
  state.darkMode = !state.darkMode;
  document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  elements.themeToggle.innerHTML = state.darkMode ? 
    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  localStorage.setItem('darkMode', state.darkMode);
}

// Currency conversion
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = state.exchangeRates[fromCurrency];
  const toRate = state.exchangeRates[toCurrency];
  return (amount / fromRate) * toRate;
}

function updateExchangeRateDisplay() {
  const currentRate = state.exchangeRates.EUR;
  elements.exchangeRate.textContent = currentRate.toFixed(4);
}

// Expense management
function saveState() {
  localStorage.setItem('expenses', JSON.stringify(state.expenses));
  localStorage.setItem('baseCurrency', state.baseCurrency);
}

function addExpense(description, category, amount, currency) {
  const newExpense = {
    id: Date.now().toString(),
    description,
    category,
    amount: parseFloat(amount),
    currency,
    date: new Date().toISOString()
  };
  
  state.expenses.unshift(newExpense);
  saveState();
  renderExpenses();
  updateBalance();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter(expense => expense.id !== id);
  saveState();
  renderExpenses();
  updateBalance();
}

// UI rendering
function renderExpenses() {
  elements.expenseList.innerHTML = state.expenses.map(expense => {
    const convertedAmount = convertCurrency(
      expense.amount,
      expense.currency,
      state.baseCurrency
    ).toFixed(2);
    
    const category = getCategoryDetails(expense.category);
    
    return `
      <li class="expense-item">
        <div class="expense-category">
          <div class="category-icon" style="background-color: ${category.color}">
            <i class="fas ${category.icon}"></i>
          </div>
          <div>
            <div class="expense-description">${expense.description}</div>
            <div class="expense-date">${new Date(expense.date).toLocaleDateString()}</div>
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

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
