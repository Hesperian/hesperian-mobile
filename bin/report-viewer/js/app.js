/**
 * Accessibility Report Viewer
 * Dynamically loads and displays accessibility-results.json
 */

(function() {
    'use strict';

    const DATA_FILE = 'accessibility-results.json';

    /**
     * Escape HTML special characters
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Calculate summary statistics from results
     */
    function calculateSummary(results) {
        return {
            totalPages: results.length,
            totalViolations: results.reduce((sum, r) => sum + (r.violations?.length || 0), 0),
            pagesWithViolations: results.filter(r => r.violations?.length > 0).length,
            pagesWithErrors: results.filter(r => r.error).length
        };
    }

    /**
     * Update summary section
     */
    function renderSummary(summary) {
        const totalEl = document.querySelector('#summary-total .value');
        const violationsEl = document.querySelector('#summary-violations .value');
        const pagesViolationsEl = document.querySelector('#summary-pages-violations .value');
        const errorsEl = document.querySelector('#summary-errors .value');

        totalEl.textContent = summary.totalPages;
        violationsEl.textContent = summary.totalViolations;
        pagesViolationsEl.textContent = summary.pagesWithViolations;
        errorsEl.textContent = summary.pagesWithErrors;

        // Update summary item classes based on values
        const violationsItem = document.getElementById('summary-violations');
        violationsItem.classList.remove('error', 'success');
        violationsItem.classList.add(summary.totalViolations > 0 ? 'error' : 'success');

        const pagesViolationsItem = document.getElementById('summary-pages-violations');
        pagesViolationsItem.classList.remove('warning', 'success');
        pagesViolationsItem.classList.add(summary.pagesWithViolations > 0 ? 'warning' : 'success');

        const errorsItem = document.getElementById('summary-errors');
        errorsItem.classList.remove('error', 'success');
        errorsItem.classList.add(summary.pagesWithErrors > 0 ? 'error' : 'success');
    }

    /**
     * Render test configuration info
     */
    function renderConfig(results) {
        const configEl = document.getElementById('test-config');

        // Extract locale info from first result
        const locales = [...new Set(results.map(r => r.locale).filter(Boolean))];
        const localeLabel = locales.length > 1 ? 'Multiple locales' : (locales[0] || 'Unknown');

        // Get timestamp from first result
        const timestamp = results[0]?.timestamp ? new Date(results[0].timestamp).toLocaleString() : 'Unknown';

        configEl.innerHTML = `
            <strong>Test Configuration:</strong><br>
            Locale: ${escapeHtml(localeLabel)} | Pages: ${results.length} page(s) | Generated: ${timestamp}
        `;
    }

    /**
     * Render a single violation
     */
    function renderViolation(violation) {
        const impactClass = `impact-${violation.impact}`;
        const violationClass = (violation.impact === 'critical' || violation.impact === 'serious')
            ? 'violation-critical'
            : violation.impact === 'moderate'
                ? 'violation-moderate'
                : 'violation-minor';

        let nodesHtml = '';
        if (violation.nodes) {
            violation.nodes.forEach(node => {
                const escapedHtml = escapeHtml(node.html);
                nodesHtml += `
                    <div class="violation-node">
                        <strong>Element:</strong><br>
                        <code>${escapedHtml}</code>
                        <strong>Impact:</strong> ${escapeHtml(node.impact)}<br>
                        ${node.failureSummary ? `<strong>Issue:</strong> ${escapeHtml(node.failureSummary)}<br>` : ''}
                    </div>
                `;
            });
        }

        return `
            <div class="violation ${violationClass}">
                <h4>
                    <span class="violation-impact ${impactClass}">${violation.impact.toUpperCase()}</span>
                    ${escapeHtml(violation.help)}
                </h4>
                <p><strong>Description:</strong> ${escapeHtml(violation.description)}</p>
                <p><strong>WCAG Tags:</strong> ${escapeHtml(violation.tags?.join(', ') || '')}</p>
                <p><strong>Affected elements:</strong> ${violation.nodes?.length || 0}</p>
                <div class="violation-nodes">
                    ${nodesHtml}
                </div>
                <p><strong>Learn more:</strong> <a href="${escapeHtml(violation.helpUrl)}" target="_blank">${escapeHtml(violation.helpUrl)}</a></p>
            </div>
        `;
    }

    /**
     * Render a single page result
     */
    function renderPageResult(result) {
        const hasViolations = result.violations?.length > 0;
        const hasError = !!result.error;
        const cssClass = hasError ? 'has-error' : hasViolations ? 'has-violations' : 'clean';

        let errorHtml = '';
        if (result.error) {
            errorHtml = `
                <div class="violation violation-critical">
                    <h4>Test Error</h4>
                    <p>${escapeHtml(result.error)}</p>
                </div>
            `;
        }

        let screenshotHtml = '';
        if (result.screenshot) {
            screenshotHtml = `
                <div class="page-screenshot">
                    <strong>Screenshot:</strong><br>
                    <img src="${escapeHtml(result.screenshot)}" alt="Screenshot of ${escapeHtml(result.title)}">
                </div>
            `;
        }

        let successHtml = '';
        if (!result.error && result.violations?.length === 0) {
            successHtml = `
                <p class="success-message">No accessibility violations found!</p>
                <p><strong>Tests passed:</strong> ${result.passes || 0}</p>
            `;
        }

        let violationsHtml = '';
        if (result.violations) {
            violationsHtml = result.violations.map(renderViolation).join('');
        }

        return `
            <div class="page-result ${cssClass}">
                <h2 class="page-title">${escapeHtml(result.title)}</h2>
                <div class="page-meta">
                    <strong>Locale:</strong> ${escapeHtml(result.locale)} |
                    <strong>Route:</strong> ${escapeHtml(result.route)} |
                    <strong>URL:</strong> <a href="${escapeHtml(result.url)}" target="_blank">${escapeHtml(result.url)}</a>
                </div>
                ${errorHtml}
                ${screenshotHtml}
                ${successHtml}
                ${violationsHtml}
            </div>
        `;
    }

    /**
     * Render all results
     */
    function renderResults(results) {
        const container = document.getElementById('results-container');
        container.innerHTML = results.map(renderPageResult).join('');
    }

    /**
     * Show error message
     */
    function showError(message) {
        document.getElementById('loading').style.display = 'none';
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Show report content
     */
    function showReport() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('report-content').style.display = 'block';
        document.getElementById('report-footer').style.display = 'block';
    }

    /**
     * Load and render the accessibility report
     */
    async function loadReport() {
        try {
            const response = await fetch(DATA_FILE);

            if (!response.ok) {
                throw new Error(`Failed to load ${DATA_FILE}: ${response.status} ${response.statusText}`);
            }

            const results = await response.json();

            if (!Array.isArray(results)) {
                throw new Error('Invalid data format: expected an array of results');
            }

            const summary = calculateSummary(results);

            renderConfig(results);
            renderSummary(summary);
            renderResults(results);
            showReport();

        } catch (error) {
            console.error('Error loading accessibility report:', error);
            showError(`Error loading report: ${error.message}`);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadReport);
    } else {
        loadReport();
    }
})();
