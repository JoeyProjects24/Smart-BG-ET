// ====================
// APP STATE MANAGEMENT
// ====================
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

// =============
// DOM ELEMENTS
// =============
const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    baseCurrencySelect: document.getElementById('base-currency'),
    expenseForm: document.getElementById('expense-form'),
    expenseList: document.getElementById('expense-list'),
    totalBalance: document.getElementById('total-balance'),
    exchangeRate: document.getElementById('exchange-rate'),
    rateChange: document.getElementById('rate-change'),
    createAccountBtn: document.getElementById('create-account-btn'),
    headerControls: document.querySelector('.header-controls')
};

// ==============
// USER MANAGEMENT
// ==============
function createAccount() {
    const userName = prompt('Enter your name:');
    if (!userName) return;
    
    state.user = {
        name: userName,
        initials: userName.slice(0, 2).toUpperCase()
    };
    
    localStorage.setItem('user', JSON.stringify(state.user));
    renderUserProfile();
}

function renderUserProfile() {
    // Remove create account button
    if (elements.createAccountBtn.parentElement) {
        elements.headerControls.removeChild(elements.createAccountBtn);
    }

    // Create user profile element
    const profileHTML = `
        <div class="user-profile">
            <div class="user-avatar">${state.user.initials}</div>
            <span>${state.user.name}</span>
        </div>
    `;
    
    elements.headerControls.insertAdjacentHTML('beforeend', profileHTML);
}

// =============
// CURRENCY
// =============
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

// ==============
// THEME TOGGLING
// ==============
function toggleTheme() {
    state.darkMode = !state.darkMode;
    document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    elements.themeToggle.innerHTML = state.darkMode ? 
        '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('darkMode', state.darkMode);
}

// ==================
// CORE FUNCTIONALITY
// ==================
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

// ==============
// UI RENDERING
// ==============
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
    
    elements.totalBalance.textContent = `${state.baseCurrency} ${total.toFixed(2)}`;
}

// ================
// EVENT HANDLERS
// ================
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
    elements.createAccountBtn.addEventListener('click', createAccount);
}

// ==============
// INITIALIZATION
// ==============
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
    
    // Render user profile if exists
    if (state.user) {
        renderUserProfile();
    }

    // Initial renders
    updateExchangeRateDisplay();
    renderExpenses();
    updateBalance();
    
    // Enable functionality
    setupEventListeners();
}

// Start application
document.addEventListener('DOMContentLoaded', init);

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCj56ZyZGEwHaMvQFD6kTQ3AQ-cE_saxiY",
  authDomain: "finwise-9cf55.firebaseapp.com",
  projectId: "finwise-9cf55",
  storageBucket: "finwise-9cf55.firebasestorage.app",
  messagingSenderId: "46446867696",
  appId: "1:46446867696:web:2d240e8603eae9b0cbbe35",
  measurementId: "G-DXG5F24HQY"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.getAuth(app);

// Update createAccount function
function createAccount() {
    const authModal = document.getElementById('auth-modal');
    authModal.style.display = 'flex';
}

// Add modal close functionality
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('auth-modal').style.display = 'none';
});

// Add Google sign-in handler
document.getElementById('google-signin-btn').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await firebase.signInWithPopup(auth, provider);
        const user = result.user;
        
        state.user = {
            name: user.displayName,
            email: user.email,
            initials: user.displayName.slice(0, 2).toUpperCase()
        };
        
        localStorage.setItem('user', JSON.stringify(state.user));
        renderUserProfile();
        document.getElementById('auth-modal').style.display = 'none';
    } catch (error) {
        console.error('Sign-in error:', error);
        alert('Sign-in failed. Please try again.');
    }
});

// Update renderUserProfile to include email
function renderUserProfile() {
    if (elements.createAccountBtn.parentElement) {
        elements.headerControls.removeChild(elements.createAccountBtn);
    }

    const profileHTML = `
        <div class="user-profile">
            <div class="user-avatar">${state.user.initials}</div>
            <div>
                <div>${state.user.name}</div>
                <div class="text-muted" style="font-size: 0.8rem">${state.user.email}</div>
            </div>
        </div>
    `;
    
    elements.headerControls.insertAdjacentHTML('beforeend', profileHTML);
}