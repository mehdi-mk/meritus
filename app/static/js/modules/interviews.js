import { dom } from './state.js';

function createTestCardHTML(test) {
    return `
        <div class="job-item" data-test-id="${test.id}">
            <div class="job-header">
                <h4>${test.title}</h4>
                <span class="job-status status-draft">${test.test_type}</span>
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
        modal.querySelector('#questions-list').innerHTML = ''; // Clear old questions

        // Populate form
        modal.querySelector('h2').textContent = 'Edit Test';
        form.querySelector('input[name="id"]').value = test.id;
        form.querySelector('input[name="title"]').value = test.title;
        form.querySelector(`input[name="test_type"][value="${test.test_type}"]`).checked = true;

        // Trigger change to show correct fields
        form.querySelector(`input[name="test_type"][value="${test.test_type}"]`).dispatchEvent(new Event('change', { bubbles: true }));

        // Add questions
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


// This function adds a new question block (either multiple-choice or descriptive) to the test creation form.
// It can optionally pre-populate the block with existing question data for editing.
// It is a helper function for the Test/Questionnaire creation feature.
// It does not return anything but appends HTML to the questions list in the test modal.
function addQuestionToForm(type, data = {}) {
    const questionsList = document.getElementById('questions-list');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';

    if (type === 'multiple-choice') {
        const answersHTML = (data.answers || [{answer_text: ''}]).map(ans => `
            <div class="mc-option-item">
                <input type="text" name="mc_option" placeholder="Answer option" required value="${ans.answer_text || ''}">
                <button type="button" class="btn-remove-dynamic remove-option-btn">&times;</button>
            </div>
        `).join('');
        questionItem.innerHTML = `
            <div class="question-header">
                <label>Multiple-Choice Question</label>
                <button type="button" class="btn-remove-dynamic remove-question-btn">&times;</button>
            </div>
            <input type="text" name="question_text" placeholder="Enter your question" required value="${data.question_text || ''}">
            <div class="mc-options-list">${answersHTML}</div>
            <button type="button" class="btn-add-dynamic add-mc-option-btn" style="margin-top: 0.5rem;">+</button>
        `;
    } else if (type === 'descriptive') {
        questionItem.innerHTML = `
            <div class="question-header">
                <label>Descriptive Question</label>
                <button type="button" class="btn-remove-dynamic remove-question-btn">&times;</button>
            </div>
            <input type="text" name="question_text" placeholder="Enter your question" required value="${data.question_text || ''}">
            <div class="form-group" style="margin-top: 0.5rem;">
                <label style="font-size: 0.85rem;">Character Limit for Answer</label>
                <input type="number" name="char_limit" placeholder="e.g., 500" min="1" value="${data.char_limit || 500}">
            </div>
        `;
    }
    questionsList.appendChild(questionItem);
}

// This function adds a new input field for a multiple-choice answer option within the test creation form.
// It is a helper function for the Test/Questionnaire creation feature.
// It does not return anything but appends an input item to the provided options list element.
function addMultipleChoiceOption(optionsList) {
    const optionItem = document.createElement('div');
    optionItem.className = 'mc-option-item';
    optionItem.innerHTML = `
        <input type="text" name="mc_option" placeholder="Answer option" required>
        <button type="button" class="btn-remove-dynamic remove-option-btn">&times;</button>
    `;
    optionsList.appendChild(optionItem);
}
