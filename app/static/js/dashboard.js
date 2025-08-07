document.addEventListener('DOMContentLoaded', function() {
    // --- Element & State Management ---
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
                <h2>Get Hired</h2>
                <p>This is where you'll find job postings and opportunities.</p>
            </div>
            <div id="hire" class="tab-pane">
                <h2>Hire</h2>
                <p>This is where you'll be able to post jobs and search for candidates.</p>
            </div>
        `;

        contentArea.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('active')) return;
                const tabName = button.dataset.tab;
                contentArea.querySelector('.tab-button.active').classList.remove('active');
                button.classList.add('active');
                contentArea.querySelector('.tab-pane.active').classList.remove('active');
                contentArea.querySelector(`#${tabName}`).classList.add('active');
            });
        });
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
            <div class="profile-section">
                <div class="profile-item account-tile">
                    <div class="item-details">
                        <h4>Account Management</h4>
                        <p>Manage your email, name, and other personal details.</p>
                    </div>
                    <div class="item-actions">
                        <button class="edit-account-btn" title="Edit Account Settings"><i class="fas fa-user-cog"></i></button>
                    </div>
                </div>
            </div>
        `;
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
    contentArea.addEventListener('click', function(event) {
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
    });

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