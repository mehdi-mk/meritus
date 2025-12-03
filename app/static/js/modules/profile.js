import { dom, state } from './state.js';
import { fetchAndDisplay } from './utils.js';

// =================================================================
// Profile Section
// =================================================================


// This function generates the HTML structure for the main "Profile" page.
// It creates collapsible tiles for Skills, Experience, Certificates, and Degrees, then fetches and displays the content for each.
// It is part of the user's profile management feature.
// It does not return anything but updates the dom.contentArea's innerHTML.
export async function loadProfileContent() {
    dom.contentArea.innerHTML = `
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




// This function fetches the user's experiences, certificates, and degrees to populate the "Acquired at" checklist in the "Add/Edit Skill" modal.
// This allows a user to link a skill to the context where they gained it.
// It is part of the Skill management feature.
// It does not return anything but updates the 'acquired-at-sources' element's innerHTML in the skill modal.
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


// --- HTML Generation Functions ---

// This function generates the HTML for a single skill item to be displayed on the profile page.
// It includes details like title, type, status, and sources, along with edit/delete/privacy controls.
// It is a helper function for the Profile section.
// It returns an HTML string for a skill item.
export function createSkillHTML(skill, isPublicView = false) {

    const statusClass = skill.status.toLowerCase();
    const statusDisplay = skill.status_display || skill.status;

    const sourcesHTML = skill.acquired_at_sources && skill.acquired_at_sources.length > 0
        ? `<div class="skill-sources">
             Acquired at: ${skill.acquired_at_sources.map(source =>
                 `<span class="source-item">${source.title} (${source.type})</span>`
             ).join('')}
           </div>`
        : '';

    const actionsHTML = !isPublicView ? `
        <div class="item-actions">
            <div class="item-action-buttons">
                <button class="edit-item-btn" title="Edit Skill"><i class="fas fa-pencil-alt"></i></button>
                <button class="remove-item-btn" title="Remove Skill"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="privacy-control">
                <label class="privacy-toggle">
                    <input type="checkbox" class="privacy-checkbox" data-id="${skill.id}" data-type="skill" ${skill.is_public ? 'checked' : ''}>
                    <span class="privacy-slider"></span>
                </label>
                <span class="privacy-label">${skill.is_public ? 'Public' : 'Private'}</span>
            </div>
        </div>` : '';

    return `
        <div class="profile-item skill-item" data-id="${skill.id}" data-type="skill">
            <div class="item-details">
                <h4>${skill.title}</h4>
                <p>${skill.type}</p>
                <span class="skill-status ${statusClass}">${statusDisplay}</span>
                ${sourcesHTML}
            </div>
            ${actionsHTML}
        </div>`;
}


// This function generates the HTML for a single experience item.
// It formats details like date range, location, responsibilities, and achievements, and includes action buttons.
// It is a helper function for the Profile section.
// It returns an HTML string for an experience item.
export function createExperienceHTML(exp, isPublicView = false) {
    const dateRange = exp.is_present ? `${exp.start_date} - Present` : `${exp.start_date} - ${exp.end_date || 'N/A'}`;
    const location = [exp.city, exp.country].filter(Boolean).join(', ');

    const responsibilitiesHTML = exp.responsibilities ? `
        <div class="experience-details-section">
            <h5>Responsibilities</h5>
            <p>${exp.responsibilities.replace(/\n/g, '<br>')}</p>
        </div>
    ` : '';

    const achievementsHTML = exp.achievements ? `
        <div class="experience-details-section">
            <h5>Achievements</h5>
            <p>${exp.achievements.replace(/\n/g, '<br>')}</p>
        </div>
    ` : '';

    const actionsHTML = !isPublicView ? `
        <div class="item-actions">
            <div class="item-action-buttons">
                <button class="edit-item-btn" title="Edit Experience"><i class="fas fa-pencil-alt"></i></button>
                <button class="remove-item-btn" title="Remove Experience"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="privacy-control">
                <label class="privacy-toggle">
                    <input type="checkbox" class="privacy-checkbox" data-id="${exp.id}" data-type="experience" ${exp.is_public ? 'checked' : ''}>
                    <span class="privacy-slider"></span>
                </label>
                <span class="privacy-label">${exp.is_public ? 'Public' : 'Private'}</span>
            </div>
        </div>` : '';

    return `
        <div class="profile-item experience-item" data-id="${exp.id}" data-type="experience">
            <div class="item-details">
                <h4>${exp.position_title}</h4>
                <p>${exp.employer}</p>
                <p class="item-meta">${location}</p>
                <p class="item-meta">${dateRange}</p>
                <p class="item-meta">${exp.employment_type} &middot; ${exp.employment_arrangement}</p>
                ${responsibilitiesHTML}${achievementsHTML}
            </div>
            ${actionsHTML}
        </div>`;
}


// This function generates the HTML for a single certificate item.
// It formats details like issuer, dates, and credential link, and includes action buttons.
// It is a helper function for the Profile section.
// It returns an HTML string for a certificate item.
export function createCertificateHTML(cert, isPublicView = false) {
    const dates = cert.expiry_date ? `${cert.issue_date} - ${cert.expiry_date}` : `Issued ${cert.issue_date}`;
    const credentialLink = cert.credential_url ? `<a href="${cert.credential_url}" target="_blank">View Credential</a>` : '';
    const actionsHTML = !isPublicView ? `
        <div class="item-actions">
            <div class="item-action-buttons">
                <button class="edit-item-btn" title="Edit Certificate"><i class="fas fa-pencil-alt"></i></button>
                <button class="remove-item-btn" title="Remove Certificate"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="privacy-control">
                <label class="privacy-toggle">
                    <input type="checkbox" class="privacy-checkbox" data-id="${cert.id}" data-type="certificate" ${cert.is_public ? 'checked' : ''}>
                    <span class="privacy-slider"></span>
                </label>
                <span class="privacy-label">${cert.is_public ? 'Public' : 'Private'}</span>
            </div>
        </div>` : '';

    return `
        <div class="profile-item certificate-item" data-id="${cert.id}" data-type="certificate">
            <div class="item-details">
                <h4>${cert.title}</h4>
                <p>${cert.issuer}</p>
                <p class="item-meta">${dates}</p>
                <p class="item-meta">ID: ${cert.credential_id || 'N/A'} ${credentialLink ? `&middot; ${credentialLink}` : ''}</p>
            </div>
            ${actionsHTML}
        </div>`;
}


// This function generates the HTML for a single degree item.
// It formats details like school, location, and dates, and includes action buttons.
// It is a helper function for the Profile section.
// It returns an HTML string for a degree item.
export function createDegreeHTML(degree, isPublicView = false) {
    const location = [degree.city, degree.country].filter(Boolean).join(', ');
    const actionsHTML = !isPublicView ? `
        <div class="item-actions">
            <div class="item-action-buttons">
                <button class="edit-item-btn" title="Edit Degree"><i class="fas fa-pencil-alt"></i></button>
                <button class="remove-item-btn" title="Remove Degree"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="privacy-control">
                <label class="privacy-toggle">
                    <input type="checkbox" class="privacy-checkbox" data-id="${degree.id}" data-type="degree" ${degree.is_public ? 'checked' : ''}>
                    <span class="privacy-slider"></span>
                </label>
                <span class="privacy-label">${degree.is_public ? 'Public' : 'Private'}</span>
            </div>
        </div>` : '';

    return `
        <div class="profile-item degree-item" data-id="${degree.id}" data-type="degree">
            <div class="item-details">
                <h4>${degree.degree} in ${degree.field_of_study}</h4>
                <p>${degree.school}</p>
                <p class="item-meta">${location}</p>
                <p class="item-meta">${degree.start_date} - ${degree.end_date}</p>
                <p class="item-meta">GPA: ${degree.gpa || 'N/A'}</p>
            </div>
            ${actionsHTML}
        </div>`;
}


// This function opens a modal for editing an existing profile item (skill, experience, etc.).
// It fetches the item's data from the API and pre-populates the form fields in the corresponding modal.
// It is part of the profile management feature.
// It does not return anything but displays and populates the edit modal.
export async function openModalForEdit(id, type) {
    try {
        const response = await fetch(`/api/${type}s/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const itemData = await response.json();

        const modal = dom.modals[type];
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

        const privacyToggle = form.querySelector('[name="is_public"]');
        const privacyLabel = form.querySelector('.privacy-label');
        if (privacyToggle && privacyLabel) {
            privacyLabel.textContent = privacyToggle.checked ? 'Public' : 'Private';
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
