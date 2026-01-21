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
     * Get CSS class for role badge based on role type
     */
    function getRoleBadgeClass(role) {
        const interactiveRoles = [
            'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
            'listbox', 'menu', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
            'option', 'slider', 'spinbutton', 'switch', 'tab', 'searchbox',
            'scrollbar', 'progressbar'
        ];
        const landmarkRoles = [
            'navigation', 'main', 'banner', 'contentinfo', 'complementary',
            'region', 'search', 'form', 'application'
        ];
        const structureRoles = [
            'heading', 'list', 'listitem', 'table', 'row', 'cell', 'rowheader',
            'columnheader', 'grid', 'gridcell', 'treegrid', 'tree', 'treeitem',
            'article', 'document', 'group', 'img', 'figure', 'separator',
            'toolbar', 'tablist', 'tabpanel', 'definition', 'term', 'directory'
        ];

        const lowerRole = role.toLowerCase();
        if (interactiveRoles.includes(lowerRole)) return 'role-interactive';
        if (landmarkRoles.includes(lowerRole)) return 'role-landmark';
        if (structureRoles.includes(lowerRole)) return 'role-structure';
        return 'role-generic';
    }

    /**
     * Render property badges for a node
     */
    function renderNodeProperties(node) {
        const props = [];

        // Boolean properties
        const boolProps = ['disabled', 'focused', 'focusable', 'expanded', 'selected', 'required', 'readonly', 'checked', 'pressed'];
        for (const prop of boolProps) {
            if (node[prop] === true) {
                props.push(`<span class="a11y-prop prop-${prop}">${prop}</span>`);
            }
        }

        // Value properties
        if (node.level !== undefined) {
            props.push(`<span class="a11y-prop prop-level">level: ${escapeHtml(String(node.level))}</span>`);
        }
        if (node.value !== undefined && node.value !== '') {
            const displayValue = String(node.value).length > 30
                ? String(node.value).substring(0, 30) + '...'
                : String(node.value);
            props.push(`<span class="a11y-prop prop-value">value: ${escapeHtml(displayValue)}</span>`);
        }
        if (node.haspopup) {
            props.push(`<span class="a11y-prop prop-haspopup">haspopup: ${escapeHtml(String(node.haspopup))}</span>`);
        }

        return props.length > 0 ? `<span class="a11y-props">${props.join('')}</span>` : '';
    }

    /**
     * Render a single accessibility tree node recursively
     */
    function renderA11yNode(node, depth = 0) {
        const hasChildren = node.children && node.children.length > 0;
        const roleClass = getRoleBadgeClass(node.role);
        const toggleClass = hasChildren ? '' : 'empty';

        // Truncate name to 100 chars
        let displayName = '';
        if (node.name) {
            displayName = node.name.length > 100
                ? node.name.substring(0, 100) + '...'
                : node.name;
        }

        const propsHtml = renderNodeProperties(node);

        let childrenHtml = '';
        if (hasChildren) {
            const childNodes = node.children.map(child => renderA11yNode(child, depth + 1)).join('');
            // Start expanded by default (no 'collapsed' class)
            childrenHtml = `<div class="a11y-node-children">${childNodes}</div>`;
        }

        return `
            <div class="a11y-node">
                <div class="a11y-node-header" onclick="window.toggleA11yNode(this)">
                    <span class="a11y-node-toggle ${toggleClass}">${hasChildren ? '&#9660;' : ''}</span>
                    <span class="a11y-role ${roleClass}">${escapeHtml(node.role)}</span>
                    ${displayName ? `<span class="a11y-node-name">${escapeHtml(displayName)}</span>` : ''}
                    ${propsHtml}
                </div>
                ${childrenHtml}
            </div>
        `;
    }

    /**
     * Render the full accessibility tree section
     */
    function renderAccessibilityTree(tree, pageId) {
        if (!tree) {
            return '';
        }

        const treeId = `a11y-tree-${pageId}`;
        const treeHtml = renderA11yNode(tree);

        return `
            <div class="a11y-tree-section">
                <div class="a11y-tree-header" onclick="window.toggleTreeSection('${treeId}')">
                    <h4>Accessibility Tree</h4>
                    <span class="a11y-tree-toggle" id="${treeId}-toggle">Click to expand</span>
                </div>
                <div class="a11y-tree-container collapsed" id="${treeId}">
                    <div class="a11y-tree-controls">
                        <button onclick="event.stopPropagation(); window.expandAllNodes('${treeId}')">Expand All</button>
                        <button onclick="event.stopPropagation(); window.collapseAllNodes('${treeId}')">Collapse All</button>
                    </div>
                    ${treeHtml}
                </div>
            </div>
        `;
    }

    /**
     * Toggle a single accessibility tree node
     */
    window.toggleA11yNode = function(headerElement) {
        const nodeEl = headerElement.parentElement;
        const childrenEl = nodeEl.querySelector(':scope > .a11y-node-children');
        const toggleEl = headerElement.querySelector('.a11y-node-toggle');

        if (childrenEl) {
            const isCollapsed = childrenEl.classList.contains('collapsed');
            childrenEl.classList.toggle('collapsed');
            toggleEl.innerHTML = isCollapsed ? '&#9660;' : '&#9654;';
        }
    };

    /**
     * Toggle the entire tree section visibility
     */
    window.toggleTreeSection = function(treeId) {
        const container = document.getElementById(treeId);
        const toggleText = document.getElementById(treeId + '-toggle');

        if (container) {
            const isCollapsed = container.classList.contains('collapsed');
            container.classList.toggle('collapsed');
            toggleText.textContent = isCollapsed ? 'Click to collapse' : 'Click to expand';
        }
    };

    /**
     * Expand all nodes in a tree
     */
    window.expandAllNodes = function(treeId) {
        const container = document.getElementById(treeId);
        if (container) {
            container.querySelectorAll('.a11y-node-children').forEach(el => {
                el.classList.remove('collapsed');
            });
            container.querySelectorAll('.a11y-node-toggle').forEach(el => {
                if (!el.classList.contains('empty')) {
                    el.innerHTML = '&#9660;';
                }
            });
        }
    };

    /**
     * Collapse all nodes in a tree
     */
    window.collapseAllNodes = function(treeId) {
        const container = document.getElementById(treeId);
        if (container) {
            container.querySelectorAll('.a11y-node-children').forEach(el => {
                el.classList.add('collapsed');
            });
            container.querySelectorAll('.a11y-node-toggle').forEach(el => {
                if (!el.classList.contains('empty')) {
                    el.innerHTML = '&#9654;';
                }
            });
        }
    };

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

        // Create a safe page ID for the accessibility tree section
        const safePageId = (result.locale + '-' + (result.pageId || result.route || 'page'))
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

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

        // Render accessibility tree section
        const accessibilityTreeHtml = renderAccessibilityTree(result.accessibilityTree, safePageId);

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
                ${accessibilityTreeHtml}
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
