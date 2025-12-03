import { dom, state} from './state.js';


// This function provides generic setup for all modals.
// It handles form submission (for both creating and updating items), closing the modal, and resetting the form.
// It is a core utility for all CRUD operations via modals.
// Instead of writing separate event listeners for the "Add Skill", "Add Experience", and "Add Education" forms,
// this single function attaches the necessary logic to any given modal.
// It takes a modal element and a success callback function, and does not return anything.
/**
 * Generic setup handler for modal forms.
 * Handles: Closing logic, Privacy Toggles, Data Formatting, and API Submission.
 *
 * @param {HTMLElement} modal - The modal DOM element to attach listeners to.
 * @param {Function} onSuccessfulSubmit - Callback function to run after a successful API response (usually to reload the grid).
 */
export function setupGenericForm(modal, onSuccessfulSubmit) {
    // Basic validation to ensure the modal and its form exist before proceeding
    if (!modal) return;
    const form = modal.querySelector('.modal-form');
    if (!form) return;

    // --- 1. Helper: Close Modal & Reset State ---
    const closeModal = () => {
        // Hide the modal visually
        modal.classList.remove('visible');
        // Wait 300ms for the CSS fade-out transition to finish before resetting data
        setTimeout(() => {
            form.reset();
            // Specific cleanup: Clear the hidden ID field to ensure the next open is a "Create" action, not "Update"
            if (form.querySelector('input[name="id"]')) {
                form.querySelector('input[name="id"]').value = '';
            }

            // Specific cleanup: Re-enable end-date input in case it was disabled by "I currently work here" checkbox
            if (form.id === 'experience-form') {
                form.querySelector('#end-date').disabled = false;
            }
        }, 300);
    };

    // --- 2. UI Logic: Privacy Toggle Label ---
    // Updates the text label next to the toggle switch (Public vs Private)
    const privacyToggle = form.querySelector('[name="is_public"]');
    if (privacyToggle) {
        privacyToggle.addEventListener('change', () => {
            const privacyLabel = form.querySelector('.privacy-label');
            if (privacyLabel) {
                privacyLabel.textContent = privacyToggle.checked ? 'Public' : 'Private';
            }
        });
    }

    // --- 3. UI Logic: Closing the Modal ---
    // Closes if user clicks the backdrop (overlay) or specific close/cancel buttons
    modal.addEventListener('click', e => {
        if (e.target === modal || e.target.matches('.modal-close-btn, .modal-cancel-btn')) {
            closeModal();
        }
    });

    // --- 4. Form Submission Handler ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevent standard browser page reload

        // Create a FormData object to extract inputs
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        // Convert 'is_public' checkbox presence to a true/false boolean
        data.is_public = formData.has('is_public');

        // --- Special Case: Skill Form ---
        // Skills have a complex relationship structure (acquired_at_sources) that needs manual formatting
        if (this.id === 'skill-form') {
            const checkedSources = Array.from(this.querySelectorAll('#acquired-at-sources input[type="checkbox"]:checked'));

            // Validation: User must select at least one source
            if (checkedSources.length === 0) {
                alert('Please select at least one source where you acquired this skill.');
                return; // Stop submission only for the skill form
            }

            // Map DOM elements to the JSON structure expected by the backend
            data.acquired_at_sources = checkedSources.map(cb => ({
                id: parseInt(cb.value),
                type: cb.dataset.type
            }));
        }
        // --- Special Case: Experience Form ---
        // Explicitly handle the 'is_present' checkbox boolean conversion
        else if (this.id === 'experience-form') {
            data.is_present = formData.has('is_present');
        }

        // Redundant check for 'is_present', but ensures data integrity
        if (this.id === 'experience-form') data.is_present = formData.has('is_present');

        // --- Special Case: Account Settings ---
        // Remove email because it cannot be changed via this form
        if (this.id === 'account-settings-form') delete data.email;

        // --- Special Case: Test/Exam Form ---
        // Complex parsing of dynamic question DOM elements into a nested JSON array
        if (this.id === 'test-form') {
            data.title = this.querySelector('#test-title').value;
            data.test_type = this.querySelector('[name="test_type"]:checked').value;
            data.questions = [];

            // Iterate over every question added to the DOM
            this.querySelectorAll('.question-item').forEach(item => {
                let questionData = {
                    question_text: item.querySelector('[name="question_text"]').value
                };

                if (item.querySelector('.mc-options-list')) {
                    // Logic for Multiple Choice Questions
                    questionData.question_type = 'multiple-choice';
                    // Extract option values and filter out empty inputs
                    questionData.answers = Array.from(item.querySelectorAll('[name="mc_option"]'))
                                         .map(input => input.value)
                                         .filter(Boolean);
                } else {
                    // Logic for Descriptive Questions
                    questionData.question_type = 'descriptive';
                    const charLimit = item.querySelector('[name="char_limit"]').value;
                    questionData.char_limit = parseInt(charLimit) || 500;
                }
                data.questions.push(questionData);
            });
        }

        // --- 5. API Endpoint Construction ---
        let url, method;

        if (this.id === 'account-settings-form') {
            url = '/api/account';
            method = 'PUT';
        } else {
            // Dynamic URL generation based on modal ID convention (e.g., 'skill-modal' -> 'skill')
            const modalType = modal.id.split('-')[0];
            const id = data.id;

            // If an ID exists, it's an Update (PUT), otherwise it's a Create (POST)
            const isEdit = id && id !== '';
            method = isEdit ? 'PUT' : 'POST';
            url = isEdit ? `/api/${modalType}s/${id}` : `/api/${modalType}s`; // 'tests' will work here
        }

        // --- 6. API Call ---
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

            // On success: close modal and run the callback (usually to refresh the list)
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


// This function dynamically adds a new text input field to a list, used for things like multiple-choice answers.
// It is a utility function for dynamic forms.
// It does not return anything but appends a new input item to the specified list element.
function addDynamicInput(type, listId, value = '') {
    const listElement = document.getElementById(listId);
    if (!listElement) return;

    const newItem = document.createElement('div');
    newItem.className = 'dynamic-input-item';
    newItem.innerHTML = `
        <input type="text" name="${type}s" placeholder="Enter a ${type}" value="${value}">
        <button type="button" class="btn-remove-dynamic">&times;</button>
    `;
    listElement.appendChild(newItem);
    newItem.querySelector('input').focus();
}


// --- Data Fetching & Display ---
// This is a generic function to fetch an array of items (like skills, experiences) from a given API endpoint.
// It then uses a provided `createHTML` function to render the items into a specified list element on the page.
// It is a reusable utility for populating profile sections.
// It does not return anything but updates the specified list element's innerHTML.
export async function fetchAndDisplay(type, listId, createHTML) {
    try {
        const response = await fetch(`/api/${type}s`);
        if (!response.ok) throw new Error(`Failed to load ${type}s.`);
        const items = await response.json();
        const listElement = document.getElementById(listId);
        if (listElement) {
            listElement.innerHTML = items.length > 0 ? items.map(item => createHTML(item, false)).join('') : `<p class="empty-list-msg">No ${type}s added yet.</p>`;
        }
    } catch (error) {
        console.error(error);
    }
}

