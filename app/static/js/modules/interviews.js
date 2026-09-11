import { dom } from './state.js';

function createTestCardHTML(test) {
    const typeMap = { 'Q': 'Questionnaire', 'T': 'Exam' };
    const displayType = typeMap[test.test_type] || test.test_type;
    const submissionCount = test.submission_count || 0;

    return `
        <div class="job-item" data-test-id="${test.id}">
            <div class="job-header">
                <h4>${test.title}</h4>
                <span class="job-status status-draft">${displayType}</span>
            </div>
            <div class="job-details">
                <p class="job-meta">Created: ${test.created_at || '—'}</p>
                <p><strong>${test.question_count}</strong> question(s)</p>
                <p><strong>${submissionCount}</strong> submission(s)</p>
            </div>
            <div class="job-actions">
                <button class="btn btn-secondary view-submissions-btn" data-test-id="${test.id}">Submissions</button>
                <button class="btn btn-secondary edit-test-btn" data-test-id="${test.id}">Edit</button>
                <button class="btn btn-danger delete-test-btn" data-test-id="${test.id}">Delete</button>
            </div>
        </div>
    `;
}


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


export async function openTestForEditing(testId) {
    try {
        const response = await fetch(`/api/tests/${testId}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to load test data.');
        }
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


export async function deleteTest(testId) {
    try {
        const response = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete test.');
        }
        loadTests();
    } catch (error) {
        alert(error.message);
    }
}


export function addQuestionToForm(type, data = {}) {
    const questionsList = document.getElementById('questions-list');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';

    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    questionItem.dataset.uniqueId = uniqueId;

    const isMulti = type === 'multiple-choice' || type === 'M';
    const displayType = isMulti ? 'Multiple-Choice Question' : 'Descriptive Question';
    const escapedText = (data.question_text || '').replace(/"/g, '&quot;');

    const headerHTML = `
        <div class="question-header">
            <label>${displayType}</label>
            <button type="button" class="remove-question-btn">&times;</button>
        </div>
        <div class="question-input-group">
            <label>Question *</label>
            <input type="text" name="question_text" placeholder="Enter your question" required value="${escapedText}">
            <span class="error-text">Question text cannot be empty.</span>
        </div>
    `;

    if (isMulti) {
        let answers = data.answers || data.options || [
            { answer_text: '', is_correct: false },
            { answer_text: '', is_correct: false }
        ];
        if (answers.length === 0) {
            answers = [
                { answer_text: '', is_correct: false },
                { answer_text: '', is_correct: false }
            ];
        }

        const answersHTML = answers.map((ans) => {
            const text = (ans.answer_text || ans.option_text || '').replace(/"/g, '&quot;');
            return `
            <div class="mc-option-item">
                <div class="radio-wrapper" title="Mark as correct answer">
                    <input type="radio" name="correct_answer_${uniqueId}" ${ans.is_correct ? 'checked' : ''}>
                </div>
                <input type="text" name="mc_option" placeholder="Option *" required value="${text}">
                <button type="button" class="remove-option-btn">&times;</button>
            </div>`;
        }).join('');

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
        const expected = data.expected_answer || data.answer || '';
        questionItem.innerHTML = `
            ${headerHTML}
            <div class="question-input-group">
                <label>Expected Answer *</label>
                <textarea name="answer_text" rows="3" placeholder="Enter the expected answer for evaluation..." required>${expected}</textarea>
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


export function setupTestFormListeners() {
    const modal = dom.modals.test;
    if (!modal) return;

    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-question-btn')) {
            const type = e.target.dataset.questionType;
            addQuestionToForm(type);
        }

        if (e.target.classList.contains('remove-question-btn')) {
            e.target.closest('.question-item').remove();
        }

        if (e.target.classList.contains('add-mc-option-btn')) {
            const list = e.target.parentElement.querySelector('.mc-options-list');
            addMultipleChoiceOption(list);
        }

        const removeOptionBtn = e.target.closest('.remove-option-btn');
        if (removeOptionBtn) {
            const optionItem = removeOptionBtn.closest('.mc-option-item');
            optionItem.remove();
        }
    });
}


export async function openTestSubmissions(testId) {
    try {
        const response = await fetch(`/api/tests/${testId}/submissions`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to load submissions.');
        }
        const data = await response.json();

        const existing = document.getElementById('submissions-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay visible';
        modal.id = 'submissions-modal';

        const rows = (data.submissions || []).map(s => `
            <div class="submission-list-item">
                <div>
                    <strong>${s.submitter_name}</strong>
                    <div class="job-meta">${s.submitter_email}</div>
                    <div class="job-meta">${s.job_title || 'Job'} • ${s.submitted_at || ''}</div>
                </div>
                <button class="btn btn-secondary view-submission-detail-btn" data-submission-id="${s.id}">View Answers</button>
            </div>
        `).join('') || '<p class="empty-list-msg">No submissions yet.</p>';

        modal.innerHTML = `
            <div class="modal-content large-modal">
                <button class="modal-close-btn">&times;</button>
                <h2>Submissions — ${data.test.title}</h2>
                <div id="submissions-list" class="submissions-list">${rows}</div>
                <div id="submission-detail" class="submission-detail" style="display:none;"></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary modal-cancel-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('.modal-close-btn').addEventListener('click', close);
        modal.querySelector('.modal-cancel-btn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelectorAll('.view-submission-detail-btn').forEach(btn => {
            btn.addEventListener('click', () => openSubmissionDetail(btn.dataset.submissionId, modal));
        });
    } catch (error) {
        alert(error.message);
    }
}


async function openSubmissionDetail(submissionId, parentModal) {
    try {
        const response = await fetch(`/api/submissions/${submissionId}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to load submission.');
        }
        const detail = await response.json();
        const container = parentModal.querySelector('#submission-detail');
        const list = parentModal.querySelector('#submissions-list');

        const questionsHTML = (detail.questions || []).map((q, index) => {
            if (q.question_type === 'M') {
                const optionsHTML = (q.options || []).map(opt => {
                    const selected = opt.id === q.selected_option_id;
                    const correct = opt.is_correct;
                    let classes = 'review-option';
                    if (selected) classes += ' selected';
                    if (correct) classes += ' correct-key';
                    return `<div class="${classes}">${opt.option_text || opt.answer_text}${selected ? ' ← candidate' : ''}${correct ? ' ✓ key' : ''}</div>`;
                }).join('');
                return `
                    <div class="review-question">
                        <h4>Q${index + 1}. ${q.question_text}</h4>
                        <p class="job-meta">Multiple choice</p>
                        ${optionsHTML}
                    </div>`;
            }
            return `
                <div class="review-question">
                    <h4>Q${index + 1}. ${q.question_text}</h4>
                    <p class="job-meta">Descriptive</p>
                    <div class="review-response"><strong>Candidate:</strong><br>${q.text_response || '<em>No answer</em>'}</div>
                    <div class="review-expected"><strong>Expected:</strong><br>${q.expected_answer || '<em>None provided</em>'}</div>
                </div>`;
        }).join('');

        container.style.display = 'block';
        list.style.display = 'none';
        container.innerHTML = `
            <button type="button" class="btn btn-secondary" id="back-to-submissions">← Back to list</button>
            <h3>${detail.submitter_name}</h3>
            <p class="job-meta">${detail.job_title} • ${detail.submitted_at || ''}</p>
            ${questionsHTML}
        `;
        container.querySelector('#back-to-submissions').addEventListener('click', () => {
            container.style.display = 'none';
            container.innerHTML = '';
            list.style.display = 'block';
        });
    } catch (error) {
        alert(error.message);
    }
}


export async function openTakeInterviewModal(jobId) {
    try {
        const response = await fetch(`/api/jobs/${jobId}/interview`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to load interview.');
        }
        const data = await response.json();

        const existing = document.getElementById('take-interview-modal');
        if (existing) existing.remove();

        if (data.already_submitted) {
            alert('You have already submitted this interview.');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay visible';
        modal.id = 'take-interview-modal';

        const questionsHTML = (data.test.questions || []).map((q, index) => {
            if (q.question_type === 'M') {
                const options = (q.options || []).map(opt => `
                    <label class="take-option">
                        <input type="radio" name="question_${q.id}" value="${opt.id}" required>
                        <span>${opt.option_text}</span>
                    </label>
                `).join('');
                return `
                    <div class="take-question" data-question-id="${q.id}" data-question-type="M">
                        <h4>Q${index + 1}. ${q.question_text}</h4>
                        <div class="take-options">${options}</div>
                    </div>`;
            }
            const limit = q.char_limit || 1000;
            return `
                <div class="take-question" data-question-id="${q.id}" data-question-type="D" data-char-limit="${limit}">
                    <h4>Q${index + 1}. ${q.question_text}</h4>
                    <textarea name="question_${q.id}" rows="4" maxlength="${limit}" required placeholder="Your answer..."></textarea>
                    <div class="char-counter"><span class="chars-used">0</span> / ${limit}</div>
                </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content large-modal">
                <button class="modal-close-btn">&times;</button>
                <h2>Interview: ${data.test.title}</h2>
                <p class="job-meta">For job: ${data.job_title}</p>
                <form id="take-interview-form" class="modal-form">
                    ${questionsHTML || '<p class="empty-list-msg">This questionnaire has no questions.</p>'}
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Submit Interview</button>
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('.modal-close-btn').addEventListener('click', close);
        modal.querySelector('.modal-cancel-btn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelectorAll('textarea[name^="question_"]').forEach(textarea => {
            const counter = textarea.closest('.take-question').querySelector('.chars-used');
            textarea.addEventListener('input', () => {
                if (counter) counter.textContent = textarea.value.length;
            });
        });

        modal.querySelector('#take-interview-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const answers = [];
            let valid = true;

            modal.querySelectorAll('.take-question').forEach(block => {
                const questionId = parseInt(block.dataset.questionId);
                const type = block.dataset.questionType;
                if (type === 'M') {
                    const selected = block.querySelector('input[type="radio"]:checked');
                    if (!selected) {
                        valid = false;
                        return;
                    }
                    answers.push({
                        question_id: questionId,
                        selected_option_id: parseInt(selected.value)
                    });
                } else {
                    const text = (block.querySelector('textarea').value || '').trim();
                    if (!text) {
                        valid = false;
                        return;
                    }
                    answers.push({
                        question_id: questionId,
                        text_response: text
                    });
                }
            });

            if (!valid) {
                alert('Please answer every question before submitting.');
                return;
            }

            try {
                const submitRes = await fetch(`/api/jobs/${jobId}/interview/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answers })
                });
                if (!submitRes.ok) {
                    const err = await submitRes.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to submit interview.');
                }
                alert('Interview submitted successfully.');
                close();
                const { loadAvailableJobs } = await import('./jobSeeker.js');
                loadAvailableJobs();
            } catch (err) {
                alert(err.message);
            }
        });
    } catch (error) {
        alert(error.message);
    }
}
