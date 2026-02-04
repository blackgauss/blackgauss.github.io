// ================================
// API Integration Module
// Use this file to connect to external APIs for computations or data
// ================================

const API = {
    // Base URL for your API (update this when you have an API endpoint)
    baseURL: 'https://api.example.com',
    
    // API Key (if needed)
    apiKey: null,
    
    // Timeout for requests (ms)
    timeout: 5000
};

// ================================
// Generic API Request Function
// ================================

async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: API.timeout
    };

    // Merge options
    const config = { ...defaultOptions, ...options };

    // Add API key if available
    if (API.apiKey) {
        config.headers['Authorization'] = `Bearer ${API.apiKey}`;
    }

    const url = `${API.baseURL}${endpoint}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
            ...config,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('API Request Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================
// Specific API Functions
// Add your custom API calls here
// ================================

/**
 * Example: Fetch projects from API
 * Uncomment and modify when you have a projects API
 */
async function fetchProjectsFromAPI() {
    const result = await apiRequest('/projects');
    
    if (result.success) {
        return result.data;
    } else {
        console.warn('Failed to fetch projects from API, using config data');
        return siteConfig.projects;
    }
}

/**
 * Example: Perform a computation via API
 */
async function performComputation(inputData) {
    const result = await apiRequest('/compute', {
        method: 'POST',
        body: JSON.stringify(inputData)
    });
    
    if (result.success) {
        return result.data;
    } else {
        throw new Error('Computation failed: ' + result.error);
    }
}

/**
 * Example: Get computation results by ID
 */
async function getComputationResult(computationId) {
    const result = await apiRequest(`/compute/${computationId}`);
    
    if (result.success) {
        return result.data;
    } else {
        throw new Error('Failed to fetch result: ' + result.error);
    }
}

// ================================
// Helper Functions
// ================================

/**
 * Display computation results in the UI
 */
function displayComputationResult(result, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Example result display
    container.innerHTML = `
        <div class="result-card">
            <h3>Computation Result</h3>
            <pre>${JSON.stringify(result, null, 2)}</pre>
        </div>
    `;
}

/**
 * Show loading state
 */
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="loading">
            <p>Loading...</p>
        </div>
    `;
}

/**
 * Show error message
 */
function showError(message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="error-message">
            <p>❌ ${message}</p>
        </div>
    `;
}

// ================================
// Event Listeners for API Calls
// ================================

// Example: Add a button to trigger API computation
document.addEventListener('DOMContentLoaded', function() {
    const computeButton = document.getElementById('computeButton');
    
    if (computeButton) {
        computeButton.addEventListener('click', async function() {
            const resultContainer = 'resultContainer';
            
            showLoading(resultContainer);
            
            try {
                const result = await performComputation({
                    // Your input data here
                    input: 'example'
                });
                
                displayComputationResult(result, resultContainer);
            } catch (error) {
                showError(error.message, resultContainer);
            }
        });
    }
});

// ================================
// Export for use in other modules
// ================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRequest,
        fetchProjectsFromAPI,
        performComputation,
        getComputationResult
    };
}

console.log('API module loaded');
