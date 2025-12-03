import { dom } from './state.js';

// This function generates the HTML structure for the "Settings" page.
// It creates sections for Notification Preferences and Account Settings, then triggers the loading of content for each.
// It is the main function for the Settings page.
// It does not return anything but updates the contentArea's innerHTML.
export function loadSettingsContent() {
    dom.contentArea.innerHTML = `
        <h1>Settings</h1>
        <div class="settings-section">
            <h3>Notification Preferences</h3>
            <div id="notification-settings">
                <p class="loading">Loading notification settings...</p>
            </div>
        </div>
        <div class="settings-section">
            <h3>Account Settings</h3>
            <div id="account-settings-card" style="position: relative;">
                <p class="loading">Loading account settings...</p>
            </div>
        </div>
    `;

    loadNotificationSettings();
    loadAccountSettings();
}


// This function fetches the user's current notification settings from the API.
// It then renders the settings UI, typically a toggle switch for enabling/disabling email notifications.
// It is part of the Settings page.
// It does not return anything but updates the 'notification-settings' element's innerHTML.
async function loadNotificationSettings() {
    const settingsDiv = document.getElementById('notification-settings');
    try {
        const response = await fetch('/api/notification-settings');
        if (!response.ok) throw new Error('Failed to load settings');
        const settings = await response.json();
        const isEmailEnabled = settings.delivery_method === 'email_and_in_app';

        settingsDiv.innerHTML = `
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Notification Delivery</h5>
                    <p class="setting-description">Choose how you want to receive notifications from the platform.</p>
                </div>
                <div class="privacy-control" style="border: none; padding: 0; justify-content: flex-end; align-items: center;">
                    <span style="margin-right: 0.5rem;">In App Only</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="delivery-method-toggle" ${isEmailEnabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span style="margin-left: 0.5rem;">Email and In App</span>
                </div>
            </div>
            <div id="notification-save-status" style="text-align: right; height: 1em; margin-top: 0.5rem; font-size: 0.8rem; color: #6c757d;"></div>
        `;

        setupNotificationSettingsEventListeners();

    } catch (error) {
        console.error('Error loading notification settings:', error);
        settingsDiv.innerHTML = '<div class="error-msg">Failed to load notification settings.</div>';
    }
}

// This function fetches the user's account information (name, email, bio, etc.) from the API.
// It then renders the information in a read-only view on the Settings page.
// It is part of the Settings page.
// It does not return anything but updates the 'account-settings-card' element's innerHTML.
async function loadAccountSettings() {
    const card = document.getElementById('account-settings-card');
    if (!card) return;
    card.innerHTML = '<p class="loading">Loading account information...</p>';
    try {
        const response = await fetch('/api/account');
        if (!response.ok) throw new Error('Failed to fetch account data.');
        const accountData = await response.json();

        // Store the data on the element for easy access
        card.dataset.accountData = JSON.stringify(accountData);
        card.innerHTML = createAccountViewHTML(accountData);

    } catch (error) {
        console.error('Error loading account settings:', error);
        card.innerHTML = '<p class="error-msg">Failed to load account information.</p>';
    }
}

// This function generates the HTML for the read-only view of the user's account settings.
// It is a helper function for the Settings page.
// It returns an HTML string.
function createAccountViewHTML(account) {
    const location = [account.city, account.country].filter(Boolean).join(', ') || 'Not provided';
    return `
        <div class="account-view">
            <div class="item-action-buttons" style="position: absolute; top: 0; right: 0;">
                 <button class="edit-item-btn edit-account-btn" title="Edit Account"><i class="fas fa-pencil-alt"></i></button>
            </div>
            <div class="form-grid" style="gap: 0 1.5rem;">
                <div class="form-group"><strong>First Name:</strong><p>${account.first_name || 'Not provided'}</p></div>
                <div class="form-group"><strong>Last Name:</strong><p>${account.last_name || 'Not provided'}</p></div>
                <div class="form-group full-width"><strong>Email:</strong><p>${account.email}</p></div>
                <div class="form-group"><strong>Phone:</strong><p>${account.phone || 'Not provided'}</p></div>
                <div class="form-group"><strong>Location:</strong><p>${location}</p></div>
                <div class="form-group full-width"><strong>Bio:</strong><p>${account.bio || 'Not provided'}</p></div>
            </div>
        </div>`;
}

// This function generates the HTML for the editable form view of the user's account settings.
// It is a helper function for the Settings page, used when the user clicks the "edit" button.
// It returns an HTML string.
export function createAccountEditHTML(account) {
    return `
        <div class="account-edit">
             <form id="inline-account-form" class="modal-form form-grid">
                <div class="form-group">
                    <label for="account-edit-first-name">First Name</label>
                    <input type="text" id="account-edit-first-name" name="first_name" value="${account.first_name || ''}">
                </div>
                <div class="form-group">
                    <label for="account-edit-last-name">Last Name</label>
                    <input type="text" id="account-edit-last-name" name="last_name" value="${account.last_name || ''}">
                </div>
                <div class="form-group">
                    <label for="account-edit-phone">Phone</label>
                    <input type="tel" id="account-edit-phone" name="phone" value="${account.phone || ''}">
                </div>
                 <div class="form-group">
                    <label for="account-edit-city">City</label>
                    <input type="text" id="account-edit-city" name="city" value="${account.city || ''}">
                </div>
                <div class="form-group">
                    <label for="account-edit-country">Country</label>
                    <input type="text" id="account-edit-country" name="country" value="${account.country || ''}">
                </div>
                <div class="form-group full-width">
                    <label for="account-edit-bio">Bio</label>
                    <textarea id="account-edit-bio" name="bio" rows="3">${account.bio || ''}</textarea>
                </div>
            </form>
            <div class="item-action-buttons" style="position: absolute; top: 0; right: 0;">
                <button class="edit-item-btn save-account-btn" title="Save Changes"><i class="fas fa-check"></i></button>
                <button class="remove-item-btn cancel-account-btn" title="Cancel"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
}

// This function handles saving the changes made in the inline account edit form on the Settings page.
// It collects the form data and sends a PUT request to the API, then reloads the account settings view.
// It is part of the Settings page.
// It does not return anything.
export async function saveAccountChanges() {
    const card = document.getElementById('account-settings-card');
    const form = document.getElementById('inline-account-form');
    if (!form || !card) return;

    const data = {
        first_name: form.querySelector('[name="first_name"]').value,
        last_name: form.querySelector('[name="last_name"]').value,
        phone: form.querySelector('[name="phone"]').value,
        country: form.querySelector('[name="country"]').value,
        city: form.querySelector('[name="city"]').value,
        bio: form.querySelector('[name="bio"]').value
    };

    try {
        const response = await fetch('/api/account', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save account changes');
        }

        // Reload the settings to show the updated, non-editable view
        await loadAccountSettings();

    } catch (error) {
        console.error('Error saving account settings:', error);
        // Show an error message within the card
        const errorDiv = document.createElement('p');
        errorDiv.className = 'error-msg';
        errorDiv.textContent = error.message;
        card.prepend(errorDiv);
    }
}


// This function sets up the event listener for the notification settings toggle switch.
// It is a helper function for the Settings page.
// It does not return anything.
function setupNotificationSettingsEventListeners() {
    const toggle = document.getElementById('delivery-method-toggle');
    if (toggle) {
        toggle.addEventListener('change', () => {
            saveNotificationSettings();
        });
    }
}

// This function saves the user's chosen notification delivery method (in-app vs. email).
// It is triggered by the toggle switch on the Settings page and provides feedback to the user on save status.
// It is part of the Settings page.
// It does not return anything.
async function saveNotificationSettings() {
    const toggle = document.getElementById('delivery-method-toggle');
    const statusDiv = document.getElementById('notification-save-status');
    if (!toggle || !statusDiv) return;

    statusDiv.textContent = 'Saving...';
    statusDiv.style.color = '#6c757d'; // Muted color

    try {
        const deliveryMethod = toggle.checked ? 'email_and_in_app' : 'in_app';
        const response = await fetch('/api/notification-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_method: deliveryMethod })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save settings');
        }

        statusDiv.textContent = 'Settings saved successfully!';
        statusDiv.style.color = 'green';

        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);

    } catch (error) {
        console.error('Error saving notification settings:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
    }
}

// This function fetches the user's account data and populates the main account settings modal.
// It is used if there's a dedicated modal for account settings, separate from the inline view.
// It is part of the account management feature.
// It does not return anything but displays and populates the account modal.
async function openAccountModal() {
    try {
        const response = await fetch('/api/account');
        if (!response.ok) throw new Error('Failed to fetch account data.');
        const data = await response.json();

        const modal = dom.modals.account;
        const form = modal.querySelector('#account-settings-form');

        form.querySelector('#account-first-name').value = data.first_name || '';
        form.querySelector('#account-last-name').value = data.last_name || '';
        form.querySelector('#account-email').value = data.email || '';
        form.querySelector('#account-phone').value = data.phone || '';
        form.querySelector('#account-country').value = data.country || '';
        form.querySelector('#account-city').value = data.city || '';
        form.querySelector('#account-bio').value = data.bio || '';

        modal.classList.add('visible');
    } catch (error) {
        console.error('Error opening account modal:', error);
        alert(error.message);
    }
}

