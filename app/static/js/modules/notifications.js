
// =================================================================
// NOTIFICATION SYSTEM
// =================================================================

/* Problem: Notifications are not clickable. */

// This function dynamically creates and injects the notification bell icon
// and its associated dropdown panel into the sidebar.
// It ensures the bell is only added once.
// It is the entry point for initializing the notification UI.
// It does not return anything.
// Create and insert the notification bell icon and its dropdown panel
function addNotificationBell() {
    const sidebar = document.querySelector('.sidebar h2');
    // Check if the bell already exists to avoid duplicates
    if (sidebar && !document.querySelector('.notification-bell')) {
        sidebar.innerHTML += `
            <div class="notification-container" style="position: relative; display: inline-block; margin-left: 1rem;">
                <button class="notification-bell" id="notification-bell">
                    🔔
                    <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
                </button>
                <div class="notification-dropdown" id="notification-dropdown">
                    <div class="notification-header" style="padding: 1rem; border-bottom: 1px solid var(--border-color); font-weight: 600;">
                        Notifications
                    </div>
                    <div id="notifications-list">
                        <p class="loading" style="padding: 1rem;">Loading notifications...</p>
                    </div>
                </div>
            </div>
        `;

        // Call setupNotifications() immediately to make the newly added elements functional.
        setupNotifications();
    }
}

// This function sets up all the event listeners for the notification system.
// It handles clicks on the bell to toggle the dropdown, and clicks outside to close it.
// It is part of the notification system feature.
// It does not return anything.
// Bring the notification system to life by setting up all the necessary user interactions.
function setupNotifications() {
    const bell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');

    // Attach a click event to the bell icon that toggles the dropdown's visibility.
    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpening = !dropdown.classList.contains('show');
        dropdown.classList.toggle('show');

        // When the dropdown opens, it loads the notifications and marks them as read.
        if (isOpening) {
            loadNotifications();
            // If the badge is visible, it means there were unread notifications.
            // Mark them all as read and hide the badge.
            const badge = document.getElementById('notification-badge');
            if (badge && badge.style.display !== 'none') {
                markAllNotificationsAsRead();
            }
        }
    });

    // Set up a global click listener that closes the dropdown if the user clicks anywhere else on the page.
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });

    // Make an initial call to check for any unread notifications when the page first loads.
    loadNotificationCount();
}


// This function sends a request to the backend to mark all unread notifications as read.
// It also updates the UI by hiding the notification badge.
// It is part of the notification system.
// It does not return anything.
// Send a request to a specific API endpoint to mark all of the user's unread notifications as "read" in the database.
async function markAllNotificationsAsRead() {
    try {
        // This endpoint marks all notifications as read on the backend.
        const response = await fetch('/api/notifications/mark-all-as-read', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to mark notifications as read');

        // Hide the badge on the frontend immediately.
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
}


// This function fetches the full list of notifications for the current user from the API.
// It then uses a helper function to generate the HTML and display the list in the notification dropdown.
// It is part of the notification system.
// It does not return anything but updates the notifications-list element's innerHTML.
// Fetch the user's full notification list from the server's API.
async function loadNotifications() {
    const notificationsList = document.getElementById('notifications-list');

    try {
        const response = await fetch('/api/notifications');
        if (!response.ok) throw new Error('Failed to load notifications');

        const notifications = await response.json();

        if (notifications.length === 0) {
            notificationsList.innerHTML = '<div class="empty-list-msg" style="padding: 1rem;">No notifications</div>';
        } else {
            notificationsList.innerHTML = notifications.map(createNotificationHTML).join('');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationsList.innerHTML = '<div class="error-msg" style="padding: 1rem;">Failed to load notifications</div>';
    }
}


// This function takes a single notification object and generates an HTML string for it.
// It includes logic to mark the item as 'unread' and adds a data-link attribute for navigation.
// It is a helper function for the notification system.
// It returns an HTML string representing a single notification item.
// Helper function that acts as a template generator.
// Take a single notification object (containing its title, message, etc.) and return a formatted HTML string.
// Used by the loadNotifications() function.
function createNotificationHTML(notification) {
    // We add a data-link attribute to make the item clickable
    // and a cursor style to indicate that.
    return `
        <div class="notification-item ${notification.is_read ? '' : 'unread'}"
             data-notification-id="${notification.id}"
             data-link="${notification.link || ''}"
             style="cursor: pointer;">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${notification.created_at}</div>
        </div>
    `;
}


// This function fetches all notifications to get the count of unread ones.
// It updates the notification badge on the bell icon, showing the count or hiding the badge if the count is zero.
// It is a lightweight check for the notification system.
// It does not return anything but updates the notification badge UI.
// A more lightweight version of loadNotifications() function.
// This function only fetches the number of unread notifications.
// It then updates the small badge on the bell icon, showing the count if it's greater than zero and hiding it otherwise.
async function loadNotificationCount() {
    try {
        const response = await fetch('/api/notifications');
        if (!response.ok) throw new Error('Failed to load notifications');

        const notifications = await response.json();
        const unreadCount = notifications.filter(n => !n.is_read).length;

        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading notification count:', error);
    }
}


// Export the initialization function to be used in main
export function initNotifications() {
    addNotificationBell();
    loadNotifications();
    setInterval(loadNotificationCount, 5000);

    document.getElementById('notifications-list').addEventListener('click', (event) => {
        const notificationItem = event.target.closest('.notification-item');
        if (notificationItem) {
            const link = notificationItem.dataset.link;
            if (link && link !== 'null' && link.trim() !== '') {
                window.location.href = link;
            }
        }
    });
}