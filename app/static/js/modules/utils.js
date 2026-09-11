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

    // IMPORTANT: forms contain <input name="id">, which shadows the form's id attribute
    // via the named-property getter. Always read the real id with getAttribute.
    const formId = () => form.getAttribute('id');

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
            if (formId() === 'experience-form') {
                form.querySelector('#end-date').disabled = false;
            }
            // Clear dynamically added question blocks when closing the test modal
            if (formId() === 'test-form') {
                const questionsList = form.querySelector('#questions-list');
                if (questionsList) questionsList.innerHTML = '';
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

        const currentFormId = this.getAttribute('id');

        // --- Special Case: Skill Form ---
        // Skills have a complex relationship structure (acquired_at_sources) that needs manual formatting
        if (currentFormId === 'skill-form') {
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
        else if (currentFormId === 'experience-form') {
            data.is_present = formData.has('is_present');
        }

        // Redundant check for 'is_present', but ensures data integrity
        if (currentFormId === 'experience-form') data.is_present = formData.has('is_present');

        // --- Special Case: Account Settings ---
        // Remove email because it cannot be changed via this form
        if (currentFormId === 'account-settings-form') delete data.email;

        // --- Special Case: Test/Exam Form ---
        // Complex parsing of dynamic question DOM elements into a nested JSON array
        if (currentFormId === 'test-form') {
            data.title = this.querySelector('#test-title').value;
            data.test_type = this.querySelector('[name="test_type"]:checked').value;
            data.questions = [];

            // Clean up garbage keys from the flat formData extraction
            delete data.question_text;
            delete data.answer_text;
            delete data.mc_option;
            delete data.q_type;
            delete data.char_limit;
            // Also clean up correct answer radio group garbage if any exist in the flat data
            Object.keys(data).forEach(key => {
                if (key.startsWith('correct_answer_')) delete data[key];
            });

            let isValid = true;

            // Iterate over every question added to the DOM
            const questionItems = this.querySelectorAll('.question-item');
            questionItems.forEach(item => {
                // Clear previous errors
                item.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');

                const qText = item.querySelector('[name="question_text"]').value.trim();
                const qType = item.querySelector('[name="q_type"]').value; // 'M' or 'D'

                let questionData = {
                    question_text: qText,
                    question_type: qType
                };

                // 1. Validate Question Text
                if (!qText) {
                    item.querySelector('.question-input-group .error-text').style.display = 'block';
                    isValid = false;
                }

                if (qType === 'M') {
                    // Logic for Multiple Choice
                    const optionItems = Array.from(item.querySelectorAll('.mc-option-item'));
                    questionData.answers = optionItems.map(opt => {
                        const textInput = opt.querySelector('input[name="mc_option"]');
                        const radioInput = opt.querySelector('input[type="radio"]');
                        return {
                            answer_text: textInput ? textInput.value.trim() : '',
                            is_correct: radioInput ? radioInput.checked : false
                        };
                    }).filter(ans => ans.answer_text !== '');

                    // 2. Validate Options count
                    if (questionData.answers.length < 2) {
                        item.querySelector('.options-error').style.display = 'block';
                        isValid = false;
                    }

                    // 3. Validate Correct Answer Selection
                    const hasCorrectAnswer = questionData.answers.some(ans => ans.is_correct);
                    if (!hasCorrectAnswer && questionData.answers.length >= 2) {
                        const caError = item.querySelector('.correct-answer-error');
                        if (caError) caError.style.display = 'block';
                        isValid = false;
                    } else {
                         const caError = item.querySelector('.correct-answer-error');
                         if (caError) caError.style.display = 'none';
                    }
                } else {
                    // Logic for Descriptive
                    const answerInput = item.querySelector('[name="answer_text"]');
                    const answerText = answerInput ? answerInput.value.trim() : '';
                    const charLimitInput = item.querySelector('[name="char_limit"]');
                    const charLimit = charLimitInput ? charLimitInput.value : 1000;

                    questionData.answer = answerText;
                    questionData.char_limit = parseInt(charLimit) || 1000;

                    // 3. Validate Answer Text
                    if (!answerText) {
                        // Find the error span next to the textarea
                        item.querySelector('textarea + .error-text').style.display = 'block';
                        isValid = false;
                    }
                }
                console.log(questionData)
                data.questions.push(questionData);
            });

            if (!isValid) {
                alert("Please fix the errors in the question form.");
                return; // Stop submission
            }

            if (data.questions.length === 0) {
                alert("Add at least one question before saving.");
                return;
            }
        }

        // --- 5. API Endpoint Construction ---
        let url, method;

        if (currentFormId === 'account-settings-form') {
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
            console.error(`Form submission error for ${currentFormId}:`, error);
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

