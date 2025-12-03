import { dom } from './state.js';
import { createSkillHTML, createExperienceHTML, createCertificateHTML, createDegreeHTML } from './profile.js';


// --- EMPLOYER FUNCTIONS --- //
// This function fetches all job postings created by the current user (employer).
// It displays them in the "Job Postings" tab within the "Hire" section.
// It is part of the employer's job management feature.
// It does not return anything but updates the 'employer-jobs-list' element's innerHTML.
export async function loadEmployerJobs() {
    const jobsList = document.getElementById('employer-jobs-list');
    if (!jobsList) return;

    try {
        const response = await fetch('/api/jobs');
        if (!response.ok) throw new Error('Failed to load jobs');

        const jobs = await response.json();

        if (jobs.length === 0) {
            jobsList.innerHTML = '<p class="empty-list-msg">No job postings yet. Click "Post New Job" to get started!</p>';
        } else {
            jobsList.innerHTML = jobs.map(createJobHTML).join('');
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        jobsList.innerHTML = '<p class="error-msg">Failed to load job postings. Please try again.</p>';
    }
}

// This function generates the HTML for a single job posting card as seen by the employer who created it.
// It includes job details, status, and actions like "View Applications", "Edit", "Delete", and "Close/Reopen".
// It is a helper function for the "Hire" -> "Job Postings" tab.
// It returns an HTML string for an employer's job item.
export function createJobHTML(job) {
    const salaryRange = job.salary_min && job.salary_max ?
        `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` :
        job.salary_min ? `From $${job.salary_min.toLocaleString()}` :
        job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Salary not specified';

    const statusClass = job.status === 'active' ? 'status-active' :
                       job.status === 'closed' ? 'status-closed' : 'status-draft';

    return `
        <div class="job-item" data-job-id="${job.id}">
            <div class="job-header">
                <h4>${job.title}</h4>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${job.applications_count ? `<span class="applications-count">${job.applications_count} applications</span>` : ''}
                    <span class="job-status ${statusClass}">${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                </div>
            </div>
            <div class="job-details">
                <p><strong>${job.company_name}</strong></p>
                <p>${job.location || 'Location not specified'}</p>
                <p>${salaryRange}</p>
                <p>${job.employment_type || 'Employment type not specified'} • ${job.employment_arrangement || 'Arrangement not specified'}</p>
                <p class="job-meta">Posted: ${job.created_at}</p>
            </div>
            <div class="job-actions">
                <button class="btn btn-primary view-applications-btn" data-job-id="${job.id}">View Applications</button>
                <button class="btn btn-secondary edit-job-btn" data-job-id="${job.id}">Edit</button>
                <button class="btn btn-danger delete-job-btn" data-job-id="${job.id}">Delete</button>
                <button class="btn btn-${job.status === 'active' ? 'warning' : 'success'} toggle-status-btn" data-job-id="${job.id}" data-current-status="${job.status}">
                    ${job.status === 'active' ? 'Close Job' : 'Reopen Job'}
                </button>
            </div>
        </div>
    `;
}


// This function creates and displays a modal for posting a new job or editing an existing one.
// It generates the entire form structure dynamically.
// It is part of the employer's job management feature.
// It does not return anything but creates and displays a modal.
export function openJobPostingModal(jobId = null) {
    const isEditing = jobId !== null && jobId !== undefined;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'job-posting-modal';

    modal.innerHTML = `
        <div class="modal-content large-modal">
            <button class="modal-close-btn">&times;</button>
            <h2>${isEditing ? 'Edit Job Posting' : 'Post New Job'}</h2>
            <form id="job-posting-form" class="modal-form">
                <input type="hidden" name="job_id" value="${jobId || ''}">

                <!-- rest of the modal HTML remains the same -->
                <div class="form-section">
                    <h3>Basic Information</h3>
                    <div class="form-group">
                        <label for="job-title">Job Title *</label>
                        <input type="text" id="job-title" name="title" required>
                    </div>

                    <div class="form-group">
                        <label for="company-name">Company Name *</label>
                        <input type="text" id="company-name" name="company_name" required>
                    </div>

                    <div class="form-group">
                        <label for="job-location">Location</label>
                        <input type="text" id="job-location" name="location" placeholder="e.g., New York, NY or Remote">
                    </div>

                    <div class="form-group">
                        <label for="job-description">Job Description *</label>
                        <textarea id="job-description" name="description" rows="5" required placeholder="Describe the role, responsibilities, and what makes this opportunity great..."></textarea>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Employment Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="employment-type">Employment Type</label>
                            <select id="employment-type" name="employment_type">
                                <option value="">Select type</option>
                                <option value="Full-Time">Full-Time</option>
                                <option value="Part-Time">Part-Time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="employment-arrangement">Work Arrangement</label>
                            <select id="employment-arrangement" name="employment_arrangement">
                                <option value="">Select arrangement</option>
                                <option value="On-Site">On-Site</option>
                                <option value="Remote">Remote</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="salary-min">Minimum Salary</label>
                            <input type="number" id="salary-min" name="salary_min" placeholder="e.g., 50000">
                        </div>
                        <div class="form-group">
                            <label for="salary-max">Maximum Salary</label>
                            <input type="number" id="salary-max" name="salary_max" placeholder="e.g., 80000">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="application-deadline">Application Deadline</label>
                        <input type="date" id="application-deadline" name="application_deadline">
                    </div>
                </div>

                <div class="form-section">
                    <h3>Required Skills</h3>
                    <div id="skills-requirements">
                        <button type="button" class="btn btn-secondary add-requirement-btn" data-type="skill">Add Skill Requirement</button>
                        <div class="requirements-list" id="skills-list"></div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Experience Requirements</h3>
                    <div id="experience-requirements">
                        <button type="button" class="btn btn-secondary add-requirement-btn" data-type="experience">Add Experience Requirement</button>
                        <div class="requirements-list" id="experience-list"></div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Certificate Requirements</h3>
                    <div id="certificate-requirements">
                        <button type="button" class="btn btn-secondary add-requirement-btn" data-type="certificate">Add Certificate Requirement</button>
                        <div class="requirements-list" id="certificates-list"></div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Degree Requirements</h3>
                    <div id="degree-requirements">
                        <button type="button" class="btn btn-secondary add-requirement-btn" data-type="degree">Add Degree Requirement</button>
                        <div class="requirements-list" id="degrees-list"></div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${isEditing ? 'Update Job' : 'Post Job'}</button>
                    <button type="button" class="btn btn-secondary modal-cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Set up modal events
    setupJobModal(modal, isEditing, jobId);

    modal.classList.add('visible');
}

// This function sets up the event listeners for the job posting modal.
// It handles closing the modal, adding new requirement fields, and submitting the form.
// It is a helper function for `openJobPostingModal`.
// It does not return anything.
export function setupJobModal(modal, isEditing, jobId) {
    const form = modal.querySelector('#job-posting-form');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const cancelBtn = modal.querySelector('.modal-cancel-btn');

    // Close modal events
    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Add requirement buttons
    modal.querySelectorAll('.add-requirement-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            addRequirement(btn.dataset.type);
        });
    });

    // Form submission
    form.addEventListener('submit', handleJobSubmission);

    // Load job data if editing
    if (isEditing) {
        loadJobForEditing(jobId, form);
    }
}

// This function dynamically adds a new requirement input block (for skills, experience, etc.) to the job posting form.
// It can pre-populate the fields with data if editing an existing job.
// It is a helper function for the job posting modal.
// It does not return anything but appends HTML to the appropriate requirements list.
export function addRequirement(type, data = {}) {
    const listId = `${type === 'experience' ? 'experience' : type + 's'}-list`;
    const list = document.getElementById(listId);

    let requirementHTML = '';
    const uniqueId = Date.now(); // Unique ID for radio button names

    switch(type) {
        case 'skill':
            requirementHTML = `
                <div class="requirement-item">
                    <div class="form-row">
                        <div class="form-group flex-grow-2">
                            <input type="text" placeholder="Skill title" name="skill_title" value="${data.skill_title || ''}" required>
                        </div>
                        <div class="form-group">
                            <select name="skill_type" required>
                                <option value="Technical" ${data.skill_type === 'Technical' ? 'selected' : ''}>Technical</option>
                                <option value="Behavioral" ${data.skill_type === 'Behavioral' ? 'selected' : ''}>Behavioral</option>
                                <option value="Conceptual" ${data.skill_type === 'Conceptual' ? 'selected' : ''}>Conceptual</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row requirement-options">
                        <div class="match-type-group">
                            <label><input type="radio" name="skill_title_match_type_${uniqueId}" value="including" ${(!data.title_match_type || data.title_match_type === 'including') ? 'checked' : ''}> Including</label>
                            <label><input type="radio" name="skill_title_match_type_${uniqueId}" value="exact" ${data.title_match_type === 'exact' ? 'checked' : ''}> Exact Match</label>
                        </div>
                        <div class="form-group checkbox-group">
                            <input type="checkbox" name="skill_required" ${data.is_required !== false ? 'checked' : ''}>
                            <label>Required</label>
                        </div>
                        <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                    </div>
                </div>
            `;
            break;

        case 'experience':
            requirementHTML = `
                 <div class="requirement-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Years Required</label>
                            <input type="number" placeholder="Years" name="years_required" min="0" value="${data.years_required || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                         <div class="form-group flex-grow-2">
                            <label>Position Title</label>
                            <input type="text" placeholder="e.g., Software Engineer" name="role_title" value="${data.role_title || ''}">
                        </div>
                        <div class="match-type-group align-self-end">
                            <label><input type="radio" name="exp_title_match_type_${uniqueId}" value="including" ${(!data.role_title_match_type || data.role_title_match_type === 'including') ? 'checked' : ''}> Including</label>
                            <label><input type="radio" name="exp_title_match_type_${uniqueId}" value="exact" ${data.role_title_match_type === 'exact' ? 'checked' : ''}> Exact Match</label>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group flex-grow-2">
                            <label>Country</label>
                            <input type="text" placeholder="e.g., USA" name="country" value="${data.country || ''}">
                        </div>
                        <div class="match-type-group align-self-end">
                            <label><input type="radio" name="exp_country_match_type_${uniqueId}" value="including" ${(!data.country_match_type || data.country_match_type === 'including') ? 'checked' : ''}> Including</label>
                            <label><input type="radio" name="exp_country_match_type_${uniqueId}" value="exact" ${data.country_match_type === 'exact' ? 'checked' : ''}> Exact Match</label>
                        </div>
                    </div>
                    <div class="form-row requirement-options">
                         <div class="form-group checkbox-group">
                            <input type="checkbox" name="experience_required" ${data.is_required !== false ? 'checked' : ''}>
                            <label>Required</label>
                        </div>
                        <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                    </div>
                </div>
            `;
            break;

        case 'certificate':
            requirementHTML = `
                <div class="requirement-item">
                    <div class="form-row">
                        <div class="form-group flex-grow-2">
                            <label>Certificate Title</label>
                            <input type="text" placeholder="e.g., Certified Cloud Practitioner" name="certificate_title" value="${data.certificate_title || ''}" required>
                        </div>
                        <div class="match-type-group align-self-end">
                            <label><input type="radio" name="cert_title_match_type_${uniqueId}" value="including" ${(!data.title_match_type || data.title_match_type === 'including') ? 'checked' : ''}> Including</label>
                            <label><input type="radio" name="cert_title_match_type_${uniqueId}" value="exact" ${data.title_match_type === 'exact' ? 'checked' : ''}> Exact Match</label>
                        </div>
                    </div>
                    <div class="form-row">
                         <div class="form-group flex-grow-2">
                            <label>Issuer</label>
                            <input type="text" placeholder="e.g., Amazon Web Services" name="certificate_issuer" value="${data.issuer || ''}">
                        </div>
                         <div class="match-type-group align-self-end">
                            <label><input type="radio" name="cert_issuer_match_type_${uniqueId}" value="including" ${(!data.issuer_match_type || data.issuer_match_type === 'including') ? 'checked' : ''}> Including</label>
                            <label><input type="radio" name="cert_issuer_match_type_${uniqueId}" value="exact" ${data.issuer_match_type === 'exact' ? 'checked' : ''}> Exact Match</label>
                        </div>
                    </div>
                    <div class="form-row requirement-options">
                        <div class="form-group checkbox-group">
                            <input type="checkbox" name="certificate_required" ${data.is_required !== false ? 'checked' : ''}>
                            <label>Required</label>
                        </div>
                        <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                    </div>
                </div>
            `;
            break;

        case 'degree':
            const degreeLevels = ["High School", "Associate's", "Bachelor's", "Master's", "Doctoral"];
            const optionsHTML = degreeLevels.map(level => `<option value="${level}" ${data.degree_level === level ? 'selected' : ''}>${level}</option>`).join('');
            requirementHTML = `
                <div class="requirement-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Minimum Degree Level</label>
                            <select name="degree_level" required>
                                ${optionsHTML}
                            </select>
                        </div>
                        <div class="form-group flex-grow-2">
                            <label>Field of Study (optional)</label>
                            <input type="text" placeholder="e.g., Computer Science" name="field_of_study" value="${data.field_of_study || ''}">
                        </div>
                    </div>
                    <div class="form-row requirement-options">
                         <div class="form-group checkbox-group">
                            <input type="checkbox" name="degree_required" ${data.is_required !== false ? 'checked' : ''}>
                            <label>Required</label>
                        </div>
                        <button type="button" class="btn btn-danger remove-requirement-btn">Remove</button>
                    </div>
                </div>
            `;
            break;
    }

    list.insertAdjacentHTML('beforeend', requirementHTML);

    // Add remove functionality to the new requirement
    const newItem = list.lastElementChild;
    newItem.querySelector('.remove-requirement-btn').addEventListener('click', () => {
        newItem.remove();
    });
}

// This function handles the submission of the job posting form (for both create and update).
// It gathers all the data from the form fields and requirement blocks, formats it, and sends it to the API.
// It is an event handler for the job posting form.
// It does not return anything.
export async function handleJobSubmission(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const jobId = formData.get('job_id');
    const isEditing = jobId && jobId !== '';

    // Build job data object
    const jobData = {
        title: formData.get('title'),
        description: formData.get('description'),
        company_name: formData.get('company_name'),
        location: formData.get('location'),
        salary_min: formData.get('salary_min') ? parseInt(formData.get('salary_min')) : null,
        salary_max: formData.get('salary_max') ? parseInt(formData.get('salary_max')) : null,
        employment_type: formData.get('employment_type'),
        employment_arrangement: formData.get('employment_arrangement'),
        application_deadline: formData.get('application_deadline') || null,
        required_skills: [],
        required_experiences: [],
        required_certificates: [],
        required_degrees: []
    };

    // Collect requirements
    form.querySelectorAll('#skills-list .requirement-item').forEach(item => {
        jobData.required_skills.push({
            title: item.querySelector('[name="skill_title"]').value,
            type: item.querySelector('[name="skill_type"]').value,
            title_match_type: item.querySelector('input[name^="skill_title_match_type"]:checked').value,
            is_required: item.querySelector('[name="skill_required"]').checked
        });
    });

    form.querySelectorAll('#experience-list .requirement-item').forEach(item => {
        jobData.required_experiences.push({
            years_required: parseInt(item.querySelector('[name="years_required"]').value),
            role_title: item.querySelector('[name="role_title"]').value || null,
            role_title_match_type: item.querySelector('input[name^="exp_title_match_type"]:checked').value,
            country: item.querySelector('[name="country"]').value || null,
            country_match_type: item.querySelector('input[name^="exp_country_match_type"]:checked').value,
            is_required: item.querySelector('[name="experience_required"]').checked
        });
    });

    form.querySelectorAll('#certificates-list .requirement-item').forEach(item => {
        jobData.required_certificates.push({
            title: item.querySelector('[name="certificate_title"]').value,
            title_match_type: item.querySelector('input[name^="cert_title_match_type"]:checked').value,
            issuer: item.querySelector('[name="certificate_issuer"]').value || null,
            issuer_match_type: item.querySelector('input[name^="cert_issuer_match_type"]:checked').value,
            is_required: item.querySelector('[name="certificate_required"]').checked
        });
    });

    form.querySelectorAll('#degrees-list .requirement-item').forEach(item => {
        jobData.required_degrees.push({
            level: item.querySelector('[name="degree_level"]').value,
            field_of_study: item.querySelector('[name="field_of_study"]').value || null,
            is_required: item.querySelector('[name="degree_required"]').checked
        });
    });

    try {
        const url = isEditing ? `/api/jobs/${jobId}` : '/api/jobs';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobData)
        });

        if (!response.ok) throw new Error('Failed to save job');

        // Close modal and refresh job list
        document.getElementById('job-posting-modal').remove();
        loadEmployerJobs();

    } catch (error) {
        console.error('Error saving job:', error);
        alert('Failed to save job. Please try again.');
    }
}

// This function fetches the data for a specific job posting and populates the job posting modal for editing.
// It fills in all the basic fields and dynamically adds the existing requirement blocks.
// It is a helper function for the job editing workflow.
// It does not return anything but populates the form in the job posting modal.
export async function loadJobForEditing(jobId, form) {
    try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) throw new Error('Failed to load job');

        const job = await response.json();

        // Fill basic fields
        form.querySelector('[name="title"]').value = job.title;
        form.querySelector('[name="company_name"]').value = job.company_name;
        form.querySelector('[name="location"]').value = job.location || '';
        form.querySelector('[name="description"]').value = job.description;
        form.querySelector('[name="employment_type"]').value = job.employment_type || '';
        form.querySelector('[name="employment_arrangement"]').value = job.employment_arrangement || '';
        form.querySelector('[name="salary_min"]').value = job.salary_min || '';
        form.querySelector('[name="salary_max"]').value = job.salary_max || '';
        form.querySelector('[name="application_deadline"]').value = job.application_deadline || '';

        // Load requirements
        job.required_skills.forEach(skill => {
            addRequirement('skill', skill);
        });

        job.required_experiences.forEach(exp => {
            addRequirement('experience', exp);
        });

        job.required_certificates.forEach(cert => {
            addRequirement('certificate', cert);
        });

        job.required_degrees.forEach(degree => {
            addRequirement('degree', degree);
        });

    } catch (error) {
        console.error('Error loading job for editing:', error);
        alert('Failed to load job data. Please try again.');
    }
}

// This function sends a request to the API to delete a job posting.
// It refreshes the job list upon successful deletion.
// It is part of the employer's job management feature.
// It does not return anything.
export async function deleteJob(jobId) {
    try {
        const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete job');

        loadEmployerJobs(); // Refresh the list
    } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job. Please try again.');
    }
}

// This function sends a request to the API to update the status of a job posting (e.g., from 'active' to 'closed').
// It refreshes the job list upon successful update.
// It is part of the employer's job management feature.
// It does not return anything.
export async function updateJobStatus(jobId, status) {
    try {
        const response = await fetch(`/api/jobs/${jobId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });

        if (!response.ok) throw new Error('Failed to update job status');

        loadEmployerJobs(); // Refresh the list
    } catch (error) {
        console.error('Error updating job status:', error);
        alert('Failed to update job status. Please try again.');
    }
}


// This function fetches all applications received for the employer's job postings.
// It can be filtered by a list of job IDs. It displays the applications as cards.
// It is part of the "Hire" -> "All Applications" tab.
// It does not return anything but updates the 'employer-applications-list' element's innerHTML.
// Load all applications for employer
export async function loadAllApplications(jobIds = null) {
    const applicationsContent = document.getElementById('employer-applications-list');
    const filterStatus = document.getElementById('employer-applications-filter-status');

    if (!applicationsContent || !filterStatus) {
        console.error('Error: Target elements for applications not found.');
        return;
    }

    // Start with a loading message and clear previous filter status
    filterStatus.innerHTML = '';
    applicationsContent.innerHTML = '<p class="loading">Loading applications...</p>';

    try {
        const url = jobIds ? `/api/applications?job_ids=${jobIds.join(',')}` : '/api/applications';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch applications: ${response.statusText}`);
        }
        const applications = await response.json();

        // If filtering, show a status message with a clear button
        if (jobIds && jobIds.length > 0) {
             const jobCount = jobIds.length;
             const jobTitle = jobCount === 1 && applications.length > 0 ? applications[0].job_title : `${jobCount} jobs`;
            filterStatus.innerHTML = `
                <div class="filter-notice">
                    <span>Showing applications for: <strong>${jobTitle}</strong></span>
                    <button class="btn btn-secondary clear-app-filter-btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Show All</button>
                </div>
            `;
        }

        if (applications.length === 0) {
            if (jobIds && jobIds.length > 0) {
                 applicationsContent.innerHTML = '<div class="empty-list-msg">No applications received for the selected job(s).</div>';
            } else {
                 applicationsContent.innerHTML = '<div class="empty-list-msg">No applications received yet.</div>';
            }
        } else {
            applicationsContent.innerHTML = applications.map(app => createApplicationCardHTML(app, false)).join('');
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        applicationsContent.innerHTML = '<div class="error-msg">Could not load applications. Please try again later.</div>';
    }
}


// This function navigates the UI to the "All Applications" tab and filters the view to show applications for a specific job.
// It is triggered when an employer clicks "View Applications" on one of their job postings.
// It is part of the employer's job management workflow.
// It does not return anything but manipulates the UI and triggers `loadAllApplications`.
export async function openApplicationsWindow(jobId) {
    // Switch to the 'All Applications' tab
    const hireTabs = contentArea.querySelector('.hire-tabs');
    if (hireTabs) {
        hireTabs.querySelector('.hire-tab-button.active')?.classList.remove('active');
        const appTab = hireTabs.querySelector('[data-hire-tab="applications"]');
        if (appTab) appTab.classList.add('active');
    }
    contentArea.querySelector('.hire-tab-pane.active')?.classList.remove('active');
    const appPane = contentArea.querySelector('#all-applications');
    if (appPane) {
        appPane.classList.add('active');
    }

    // Populate the dropdown filter first, which is now necessary here
    await populateJobFilterDropdown();

    // Now, programmatically check the correct box in the newly populated filter
    const filterContainer = document.getElementById('applications-filter-container');
    if (filterContainer) {
        // Uncheck all boxes first to ensure a clean state
        filterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        // Check the box for the specific job
        const targetCheckbox = filterContainer.querySelector(`input[value="${jobId}"]`);
        if (targetCheckbox) {
            targetCheckbox.checked = true;
        }
    }

    // Load applications for the specific job, ensuring jobId is passed as an array
    await loadAllApplications(jobId ? [jobId] : null);
}


// This function generates the HTML for a single application card as seen by an employer.
// It includes the applicant's name, job applied for, a status dropdown, and archive/profile buttons.
// It is a helper function for the "Hire" section.
// It returns an HTML string for an application card.
export function createApplicationCardHTML(application, isArchivedView = false) {
    const appliedDate = new Date(application.applied_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const statuses = ["Submitted", "Under Review", "Rejected", "Offer Sent", "Accepted"];
    const statusOptions = statuses.map(status =>
        `<option value="${status}" ${application.status === status ? 'selected' : ''}>${status}</option>`
    ).join('');

    // This converts "Under Review" to "under-review" for use as a CSS class
    const statusClass = application.status.toLowerCase().replace(/ /g, '-');

    const archiveButton = isArchivedView
        ? `<button class="btn btn-secondary unarchive-app-btn" data-application-id="${application.application_id}">Unarchive</button>`
        : `<button class="btn btn-warning archive-app-btn" data-application-id="${application.application_id}">Archive</button>`;

    return `
        <div class="application-card status-border-${statusClass}" data-application-id="${application.application_id}">
            <div class="application-header">
                <div class="application-info">
                    <h4>${application.applicant_name}</h4>
                    <div class="application-meta">
                        <span>Applied for <strong>${application.job_title}</strong></span>
                        <span class="meta-separator">•</span>
                        <span>${appliedDate}</span>
                    </div>
                </div>
                <div class="application-actions">
                     <button class="btn btn-secondary view-profile-btn" data-applicant-id="${application.applicant_id}" data-job-id="${application.job_id}">View Profile</button>
                    <select class="status-selector" data-application-id="${application.application_id}">
                        ${statusOptions}
                    </select>
                    ${archiveButton}
                </div>
            </div>
        </div>
    `;
}

// This function fetches a unique list of all applicants who have applied to any of the employer's jobs.
// It displays each unique applicant once, showing the most recent job they applied for.
// It is part of the "Hire" -> "All Applicants" tab.
// It does not return anything but updates the 'employer-applicants-list' element's innerHTML.
// Load all unique applicants for the employer
export async function loadAllApplicants() {
    const applicantsList = document.getElementById('employer-applicants-list');
    if (!applicantsList) return;
    applicantsList.innerHTML = '<p class="loading">Loading applicants...</p>';

    try {
        const response = await fetch('/api/applicants');
        if (!response.ok) throw new Error('Failed to fetch applicants');
        const applicants = await response.json();

        if (applicants.length === 0) {
            applicantsList.innerHTML = '<div class="empty-list-msg">No applicants found yet.</div>';
        } else {
            applicantsList.innerHTML = applicants.map(createApplicantCardHTML).join('');
        }
    } catch (error) {
        console.error('Error loading applicants:', error);
        applicantsList.innerHTML = '<div class="error-msg">Could not load applicants.</div>';
    }
}


// This function fetches all applications that the employer has marked as "archived".
// It is part of the "Hire" -> "Archived Applications" tab.
// It does not return anything but updates the 'employer-archived-applications-list' element's innerHTML.
export async function loadArchivedApplications() {
    const archivedList = document.getElementById('employer-archived-applications-list');
    if (!archivedList) return;
    archivedList.innerHTML = '<p class="loading">Loading archived applications...</p>';

    try {
        const response = await fetch('/api/applications?show_archived=true');
        if (!response.ok) throw new Error('Failed to fetch archived applications');

        const applications = await response.json();

        if (applications.length === 0) {
            archivedList.innerHTML = '<div class="empty-list-msg">You have no archived applications.</div>';
        } else {
            archivedList.innerHTML = applications.map(app => createApplicationCardHTML(app, true)).join('');
        }
    } catch (error) {
        console.error('Error loading archived applications:', error);
        archivedList.innerHTML = '<div class="error-msg">Could not load archived applications.</div>';
    }
}


// This function sends a request to the API to archive or un-archive a job application.
// After the action, it refreshes both the main and archived application lists to reflect the change.
// It is part of the employer's application management workflow.
// It does not return anything.
export async function archiveApplication(applicationId, archive = true) {
    try {
        const response = await fetch(`/api/applications/${applicationId}/archive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_archived: archive })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update application');
        }

        // Refresh both lists to ensure data consistency
        loadAllApplications();
        loadArchivedApplications();

    } catch (error) {
        console.error('Error archiving/unarchiving application:', error);
        alert(error.message);
    }
}


// This function generates the HTML for a single applicant card in the "All Applicants" tab.
// It shows the applicant's name and the last job they applied for, with a button to view their profile.
// It is a helper function for the "Hire" section.
// It returns an HTML string for an applicant card.
// Create HTML for an applicant card in the "All Applicants" tab
export function createApplicantCardHTML(applicant) {
    return `
        <div class="applicant-card" data-applicant-id="${applicant.applicant_id}">
            <div class="applicant-info">
                <h4>${applicant.applicant_name}</h4>
                <p>Last applied for: <strong>${applicant.job_title}</strong></p>
            </div>
            <div class="applicant-actions">
                <button class="btn btn-primary view-profile-btn" data-applicant-id="${applicant.applicant_id}" data-job-id="${applicant.job_id}">View Profile</button>
            </div>
        </div>
    `;
}


// This function displays a modal containing the detailed public profile of a job applicant.
// It fetches all public-facing profile information (bio, skills, experience, etc.) and the relevant cover letter.
// It is part of the employer's applicant review process.
// It does not return anything but creates and displays a modal.
// Show a modal with the applicant's full public profile
export async function showApplicantProfileModal(applicantId) {
    const modalId = 'candidate-profile-modal';
    // This is a bit of a workaround because the event might be delegated.
    // We find the button that was clicked to get the job_id.
    const button = event.target.closest('.view-profile-btn');
    const jobId = button ? button.dataset.jobId : null;

    // Remove any existing modal first
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    // Create and show a loading state modal immediately
    let modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.id = modalId;
    modal.innerHTML = `
        <div class="modal-content large-modal candidate-profile-modal">
            <button class="modal-close-btn">&times;</button>
            <div class="loading-state" style="padding: 4rem; text-align: center;">
                <p class="loading">Loading applicant profile...</p>
            </div>
        </div>`;
    document.body.appendChild(modal);

    try {
        const url = jobId ? `/api/profile/${applicantId}/public?job_id=${jobId}` : `/api/profile/${applicantId}/public`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load profile.');
        const profile = await response.json();

        const location = [profile.city, profile.country].filter(Boolean).join(', ') || 'Not provided';

        // --- HTML Sections ---
        const bioHtml = `<p>${profile.bio || 'No bio provided.'}</p>`;

        const coverLetterHtml = profile.cover_letter
            ? `<p>${profile.cover_letter.replace(/\n/g, '<br>')}</p>`
            : '<p class="empty-list-msg">No cover letter was submitted for this application.</p>';

        const skillsHtml = profile.skills.length > 0
            ? profile.skills.map(skill => createSkillHTML(skill, true)).join('')
            : '<p class="empty-list-msg">No public skills listed.</p>';

        const experiencesHtml = profile.experiences.length > 0
            ? profile.experiences.map(exp => createExperienceHTML(exp, true)).join('')
            : '<p class="empty-list-msg">No public experience listed.</p>';

        const certificatesHtml = profile.certificates.length > 0
            ? profile.certificates.map(cert => createCertificateHTML(cert, true)).join('')
            : '<p class="empty-list-msg">No public certificates listed.</p>';

        const degreesHtml = profile.degrees.length > 0
            ? profile.degrees.map(degree => createDegreeHTML(degree, true)).join('')
            : '<p class="empty-list-msg">No public degrees listed.</p>';


        modal.innerHTML = `
            <div class="modal-content large-modal candidate-profile-modal">
                <button class="modal-close-btn">&times;</button>
                <div class="profile-modal-header">
                    <h2>${profile.first_name || ''} ${profile.last_name || ''}</h2>
                    <p>${profile.email} &middot; ${location}</p>
                </div>
                <div class="candidate-profile-content">
                    <div class="profile-modal-section"><h3>Bio</h3>${bioHtml}</div>
                    ${profile.job_title ? `<div class="profile-modal-section"><h3>Cover Letter for ${profile.job_title}</h3>${coverLetterHtml}</div>` : ''}
                    <div class="profile-modal-section"><h3>Skills</h3>${skillsHtml}</div>
                    <div class="profile-modal-section"><h3>Experience</h3>${experiencesHtml}</div>
                    <div class="profile-modal-section"><h3>Certificates</h3>${certificatesHtml}</div>
                    <div class="profile-modal-section"><h3>Degrees</h3>${degreesHtml}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error showing applicant profile modal:', error);
        modal.innerHTML = `
             <div class="modal-content">
                 <button class="modal-close-btn">&times;</button>
                 <div class="error-msg" style="padding: 2rem;">Could not load applicant profile. Please try again.</div>
             </div>`;
    }

    // Add close event listeners to the final modal
    modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
}


// This function fetches the employer's job postings and uses them to build a filter dropdown on the "All Applications" tab.
// This allows the employer to filter applications by one or more jobs.
// It is part of the employer's application review feature.
// It does not return anything but updates the 'applications-filter-container' element's innerHTML.
export async function populateJobFilterDropdown() {
    const filterContainer = document.getElementById('applications-filter-container');
    if (!filterContainer) return;

    try {
        const response = await fetch('/api/jobs');
        if (!response.ok) throw new Error('Failed to fetch job postings for filter');
        const jobs = await response.json();

        if (jobs.length === 0) {
            filterContainer.innerHTML = ''; // No jobs, no filter
            return;
        }

        const jobItems = jobs.map(job => `
            <label class="dropdown-item">
                <input type="checkbox" class="job-filter-checkbox" value="${job.id}">
                ${job.title}
            </label>
        `).join('');

        filterContainer.innerHTML = `
            <div class="application-filters">
                <div class="filter-dropdown">
                    <button class="dropdown-button">
                        <span>Filter by Job Posting</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="dropdown-panel">
                        ${jobItems}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners to checkboxes to trigger filtering
        filterContainer.querySelectorAll('.job-filter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedIds = Array.from(filterContainer.querySelectorAll('.job-filter-checkbox:checked'))
                                         .map(cb => cb.value);
                loadAllApplications(selectedIds.length > 0 ? selectedIds : null);
            });
        });

    } catch(error) {
        console.error('Error populating job filter dropdown:', error);
        filterContainer.innerHTML = '<p class="error-msg">Could not load job filter.</p>';
    }
}
