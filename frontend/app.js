// API Configuration - must match docker-compose ports
const API_BASE = {
    auth: 'http://localhost:5005',
    appointment: 'http://localhost:5006'
};

// Doctor data by department
const doctorsByDepartment = {
    'Cardiology': ['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Emily Williams'],
    'Dermatology': ['Dr. David Brown', 'Dr. Lisa Davis'],
    'Neurology': ['Dr. Robert Wilson', 'Dr. Jennifer Martinez', 'Dr. James Taylor'],
    'Orthopedics': ['Dr. William Anderson', 'Dr. Patricia Thomas'],
    'Pediatrics': ['Dr. Maria Garcia', 'Dr. John Lee', 'Dr. Amanda White'],
    'General': ['Dr. Christopher Martin', 'Dr. Laura Jackson']
};

// State
let currentUser = null;
let authToken = localStorage.getItem('token');

// DOM Elements
const authModal = document.getElementById('authModal');
const confirmationModal = document.getElementById('confirmationModal');
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const closeAuth = document.getElementById('closeAuth');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTabs = document.querySelectorAll('.auth-tab');
const navLinks = document.querySelectorAll('.nav-link');
const bookNowBtn = document.getElementById('bookNowBtn');
const bookingForm = document.getElementById('bookingForm');
const departmentSelect = document.getElementById('department');
const doctorSelect = document.getElementById('doctor');
const appointmentsLink = document.getElementById('appointmentsLink');
const closeConfirmation = document.getElementById('closeConfirmation');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
    updateDoctorOptions();
});

// Event Listeners
function setupEventListeners() {
    // Auth modal
    authBtn.addEventListener('click', () => openModal(authModal));
    closeAuth.addEventListener('click', () => closeModal(authModal));
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal(authModal);
    });

    // Auth tabs
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    // Forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    bookingForm.addEventListener('submit', handleBooking);

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // Book now button
    bookNowBtn.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Please login to book an appointment', 'warning');
            openModal(authModal);
            return;
        }
        document.getElementById('bookingSection').scrollIntoView({ behavior: 'smooth' });
    });

    // Department change
    departmentSelect.addEventListener('change', updateDoctorOptions);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Confirmation modal
    closeConfirmation.addEventListener('click', () => {
        closeModal(confirmationModal);
        navigateTo('appointments');
        loadAppointments();
    });
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE.auth}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            closeModal(authModal);
            updateUIForAuth();
            showToast('Welcome back!', 'success');
            loginForm.reset();
        } else {
            showToast(data || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE.auth}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            switchAuthTab('login');
            registerForm.reset();
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForAuth();
    navigateTo('home');
    showToast('Logged out successfully', 'success');
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('user');
    if (authToken && savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForAuth();
    }
}

// Booking Functions
async function handleBooking(e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Please login to book an appointment', 'warning');
        openModal(authModal);
        return;
    }

    const doctor = document.getElementById('doctor').value;
    const date = document.getElementById('appointmentDate').value;
    const department = document.getElementById('department').value;
    const symptoms = document.getElementById('symptoms').value;

    if (!doctor || !date) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    // Validate date is in the future
    const selectedDate = new Date(date);
    const now = new Date();
    if (selectedDate <= now) {
        showToast('Please select a future date and time', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE.appointment}/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({ doctor, date, department, symptoms })
        });

        const data = await response.json();

        if (response.ok) {
            showConfirmation(data.appointment_id, doctor, date, department);
            bookingForm.reset();
            updateDoctorOptions();
        } else {
            showToast(data.error || 'Booking failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

function showConfirmation(appointmentId, doctor, date, department) {
    const detailsDiv = document.getElementById('confirmationDetails');
    const formattedDate = new Date(date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    detailsDiv.innerHTML = `
        <p><strong>Appointment ID:</strong> ${appointmentId}</p>
        <p><strong>Doctor:</strong> ${doctor}</p>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Date & Time:</strong> ${formattedDate}</p>
        <p><strong>Patient:</strong> ${currentUser.username}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
    `;

    openModal(confirmationModal);
}

async function loadAppointments() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE.appointment}/appointments`, {
            headers: { 'Authorization': authToken }
        });

        const appointments = await response.json();
        const container = document.getElementById('appointmentsList');

        if (appointments.length === 0) {
            container.innerHTML = '<p class="empty-state">No appointments yet. Book your first appointment!</p>';
            return;
        }

        container.innerHTML = appointments.map(apt => `
            <div class="appointment-card">
                <div class="appointment-info">
                    <h3>Dr. ${apt.doctor}</h3>
                    <p><strong>Department:</strong> ${apt.department || 'General'}</p>
                    <p><strong>Date:</strong> ${new Date(apt.date).toLocaleString()}</p>
                    ${apt.symptoms ? `<p><strong>Symptoms:</strong> ${apt.symptoms}</p>` : ''}
                </div>
                <span class="appointment-status status-${apt.status || 'confirmed'}">${apt.status || 'confirmed'}</span>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load appointments', 'error');
    }
}

// UI Helpers
function updateUIForAuth() {
    if (currentUser) {
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        appointmentsLink.style.display = 'block';
        bookNowBtn.textContent = 'Book Appointment';
    } else {
        authBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        appointmentsLink.style.display = 'none';
        bookNowBtn.textContent = 'Login to Book';
    }
}

function updateDoctorOptions() {
    const department = departmentSelect.value;
    const doctors = doctorsByDepartment[department] || [];

    doctorSelect.innerHTML = '<option value="">Select Doctor</option>' +
        doctors.map(doc => `<option value="${doc}">${doc}</option>`).join('');
}

function switchAuthTab(tab) {
    authTabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function navigateTo(page) {
    // Update nav links
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');

    // Load appointments if navigating to appointments page
    if (page === 'appointments') {
        if (!currentUser) {
            showToast('Please login to view appointments', 'warning');
            navigateTo('home');
            openModal(authModal);
            return;
        }
        loadAppointments();
    }
}

function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
