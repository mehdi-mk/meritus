import { dom } from './state.js';
import {
    loadJobSeekerContent, loadAvailableJobs, loadUserApplications
} from './jobSeeker.js';
import {
    loadEmployerJobs, loadAllApplications, populateJobFilterDropdown,
    loadAllApplicants, loadArchivedApplications, openJobPostingModal
} from './employer.js';
import { loadTests } from './interviews.js';


// This function generates the HTML structure for the "Job" section, which contains two main tabs: "Get Hired" (for job seekers) and "Hire" (for employers).
// It sets up the event listeners for switching between these tabs and their sub-tabs, and triggers the initial content load.
// It is the main function for the Job section of the application.
// It does not return anything but updates the dom.contentArea's innerHTML and sets up numerous event listeners.
export function loadJobContent() {
    dom.contentArea.innerHTML = `
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
                        <div id="eligibility-switch" class="eligibility-switch-container">
                            <button class="eligibility-switch-option active" data-value="all">See All Jobs</button>
                            <button class="eligibility-switch-option" data-value="eligible">See Eligible Jobs Only</button>
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
            <div class="hire-section">
                <div class="hire-actions">
                    <button class="btn btn-primary" id="post-job-btn">Post New Job</button>
                </div>

                <!-- Add hire tabs -->
                <div class="hire-tabs">
                    <button class="hire-tab-button active" data-hire-tab="postings">Job Postings</button>
                    <button class="hire-tab-button" data-hire-tab="applications">All Applications</button>
                    <button class="hire-tab-button" data-hire-tab="applicants">All Applicants</button>
                    <button class="hire-tab-button" data-hire-tab="archived">Archived Applications</button>
                    <button class="hire-tab-button" data-hire-tab="interviews">Interviews</button>
                </div>

                <div id="job-postings" class="hire-tab-pane active">
                    <div id="employer-jobs-list">
                        <p class="loading">Loading your job postings...</p>
                    </div>
                </div>

                <div id="all-applications" class="hire-tab-pane">
                    <div id="applications-filter-container"></div>
                    <div id="employer-applications-filter-status"></div>
                    <div id="employer-applications-list">
                        <p class="loading">Loading applications...</p>
                    </div>
                </div>

                <div id="all-applicants" class="hire-tab-pane">
                    <div id="employer-applicants-list">
                        <p class="loading">Loading applicants...</p>
                    </div>
                </div>

                <div id="all-archived" class="hire-tab-pane">
                    <h3>Archived Applications</h3>
                    <div id="employer-archived-applications-list">
                        <p class="loading">Loading archived applications...</p>
                    </div>
                </div>

                <div id="interviews-pane" class="hire-tab-pane">
                    <div class="hire-actions">
                        <button class="btn btn-primary" id="create-test-btn">Create a Test</button>
                    </div>
                    <div id="tests-list">
                        <p class="empty-list-msg">No questionnaires or exams created yet.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Set up main tab switching (Get Hired / Hire)
    dom.contentArea.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            if (button.classList.contains('active')) return;
            const tabName = button.dataset.tab;
            dom.contentArea.querySelector('.tab-button.active').classList.remove('active');
            button.classList.add('active');
            dom.contentArea.querySelector('.tab-pane.active').classList.remove('active');
            const targetTab = dom.contentArea.querySelector(`#${tabName}`);
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
    dom.contentArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('hire-tab-button')) {
            if (e.target.classList.contains('active')) return;

            const tabName = e.target.dataset.hireTab; // e.g., 'postings', 'applications', 'applicants'

            // Deactivate old tab and pane
            dom.contentArea.querySelector('.hire-tab-button.active').classList.remove('active');
            const activePane = dom.contentArea.querySelector('.hire-tab-pane.active');
            if(activePane) activePane.classList.remove('active');

            // Activate new tab
            e.target.classList.add('active');

            // Determine and activate new pane
            const paneIdMap = {
                'postings': 'job-postings',
                'applications': 'all-applications',
                'applicants': 'all-applicants',
                'archived': 'all-archived',
                'interviews': 'interviews-pane'
            };
            const targetPaneId = paneIdMap[tabName];
            if (targetPaneId) {
                const targetTab = dom.contentArea.querySelector(`#${targetPaneId}`);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            }

            // Load appropriate content
            if (tabName === 'postings') {
                loadEmployerJobs();
            } else if (tabName === 'applications') {
                loadAllApplications();
                populateJobFilterDropdown();
            } else if (tabName === 'applicants') {
                loadAllApplicants();
            } else if (tabName === 'archived') {
                loadArchivedApplications();
            } else if (tabName === 'interviews') {
                loadTests();
            }
        }
    });

    // Set up job seeker sub-tabs
    dom.contentArea.querySelectorAll('.job-tab-button').forEach(button => {
        button.addEventListener('click', () => {
            if (button.classList.contains('active')) return;
            const tabName = button.dataset.jobTab;
            dom.contentArea.querySelector('.job-tab-button.active').classList.remove('active');
            button.classList.add('active');
            dom.contentArea.querySelector('.job-tab-pane.active').classList.remove('active');
            const targetTab = dom.contentArea.querySelector(`#${tabName === 'browse' ? 'browse-jobs' : 'my-applications'}`);
            targetTab.classList.add('active');

            // Load appropriate content
            if (tabName === 'browse') {
                loadAvailableJobs();
            } else if (tabName === 'applications') {
                loadUserApplications();
            }
        });
    });


    // Set up filters
    const searchBtn = dom.contentArea.querySelector('#search-jobs-btn');
    const clearBtn = dom.contentArea.querySelector('#clear-filters-btn');

    if (searchBtn) {
        searchBtn.addEventListener('click', loadAvailableJobs);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            dom.contentArea.querySelector('#job-search').value = '';
            dom.contentArea.querySelector('#location-filter').value = '';
            dom.contentArea.querySelector('#type-filter').value = '';
            dom.contentArea.querySelector('#arrangement-filter').value = '';
            loadAvailableJobs();
        });
    }

    // Set up post job button
    const postJobBtn = dom.contentArea.querySelector('#post-job-btn');
    if (postJobBtn) {
        postJobBtn.addEventListener('click', () => openJobPostingModal());
    }

    // Set up create test button
    const createTestBtn = dom.contentArea.querySelector('#create-test-btn');
    if (createTestBtn) {
        createTestBtn.addEventListener('click', () => {
            const modal = dom.modals.test;
            const form = modal.querySelector('form');
            form.reset();
            form.querySelector('input[name="id"]').value = '';
            modal.querySelector('h2').textContent = 'Create New Test';
            // Clear any existing dynamic questions from a previous edit
            modal.querySelector('#questions-list').innerHTML = '';
            // Ensure questionnaire fields are visible by default
            modal.querySelector('#questionnaire-fields').style.display = 'block';
            modal.querySelector('#exam-fields').style.display = 'none';
            modal.querySelector('#test-type-questionnaire').checked = true;

            modal.classList.add('visible');
        });
    }

    // Initial load
    loadJobSeekerContent();
}
