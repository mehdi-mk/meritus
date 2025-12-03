// shared state
export const state = {
    selectedApplications: new Set(),
    itemToDelete: { id: null, type: null }
};

// We will populate this object after the DOM loads in dashboard.js
export const dom = {
    contentArea: null,
    modals: {}
};