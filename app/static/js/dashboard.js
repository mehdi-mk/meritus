document.addEventListener('DOMContentLoaded', function() {
    // --- Element & State Management ---
    let selectedApplications = new Set();

    const contentArea = document.getElementById('content-area');
    const modals = {
        skill: document.getElementById('skill-modal'),
        experience: document.getElementById('experience-modal'),
        certificate: document.getElementById('certificate-modal'),
        degree: document.getElementById('degree-modal'),
        account: document.getElementById('account-settings-modal'),
        confirm: document.getElementById('confirm-remove-modal')
    };
    let itemToDelete = { id: null, type: null };

    // --- Navigation & Content Loading ---
    const contentLoaders = {
        'Home': loadHomeContent,
        'Learning': () => contentArea.innerHTML = '<h1>Learning</h1>',
        'Profile': loadProfileContent,
        'Settings': loadSettingsContent,
        'Job': loadJobContent,
        'Help': () => contentArea.innerHTML = '<h1>Help</h1>'
    };

    document.querySelector('.sidebar nav').addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            const contentName = event.target.dataset.content;
            if (contentLoaders[contentName]) {
                contentLoaders[contentName]();
            } else {
                // Generic fallback for simple pages
                contentArea.innerHTML = `<h1>${contentName}</h1>`;
            }
        }
    });


    contentArea.addEventListener('change', async (event) => {
        if (event.target.classList.contains('status-selector')) {
            const dropdown = event.target;
            const applicationId = dropdown.dataset.applicationId;
            const newStatus = dropdown.value;

            try {
                const response = await fetch(`/api/applications/${applicationId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update status');
                }

                // Update the card's border color to reflect the new status
                const card = dropdown.closest('.application-card');
                if (card) {
                    const statusClass = newStatus.toLowerCase().replace(/ /g, '-');
                    // Remove any old status-border-* class before adding the new one
                    card.className = card.className.replace(/status-border-\S+/g, ' ').trim();
                    card.classList.add(`status-border-${statusClass}`);
                }

                // You can add a small, non-disruptive success message here if you like
                console.log(`Application ${applicationId} status updated to ${newStatus}`);

            } catch (error) {
                console.error('Error updating application status:', error);
                // If the update fails, alert the user and refresh the list to show the correct state
                alert('Failed to update status. Please try again.');
                loadAllApplications(); // Refresh the list on error
            }
        }
    });


    // =================================================================
    // NOTIFICATION SYSTEM - MODIFICATIONS
    // =================================================================


    // Add to the beginning of the DOMContentLoaded function
    function addNotificationBell() {
        const sidebar = document.querySelector('.sidebar h2');
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

            setupNotifications();
        }
    }


    function setupNotifications() {
        const bell = document.getElementById('notification-bell');
        const dropdown = document.getElementById('notification-dropdown');

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpening = !dropdown.classList.contains('show');
            dropdown.classList.toggle('show');

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

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        loadNotificationCount();
    }

    async function markAllNotificationsAsRead() {
        try {
            // This endpoint marks all notifications as read on the backend
            const response = await fetch('/api/notifications/mark-all-as-read', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to mark notifications as read');

            // Hide the badge on the frontend immediately
            const badge = document.getElementById('notification-badge');
            if (badge) {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }


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

    // Call this function in the DOMContentLoaded
    addNotificationBell();


    document.getElementById('notifications-list').addEventListener('click', (event) => {
        const notificationItem = event.target.closest('.notification-item');
        if (notificationItem) {
            const link = notificationItem.dataset.link;
            // Redirect if the notification has a valid link
            if (link && link !== 'null' && link.trim() !== '') {
                window.location.href = link;
            }
        }
    });


    // Update the createProfileItemHTML function to include privacy controls
    function createProfileItemHTML(item, type) {
        let detailsHTML = '';
        let metaHTML = '';

        switch(type) {
            case 'skill':
                detailsHTML = `
                    <h4>${item.title}</h4>
                    <p>Type: ${item.type}</p>
                    <p>Status: ${item.status}</p>
                `;
                break;
            case 'experience':
                detailsHTML = `
                    <h4>${item.position_title}</h4>
                    <p>${item.employer} • ${item.city}, ${item.country}</p>
                    <p>${item.start_date} - ${item.is_present ? 'Present' : item.end_date}</p>
                `;
                metaHTML = `${item.employment_type || ''} ${item.employment_arrangement ? '• ' + item.employment_arrangement : ''}`;
                break;
            case 'certificate':
                detailsHTML = `
                    <h4>${item.title}</h4>
                    <p>Issued by: ${item.issuer}</p>
                    <p>Issue Date: ${item.issue_date}</p>
                `;
                if (item.expiry_date) metaHTML = `Expires: ${item.expiry_date}`;
                break;
            case 'degree':
                detailsHTML = `
                    <h4>${item.degree} in ${item.field_of_study}</h4>
                    <p>${item.school} • ${item.city}, ${item.country}</p>
                    <p>${item.start_date} - ${item.end_date}</p>
                `;
                if (item.gpa) metaHTML = `GPA: ${item.gpa}`;
                break;
        }

        return `
            <div class="profile-item" data-id="${item.id}" data-type="${type}">
                <div class="item-details">
                    ${detailsHTML}
                    ${metaHTML ? `<div class="item-meta">${metaHTML}</div>` : ''}
                    <div class="privacy-control">
                        <label class="privacy-toggle">
                            <input type="checkbox" class="privacy-checkbox"
                                   data-id="${item.id}" data-type="${type}"
                                   ${item.is_public ? 'checked' : ''}>
                            <span class="privacy-slider"></span>
                        </label>
                        <span class="privacy-label">${item.is_public ? 'Public' : 'Private'}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="edit-item-btn" data-id="${item.id}" data-type="${type}">✏️</button>
                    <button class="remove-item-btn" data-id="${item.id}" data-type="${type}">🗑️</button>
                </div>
            </div>
        `;
    }



    // Update modal opening functions to include privacy controls
    function openSkillModal(skill = null) {
        const modal = modals.skill;
        const form = document.getElementById('skill-form');
        const modalTitle = modal.querySelector('h2');

        if (skill) {
            modalTitle.textContent = 'Edit Skill';
            document.getElementById('skill-type').value = skill.type;
            document.getElementById('skill-title').value = skill.title;
            document.getElementById('skill-status').value = skill.status;
            form.dataset.skillId = skill.id;

            addPrivacyControlToForm('skill-form', skill.is_public);
        } else {
            modalTitle.textContent = 'Add New Skill';
            form.reset();
            delete form.dataset.skillId;

            addPrivacyControlToForm('skill-form', true); // Default to public
        }

        modal.classList.add('visible');
    }

    function openExperienceModal(experience = null) {
        const modal = modals.experience;
        const form = document.getElementById('experience-form');
        const modalTitle = modal.querySelector('h2');

        if (experience) {
            modalTitle.textContent = 'Edit Experience';
            document.getElementById('exp-position').value = experience.position_title;
            document.getElementById('exp-employer').value = experience.employer;
            document.getElementById('exp-country').value = experience.country;
            document.getElementById('exp-city').value = experience.city;
            document.getElementById('exp-start-date').value = experience.start_date;
            document.getElementById('exp-end-date').value = experience.end_date || '';
            document.getElementById('exp-is-present').checked = experience.is_present;
            document.getElementById('exp-employment-type').value = experience.employment_type;
            document.getElementById('exp-employment-arrangement').value = experience.employment_arrangement;
            form.dataset.experienceId = experience.id;

            addPrivacyControlToForm('experience-form', experience.is_public);
        } else {
            modalTitle.textContent = 'Add New Experience';
            form.reset();
            delete form.dataset.experienceId;

            addPrivacyControlToForm('experience-form', true); // Default to public
        }

        modal.classList.add('visible');
    }

    function openCertificateModal(certificate = null) {
        const modal = modals.certificate;
        const form = document.getElementById('certificate-form');
        const modalTitle = modal.querySelector('h2');

        if (certificate) {
            modalTitle.textContent = 'Edit Certificate';
            document.getElementById('cert-title').value = certificate.title;
            document.getElementById('cert-issuer').value = certificate.issuer;
            document.getElementById('cert-issue-date').value = certificate.issue_date;
            document.getElementById('cert-expiry-date').value = certificate.expiry_date || '';
            document.getElementById('cert-credential-id').value = certificate.credential_id || '';
            document.getElementById('cert-credential-url').value = certificate.credential_url || '';
            form.dataset.certificateId = certificate.id;

            addPrivacyControlToForm('certificate-form', certificate.is_public);
        } else {
            modalTitle.textContent = 'Add New Certificate';
            form.reset();
            delete form.dataset.certificateId;

            addPrivacyControlToForm('certificate-form', true); // Default to public
        }

        modal.classList.add('visible');
    }

    function openDegreeModal(degree = null) {
        const modal = modals.degree;
        const form = document.getElementById('degree-form');
        const modalTitle = modal.querySelector('h2');

        if (degree) {
            modalTitle.textContent = 'Edit Degree';
            document.getElementById('degree-level').value = degree.degree;
            document.getElementById('degree-field').value = degree.field_of_study;
            document.getElementById('degree-school').value = degree.school;
            document.getElementById('degree-country').value = degree.country;
            document.getElementById('degree-city').value = degree.city;
            document.getElementById('degree-start-date').value = degree.start_date;
            document.getElementById('degree-end-date').value = degree.end_date;
            document.getElementById('degree-gpa').value = degree.gpa || '';
            form.dataset.degreeId = degree.id;

            addPrivacyControlToForm('degree-form', degree.is_public);
        } else {
            modalTitle.textContent = 'Add New Degree';
            form.reset();
            delete form.dataset.degreeId;

            addPrivacyControlToForm('degree-form', true); // Default to public
        }

        modal.classList.add('visible');
    }


    // Add privacy control to all modal forms
    function addPrivacyControlToForm(formId, isPublic = true) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Check if privacy control already exists
        if (form.querySelector('.form-privacy-control')) return;

        const privacyHTML = `
            <div class="form-group full-width">
                <div class="form-privacy-control">
                    <div class="privacy-description">
                        <div class="privacy-title">Visibility</div>
                        <p class="privacy-text">Choose whether this item should be visible on your public profile</p>
                    </div>
                    <label class="privacy-toggle">
                        <input type="checkbox" id="is-public-toggle" name="is_public" ${isPublic ? 'checked' : ''}>
                        <span class="privacy-slider"></span>
                    </label>
                    <span class="privacy-label" id="privacy-status">${isPublic ? 'Public' : 'Private'}</span>
                </div>
            </div>
        `;

        // Insert before form actions
        const formActions = form.querySelector('.form-actions');
        if (formActions) {
            formActions.insertAdjacentHTML('beforebegin', privacyHTML);
        } else {
            form.insertAdjacentHTML('beforeend', privacyHTML);
        }

        // Add event listener for toggle
        const toggle = form.querySelector('#is-public-toggle');
        const statusLabel = form.querySelector('#privacy-status');

        if (toggle && statusLabel) {
            toggle.addEventListener('change', function() {
                statusLabel.textContent = this.checked ? 'Public' : 'Private';
            });
        }
    }


    async function handleExperienceFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const experienceId = form.dataset.experienceId;

        const data = {
            position_title: formData.get('position_title'),
            employer: formData.get('employer'),
            country: formData.get('country'),
            city: formData.get('city'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            is_present: formData.get('is_present') === 'on',
            employment_type: formData.get('employment_type'),
            employment_arrangement: formData.get('employment_arrangement'),
            is_public: formData.get('is_public') === 'on'  // Add this line
        };

        try {
            const url = experienceId ? `/api/experiences/${experienceId}` : '/api/experiences';
            const method = experienceId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save experience');

            modals.experience.classList.remove('visible');
            showNotification(`Experience ${experienceId ? 'updated' : 'added'} successfully`, 'success');
            loadProfileContent();

        } catch (error) {
            console.error('Error saving experience:', error);
            showNotification('Failed to save experience', 'error');
        }
    }


    async function handleCertificateFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const certificateId = form.dataset.certificateId;

        const data = {
            title: formData.get('title'),
            issuer: formData.get('issuer'),
            issue_date: formData.get('issue_date'),
            expiry_date: formData.get('expiry_date'),
            credential_id: formData.get('credential_id'),
            credential_url: formData.get('credential_url'),
            is_public: formData.get('is_public') === 'on'  // Add this line
        };

        try {
            const url = certificateId ? `/api/certificates/${certificateId}` : '/api/certificates';
            const method = certificateId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save certificate');

            modals.certificate.classList.remove('visible');
            showNotification(`Certificate ${certificateId ? 'updated' : 'added'} successfully`, 'success');
            loadProfileContent();

        } catch (error) {
            console.error('Error saving certificate:', error);
            showNotification('Failed to save certificate', 'error');
        }
    }


    async function handleDegreeFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const degreeId = form.dataset.degreeId;

        const data = {
            degree: formData.get('degree'),
            field_of_study: formData.get('field_of_study'),
            school: formData.get('school'),
            country: formData.get('country'),
            city: formData.get('city'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            gpa: formData.get('gpa'),
            is_public: formData.get('is_public') === 'on'  // Add this line
        };

        try {
            const url = degreeId ? `/api/degrees/${degreeId}` : '/api/degrees';
            const method = degreeId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save degree');

            modals.degree.classList.remove('visible');
            showNotification(`Degree ${degreeId ? 'updated' : 'added'} successfully`, 'success');
            loadProfileContent();

        } catch (error) {
            console.error('Error saving degree:', error);
            showNotification('Failed to save degree', 'error');
        }
    }


    async function handleSkillFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const skillId = form.dataset.skillId;

        const data = {
            type: formData.get('type'),
            title: formData.get('title'),
            status: formData.get('status'),
            is_public: formData.get('is_public') === 'on',  // Add this line
            acquired_at_sources: [] // Add sources logic if needed
        };

        try {
            const url = skillId ? `/api/skills/${skillId}` : '/api/skills';
            const method = skillId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save skill');

            modals.skill.classList.remove('visible');
            showNotification(`Skill ${skillId ? 'updated' : 'added'} successfully`, 'success');
            loadProfileContent();

        } catch (error) {
            console.error('Error saving skill:', error);
            showNotification('Failed to save skill', 'error');
        }
    }


    // Add privacy toggle event listeners
    function setupPrivacyToggles() {
        contentArea.addEventListener('change', async (e) => {
            if (e.target.classList.contains('privacy-checkbox')) {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                const isPublic = e.target.checked;

                await updatePrivacySetting(id, type, isPublic);

                // Update label
                const label = e.target.closest('.privacy-control').querySelector('.privacy-label');
                label.textContent = isPublic ? 'Public' : 'Private';
            }
        });
    }

    async function updatePrivacySetting(id, type, isPublic) {
        try {
            const endpoint = `/api/${type}s/${id}`;
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_public: isPublic })
            });

            if (!response.ok) throw new Error('Failed to update privacy setting');

            showNotification('Privacy setting updated', 'success');

        } catch (error) {
            console.error('Error updating privacy setting:', error);
            showNotification('Failed to update privacy setting', 'error');
        }
    }

    // Call setupPrivacyToggles in the DOMContentLoaded function
    setupPrivacyToggles();


    function loadHomeContent() {
        contentArea.innerHTML = '<h1>Home</h1>';
    }

    function loadJobContent() {
        contentArea.innerHTML = `
            <h1>Job</h1>
            <div class="tab-panel">
                <button class="tab-button active" data-tab="get-hired">Get Hired</button>
                <button class="tab-button" data-tab="hire">Hire</button>
            </div>
            <div id="get-hired" class="tab-pane active">
                <!-- existing get-hired content -->
                <div class="job-seeker-section">
                    <div class="job-filters">
                        <div class="filters-row">
                            <div class="filter-group">
                                <input type="text" id="job-search" placeholder="Search jobs..." class="filter-input">
                            </div>
                            <div class="filter-group">
                                <input type="text" id="location-filter" placeholder="Location..." class="filter-input">
                            </div>
                            <div class="filter-group">
                                <select id="type-filter" class="filter-select">
                                    <option value="">All Types</option>
                                    <option value="Full-Time">Full-Time</option>
                                    <option value="Part-Time">Part-Time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <select id="arrangement-filter" class="filter-select">
                                    <option value="">All Arrangements</option>
                                    <option value="On-Site">On-Site</option>
                                    <option value="Remote">Remote</option>
                                    <option value="Hybrid">Hybrid</option>
                                </select>
                            </div>
                            <button class="btn btn-primary" id="search-jobs-btn">Search</button>
                            <button class="btn btn-secondary" id="clear-filters-btn">Clear</button>
                        </div>
                        <div class="eligibility-filter-row">
                            <div class="eligibility-toggle">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="eligibility-filter">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span class="toggle-label" id="eligibility-toggle-label">See all jobs</span>
                            </div>
                        </div>
                    </div>

                    <div class="job-seeker-tabs">
                        <button class="job-tab-button active" data-job-tab="browse">Browse Jobs</button>
                        <button class="job-tab-button" data-job-tab="applications">My Applications</button>
                    </div>

                    <div id="browse-jobs" class="job-tab-pane active">
                        <div id="jobs-list">
                            <p class="loading">Loading available jobs...</p>
                        </div>
                    </div>

                    <div id="my-applications" class="job-tab-pane">
                        <div id="applications-list">
                            <p class="loading">Loading your applications...</p>
                        </div>
                    </div>
                </div>
            </div>
            <div id="hire" class="tab-pane">
                <h2>Hire</h2>
                <div class="hire-section">
                    <div class="hire-actions">
                        <button class="btn btn-primary" id="post-job-btn">Post New Job</button>
                    </div>

                    <!-- Add hire tabs -->
                    <div class="hire-tabs">
                        <button class="hire-tab-button active" data-hire-tab="postings">Job Postings</button>
                        <button class="hire-tab-button" data-hire-tab="applications">All Applications</button>
                    </div>

                    <div id="job-postings" class="hire-tab-pane active">
                        <h3>Your Job Postings</h3>
                        <div id="employer-jobs-list">
                            <p class="loading">Loading your job postings...</p>
                        </div>
                    </div>

                    <div id="all-applications" class="hire-tab-pane">
                        <h3>All Applications</h3>
                        <div id="employer-applications-list">
                            <p class="loading">Loading applications...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set up main tab switching (Get Hired / Hire)
        contentArea.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('active')) return;
                const tabName = button.dataset.tab;
                contentArea.querySelector('.tab-button.active').classList.remove('active');
                button.classList.add('active');
                contentArea.querySelector('.tab-pane.active').classList.remove('active');
                const targetTab = contentArea.querySelector(`#${tabName}`);
                targetTab.classList.add('active');

                // Load content based on tab
                if (tabName === 'hire') {
                    loadEmployerJobs();
                } else if (tabName === 'get-hired') {
                    loadJobSeekerContent();
                }
            });
        });

        // Set up hire sub-tabs
        contentArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('hire-tab-button')) {
                if (e.target.classList.contains('active')) return;

                const tabName = e.target.dataset.hireTab;
                contentArea.querySelector('.hire-tab-button.active').classList.remove('active');
                e.target.classList.add('active');
                contentArea.querySelector('.hire-tab-pane.active').classList.remove('active');
                const targetTab = contentArea.querySelector(`#${tabName === 'postings' ? 'job-postings' : 'all-applications'}`);
                targetTab.classList.add('active');

                // Load appropriate content
                if (tabName === 'postings') {
                    loadEmployerJobs();
                } else if (tabName === 'applications') {
                    loadAllApplications();
                }
            }
        });

        // Set up job seeker sub-tabs
        contentArea.querySelectorAll('.job-tab-button').forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('active')) return;
                const tabName = button.dataset.jobTab;
                contentArea.querySelector('.job-tab-button.active').classList.remove('active');
                button.classList.add('active');
                contentArea.querySelector('.job-tab-pane.active').classList.remove('active');
                const targetTab = contentArea.querySelector(`#${tabName === 'browse' ? 'browse-jobs' : 'my-applications'}`);
                targetTab.classList.add('active');

                // Load appropriate content
                if (tabName === 'browse') {
                    loadAvailableJobs();
                } else if (tabName === 'applications') {
                    loadUserApplications();
                }
            });
        });

        // Set up event listeners for dynamic content
        setupJobEventListeners();

        // Set up filters
        const searchBtn = contentArea.querySelector('#search-jobs-btn');
        const clearBtn = contentArea.querySelector('#clear-filters-btn');
        const eligibilityToggle = contentArea.querySelector('#eligibility-filter');
        const eligibilityLabel = contentArea.querySelector('#eligibility-toggle-label');

        if (searchBtn) {
            searchBtn.addEventListener('click', loadAvailableJobs);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                contentArea.querySelector('#job-search').value = '';
                contentArea.querySelector('#location-filter').value = '';
                contentArea.querySelector('#type-filter').value = '';
                contentArea.querySelector('#arrangement-filter').value = '';
                loadAvailableJobs();
            });
        }

        // Set up eligibility filter toggle
        if (eligibilityToggle && eligibilityLabel) {
            eligibilityToggle.addEventListener('change', () => {
                if (eligibilityToggle.checked) {
                    eligibilityLabel.textContent = 'See eligible jobs';
                } else {
                    eligibilityLabel.textContent = 'See all jobs';
                }
                loadAvailableJobs();
            });
        }

        // Set up post job button
        const postJobBtn = contentArea.querySelector('#post-job-btn');
        if (postJobBtn) {
            postJobBtn.addEventListener('click', () => openJobPostingModal());
        }

        // Initial load
        loadJobSeekerContent();
    }


        // Setup application event listeners
    function setupApplicationEventListeners() {
        // Status change listeners
        contentArea.addEventListener('change', async (e) => {
            if (e.target.classList.contains('status-selector') && e.target.dataset.applicationId) {
                const applicationId = e.target.dataset.applicationId;
                const newStatus = e.target.value;
                await updateApplicationStatus(applicationId, newStatus);
            }
        });

        // Checkbox listeners for bulk actions
        contentArea.addEventListener('change', (e) => {
            if (e.target.classList.contains('application-checkbox')) {
                const applicationId = e.target.dataset.applicationId;
                const jobId = e.target.closest('.application-card').dataset.jobId;

                if (e.target.checked) {
                    selectedApplications.add(applicationId);
                } else {
                    selectedApplications.delete(applicationId);
                }

                updateBulkActionsVisibility(jobId);
            }
        });

        // Bulk action buttons
        contentArea.addEventListener('click', async (e) => {
            if (e.target.classList.contains('apply-bulk-btn')) {
                const jobId = e.target.dataset.jobId;
                const statusSelect = document.getElementById(`bulk-status-${jobId}`);
                const newStatus = statusSelect.value;

                if (!newStatus) {
                    alert('Please select a status');
                    return;
                }

                await applyBulkStatusUpdate(Array.from(selectedApplications), newStatus);
                selectedApplications.clear();
                updateBulkActionsVisibility(jobId);
            }

            if (e.target.classList.contains('cancel-bulk-btn')) {
                const jobId = e.target.dataset.jobId;
                selectedApplications.clear();
                updateBulkActionsVisibility(jobId);
                // Uncheck all checkboxes
                contentArea.querySelectorAll('.application-checkbox').forEach(cb => cb.checked = false);
            }

            if (e.target.classList.contains('view-profile-btn')) {
                const applicantId = e.target.dataset.applicantId;
                await showCandidateProfile(applicantId);
            }
        });

        // Application filter listeners
        contentArea.addEventListener('change', (e) => {
            if (e.target.classList.contains('applications-filter')) {
                const filterValue = e.target.value;
                const applicationCards = e.target.closest('.job-applications-section').querySelectorAll('.application-card');

                applicationCards.forEach(card => {
                    const status = card.querySelector('.application-status').textContent.toLowerCase().replace(' ', '_');
                    if (!filterValue || status.includes(filterValue)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    }


    // Update bulk actions visibility
    function updateBulkActionsVisibility(jobId) {
        const bulkActions = document.getElementById(`bulk-actions-${jobId}`);
        if (bulkActions) {
            if (selectedApplications.size > 0) {
                bulkActions.classList.remove('hidden');
            } else {
                bulkActions.classList.add('hidden');
            }
        }
    }

    // Update the status change event listener in setupApplicationEventListeners
    async function updateApplicationStatus(applicationId, newStatus) {
        try {
            const response = await fetch(`/api/applications/${applicationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update status');

            // Update the UI immediately
            const applicationCard = document.querySelector(`[data-application-id="${applicationId}"]`);
            if (applicationCard) {
                const statusBadge = applicationCard.querySelector('.application-status');
                if (statusBadge) {
                    // Remove old status class
                    statusBadge.className = statusBadge.className.replace(/status-\w+/, '');
                    // Add new status class
                    statusBadge.classList.add(`status-${newStatus}`);
                    statusBadge.textContent = newStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
            }

            showNotification('Application status updated successfully', 'success');

        } catch (error) {
            console.error('Error updating application status:', error);
            showNotification('Failed to update application status', 'error');
        }
    }

    // Apply bulk status update
    async function applyBulkStatusUpdate(applicationIds, newStatus) {
        try {
            const response = await fetch('/api/applications/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    application_ids: applicationIds,
                    status: newStatus
                })
            });

            if (!response.ok) throw new Error('Failed to update applications');

            const result = await response.json();
            showNotification(`Successfully updated ${result.updated_count} applications`, 'success');

            // Refresh the applications list
            loadAllApplications();

        } catch (error) {
            console.error('Error bulk updating applications:', error);
            showNotification('Failed to update applications', 'error');
        }
    }


    // Show candidate profile modal
    async function showCandidateProfile(applicantId) {
        try {
            const response = await fetch(`/api/profile/${applicantId}/public`);
            if (!response.ok) throw new Error('Failed to load profile');

            const profile = await response.json();

            const modal = document.createElement('div');
            modal.className = 'modal-overlay visible';
            modal.innerHTML = `
                <div class="modal-content large-modal">
                    <button class="modal-close-btn">&times;</button>
                    <h2>${profile.first_name} ${profile.last_name}'s Profile</h2>
                    <div class="candidate-profile-content">
                        <div class="profile-section">
                            <h3>Basic Information</h3>
                            <p><strong>Email:</strong> ${profile.email}</p>
                            <p><strong>Location:</strong> ${profile.city}, ${profile.country}</p>
                            <p><strong>Bio:</strong> ${profile.bio || 'No bio provided'}</p>
                        </div>

                        ${profile.skills && profile.skills.length > 0 ? `
                            <div class="profile-section">
                                <h3>Skills (${profile.skills.length})</h3>
                                ${profile.skills.map(skill => `
                                    <div class="profile-item">
                                        <div class="item-details">
                                            <h4>${skill.title}</h4>
                                            <p>Type: ${skill.type}</p>
                                            <p>Status: ${skill.status}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${profile.experiences && profile.experiences.length > 0 ? `
                            <div class="profile-section">
                                <h3>Experience (${profile.experiences.length})</h3>
                                ${profile.experiences.map(exp => `
                                    <div class="profile-item">
                                        <div class="item-details">
                                            <h4>${exp.position_title}</h4>
                                            <p>${exp.employer} • ${exp.city}, ${exp.country}</p>
                                            <p>${exp.start_date} - ${exp.is_present ? 'Present' : exp.end_date}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${profile.certificates && profile.certificates.length > 0 ? `
                            <div class="profile-section">
                                <h3>Certificates (${profile.certificates.length})</h3>
                                ${profile.certificates.map(cert => `
                                    <div class="profile-item">
                                        <div class="item-details">
                                            <h4>${cert.title}</h4>
                                            <p>Issued by: ${cert.issuer}</p>
                                            <p>Issue Date: ${cert.issue_date}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${profile.degrees && profile.degrees.length > 0 ? `
                            <div class="profile-section">
                                <h3>Education (${profile.degrees.length})</h3>
                                ${profile.degrees.map(degree => `
                                    <div class="profile-item">
                                        <div class="item-details">
                                            <h4>${degree.degree} in ${degree.field_of_study}</h4>
                                            <p>${degree.school} • ${degree.city}, ${degree.country}</p>
                                            <p>${degree.start_date} - ${degree.end_date}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('.modal-close-btn').addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });

        } catch (error) {
            console.error('Error loading candidate profile:', error);
            showNotification('Failed to load candidate profile', 'error');
        }
    }


    // Utility function for notifications
    function showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }


    function setupJobEventListeners() {
        // Use event delegation for dynamically added elements
        contentArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-applications-btn')) {
                const jobId = e.target.dataset.jobId;
                openApplicationsWindow(jobId);
            }
        });
    }


    // Load all applications for employer
    async function loadAllApplications() {
        // This ID matches the one in your existing loadJobContent function
        const applicationsContent = document.getElementById('employer-applications-list');
        if (!applicationsContent) {
            console.error('Error: Target element "employer-applications-list" not found.');
            return;
        }

        // Start with a loading message
        applicationsContent.innerHTML = '<p class="loading">Loading applications...</p>';

        try {
            const response = await fetch('/api/applications');
            if (!response.ok) {
                throw new Error(`Failed to fetch applications: ${response.statusText}`);
            }
            const applications = await response.json();

            if (applications.length === 0) {
                applicationsContent.innerHTML = '<div class="empty-list-msg">No applications received yet.</div>';
            } else {
                applicationsContent.innerHTML = applications.map(createApplicationCardHTML).join('');
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            applicationsContent.innerHTML = '<div class="error-msg">Could not load applications. Please try again later.</div>';
        }
    }

    function createApplicationCardHTML(application) {
        const appliedDate = new Date(application.applied_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const statuses = ["Submitted", "Under Review", "Rejected", "Offer Sent", "Accepted"];
        const statusOptions = statuses.map(status =>
            `<option value="${status}" ${application.status === status ? 'selected' : ''}>${status}</option>`
        ).join('');

        // This converts "Under Review" to "under-review" for use as a CSS class
        const statusClass = application.status.toLowerCase().replace(/ /g, '-');

        return `
            <div class="application-card status-border-${statusClass}" data-application-id="${application.application_id}">
                <div class="application-header">
                    <div class="application-info">
                        <h4>${application.applicant_name}</h4>
                        <div class="application-meta">
                            <span>Applied for <strong>${application.job_title}</strong></span>
                            <span class="meta-separator">•</span>
                            <span>${appliedDate}</span>
                        </div>
                    </div>
                    <div class="application-actions">
                        <select class="status-selector" data-application-id="${application.application_id}">
                            ${statusOptions}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }


    function loadJobSeekerContent() {
        loadAvailableJobs();
    }

    // Load available jobs for job seekers
    async function loadAvailableJobs() {
        const jobsList = document.getElementById('jobs-list');
        if (!jobsList) return;

        try {
            // Get filter values
            const search = document.getElementById('job-search')?.value || '';
            const location = document.getElementById('location-filter')?.value || '';
            const employmentType = document.getElementById('type-filter')?.value || '';
            const employmentArrangement = document.getElementById('arrangement-filter')?.value || '';
            const eligibilityFilter = document.getElementById('eligibility-filter')?.checked || false;

            // Build query parameters
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (location) params.append('location', location);
            if (employmentType) params.append('employment_type', employmentType);
            if (employmentArrangement) params.append('employment_arrangement', employmentArrangement);
            if (eligibilityFilter) params.append('eligible_only', 'true');

            const response = await fetch(`/api/jobs/browse?${params}`);
            if (!response.ok) throw new Error('Failed to load jobs');

            const jobs = await response.json();

            if (jobs.length === 0) {
                jobsList.innerHTML = '<div class="empty-list-msg">No jobs found matching your criteria.</div>';
            } else {
                jobsList.innerHTML = jobs.map(createJobSeekerJobHTML).join('');
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            jobsList.innerHTML = '<div class="error-msg">Failed to load jobs. Please try again.</div>';
        }
    }

    // Create HTML for job seeker job view
    function createJobSeekerJobHTML(job) {
        const salaryRange = job.salary_min && job.salary_max ?
            `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` :
            job.salary_min ? `From $${job.salary_min.toLocaleString()}` :
            job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Salary not specified';

        const applicationStatus = job.user_applied ?
            `<span class="application-status status-${job.application_status}">
                ${job.application_status === 'pending' ? 'Application Submitted' :
                  job.application_status === 'reviewed' ? 'Under Review' :
                  job.application_status === 'shortlisted' ? 'Shortlisted' : 'Applied'}
            </span>` : '';

        // Determine if user is eligible and if apply button should be enabled
        const isEligible = job.user_eligible !== false; // Default to eligible if not specified
        const applyButtonClass = !job.user_applied && isEligible ? 'btn-primary' : 'btn-secondary';
        const applyButtonDisabled = job.user_applied || !isEligible;
        const applyButtonText = job.user_applied ? 'Applied' :
                               !isEligible ? 'Not Eligible' : 'Apply Now';

        // Eligibility indicator
        const eligibilityIndicator = !isEligible ?
            `<span class="eligibility-status not-eligible">
                <i class="fas fa-exclamation-triangle"></i> Requirements not met
            </span>` : '';

        return `
            <div class="job-seeker-item" data-job-id="${job.id}">
                <div class="job-seeker-header">
                    <h3>${job.title}</h3>
                    <div class="header-status">
                        ${applicationStatus}
                        ${eligibilityIndicator}
                    </div>
                </div>
                <div class="job-seeker-company">
                    <strong>${job.company_name}</strong>
                    ${job.location ? ` • ${job.location}` : ''}
                </div>
                <div class="job-seeker-details">
                    <span class="job-detail-badge">${job.employment_type || 'Not specified'}</span>
                    <span class="job-detail-badge">${job.employment_arrangement || 'Not specified'}</span>
                    <span class="job-salary">${salaryRange}</span>
                </div>
                <div class="job-seeker-description">
                    ${job.description.length > 200 ? job.description.substring(0, 200) + '...' : job.description}
                </div>
                <div class="job-seeker-footer">
                    <span class="job-posted">Posted ${job.created_at}</span>
                    <div class="job-seeker-actions">
                        <button class="btn btn-secondary view-job-btn" data-job-id="${job.id}">View Details</button>
                        <button class="btn ${applyButtonClass} apply-job-btn"
                                data-job-id="${job.id}"
                                ${applyButtonDisabled ? 'disabled' : ''}>
                            ${applyButtonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Load user's applications
    async function loadUserApplications() {
        const applicationsList = document.getElementById('applications-list');
        if (!applicationsList) return;

        try {
            const response = await fetch('/api/my-applications');
            if (!response.ok) throw new Error('Failed to load applications');

            const applications = await response.json();

            if (applications.length === 0) {
                applicationsList.innerHTML = '<div class="empty-list-msg">You haven\'t applied to any jobs yet.</div>';
            } else {
                applicationsList.innerHTML = applications.map(createApplicationHTML).join('');
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            applicationsList.innerHTML = '<div class="error-msg">Failed to load applications. Please try again.</div>';
        }
    }

    // Create HTML for user applications
    function createApplicationHTML(application) {
        const statusClass = `status-${application.status}`;
        const statusText = application.status.charAt(0).toUpperCase() + application.status.slice(1);

        return `
            <div class="application-item" data-application-id="${application.id}">
                <div class="application-header">
                    <h4>${application.job_title}</h4>
                    <span class="application-status ${statusClass}">${statusText}</span>
                </div>
                <div class="application-details">
                    <p><strong>${application.company_name}</strong></p>
                    <p>Applied: ${application.applied_at}</p>
                </div>
                <div class="application-actions">
                    ${application.status === 'pending' ?
                        `<button class="btn btn-danger withdraw-app-btn" data-application-id="${application.id}">Withdraw</button>` :
                        ''
                    }
                </div>
            </div>
        `;
    }

    // Load employer's jobs
    async function loadEmployerJobs() {
        const jobsList = document.getElementById('employer-jobs-list');
        if (!jobsList) return;

        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to load jobs');

            const jobs = await response.json();

            if (jobs.length === 0) {
                jobsList.innerHTML = '<p class="empty-list-msg">No job postings yet. Click "Post New Job" to get started!</p>';
            } else {
                jobsList.innerHTML = jobs.map(createJobHTML).join('');
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            jobsList.innerHTML = '<p class="error-msg">Failed to load job postings. Please try again.</p>';
        }
    }

    // Create HTML for job listing
    function createJobHTML(job) {
        const salaryRange = job.salary_min && job.salary_max ?
            `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` :
            job.salary_min ? `From $${job.salary_min.toLocaleString()}` :
            job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Salary not specified';

        const statusClass = job.status === 'active' ? 'status-active' :
                           job.status === 'closed' ? 'status-closed' : 'status-draft';

        return `
            <div class="job-item" data-job-id="${job.id}">
                <div class="job-header">
                    <h4>${job.title}</h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${job.applications_count ? `<span class="applications-count">${job.applications_count} applications</span>` : ''}
                        <span class="job-status ${statusClass}">${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                    </div>
                </div>
                <div class="job-details">
                    <p><strong>${job.company_name}</strong></p>
                    <p>${job.location || 'Location not specified'}</p>
                    <p>${salaryRange}</p>
                    <p>${job.employment_type || 'Employment type not specified'} • ${job.employment_arrangement || 'Arrangement not specified'}</p>
                    <p class="job-meta">Posted: ${job.created_at}</p>
                </div>
                <div class="job-actions">
                    <button class="btn btn-primary view-applications-btn" data-job-id="${job.id}">View Applications</button>
                    <button class="btn btn-secondary edit-job-btn" data-job-id="${job.id}">Edit</button>
                    <button class="btn btn-danger delete-job-btn" data-job-id="${job.id}">Delete</button>
                    <button class="btn btn-${job.status === 'active' ? 'warning' : 'success'} toggle-status-btn" data-job-id="${job.id}" data-current-status="${job.status}">
                        ${job.status === 'active' ? 'Close Job' : 'Reopen Job'}
                    </button>
                </div>
            </div>
        `;
    }


    // Open job posting modal
    function openJobPostingModal(jobId = null) {
        const isEditing = jobId !== null && jobId !== undefined;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'job-posting-modal';

        modal.innerHTML = `
            <div class="modal-content large-modal">
                <button class="modal-close-btn">&times;</button>
                <h2>${isEditing ? 'Edit Job Posting' : 'Post New Job'}</h2>
                <form id="job-posting-form" class="modal-form">
                    <input type="hidden" name="job_id" value="${jobId || ''}">

                    <!-- rest of the modal HTML remains the same -->
                    <div class="form-section">
                        <h3>Basic Information</h3>
                        <div class="form-group">
                            <label for="job-title">Job Title *</label>
                            <input type="text" id="job-title" name="title" required>
                        </div>

                        <div class="form-group">
                            <label for="company-name">Company Name *</label>
                            <input type="text" id="company-name" name="company_name" required>
                        </div>

                        <div class="form-group">
                            <label for="job-location">Location</label>
                            <input type="text" id="job-location" name="location" placeholder="e.g., New York, NY or Remote">
                        </div>

                        <div class="form-group">
                            <label for="job-description">Job Description *</label>
                            <textarea id="job-description" name="description" rows="5" required placeholder="Describe the role, responsibilities, and what makes this opportunity great..."></textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Employment Details</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="employment-type">Employment Type</label>
                                <select id="employment-type" name="employment_type">
                                    <option value="">Select type</option>
                                    <option value="Full-Time">Full-Time</option>
                                    <option value="Part-Time">Part-Time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="employment-arrangement">Work Arrangement</label>
                                <select id="employment-arrangement" name="employment_arrangement">
                                    <option value="">Select arrangement</option>
                                    <option value="On-Site">On-Site</option>
                                    <option value="Remote">Remote</option>
                                    <option value="Hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="salary-min">Minimum Salary</label>
                                <input type="number" id="salary-min" name="salary_min" placeholder="e.g., 50000">
                            </div>
                            <div class="form-group">
                                <label for="salary-max">Maximum Salary</label>
                                <input type="number" id="salary-max" name="salary_max" placeholder="e.g., 80000">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="application-deadline">Application Deadline</label>
                            <input type="date" id="application-deadline" name="application_deadline">
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Required Skills</h3>
                        <div id="skills-requirements">
                            <button type="button" class="btn btn-secondary add-requirement-btn" data-type="skill">Add Skill Requirement</button>
                            <div class="requirements-list" id="skills-list"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Experience Requirements</h3>
                        <div id="experience-requirements">
                            <button type="button" class="btn btn-secondary add-requirement-btn" data-type="experience">Add Experience Requirement</button>
                            <div class="requirements-list" id="experience-list"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Certificate Requirements</h3>
                        <div id="certificate-requirements">
                            <button type="button" class="btn btn-secondary add-requirement-btn" data-type="certificate">Add Certificate Requirement</button>
                            <div class="requirements-list" id="certificates-list"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Degree Requirements</h3>
                        <div id="degree-requirements">
                            <button type="button" class="btn btn-secondary add-requirement-btn" data-type="degree">Add Degree Requirement</button>
                            <div class="requirements-list" id="degrees-list"></div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">${isEditing ? 'Update Job' : 'Post Job'}</button>
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Set up modal events
        setupJobModal(modal, isEditing, jobId);

        modal.classList.add('visible');
    }

    // Setup job modal functionality
    function setupJobModal(modal, isEditing, jobId) {
        const form = modal.querySelector('#job-posting-form');
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');

        // Close modal events
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Add requirement buttons
        modal.querySelectorAll('.add-requirement-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                addRequirement(btn.dataset.type);
            });
        });

        // Form submission
        form.addEventListener('submit', handleJobSubmission);

        // Load job data if editing
        if (isEditing) {
            loadJobForEditing(jobId, form);
        }
    }

    // Add requirement functions
    function addRequirement(type) {
        const listId = `${type === 'experience' ? 'experience' : type + 's'}-list`;
        const list = document.getElementById(listId);

        let requirementHTML = '';

        switch(type) {
            case 'skill':
                requirementHTML = `
                    <div class="requirement-item">
                        <div class="form-row">
                            <div class="form-group">
                                <input type="text" placeholder="Skill title" name="skill_title" required>
                            </div>
                            <div class="form-group">
                                <select name="skill_type" required>
                                    <option value="">Select type</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Behavioral">Behavioral</option>
                                    <option value="Conceptual">Conceptual</option>
                                </select>
                            </div>
                            <div class="form-group checkbox-group">
                                <input type="checkbox" name="skill_required" checked>
                                <label>Required</label>
                            </div>
                            <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                        </div>
                    </div>
                `;
                break;

            case 'experience':
                requirementHTML = `
                    <div class="requirement-item">
                        <div class="form-row">
                            <div class="form-group">
                                <input type="number" placeholder="Years required" name="years_required" min="0" required>
                            </div>
                            <div class="form-group">
                                <input type="text" placeholder="Industry (optional)" name="industry">
                            </div>
                            <div class="form-group">
                                <input type="text" placeholder="Role title (optional)" name="role_title">
                            </div>
                            <div class="form-group checkbox-group">
                                <input type="checkbox" name="experience_required" checked>
                                <label>Required</label>
                            </div>
                            <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                        </div>
                    </div>
                `;
                break;

            case 'certificate':
                requirementHTML = `
                    <div class="requirement-item">
                        <div class="form-row">
                            <div class="form-group">
                                <input type="text" placeholder="Certificate title" name="certificate_title" required>
                            </div>
                            <div class="form-group">
                                <input type="text" placeholder="Issuer (optional)" name="certificate_issuer">
                            </div>
                            <div class="form-group checkbox-group">
                                <input type="checkbox" name="certificate_required" checked>
                                <label>Required</label>
                            </div>
                            <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                        </div>
                    </div>
                `;
                break;

            case 'degree':
                requirementHTML = `
                    <div class="requirement-item">
                        <div class="form-row">
                            <div class="form-group">
                                <select name="degree_level" required>
                                    <option value="">Select level</option>
                                    <option value="High School">High School</option>
                                    <option value="Associate's">Associate's</option>
                                    <option value="Bachelor's">Bachelor's</option>
                                    <option value="Master's">Master's</option>
                                    <option value="Doctorate">Doctorate</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <input type="text" placeholder="Field of study (optional)" name="field_of_study">
                            </div>
                            <div class="form-group checkbox-group">
                                <input type="checkbox" name="degree_required" checked>
                                <label>Required</label>
                            </div>
                            <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                        </div>
                    </div>
                `;
                break;
        }

        list.insertAdjacentHTML('beforeend', requirementHTML);

        // Add remove functionality to the new requirement
        const newItem = list.lastElementChild;
        newItem.querySelector('.remove-requirement-btn').addEventListener('click', () => {
            newItem.remove();
        });
    }

    // Handle job form submission
    async function handleJobSubmission(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const jobId = formData.get('job_id');
        const isEditing = jobId && jobId !== '';

        // Build job data object
        const jobData = {
            title: formData.get('title'),
            description: formData.get('description'),
            company_name: formData.get('company_name'),
            location: formData.get('location'),
            salary_min: formData.get('salary_min') ? parseInt(formData.get('salary_min')) : null,
            salary_max: formData.get('salary_max') ? parseInt(formData.get('salary_max')) : null,
            employment_type: formData.get('employment_type'),
            employment_arrangement: formData.get('employment_arrangement'),
            application_deadline: formData.get('application_deadline') || null,
            required_skills: [],
            required_experiences: [],
            required_certificates: [],
            required_degrees: []
        };

        // Collect requirements
        form.querySelectorAll('#skills-list .requirement-item').forEach(item => {
            jobData.required_skills.push({
                title: item.querySelector('[name="skill_title"]').value,
                type: item.querySelector('[name="skill_type"]').value,
                is_required: item.querySelector('[name="skill_required"]').checked
            });
        });

        form.querySelectorAll('#experience-list .requirement-item').forEach(item => {
            jobData.required_experiences.push({
                years_required: parseInt(item.querySelector('[name="years_required"]').value),
                industry: item.querySelector('[name="industry"]').value || null,
                role_title: item.querySelector('[name="role_title"]').value || null,
                is_required: item.querySelector('[name="experience_required"]').checked
            });
        });

        form.querySelectorAll('#certificates-list .requirement-item').forEach(item => {
            jobData.required_certificates.push({
                title: item.querySelector('[name="certificate_title"]').value,
                issuer: item.querySelector('[name="certificate_issuer"]').value || null,
                is_required: item.querySelector('[name="certificate_required"]').checked
            });
        });

        form.querySelectorAll('#degrees-list .requirement-item').forEach(item => {
            jobData.required_degrees.push({
                level: item.querySelector('[name="degree_level"]').value,
                field_of_study: item.querySelector('[name="field_of_study"]').value || null,
                is_required: item.querySelector('[name="degree_required"]').checked
            });
        });

        try {
            const url = isEditing ? `/api/jobs/${jobId}` : '/api/jobs';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jobData)
            });

            if (!response.ok) throw new Error('Failed to save job');

            // Close modal and refresh job list
            document.getElementById('job-posting-modal').remove();
            loadEmployerJobs();

        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job. Please try again.');
        }
    }

    // Load job data for editing
    async function loadJobForEditing(jobId, form) {
        try {
            const response = await fetch(`/api/jobs/${jobId}`);
            if (!response.ok) throw new Error('Failed to load job');

            const job = await response.json();

            // Fill basic fields
            form.querySelector('[name="title"]').value = job.title;
            form.querySelector('[name="company_name"]').value = job.company_name;
            form.querySelector('[name="location"]').value = job.location || '';
            form.querySelector('[name="description"]').value = job.description;
            form.querySelector('[name="employment_type"]').value = job.employment_type || '';
            form.querySelector('[name="employment_arrangement"]').value = job.employment_arrangement || '';
            form.querySelector('[name="salary_min"]').value = job.salary_min || '';
            form.querySelector('[name="salary_max"]').value = job.salary_max || '';
            form.querySelector('[name="application_deadline"]').value = job.application_deadline || '';

            // Load requirements
            job.required_skills.forEach(skill => {
                addRequirement('skill');
                const lastSkill = document.querySelector('#skills-list .requirement-item:last-child');
                lastSkill.querySelector('[name="skill_title"]').value = skill.skill_title;
                lastSkill.querySelector('[name="skill_type"]').value = skill.skill_type;
                lastSkill.querySelector('[name="skill_required"]').checked = skill.is_required;
            });

            job.required_experiences.forEach(exp => {
                addRequirement('experience');
                const lastExp = document.querySelector('#experience-list .requirement-item:last-child');
                lastExp.querySelector('[name="years_required"]').value = exp.years_required;
                lastExp.querySelector('[name="industry"]').value = exp.industry || '';
                lastExp.querySelector('[name="role_title"]').value = exp.role_title || '';
                lastExp.querySelector('[name="experience_required"]').checked = exp.is_required;
            });

            job.required_certificates.forEach(cert => {
                addRequirement('certificate');
                const lastCert = document.querySelector('#certificates-list .requirement-item:last-child');
                lastCert.querySelector('[name="certificate_title"]').value = cert.certificate_title;
                lastCert.querySelector('[name="certificate_issuer"]').value = cert.issuer || '';
                lastCert.querySelector('[name="certificate_required"]').checked = cert.is_required;
            });

            job.required_degrees.forEach(degree => {
                addRequirement('degree');
                const lastDegree = document.querySelector('#degrees-list .requirement-item:last-child');
                lastDegree.querySelector('[name="degree_level"]').value = degree.degree_level;
                lastDegree.querySelector('[name="field_of_study"]').value = degree.field_of_study || '';
                lastDegree.querySelector('[name="degree_required"]').checked = degree.is_required;
            });

        } catch (error) {
            console.error('Error loading job for editing:', error);
            alert('Failed to load job data. Please try again.');
        }
    }

    // Delete job
    async function deleteJob(jobId) {
        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete job');

            loadEmployerJobs(); // Refresh the list
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job. Please try again.');
        }
    }

    // Update job status
    async function updateJobStatus(jobId, status) {
        try {
            const response = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: status })
            });

            if (!response.ok) throw new Error('Failed to update job status');

            loadEmployerJobs(); // Refresh the list
        } catch (error) {
            console.error('Error updating job status:', error);
            alert('Failed to update job status. Please try again.');
        }
    }

    async function loadProfileContent() {
        contentArea.innerHTML = `
            <h1>Profile</h1>
            <div class="profile-section">
                <div class="tile">
                    <div class="tile-header">
                        <h2>Skills</h2>
                        <div class="tile-actions">
                            <button class="toggle-btn">+</button>
                        </div>
                    </div>
                    <div class="tile-content">
                        <div id="skill-list"></div>
                        <div class="tile-footer">
                            <button class="add-btn" data-modal="skill">Add Skill</button>
                        </div>
                    </div>
                </div>
                <div class="tile">
                    <div class="tile-header">
                        <h2>Experience</h2>
                        <div class="tile-actions">
                            <button class="toggle-btn">+</button>
                        </div>
                    </div>
                    <div class="tile-content">
                        <div id="experience-list"></div>
                        <div class="tile-footer">
                            <button class="add-btn" data-modal="experience">Add Experience</button>
                        </div>
                    </div>
                </div>
                <div class="tile">
                    <div class="tile-header">
                        <h2>Certificates</h2>
                        <div class="tile-actions">
                            <button class="toggle-btn">+</button>
                        </div>
                    </div>
                    <div class="tile-content">
                        <div id="certificate-list"></div>
                        <div class="tile-footer">
                            <button class="add-btn" data-modal="certificate">Add Certificate</button>
                        </div>
                    </div>
                </div>
                <div class="tile">
                    <div class="tile-header">
                        <h2>Degrees</h2>
                        <div class="tile-actions">
                            <button class="toggle-btn">+</button>
                        </div>
                    </div>
                    <div class="tile-content">
                        <div id="degree-list"></div>
                        <div class="tile-footer">
                            <button class="add-btn" data-modal="degree">Add Degree</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        await Promise.all([
            fetchAndDisplay('skill', 'skill-list', createSkillHTML),
            fetchAndDisplay('experience', 'experience-list', createExperienceHTML),
            fetchAndDisplay('certificate', 'certificate-list', createCertificateHTML),
            fetchAndDisplay('degree', 'degree-list', createDegreeHTML)
        ]);
    }

    function loadSettingsContent() {
        contentArea.innerHTML = `
            <h1>Settings</h1>
            <div class="settings-section">
                <h3>Notification Preferences</h3>
                <div id="notification-settings">
                    <p class="loading">Loading notification settings...</p>
                </div>
            </div>
            <div class="settings-section">
                <h3>Account Settings</h3>
                <button class="btn btn-secondary" id="account-settings-btn">Update Account Information</button>
            </div>
        `;

        loadNotificationSettings();

        // Set up account settings button
        const accountBtn = document.getElementById('account-settings-btn');
        if (accountBtn) {
            accountBtn.addEventListener('click', () => {
                // Open existing account modal
                if (modals.account) {
                    modals.account.classList.add('visible');
                    loadAccountData();
                }
            });
        }
    }

    async function loadNotificationSettings() {
        const settingsDiv = document.getElementById('notification-settings');

        try {
            const response = await fetch('/api/notification-settings');
            if (!response.ok) throw new Error('Failed to load settings');

            const settings = await response.json();

            settingsDiv.innerHTML = `
                <div class="setting-item">
                    <div class="setting-info">
                        <h5>Application Status Updates - Email</h5>
                        <p class="setting-description">Receive email notifications when your application status changes</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="application-status-email" ${settings.application_status_email ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <h5>Application Status Updates - In-App</h5>
                        <p class="setting-description">Receive in-app notifications when your application status changes</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="application-status-inapp" ${settings.application_status_inapp ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <h5>New Job Matches - Email</h5>
                        <p class="setting-description">Receive email notifications for jobs matching your profile</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="new-job-matches-email" ${settings.new_job_matches_email ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <h5>New Job Matches - In-App</h5>
                        <p class="setting-description">Receive in-app notifications for jobs matching your profile</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="new-job-matches-inapp" ${settings.new_job_matches_inapp ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <h5>Job Applications - Email</h5>
                        <p class="setting-description">Receive email notifications when someone applies to your jobs</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="job-application-email" ${settings.job_application_email ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <h5>Job Applications - In-App</h5>
                        <p class="setting-description">Receive in-app notifications when someone applies to your jobs</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="job-application-inapp" ${settings.job_application_inapp ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div style="margin-top: 2rem;">
                    <button class="btn btn-primary" id="save-notification-settings">Save Settings</button>
                </div>
            `;

            setupNotificationSettingsEventListeners();

        } catch (error) {
            console.error('Error loading notification settings:', error);
            settingsDiv.innerHTML = '<div class="error-msg">Failed to load notification settings.</div>';
        }
    }

    function setupNotificationSettingsEventListeners() {
        const saveBtn = document.getElementById('save-notification-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveNotificationSettings);
        }
    }

    async function saveNotificationSettings() {
        try {
            const settings = {
                application_status_email: document.getElementById('application-status-email').checked,
                application_status_inapp: document.getElementById('application-status-inapp').checked,
                new_job_matches_email: document.getElementById('new-job-matches-email').checked,
                new_job_matches_inapp: document.getElementById('new-job-matches-inapp').checked,
                job_application_email: document.getElementById('job-application-email').checked,
                job_application_inapp: document.getElementById('job-application-inapp').checked
            };

            const response = await fetch('/api/notification-settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error('Failed to save settings');

            showNotification('Notification settings saved successfully', 'success');

        } catch (error) {
            console.error('Error saving notification settings:', error);
            showNotification('Failed to save notification settings', 'error');
        }
    }

    // --- Data Fetching & Display ---
    async function fetchAndDisplay(type, listId, createHTML) {
        try {
            const response = await fetch(`/api/${type}s`);
            if (!response.ok) throw new Error(`Failed to load ${type}s.`);
            const items = await response.json();
            const listElement = document.getElementById(listId);
            if (listElement) {
                listElement.innerHTML = items.length > 0 ? items.map(createHTML).join('') : `<p class="empty-list-msg">No ${type}s added yet.</p>`;
            }
        } catch (error) {
            console.error(error);
        }
    }

    // --- HTML Generation Functions ---

    function createSkillHTML(skill) {

        const statusClass = skill.status.toLowerCase();
        const statusDisplay = skill.status_display || skill.status;

        const sourcesHTML = skill.acquired_at_sources && skill.acquired_at_sources.length > 0
            ? `<div class="skill-sources">
                 Acquired at: ${skill.acquired_at_sources.map(source =>
                     `<span class="source-item">${source.title} (${source.type})</span>`
                 ).join('')}
               </div>`
            : '';

        return `
            <div class="profile-item skill-item" data-id="${skill.id}" data-type="skill">
                <div class="item-details">
                    <h4>${skill.title}</h4>
                    <p>${skill.type}</p>
                    <span class="skill-status ${statusClass}">${statusDisplay}</span>
                    ${sourcesHTML}
                </div>
                <div class="item-actions">
                    <button class="edit-item-btn" title="Edit Skill"><i class="fas fa-pencil-alt"></i></button>
                    <button class="remove-item-btn" title="Remove Skill"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    }

    // This function loads profile items for the skill form
    async function loadProfileItemsForSkillForm() {
        try {
            const response = await fetch('/api/user/profile-items');
            if (!response.ok) throw new Error('Failed to load profile items');

            const items = await response.json();
            const container = document.getElementById('acquired-at-sources');

            if (items.length === 0) {
                container.innerHTML = '<p class="empty">No experiences, certificates, or degrees found. Please add some first.</p>';
                container.classList.add('empty');
                return;
            }

            container.classList.remove('empty');
            container.innerHTML = items.map(item => `
                <div class="checkbox-item">
                    <input type="checkbox" id="source-${item.type}-${item.id}"
                           value="${item.id}" data-type="${item.type}">
                    <label for="source-${item.type}-${item.id}">${item.display}</label>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading profile items:', error);
            document.getElementById('acquired-at-sources').innerHTML =
                '<p class="error">Error loading profile items. Please try again.</p>';
        }
    }

    function createExperienceHTML(exp) {
        const dateRange = exp.is_present ? `${exp.start_date} - Present` : `${exp.start_date} - ${exp.end_date || 'N/A'}`;
        const location = [exp.city, exp.country].filter(Boolean).join(', ');
        return `
            <div class="profile-item experience-item" data-id="${exp.id}" data-type="experience">
                <div class="item-details">
                    <h4>${exp.position_title}</h4>
                    <p>${exp.employer}</p>
                    <p class="item-meta">${location}</p>
                    <p class="item-meta">${dateRange}</p>
                    <p class="item-meta">${exp.employment_type} &middot; ${exp.employment_arrangement}</p>
                </div>
                <div class="item-actions">
                    <button class="edit-item-btn" title="Edit Experience"><i class="fas fa-pencil-alt"></i></button>
                    <button class="remove-item-btn" title="Remove Experience"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    }

    function createCertificateHTML(cert) {
        const dates = cert.expiry_date ? `${cert.issue_date} - ${cert.expiry_date}` : `Issued ${cert.issue_date}`;
        const credentialLink = cert.credential_url ? `<a href="${cert.credential_url}" target="_blank">View Credential</a>` : '';
        return `
            <div class="profile-item certificate-item" data-id="${cert.id}" data-type="certificate">
                <div class="item-details">
                    <h4>${cert.title}</h4>
                    <p>${cert.issuer}</p>
                    <p class="item-meta">${dates}</p>
                    <p class="item-meta">ID: ${cert.credential_id || 'N/A'} ${credentialLink ? `&middot; ${credentialLink}` : ''}</p>
                </div>
                <div class="item-actions">
                    <button class="edit-item-btn" title="Edit Certificate"><i class="fas fa-pencil-alt"></i></button>
                    <button class="remove-item-btn" title="Remove Certificate"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    }

    function createDegreeHTML(degree) {
        const location = [degree.city, degree.country].filter(Boolean).join(', ');
        return `
            <div class="profile-item degree-item" data-id="${degree.id}" data-type="degree">
                <div class="item-details">
                    <h4>${degree.degree} in ${degree.field_of_study}</h4>
                    <p>${degree.school}</p>
                    <p class="item-meta">${location}</p>
                    <p class="item-meta">${degree.start_date} - ${degree.end_date}</p>
                    <p class="item-meta">GPA: ${degree.gpa || 'N/A'}</p>
                </div>
                <div class="item-actions">
                    <button class="edit-item-btn" title="Edit Degree"><i class="fas fa-pencil-alt"></i></button>
                    <button class="remove-item-btn" title="Remove Degree"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    }


    // --- Unified Event Delegation for Main Content Area ---
    contentArea.addEventListener('click', async function(event) {
        const header = event.target.closest('.tile-header');
        if (header) {
            const tile = header.closest('.tile');
            tile.classList.toggle('expanded');
            header.querySelector('.toggle-btn').textContent = tile.classList.contains('expanded') ? '−' : '+';
            return;
        }

        const addBtn = event.target.closest('.add-btn');
        if (addBtn) {
            const modalType = addBtn.dataset.modal;
            if (modals[modalType]) {
                const modal = modals[modalType];
                const form = modal.querySelector('.modal-form');
                form.reset();
                form.querySelector('input[name="id"]').value = '';
                modal.querySelector('h2').textContent = `Add New ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`;

                // ONLY call this for skill modals
                if (modalType === 'skill') {
                    loadProfileItemsForSkillForm();
                }

                modal.classList.add('visible');
            }
            return;
        }

        const editBtn = event.target.closest('.edit-item-btn');
        if (editBtn) {
            const item = editBtn.closest('.profile-item');
            openModalForEdit(item.dataset.id, item.dataset.type);
            return;
        }

        const removeBtn = event.target.closest('.remove-item-btn');
        if (removeBtn) {
            const item = removeBtn.closest('.profile-item');
            itemToDelete = { id: item.dataset.id, type: item.dataset.type };
            modals.confirm.querySelector('#confirm-remove-text').textContent = `Are you sure you want to remove this ${itemToDelete.type}?`;
            modals.confirm.classList.add('visible');
            return;
        }

        // **FIX**: Correctly handle the account edit button click
        const editAccountBtn = event.target.closest('.edit-account-btn');
        if (editAccountBtn) {
            openAccountModal();
        }

        // Job management actions
        const editJobBtn = event.target.closest('.edit-job-btn');
        if (editJobBtn) {
            const jobId = parseInt(editJobBtn.dataset.jobId); // Parse to integer
            openJobPostingModal(jobId);
            return;
        }

        const deleteJobBtn = event.target.closest('.delete-job-btn');
        if (deleteJobBtn) {
            const jobId = parseInt(deleteJobBtn.dataset.jobId); // Parse to integer
            if (confirm('Are you sure you want to delete this job posting?')) {
                deleteJob(jobId);
            }
            return;
        }

        const toggleStatusBtn = event.target.closest('.toggle-status-btn');
        if (toggleStatusBtn) {
            const jobId = parseInt(toggleStatusBtn.dataset.jobId); // Parse to integer
            const currentStatus = toggleStatusBtn.dataset.currentStatus;
            const newStatus = currentStatus === 'active' ? 'closed' : 'active';
            updateJobStatus(jobId, newStatus);
            return;
        }

        // Job seeker actions
        const applyJobBtn = event.target.closest('.apply-job-btn');
        if (applyJobBtn) {
            const jobId = parseInt(applyJobBtn.dataset.jobId);
            openApplicationModal(jobId);
            return;
        }

        const viewJobBtn = event.target.closest('.view-job-btn');
        if (viewJobBtn) {
            const jobId = parseInt(viewJobBtn.dataset.jobId);
            openJobDetailsModal(jobId);
            return;
        }

        const withdrawAppBtn = event.target.closest('.withdraw-app-btn');
        if (withdrawAppBtn) {
            const applicationId = parseInt(withdrawAppBtn.dataset.applicationId);
            if (confirm('Are you sure you want to withdraw this application?')) {
                await withdrawApplication(applicationId);
            }
            return;
        }
    });


    // Withdraw application
    async function withdrawApplication(applicationId) {
        try {
            const response = await fetch(`/api/applications/${applicationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Application withdrawn successfully.');
                loadUserApplications();
                loadAvailableJobs(); // Refresh to show apply button again
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to withdraw application'}`);
            }
        } catch (error) {
            console.error('Error withdrawing application:', error);
            alert('Failed to withdraw application. Please try again.');
        }
    }


    // Open application modal
    function openApplicationModal(jobId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'application-modal';

        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close-btn">&times;</button>
                <h2>Apply for Job</h2>
                <form id="application-form" class="modal-form">
                    <div class="form-group">
                        <label for="cover-letter">Cover Letter (Optional)</label>
                        <textarea id="cover-letter" name="cover_letter" rows="6"
                                  placeholder="Tell the employer why you're interested in this position and what makes you a great fit..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Submit Application</button>
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Set up form submission
        const form = modal.querySelector('#application-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch(`/api/jobs/${jobId}/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    modal.remove();
                    alert('Application submitted successfully!');
                    loadAvailableJobs(); // Refresh the job list
                    loadUserApplications(); // Refresh applications if visible
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.error || 'Failed to submit application'}`);
                }
            } catch (error) {
                console.error('Error submitting application:', error);
                alert('Failed to submit application. Please try again.');
            }
        });

        // Close modal events
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');

        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        modal.classList.add('visible');
    }


    // Open job details modal (simplified view)
    async function openJobDetailsModal(jobId) {
        try {
            const response = await fetch(`/api/jobs/${jobId}`);
            if (!response.ok) {
                // Try the browse endpoint if the job isn't owned by current user
                const browseResponse = await fetch(`/api/jobs/browse?search=&location=`);
                const jobs = await browseResponse.json();
                const job = jobs.find(j => j.id === jobId);
                if (!job) throw new Error('Job not found');
                showJobDetailsModal(job);
                return;
            }

            const job = await response.json();
            showJobDetailsModal(job);
        } catch (error) {
            console.error('Error loading job details:', error);
            alert('Failed to load job details.');
        }
    }


    function showJobDetailsModal(job) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'job-details-modal';

        const salaryRange = job.salary_min && job.salary_max ?
            `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` :
            job.salary_min ? `From $${job.salary_min.toLocaleString()}` :
            job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Salary not specified';

        modal.innerHTML = `
            <div class="modal-content large-modal">
                <button class="modal-close-btn">&times;</button>
                <h2>${job.title}</h2>
                <div class="job-details-content">
                    <div class="job-basic-info">
                        <p><strong>Company:</strong> ${job.company_name}</p>
                        <p><strong>Location:</strong> ${job.location || 'Not specified'}</p>
                        <p><strong>Employment Type:</strong> ${job.employment_type || 'Not specified'}</p>
                        <p><strong>Work Arrangement:</strong> ${job.employment_arrangement || 'Not specified'}</p>
                        <p><strong>Salary:</strong> ${salaryRange}</p>
                        ${job.application_deadline ? `<p><strong>Application Deadline:</strong> ${job.application_deadline}</p>` : ''}
                    </div>

                    <div class="job-description">
                        <h3>Job Description</h3>
                        <p>${job.description.replace(/\n/g, '<br>')}</p>
                    </div>

                    ${job.required_skills && job.required_skills.length > 0 ? `
                        <div class="job-requirements">
                            <h3>Required Skills</h3>
                            <div class="requirements-list">
                                ${job.required_skills.map(skill =>
                                    `<span class="requirement-tag ${skill.is_required ? 'required' : 'preferred'}">
                                        ${skill.skill_title} (${skill.skill_type})
                                        ${skill.is_required ? '' : ' - Preferred'}
                                    </span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="job-actions">
                        ${!job.user_applied ?
                            `<button class="btn btn-primary apply-job-btn" data-job-id="${job.id}">Apply Now</button>` :
                            `<span class="application-status status-${job.application_status}">Already Applied</span>`
                        }
                        <button class="btn btn-secondary modal-cancel-btn">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal events
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');

        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        modal.classList.add('visible');
    }


    // --- Modal & Form Logic ---
    async function openModalForEdit(id, type) {
        try {
            const response = await fetch(`/api/${type}s/${id}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const itemData = await response.json();

            const modal = modals[type];
            const form = modal.querySelector('.modal-form');
            form.reset();

            // Special handling for skill modal
            if (type === 'skill') {
                await loadProfileItemsForSkillForm();

                // Pre-select the acquired at sources
                if (itemData.acquired_at_sources) {
                    itemData.acquired_at_sources.forEach(source => {
                        const checkbox = form.querySelector(`input[value="${source.id}"][data-type="${source.type.toLowerCase()}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }

            for (const key in itemData) {
                if (Object.prototype.hasOwnProperty.call(itemData, key) && key !== 'acquired_at_sources') {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.type === 'checkbox' ? (input.checked = itemData[key]) : (input.value = itemData[key]);
                    }
                }
            }

            if (type === 'experience') {
                const presentCheckbox = form.querySelector('#present-checkbox');
                if (presentCheckbox) presentCheckbox.dispatchEvent(new Event('change'));
            }

            modal.querySelector('h2').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            modal.classList.add('visible');
        } catch (error) {
            console.error(`Failed to load ${type} for editing:`, error);
        }
    }

    async function openAccountModal() {
        try {
            const response = await fetch('/api/account');
            if (!response.ok) throw new Error('Failed to fetch account data.');
            const data = await response.json();

            const modal = modals.account;
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

    function setupGenericForm(modal, onSuccessfulSubmit) {
        if (!modal) return;
        const form = modal.querySelector('.modal-form');
        if (!form) return;

        const closeModal = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                form.reset();
                if (form.querySelector('input[name="id"]')) {
                    form.querySelector('input[name="id"]').value = '';
                }
                if (form.id === 'experience-form') {
                    form.querySelector('#end-date').disabled = false;
                }
            }, 300);
        };

        modal.addEventListener('click', e => {
            if (e.target === modal || e.target.matches('.modal-close-btn, .modal-cancel-btn')) {
                closeModal();
            }
        });

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            // Check if this is a skill form by checking both form ID and modal ID
            const isSkillForm = this.id === 'skill-form' || modal.id === 'skill-modal';

            if (isSkillForm) {
                const checkedSources = Array.from(this.querySelectorAll('#acquired-at-sources input[type="checkbox"]:checked'));

                if (checkedSources.length === 0) {
                    alert('Please select at least one source where you acquired this skill.');
                    return;
                }

                data.acquired_at_sources = checkedSources.map(cb => ({
                    id: parseInt(cb.value),
                    type: cb.dataset.type
                }));
            }

            // Handle specific form data adjustments
            if (this.id === 'experience-form') data.is_present = formData.has('is_present');
            if (this.id === 'account-settings-form') delete data.email;

            const id = data.id;
            const isEdit = id && id !== '';
            let url, method;

            if (this.id === 'account-settings-form') {
                url = '/api/account';
                method = 'PUT';
            } else {
                const modalType = modal.id.split('-')[0];
                method = isEdit ? 'PUT' : 'POST';
                url = isEdit ? `/api/${modalType}s/${id}` : `/api/${modalType}s`;
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || errorData.message || `Operation failed.`);
                }

                closeModal();
                if(onSuccessfulSubmit) {
                   onSuccessfulSubmit();
                }
            } catch (error) {
                console.error(`Form submission error for ${this.id}:`, error);
                alert(error.message);
            }
        });
    }

    // Setup all modals when DOM loads
    setupGenericForm(modals.skill, () => fetchAndDisplay('skill', 'skill-list', createSkillHTML));
    setupGenericForm(modals.experience, () => fetchAndDisplay('experience', 'experience-list', createExperienceHTML));
    setupGenericForm(modals.certificate, () => fetchAndDisplay('certificate', 'certificate-list', createCertificateHTML));
    setupGenericForm(modals.degree, () => fetchAndDisplay('degree', 'degree-list', createDegreeHTML));
    setupGenericForm(modals.account);

    // Handle special UI logic within specific modals
    if (modals.experience) {
        modals.experience.querySelector('#present-checkbox')?.addEventListener('change', function() {
            const endDateInput = modals.experience.querySelector('#end-date');
            endDateInput.disabled = this.checked;
            if (this.checked) endDateInput.value = '';
        });
    }

    // Confirmation Modal Logic
    if (modals.confirm) {
        modals.confirm.addEventListener('click', async function(event) {
            if (event.target === this || event.target.matches('.modal-cancel-btn, .modal-close-btn')) {
                this.classList.remove('visible');
                itemToDelete = { id: null, type: null };
            }
            if (event.target.matches('#confirm-delete-action-btn')) {
                if (!itemToDelete.id || !itemToDelete.type) return;
                const response = await fetch(`/api/${itemToDelete.type}s/${itemToDelete.id}`, { method: 'DELETE' });
                if (response.ok) {
                   loadProfileContent(); // Easiest way to reflect removal is to reload the section
                } else {
                    alert(`Failed to remove ${itemToDelete.type}.`);
                }
                this.classList.remove('visible');
                itemToDelete = { id: null, type: null };
            }
        });
    }

    // --- Initial Load ---
    loadHomeContent();
});