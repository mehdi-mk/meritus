import { dom } from './state.js';

// This function is the entry point for loading the job seeker's view.
// It currently just calls `loadAvailableJobs` to show the job browsing interface.
// It is part of the "Get Hired" tab.
// It does not return anything.
export function loadJobSeekerContent() {
    loadAvailableJobs();
}

// This function fetches jobs from the `/api/jobs/browse` endpoint based on the user's search and filter criteria.
// It displays the resulting list of jobs for the job seeker.
// It is part of the "Get Hired" -> "Browse Jobs" tab.
// It does not return anything but updates the 'jobs-list' element's innerHTML.
export async function loadAvailableJobs() {
    const jobsList = document.getElementById('jobs-list');
    if (!jobsList) return;

    try {
        // Get filter values
        const search = document.getElementById('job-search')?.value || '';
        const location = document.getElementById('location-filter')?.value || '';
        const employmentType = document.getElementById('type-filter')?.value || '';
        const employmentArrangement = document.getElementById('arrangement-filter')?.value || '';
        const eligibleOnly = document.querySelector('#eligibility-switch .active')?.dataset.value === 'eligible';

        // Build query parameters
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (location) params.append('location', location);
        if (employmentType) params.append('employment_type', employmentType);
        if (employmentArrangement) params.append('employment_arrangement', employmentArrangement);
        if (eligibleOnly) params.append('eligible_only', 'true');

        const response = await fetch(`/api/jobs/browse?${params}`);
        if (!response.ok) throw new Error('Failed to load jobs');

        const jobs = await response.json();

        if (jobs.length === 0) {
            jobsList.innerHTML = '<div class="empty-list-msg">No jobs found matching your criteria.</div>';
        } else {
            jobsList.innerHTML = jobs.map(createJobSeekerJobHTML).join('');
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        jobsList.innerHTML = '<div class="error-msg">Failed to load jobs. Please try again.</div>';
    }
}

// This function generates the HTML for a single job posting as seen by a job seeker.
// It includes job details, salary, an eligibility indicator, and an "Apply" or "Already Applied" button.
// It is a helper function for the "Get Hired" section.
// It returns an HTML string for a job seeker's job item.
function createJobSeekerJobHTML(job) {
    const salaryRange = job.salary_min && job.salary_max ?
        `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` :
        job.salary_min ? `From $${job.salary_min.toLocaleString()}` :
        job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Salary not specified';

    const applicationStatus = job.user_applied ?
        `<span class="application-status status-${job.application_status}">
            ${job.application_status === 'pending' ? 'Application Submitted' :
              job.application_status === 'reviewed' ? 'Under Review' :
              job.application_status === 'shortlisted' ? 'Shortlisted' : 'Applied'}
        </span>` : '';

    // Determine if user is eligible and if apply button should be enabled
    const isEligible = job.user_eligible !== false; // Default to eligible if not specified
    const applyButtonClass = !job.user_applied && isEligible ? 'btn-primary' : 'btn-secondary';
    const applyButtonDisabled = job.user_applied || !isEligible;
    const applyButtonText = job.user_applied ? '<i class="fas fa-check"></i> Already Applied' :
                           !isEligible ? 'Not Eligible' : 'Apply Now';

    // Eligibility indicator
    const eligibilityIndicator = !isEligible ?
        `<span class="eligibility-status not-eligible">
            <i class="fas fa-exclamation-triangle"></i> Requirements not met
        </span>` : '';

    return `
        <div class="job-seeker-item" data-job-id="${job.id}">
            <div class="job-seeker-header">
                <h3>${job.title}</h3>
                <div class="header-status">
                    ${applicationStatus}
                    ${eligibilityIndicator}
                </div>
            </div>
            <div class="job-seeker-company">
                <strong>${job.company_name}</strong>
                ${job.location ? ` • ${job.location}` : ''}
            </div>
            <div class="job-seeker-details">
                <span class="job-detail-badge">${job.employment_type || 'Not specified'}</span>
                <span class="job-detail-badge">${job.employment_arrangement || 'Not specified'}</span>
                <span class="job-salary">${salaryRange}</span>
            </div>
            <div class="job-seeker-description">
                ${job.description.length > 200 ? job.description.substring(0, 200) + '...' : job.description}
            </div>
            <div class="job-seeker-footer">
                <span class="job-posted">Posted ${job.created_at}</span>
                <div class="job-seeker-actions">
                    <button class="btn btn-secondary view-job-btn" data-job-id="${job.id}">View Details</button>
                    <button class="btn ${applyButtonClass} apply-job-btn"
                            data-job-id="${job.id}"
                            ${applyButtonDisabled ? 'disabled' : ''}>
                        ${applyButtonText}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// This function fetches all job applications submitted by the current user.
// It displays them in the "My Applications" tab.
// It is part of the "Get Hired" -> "My Applications" tab.
// It does not return anything but updates the 'applications-list' element's innerHTML.
export async function loadUserApplications() {
    const applicationsList = document.getElementById('applications-list');
    if (!applicationsList) return;

    try {
        const response = await fetch('/api/my-applications');
        if (!response.ok) throw new Error('Failed to load applications');

        const applications = await response.json();

        if (applications.length === 0) {
            applicationsList.innerHTML = '<div class="empty-list-msg">You haven\'t applied to any jobs yet.</div>';
        } else {
            applicationsList.innerHTML = applications.map(createApplicationHTML).join('');
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        applicationsList.innerHTML = '<div class="error-msg">Failed to load applications. Please try again.</div>';
    }
}

// This function generates the HTML for a single application card in the "My Applications" tab.
// It shows the job title, company, status, and date applied, with an option to withdraw if applicable.
// It is a helper function for the "Get Hired" section.
// It returns an HTML string for a user's application item.
function createApplicationHTML(application) {
    const statusClass = `status-${application.status}`;
    const statusText = application.status.charAt(0).toUpperCase() + application.status.slice(1);

    return `
        <div class="application-item" data-application-id="${application.id}">
            <div class="application-header">
                <h4>${application.job_title}</h4>
                <span class="application-status ${statusClass}">${statusText}</span>
            </div>
            <div class="application-details">
                <p><strong>${application.company_name}</strong></p>
                <p>Applied: ${application.applied_at}</p>
            </div>
            <div class="application-actions">
                ${application.status === 'pending' ?
                    `<button class="btn btn-danger withdraw-app-btn" data-application-id="${application.id}">Withdraw</button>` :
                    ''
                }
            </div>
        </div>
    `;
}


// This function sends a request to the API for a user to withdraw their job application.
// It refreshes the user's application list and the job browsing list upon success.
// It is part of the job seeker's application management feature.
// It does not return anything.
export async function withdrawApplication(applicationId) {
    try {
        const response = await fetch(`/api/applications/${applicationId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Application withdrawn successfully.');
            loadUserApplications();
            loadAvailableJobs(); // Refresh to show apply button again
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to withdraw application'}`);
        }
    } catch (error) {
        console.error('Error withdrawing application:', error);
        alert('Failed to withdraw application. Please try again.');
    }
}


// This function creates and displays a modal for a job seeker to write an optional cover letter and submit their application.
// It handles the form submission to the `/apply` endpoint.
// It is part of the job seeker's application process.
// It does not return anything but creates and displays a modal.
export function openApplicationModal(jobId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'application-modal';

    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>Apply for Job</h2>
            <form id="application-form" class="modal-form">
                <div class="form-group">
                    <label for="cover-letter">Cover Letter (Optional)</label>
                    <textarea id="cover-letter" name="cover_letter" rows="6"
                              placeholder="Tell the employer why you're interested in this position and what makes you a great fit..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Submit Application</button>
                    <button type="button" class="btn btn-secondary modal-cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Set up form submission
    const form = modal.querySelector('#application-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`/api/jobs/${jobId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                modal.remove();
                alert('Application submitted successfully!');
                loadAvailableJobs(); // Refresh the job list
                loadUserApplications(); // Refresh applications if visible
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to submit application'}`);
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Failed to submit application. Please try again.');
        }
    });

    // Close modal events
    const closeBtn = modal.querySelector('.modal-close-btn');
    const cancelBtn = modal.querySelector('.modal-cancel-btn');

    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.classList.add('visible');
}


// This function fetches the full details of a job posting and displays them in a read-only modal.
// It is used by job seekers to view more information about a job before applying.
// It is part of the job browsing feature.
// It does not return anything but triggers `showJobDetailsModal`.
export async function openJobDetailsModal(jobId) {
    try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
            // Try the browse endpoint if the job isn't owned by current user
            const browseResponse = await fetch(`/api/jobs/browse?search=&location=`);
            const jobs = await browseResponse.json();
            const job = jobs.find(j => j.id === jobId);
            if (!job) throw new Error('Job not found');
            showJobDetailsModal(job);
            return;
        }

        const job = await response.json();
        showJobDetailsModal(job);
    } catch (error) {
        console.error('Error loading job details:', error);
        alert('Failed to load job details.');
    }
}


// This function takes a job object and generates the HTML for the detailed job view modal.
// It displays all job information, including the full description and all requirements.
// It is a helper function for `openJobDetailsModal`.
// It does not return anything but creates and displays a modal.
function showJobDetailsModal(job) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'job-details-modal';

    const salaryRange = job.salary_min && job.salary_max ?
        `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` :
        job.salary_min ? `From $${job.salary_min.toLocaleString()}` :
        job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Salary not specified';

    modal.innerHTML = `
        <div class="modal-content large-modal">
            <button class="modal-close-btn">&times;</button>
            <h2>${job.title}</h2>
            <div class="job-details-content">
                <div class="job-basic-info">
                    <p><strong>Company:</strong> ${job.company_name}</p>
                    <p><strong>Location:</strong> ${job.location || 'Not specified'}</p>
                    <p><strong>Employment Type:</strong> ${job.employment_type || 'Not specified'}</p>
                    <p><strong>Work Arrangement:</strong> ${job.employment_arrangement || 'Not specified'}</p>
                    <p><strong>Salary:</strong> ${salaryRange}</p>
                    ${job.application_deadline ? `<p><strong>Application Deadline:</strong> ${job.application_deadline}</p>` : ''}
                </div>

                <div class="job-description">
                    <h3>Job Description</h3>
                    <p>${job.description.replace(/\n/g, '<br>')}</p>
                </div>

                ${job.required_skills && job.required_skills.length > 0 ? `
                    <div class="job-requirements">
                        <h3>Required Skills</h3>
                        <div class="requirements-list">
                            ${job.required_skills.map(skill =>
                                `<span class="requirement-tag ${skill.is_required ? 'required' : 'preferred'}">
                                    ${skill.skill_title} (${skill.skill_type})
                                    ${skill.is_required ? '' : ' - Preferred'}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                ${job.required_experiences && job.required_experiences.length > 0 ? `
                    <div class="job-requirements">
                        <h3>Required Experience</h3>
                        <div class="requirements-list">
                            ${job.required_experiences.map(exp => {
                                let details = `${exp.years_required}+ years`;
                                if (exp.role_title) details += ` in a role like "${exp.role_title}"`;
                                if (exp.country) details += ` in ${exp.country}`;
                                return `<span class="requirement-tag ${exp.is_required ? 'required' : 'preferred'}">
                                    ${details}
                                    ${exp.is_required ? '' : ' - Preferred'}
                                </span>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                ${job.required_certificates && job.required_certificates.length > 0 ? `
                    <div class="job-requirements">
                        <h3>Required Certificates</h3>
                        <div class="requirements-list">
                            ${job.required_certificates.map(cert => {
                                let details = cert.certificate_title;
                                if (cert.issuer) details += ` from ${cert.issuer}`;
                                return `<span class="requirement-tag ${cert.is_required ? 'required' : 'preferred'}">
                                    ${details}
                                    ${cert.is_required ? '' : ' - Preferred'}
                                </span>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                ${job.required_degrees && job.required_degrees.length > 0 ? `
                    <div class="job-requirements">
                        <h3>Required Degree</h3>
                        <div class="requirements-list">
                            ${job.required_degrees.map(degree => {
                                let details = degree.degree_level;
                                if (degree.field_of_study) details += ` in ${degree.field_of_study}`;
                                return `<span class="requirement-tag ${degree.is_required ? 'required' : 'preferred'}">
                                    ${details}
                                    ${degree.is_required ? '' : ' - Preferred'}
                                </span>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="job-actions">
                    ${!job.user_applied ?
                        `<button class="btn btn-primary apply-job-btn" data-job-id="${job.id}">Apply Now</button>` :
                        `<span class="application-status status-${job.application_status}">Already Applied</span>`
                    }
                    <button class="btn btn-secondary modal-cancel-btn">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listener for the modal's own "Apply Now" button
    const applyBtnInModal = modal.querySelector('.apply-job-btn');
    if (applyBtnInModal) {
        applyBtnInModal.addEventListener('click', () => {
            const jobId = parseInt(applyBtnInModal.dataset.jobId);
            modal.remove(); // Close the current modal
            openApplicationModal(jobId); // Open the application modal
        });
    }

    // Close modal events
    const closeBtn = modal.querySelector('.modal-close-btn');
    const cancelBtn = modal.querySelector('.modal-cancel-btn');

    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.classList.add('visible');
}
