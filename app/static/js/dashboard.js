import { state, dom } from './modules/state.js';
import { setupGenericForm, fetchAndDisplay } from './modules/utils.js';
import { initNotifications } from './modules/notifications.js';
import {
    loadProfileContent, createSkillHTML, createExperienceHTML,
    createCertificateHTML, createDegreeHTML, openModalForEdit
} from './modules/profile.js';
import {
    loadSettingsContent, createAccountEditHTML, saveAccountChanges
} from './modules/settings.js';
import { loadJobContent } from './modules/jobs.js';
import {
    loadTests, deleteTest, openTestForEditing
} from './modules/interviews.js';
import {
    loadAllApplications, showApplicantProfileModal, archiveApplication,
    openApplicationsWindow, openJobPostingModal, deleteJob, updateJobStatus
} from './modules/employer.js';
import {
    openApplicationModal, openJobDetailsModal, withdrawApplication
} from './modules/jobSeeker.js';


// --- EVENT LISTENERS --- //

document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize DOM references in state
    dom.contentArea = document.getElementById('content-area');
    dom.modals = {
        skill: document.getElementById('skill-modal'),
        experience: document.getElementById('experience-modal'),
        certificate: document.getElementById('certificate-modal'),
        degree: document.getElementById('degree-modal'),
        account: document.getElementById('account-settings-modal'),
        confirm: document.getElementById('confirm-remove-modal'),
        test: document.getElementById('test-modal')
    };

    // 2. Initialize Notifications
    initNotifications();

    // 3. Setup Navigation
    const contentLoaders = {
        'Home': loadHomeContent, // Defined below locally
        'Learning': () => dom.contentArea.innerHTML = '<h1>Learning</h1>',
        'Profile': loadProfileContent,
        'Settings': loadSettingsContent,
        'Job': loadJobContent,
        'Help': () => dom.contentArea.innerHTML = '<h1>Help</h1>'
    };

    async function loadHomeContent() {
        try {
            const response = await fetch('/api/account');
            if (!response.ok) throw new Error('Failed to fetch account details');
            const account = await response.json();
            const name = account.first_name || account.email.split('@')[0];
            dom.contentArea.innerHTML = `<h1>Hello, ${name}!</h1>`;
        } catch (error) {
            console.error('Error loading home content:', error);
            dom.contentArea.innerHTML = '<h1>Welcome!</h1><p>Welcome to your Meritus dashboard.</p>';
        }
    }

    // Sidebar listener
    document.querySelector('.sidebar nav').addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            const currentActive = document.querySelector('.sidebar nav a.active');
            if (currentActive) currentActive.classList.remove('active');
            event.target.classList.add('active');
            const contentName = event.target.dataset.content;
            if (contentLoaders[contentName]) {
                contentLoaders[contentName]();
            } else {
                dom.contentArea.innerHTML = `<h1>${contentName}</h1>`;
            }
        }
    });

    // Filter dropdown listener
    document.addEventListener('click', function(event) {
        const filterDropdown = document.querySelector('.filter-dropdown.open');
        if (filterDropdown && !filterDropdown.contains(event.target)) {
            filterDropdown.classList.remove('open');
        }
    });

    // Status change and privacy toggle listener
    dom.contentArea.addEventListener('change', async (event) => {
        // Check if the event was triggered by the application status dropdown
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

                const card = dropdown.closest('.application-card');
                if (card) {
                    const statusClass = newStatus.toLowerCase().replace(/ /g, '-');
                    card.className = card.className.replace(/status-border-\S+/g, ' ').trim();
                    card.classList.add(`status-border-${statusClass}`);
                }

                console.log(`Application ${applicationId} status updated to ${newStatus}`);

            } catch (error) {
                console.error('Error updating application status:', error);
                alert('Failed to update status. Please try again.');
                loadAllApplications();
            }
        }

        // Check if the event was triggered by a privacy toggle checkbox
        if (event.target.classList.contains('privacy-checkbox')) {
            const checkbox = event.target;
            const id = checkbox.dataset.id;
            const type = checkbox.dataset.type;
            const isPublic = checkbox.checked;

            const label = checkbox.closest('.privacy-control').querySelector('.privacy-label');
            if (label) {
                label.textContent = isPublic ? 'Public' : 'Private';
            }

            await updatePrivacySetting(id, type, isPublic);
        }
    });

    // Privacy setting update function
    async function updatePrivacySetting(id, type, isPublic) {
        try {
            const res = await fetch(`/api/${type}s/${id}`);
            if (!res.ok) throw new Error(`Failed to fetch ${type} to update privacy.`);
            const itemData = await res.json();

            itemData.is_public = isPublic;

            if (type === 'skill' && itemData.acquired_at_sources) {
                itemData.acquired_at_sources = itemData.acquired_at_sources.map(s => ({
                    id: s.id,
                    type: s.type.toLowerCase()
                }));
            }

            const response = await fetch(`/api/${type}s/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData),
            });

            if (!response.ok) throw new Error('Failed to update privacy setting');

        } catch (error) {
            console.error('Error updating privacy setting:', error);
            alert('Could not update privacy setting. Refreshing the page to ensure consistency.');
            loadProfileContent();
        }
    }

    // 4. Setup Modals
    setupGenericForm(dom.modals.skill, () => fetchAndDisplay('skill', 'skill-list', createSkillHTML));
    setupGenericForm(dom.modals.experience, () => fetchAndDisplay('experience', 'experience-list', createExperienceHTML));
    setupGenericForm(dom.modals.certificate, () => fetchAndDisplay('certificate', 'certificate-list', createCertificateHTML));
    setupGenericForm(dom.modals.degree, () => fetchAndDisplay('degree', 'degree-list', createDegreeHTML));
    setupGenericForm(dom.modals.account);
    setupGenericForm(dom.modals.test, () => loadTests());

    // Confirmation Modal Logic (Kept here as it bridges multiple modules)
    if (dom.modals.confirm) {
        dom.modals.confirm.addEventListener('click', async function(event) {
            if (event.target === this || event.target.matches('.modal-cancel-btn, .modal-close-btn')) {
                this.classList.remove('visible');
                state.itemToDelete = { id: null, type: null };
            }
            if (event.target.matches('#confirm-delete-action-btn')) {
                if (!state.itemToDelete.id || !state.itemToDelete.type) return;

                if (state.itemToDelete.type === 'test') {
                    await deleteTest(state.itemToDelete.id);
                    this.classList.remove('visible');
                    return;
                }

                const response = await fetch(`/api/${state.itemToDelete.type}s/${state.itemToDelete.id}`, { method: 'DELETE' });
                if (response.ok) {
                   loadProfileContent();
                } else {
                    alert(`Failed to remove ${state.itemToDelete.type}.`);
                }
                this.classList.remove('visible');
                state.itemToDelete = { id: null, type: null };
            }
        });
    }

    // Experience Modal Special Logic
    if (dom.modals.experience) {
        dom.modals.experience.querySelector('#present-checkbox')?.addEventListener('change', function() {
            const endDateInput = dom.modals.experience.querySelector('#end-date');
            endDateInput.disabled = this.checked;
            if (this.checked) endDateInput.value = '';
        });
    }

    // Test Modal Special Logic
    if (dom.modals.test) {
        dom.modals.test.addEventListener('change', event => {
            if (event.target.name === 'test_type') {
                const questionnaireFields = dom.modals.test.querySelector('#questionnaire-fields');
                const examFields = dom.modals.test.querySelector('#exam-fields');
                if (event.target.value === 'Questionnaire') {
                    questionnaireFields.style.display = 'block';
                    examFields.style.display = 'none';
                } else {
                    questionnaireFields.style.display = 'none';
                    examFields.style.display = 'block';
                }
            }
        });
    }


    // 5. Global Event Delegation
    dom.contentArea.addEventListener('click', async function(event) {

        // Tile Expansion (UI)
        const header = event.target.closest('.tile-header');
        if (header) {
            const tile = header.closest('.tile');
            tile.classList.toggle('expanded');
            header.querySelector('.toggle-btn').textContent = tile.classList.contains('expanded') ? '−' : '+';
            return;
        }

        // Add Buttons (Generic)
        const addBtn = event.target.closest('.add-btn');
        if (addBtn) {
            const modalType = addBtn.dataset.modal;
            if (dom.modals[modalType]) {
                const modal = dom.modals[modalType];
                const form = modal.querySelector('.modal-form');
                form.reset();
                const privacyToggle = form.querySelector('[name="is_public"]');
                const privacyLabel = form.querySelector('.privacy-label');
                if (privacyToggle) privacyToggle.checked = true;
                if (privacyLabel) privacyLabel.textContent = 'Public';
                form.querySelector('input[name="id"]').value = '';
                modal.querySelector('h2').textContent = `Add New ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`;

                // Note: loadProfileItemsForSkillForm is not exported from profile.js in my list above.
                // You need to export it from profile.js and import it here if you want to use it.
                // OR, cleaner: Import it and use it.
                if (modalType === 'skill') {
                     // import { loadProfileItemsForSkillForm } from './modules/profile.js';
                     // await loadProfileItemsForSkillForm();
                }
                modal.classList.add('visible');
            }
            return;
        }

        // Profile Actions
        const editBtn = event.target.closest('.edit-item-btn');
        if (editBtn && !editBtn.classList.contains('edit-account-btn') && !editBtn.classList.contains('edit-test-btn') && !editBtn.classList.contains('edit-job-btn')) {
            const item = editBtn.closest('.profile-item');
            if (item) {
                openModalForEdit(item.dataset.id, item.dataset.type);
                return;
            }
        }

        const removeBtn = event.target.closest('.remove-item-btn');
        if (removeBtn && !removeBtn.classList.contains('cancel-account-btn')) {
            const item = removeBtn.closest('.profile-item');
            if (item) {
                state.itemToDelete = { id: item.dataset.id, type: item.dataset.type };
                dom.modals.confirm.querySelector('#confirm-remove-text').textContent = `Are you sure you want to remove this ${state.itemToDelete.type}?`;
                dom.modals.confirm.classList.add('visible');
                return;
            }
        }

        // Account Settings Actions
        if (event.target.closest('.edit-account-btn')) {
            const card = document.getElementById('account-settings-card');
            if (card && card.dataset.accountData) {
                const accountData = JSON.parse(card.dataset.accountData);
                card.innerHTML = createAccountEditHTML(accountData);
            }
            return;
        }
        if (event.target.closest('.save-account-btn')) {
            saveAccountChanges();
            return;
        }
        if (event.target.closest('.cancel-account-btn')) {
            loadSettingsContent(); // Reloading is easiest way to cancel
            return;
        }

        // Test Actions
        if (event.target.closest('.edit-test-btn')) {
            openTestForEditing(event.target.closest('.edit-test-btn').dataset.testId);
            return;
        }

        if (event.target.closest('.delete-test-btn')) {
            const testId = event.target.closest('.delete-test-btn').dataset.testId;
            state.itemToDelete = { id: testId, type: 'test' };
            dom.modals.confirm.querySelector('#confirm-remove-text').textContent = `Are you sure?`;
            dom.modals.confirm.classList.add('visible');
            return;
        }

        // Job Actions
        if (event.target.closest('.clear-app-filter-btn')) {
            await loadAllApplications();
            const filterContainer = document.getElementById('applications-filter-container');
            if(filterContainer) filterContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
            return;
        }

        const dropdownButton = event.target.closest('.dropdown-button');
        if (dropdownButton) {
            dropdownButton.closest('.filter-dropdown').classList.toggle('open');
            return;
        }

        if (event.target.closest('.view-profile-btn')) {
            const applicantId = event.target.closest('.view-profile-btn').dataset.applicantId;
            showApplicantProfileModal(applicantId);
            return;
        }

        if (event.target.closest('.archive-app-btn')) {
            archiveApplication(event.target.closest('.archive-app-btn').dataset.applicationId, true);
            return;
        }
        if (event.target.closest('.unarchive-app-btn')) {
            archiveApplication(event.target.closest('.unarchive-app-btn').dataset.applicationId, false);
            return;
        }

        if (event.target.closest('.view-applications-btn')) {
            openApplicationsWindow(event.target.closest('.view-applications-btn').dataset.jobId);
            return;
        }

        if (event.target.closest('.edit-job-btn')) {
            openJobPostingModal(parseInt(event.target.closest('.edit-job-btn').dataset.jobId));
            return;
        }

        if (event.target.closest('.delete-job-btn')) {
            if (confirm('Are you sure?')) deleteJob(parseInt(event.target.closest('.delete-job-btn').dataset.jobId));
            return;
        }

        if (event.target.closest('.toggle-status-btn')) {
            const btn = event.target.closest('.toggle-status-btn');
            const newStatus = btn.dataset.currentStatus === 'active' ? 'closed' : 'active';
            updateJobStatus(parseInt(btn.dataset.jobId), newStatus);
            return;
        }

        // Job Seeker Actions
        if (event.target.closest('.apply-job-btn')) {
            const jobId = parseInt(event.target.closest('.apply-job-btn').dataset.jobId);
            openApplicationModal(jobId);
            return;
        }

        if (event.target.closest('.view-job-btn')) {
            openJobDetailsModal(parseInt(event.target.closest('.view-job-btn').dataset.jobId));
            return;
        }

        if (event.target.closest('.withdraw-app-btn')) {
            if (confirm('Withdraw application?')) withdrawApplication(parseInt(event.target.closest('.withdraw-app-btn').dataset.applicationId));
            return;
        }
    });

    // Initial Load
    loadHomeContent();
});