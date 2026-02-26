import { dom } from './state.js';

function createTestCardHTML(test) {
    const typeMap = { 'Q': 'Questionnaire', 'T': 'Exam' };
    const displayType = typeMap[test.test_type];// || test.test_type;

    return `
        <div class="job-item" data-test-id="${test.id}">
            <div class="job-header">
                <h4>${test.title}</h4>
                <span class="job-status status-draft">${displayType}</span>
            </div>
            <div class="job-details">
                <p class="job-meta">Created: ${test.created_at}</p>
                <p><strong>${test.question_count}</strong> question(s)</p>
            </div>
            <div class="job-actions">
                <button class="btn btn-secondary edit-test-btn" data-test-id="${test.id}">Edit</button>
                <button class="btn btn-danger delete-test-btn" data-test-id="${test.id}">Delete</button>
            </div>
        </div>
    `;
}


// This function fetches all tests (questionnaires/exams) created by the current user (employer).
// It displays the tests in a list on the "Hire" -> "Interviews" tab.
// It is part of the employer's hiring tools.
// It does not return anything but updates the 'tests-list' element's innerHTML.
// Load all tests (questionnaires/exams) for employer
export async function loadTests() {
    const testsList = document.getElementById('tests-list');
    if (!testsList) return;
    testsList.innerHTML = '<p class="loading">Loading tests...</p>';

    try {
        const response = await fetch('/api/tests');
        if (!response.ok) throw new Error('Failed to fetch tests');
        const tests = await response.json();

        if (tests.length === 0) {
            testsList.innerHTML = '<p class="empty-list-msg">No questionnaires or exams created yet.</p>';
        } else {
            testsList.innerHTML = tests.map(createTestCardHTML).join('');
        }
    } catch (error) {
        console.error('Error loading tests:', error);
        testsList.innerHTML = '<div class="error-msg">Could not load tests.</div>';
    }
}


// This function opens the test creation/edit modal and populates it with the data of a specific test.
// It fetches the detailed test data, including questions and answers, from the API.
// It is part of the employer's hiring tools.
// It does not return anything but displays and populates the test modal for editing.
export async function openTestForEditing(testId) {
    try {
        const response = await fetch(`/api/tests/${testId}`);
        if (!response.ok) throw new Error('Failed to load test data.');
        const test = await response.json();

        const modal = dom.modals.test;
        const form = modal.querySelector('form');
        form.reset();
        modal.querySelector('#questions-list').innerHTML = '';

        modal.querySelector('h2').textContent = 'Edit Test';
        form.querySelector('input[name="id"]').value = test.id;
        form.querySelector('input[name="title"]').value = test.title;

        const typeRadio = form.querySelector(`input[name="test_type"][value="${test.test_type}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            typeRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (test.questions && test.questions.length > 0) {
            test.questions.forEach(q => addQuestionToForm(q.question_type, q));
        }

        modal.classList.add('visible');

    } catch (error) {
        console.error('Error opening test for editing:', error);
        alert(error.message);
    }
}


// This function sends a request to the API to delete a specific test.
// After deletion, it refreshes the list of tests.
// It is part of the employer's hiring tools.
// It does not return anything.
export async function deleteTest(testId) {
    await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
    loadTests(); // Refresh the list
}


// --- Form Logic for Questions ---

// This function adds a new question block (either multiple-choice or descriptive) to the test creation form.
// It can optionally pre-populate the block with existing question data for editing.
// It is a helper function for the Test/Questionnaire creation feature.
// It does not return anything but appends HTML to the questions list in the test modal.
export function addQuestionToForm(type, data = {}) {
    const questionsList = document.getElementById('questions-list');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    
    // Generate a unique ID for the radio group of this question
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    questionItem.dataset.uniqueId = uniqueId;

    // Check if type is Multiple-Choice ('M' or legacy 'multiple-choice')
    const isMulti = type === 'multiple-choice' || type === 'M';
    const displayType = isMulti ? 'Multiple-Choice Question' : 'Descriptive Question';

    // Common Header HTML
    const headerHTML = `
        <div class="question-header">
            <label>${displayType}</label>
            <button type="button" class="remove-question-btn">&times;</button>
        </div>
        <div class="question-input-group">
            <label>Question *</label>
            <input type="text" name="question_text" placeholder="Enter your question" required value="${data.question_text || ''}">
            <span class="error-text">Question text cannot be empty.</span>
        </div>
    `;

    if (isMulti) {
        // Logic for Multiple Choice
        let answers = data.answers || [{answer_text: '', is_correct: false}, {answer_text: '', is_correct: false}];
        if (answers.length === 0) answers = [{answer_text: '', is_correct: false}, {answer_text: '', is_correct: false}];

        const answersHTML = answers.map((ans, index) => `
            <div class="mc-option-item">
                <div class="radio-wrapper" title="Mark as correct answer">
                    <input type="radio" name="correct_answer_${uniqueId}" ${ans.is_correct ? 'checked' : ''}>
                </div>
                <input type="text" name="mc_option" placeholder="Option *" required value="${ans.answer_text || ''}">
                <button type="button" class="remove-option-btn">&times;</button>
            </div>
        `).join('');

        questionItem.innerHTML = `
            ${headerHTML}
            <div class="mc-options-section">
                <label class="mc-options-label">Answer Options (Select the radio button for the correct answer)</label>
                <div class="mc-options-list" data-group-name="correct_answer_${uniqueId}">${answersHTML}</div>
                <span class="error-text options-error">At least 2 options are required.</span>
                <span class="error-text correct-answer-error" style="display:none; color: #dc3545; font-size: 0.85em; margin-top: 5px;">Please select one correct answer.</span>
                <button type="button" class="btn btn-secondary add-mc-option-btn">+ Add Option</button>
            </div>
            <input type="hidden" name="q_type" value="M">
        `;
    } else {
        // Logic for Descriptive
        questionItem.innerHTML = `
            ${headerHTML}
            <div class="question-input-group">
                <label>Correct Answer *</label>
                <textarea name="answer_text" rows="3" placeholder="Enter the expected answer for evaluation..." required>${data.answer || ''}</textarea>
                <span class="error-text">Answer text cannot be empty.</span>
            </div>
            <div class="char-limit-group">
                <label>Max Character Limit for Applicant:</label>
                <input type="number" name="char_limit" placeholder="1000" min="1" value="${data.char_limit || 1000}">
            </div>
            <input type="hidden" name="q_type" value="D">
        `;
    }
    questionsList.appendChild(questionItem);
}

// This function adds a new input field for a multiple-choice answer option within the test creation form.
// It is a helper function for the Test/Questionnaire creation feature.
// It does not return anything but appends an input item to the provided options list element.
function addMultipleChoiceOption(container) {
    const groupName = container.dataset.groupName;
    const optionDiv = document.createElement('div');
    optionDiv.className = 'mc-option-item';
    optionDiv.innerHTML = `
        <div class="radio-wrapper" title="Mark as correct answer">
            <input type="radio" name="${groupName}">
        </div>
        <input type="text" name="mc_option" placeholder="New Option *" required>
        <button type="button" class="remove-option-btn">&times;</button>
    `;
    container.appendChild(optionDiv);
}


// --- Event Listeners ---

export function setupTestFormListeners() {
    const modal = dom.modals.test;
    if (!modal) return;

    modal.addEventListener('click', (e) => {
        // 1. Add new question block
        if (e.target.classList.contains('add-question-btn')) {
            const type = e.target.dataset.questionType;
            addQuestionToForm(type);
        }

        // 2. Remove question block
        if (e.target.classList.contains('remove-question-btn')) {
            e.target.closest('.question-item').remove();
        }

        // 3. Add new option to multiple choice
        if (e.target.classList.contains('add-mc-option-btn')) {
            const list = e.target.parentElement.querySelector('.mc-options-list');
            addMultipleChoiceOption(list);
        }

        // 4. Remove option from multiple choice
        const removeOptionBtn = e.target.closest('.remove-option-btn');
        if (removeOptionBtn) {
            const optionItem = removeOptionBtn.closest('.mc-option-item');
            optionItem.remove();
        }
    });
}