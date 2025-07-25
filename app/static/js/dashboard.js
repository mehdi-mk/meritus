document.addEventListener('DOMContentLoaded', function() {
    // --- Element & State Management ---
    const contentArea = document.getElementById('content-area');
    const modals = {
        experience: document.getElementById('experience-modal'),
        certificate: document.getElementById('certificate-modal'),
        degree: document.getElementById('degree-modal'),
        confirm: document.getElementById('confirm-remove-modal')
    };
    let itemToDelete = { id: null, type: null };

    // --- HTML Generation Functions ---
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

    async function openModalForEdit(id, type) {
        try {
            const response = await fetch(`/api/${type}s/${id}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const itemData = await response.json();

            const modal = modals[type];
            const form = modal.querySelector('.modal-form');

            form.reset();

            // Populate form with fetched data
            for (const key in itemData) {
                if (Object.prototype.hasOwnProperty.call(itemData, key)) {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = itemData[key];
                        } else {
                            input.value = itemData[key];
                        }
                    }
                }
            }

            // Manually trigger change event for checkbox to update UI
            if (type === 'experience') {
                const presentCheckbox = form.querySelector('#present-checkbox');
                if (presentCheckbox) presentCheckbox.dispatchEvent(new Event('change'));
            }

            modal.querySelector('h2').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            modal.classList.add('visible');
        } catch (error) {
            console.error(`Failed to load ${type} for editing:`, error);
            alert(`Could not load ${type} data. Please try again.`);
        }
    }

    // --- Data Fetching & Display ---
    async function fetchAndDisplay(type, listId, createHTML) {
        const container = document.getElementById(listId);
        if (!container) return;
        try {
            const response = await fetch(`/api/${type}s`);
            const items = await response.json();
            container.innerHTML = '';
            if (items.length > 0) {
                items.forEach(item => container.insertAdjacentHTML('beforeend', createHTML(item)));
            } else {
                container.innerHTML = `<p>No ${type}s added yet.</p>`;
            }
        } catch (error) {
            console.error(`Failed to load ${type}s:`, error);
            container.innerHTML = `<p class="error">Could not load ${type}s. Please try again later.</p>`;
        }
    }

    // --- Main Logic ---
    function loadProfileContent() {
        contentArea.innerHTML = `
            <h1>Profile</h1>
            <div class="tile">
                <div class="tile-header"><h3>Experiences</h3><button class="toggle-btn">+</button></div>
                <div class="tile-content"><div id="experience-list"></div><button class="add-btn" data-modal="experience">Add Experience</button></div>
            </div>
            <div class="tile">
                <div class="tile-header"><h3>Certificates</h3><button class="toggle-btn">+</button></div>
                <div class="tile-content"><div id="certificate-list"></div><button class="add-btn" data-modal="certificate">Add Certificate</button></div>
            </div>
            <div class="tile">
                <div class="tile-header"><h3>Degrees</h3><button class="toggle-btn">+</button></div>
                <div class="tile-content"><div id="degree-list"></div><button class="add-btn" data-modal="degree">Add Degree</button></div>
            </div>`;
        fetchAndDisplay('experience', 'experience-list', createExperienceHTML);
        fetchAndDisplay('certificate', 'certificate-list', createCertificateHTML);
        fetchAndDisplay('degree', 'degree-list', createDegreeHTML);
    }

    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const content = e.target.dataset.content;
            if (content === 'Profile') {
                loadProfileContent();
            } else {
                contentArea.innerHTML = `<h1>${content}</h1>`;
            }
        });
    });

    // --- Event Delegation ---
    contentArea.addEventListener('click', function(event) {
        const header = event.target.closest('.tile-header');
        if (header) {
            const tile = header.closest('.tile');
            tile.classList.toggle('expanded');
            header.querySelector('.toggle-btn').textContent = tile.classList.contains('expanded') ? '−' : '+';
            return; // Prevent other actions
        }

        const addBtn = event.target.closest('.add-btn');
        if (addBtn) {
            const modalType = addBtn.dataset.modal;
            if (modals[modalType]) {
                // Ensure modal is in "add" mode
                const modal = modals[modalType];
                const form = modal.querySelector('.modal-form');
                form.reset();
                form.querySelector('input[name="id"]').value = '';
                modal.querySelector('h2').textContent = `Add New ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`;
                modal.classList.add('visible');
            }
            return; // Prevent other actions
        }

        const editBtn = event.target.closest('.edit-item-btn');
        if (editBtn) {
            const item = editBtn.closest('.profile-item');
            openModalForEdit(item.dataset.id, item.dataset.type);
            return; // Prevent other actions
        }

        const removeBtn = event.target.closest('.remove-item-btn');
        if (removeBtn) {
            const item = removeBtn.closest('.profile-item');
            itemToDelete = { id: item.dataset.id, type: item.dataset.type };
            modals.confirm.querySelector('#confirm-remove-text').textContent = `Are you sure you want to remove this ${itemToDelete.type}?`;
            modals.confirm.classList.add('visible');
        }
    });

    // --- Modal & Form Logic ---
    function setupForm(modalType, fetchFunction, createHTML) {
        const modal = modals[modalType];
        if (!modal) return;
        const form = modal.querySelector('.modal-form');

        const closeModal = () => {
            modal.classList.remove('visible');
            // A small delay to allow the animation to finish before resetting
            setTimeout(() => {
                form.reset();
                form.querySelector('input[name="id"]').value = ''; // Clear ID
                 // Reset any disabled fields
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

        if (form.id === 'experience-form') {
            form.querySelector('#present-checkbox')?.addEventListener('change', function() {
                const endDateInput = form.querySelector('#end-date');
                endDateInput.disabled = this.checked;
                if (this.checked) endDateInput.value = '';
            });
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            const id = data.id;

            // Ensure checkbox value is boolean
            if (form.id === 'experience-form') {
                data.is_present = formData.has('is_present');
            }

            const isEdit = id && id !== '';
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/${modalType}s/${id}` : `/api/${modalType}s`;

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to ${isEdit ? 'update' : 'create'} ${modalType}`);
                }

                closeModal();
                fetchAndDisplay(modalType, `${modalType}-list`, createHTML);

            } catch (error) {
                console.error(`Form submission error for ${modalType}:`, error);
                alert(error.message);
            }
        });
    }
    setupForm('experience', fetchAndDisplay, createExperienceHTML);
    setupForm('certificate', fetchAndDisplay, createCertificateHTML);
    setupForm('degree', fetchAndDisplay, createDegreeHTML);

    // --- Confirmation Modal Logic ---
    modals.confirm?.addEventListener('click', async function(event) {
        if (event.target === this || event.target.matches('.modal-cancel-btn')) {
            this.classList.remove('visible');
            itemToDelete = { id: null, type: null };
        }
        if (event.target.matches('#confirm-delete-action-btn')) {
            if (!itemToDelete.id || !itemToDelete.type) return;
            const response = await fetch(`/api/${itemToDelete.type}s/${itemToDelete.id}`, { method: 'DELETE' });
            if (response.ok) {
                document.querySelector(`.profile-item[data-id="${itemToDelete.id}"][data-type="${itemToDelete.type}"]`)?.remove();
            } else {
                alert(`Failed to remove ${itemToDelete.type}.`);
            }
            this.classList.remove('visible');
            itemToDelete = { id: null, type: null };
        }
    });
});