// Main Application Logic
// Ties together model, simulation, causal graph, and industry structure

class EconomicsSimulator {
    constructor() {
        this.model = new EconomicModel();
        this.simulation = new EconomicSimulation(this.model);
        
        // Get container dimensions
        const vizContainer = document.getElementById('visualization');
        const width = Math.max(700, vizContainer.clientWidth - 40);
        
        // Initialize causal graph
        this.graph = new CausalGraph('graph-container', width, 420);
        
        // Initialize industry structure visualization
        this.industryStructure = new IndustryStructure('industry-container', width, 300);
        
        this.baselineResults = null;
        this.currentResults = null;
        this.changes = null;
        this.lastSourceNode = null;
        this.animationToken = 0; // For canceling stale animations
        
        console.log('EconomicsSimulator initialized');
        this.init();
    }
    
    init() {
        // Initialize causal graph with model data
        const graphData = {
            nodes: this.model.getAllNodes(),
            edges: this.model.edges
        };
        console.log('Graph data:', graphData.nodes.length, 'nodes,', graphData.edges.length, 'edges');
        this.graph.init(graphData);
        
        // Initialize industry structure visualization
        this.industryStructure.init();
        
        // Calculate baseline (free trade)
        this.baselineResults = this.simulation.getBaselineResults();
        this.currentResults = { ...this.baselineResults };
        console.log('Baseline results:', this.baselineResults);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial render of metrics
        this.updateMetrics();
        this.industryStructure.updateMetrics(this.currentResults);
    }
    
    setupEventListeners() {
        const tariffSlider = document.getElementById('tariff-rate');
        const subsidySlider = document.getElementById('subsidy-level');
        const lobbyingSlider = document.getElementById('lobbying-intensity');
        const resetBtn = document.getElementById('reset-btn');
        const explainModeCheckbox = document.getElementById('explain-mode-checkbox');
        
        console.log('Setting up event listeners...');
        
        // Slider change handlers
        tariffSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            console.log('Tariff changed to:', value);
            document.getElementById('tariff-display').textContent = `${value}%`;
            this.lastSourceNode = 'tariff';
            this.runSimulation();
        });
        
        subsidySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            console.log('Subsidy changed to:', value);
            document.getElementById('subsidy-display').textContent = `$${value}`;
            this.lastSourceNode = 'subsidy';
            this.runSimulation();
        });
        
        lobbyingSlider.addEventListener('input', (e) => {
            const values = ['Very Low', 'Low', 'Below Average', 'Medium-Low', 'Medium', 
                           'Medium-High', 'High', 'Above Average', 'Very High', 'Extreme'];
            document.getElementById('lobbying-display').textContent = values[e.target.value - 1];
            console.log('Lobbying intensity changed to:', e.target.value);
            this.lastSourceNode = 'lobbying_effort'; // Set source node for lobbying!
            this.runSimulation();
        });
        
        // Reset button
        resetBtn.addEventListener('click', () => {
            console.log('Reset clicked');
            tariffSlider.value = 0;
            subsidySlider.value = 0;
            lobbyingSlider.value = 5;
            document.getElementById('tariff-display').textContent = '0%';
            document.getElementById('subsidy-display').textContent = '$0';
            document.getElementById('lobbying-display').textContent = 'Medium';
            this.lastSourceNode = null;
            
            // Clear summary strip and chain strip
            document.getElementById('summary-strip').classList.add('hidden');
            document.getElementById('chain-strip').classList.add('hidden');
            
            // Close info panel if open
            document.getElementById('info-panel').classList.add('hidden');
            
            this.runSimulation();
        });
        
        // Explain mode toggle
        explainModeCheckbox.addEventListener('change', (e) => {
            this.graph.explainMode = e.target.checked;
            console.log('Explain mode:', e.target.checked);
        });
        
        // Close info panel
        document.getElementById('close-info').addEventListener('click', () => {
            this.closeInfoPanel();
        });
        
        // Escape key closes info panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeInfoPanel();
            }
        });
        
        // Click outside info panel closes it
        document.addEventListener('click', (e) => {
            const infoPanel = document.getElementById('info-panel');
            if (!infoPanel.classList.contains('hidden') && !infoPanel.contains(e.target)) {
                this.closeInfoPanel();
            }
        });
    }
    
    closeInfoPanel() {
        document.getElementById('info-panel').classList.add('hidden');
    }
    
    runSimulation() {
        console.log('Running simulation...');
        const tariffRate = parseFloat(document.getElementById('tariff-rate').value);
        const subsidyLevel = parseFloat(document.getElementById('subsidy-level').value);
        const lobbyingIntensity = parseFloat(document.getElementById('lobbying-intensity').value);
        
        console.log('Inputs: tariff=', tariffRate, 'subsidy=', subsidyLevel, 'lobbying=', lobbyingIntensity);
        
        this.currentResults = this.simulation.runSimulation(tariffRate, subsidyLevel, lobbyingIntensity);
        this.changes = this.simulation.calculateChanges(this.currentResults, this.baselineResults);
        
        console.log('Current results:', this.currentResults);
        console.log('Moat pressure:', this.currentResults.moat_pressure);
        
        // Update causal graph with new values and propagation animation
        this.graph.updateValues(this.currentResults, this.changes, this.lastSourceNode);
        
        // Update industry structure visualization
        this.industryStructure.render(this.currentResults.moat_pressure);
        
        // Update metrics panels
        this.updateMetrics();
        this.industryStructure.updateMetrics(this.currentResults);
        
        // Update summary text, chain strip, and tradeoff panel
        this.updateSummaryAndTradeoffs(tariffRate, subsidyLevel, lobbyingIntensity);
    }
    
    updateMetrics() {
        const r = this.currentResults;
        console.log('Updating metrics:', r);
        
        document.getElementById('consumer-price').textContent = `$${r.domestic_price.toFixed(1)}`;
        document.getElementById('domestic-production').textContent = `${Math.round(r.domestic_supply)} units`;
        document.getElementById('imports').textContent = `${Math.round(r.imports)} units`;
        document.getElementById('gov-revenue').textContent = `$${Math.round(r.gov_revenue)}`;
        document.getElementById('rents-created').textContent = `$${Math.round(r.economic_rent)}`;
        document.getElementById('lobbying-cost').textContent = `$${Math.round(r.lobbying_effort)}`;
        document.getElementById('deadweight-loss').textContent = `$${Math.round(r.total_dwl)}`;
    }
    
    updateSummaryAndTradeoffs(tariffRate, subsidyLevel, lobbyingIntensity) {
        const r = this.currentResults;
        const c = this.changes;
        
        // Generate summary text
        let summaryParts = [];
        
        if (tariffRate > 0) {
            const priceChange = Math.round((r.domestic_price - this.baselineResults.domestic_price));
            summaryParts.push(`Higher tariffs raised domestic prices by $${priceChange}`);
            
            if (r.imports < this.baselineResults.imports) {
                const importDrop = Math.round(this.baselineResults.imports - r.imports);
                summaryParts.push(`and cut imports by ${importDrop} units`);
            }
            
            if (r.economic_rent > 0) {
                summaryParts.push(`creating $${Math.round(r.economic_rent)} in economic rents for protected producers`);
            }
        }
        
        if (subsidyLevel > 0) {
            summaryParts.push(`Subsidies of $${subsidyLevel}/unit increased domestic production but cost taxpayers $${Math.round(r.subsidy_cost)}`);
        }
        
        if (lobbyingIntensity > 5 && r.economic_rent > 100) {
            summaryParts.push(`Higher lobbying intensity amplified rent-seeking, wasting $${Math.round(r.lobbying_effort)} on political competition`);
        }
        
        const summaryText = summaryParts.join(' ').replace(/, and/g, ' and');
        
        if (summaryText) {
            document.getElementById('summary-text').textContent = summaryText;
            document.getElementById('summary-strip').classList.remove('hidden');
        } else {
            document.getElementById('summary-strip').classList.add('hidden');
        }
        
        // Update active chain strip
        this.updateChainStrip();
        
        // Update tradeoff snapshot and group impacts
        this.updateTradeoffSnapshot(r, c);
    }
    
    updateChainStrip() {
        const teachingPaths = {
            tariff: ['Tariff', 'Import Price ↑', 'Domestic Price ↑', 'Demand ↓', 'Imports ↓', 'Rents ↑', 'Lobbying ↑'],
            subsidy: ['Subsidy', 'Producer Price ↑', 'Production ↑', 'Surplus ↑', 'Rents ↑', 'Lobbying ↑'],
            lobbying_effort: ['Lobbying Intensity', 'Political Influence ↑', 'DWL ↑']
        };
        
        const path = teachingPaths[this.lastSourceNode];
        if (path && path.length > 0) {
            document.getElementById('chain-path').textContent = path.join(' → ');
            document.getElementById('chain-strip').classList.remove('hidden');
        } else {
            document.getElementById('chain-strip').classList.add('hidden');
        }
    }
    
    updateTradeoffSnapshot(results, changes) {
        // Determine biggest winner and loser based on surplus changes
        const groups = [
            { name: 'Households', value: results.consumer_surplus - this.baselineResults.consumer_surplus },
            { name: 'Large Firms', value: results.producer_surplus - this.baselineResults.producer_surplus + results.economic_rent },
            { name: 'Government', value: results.gov_revenue - results.subsidy_cost },
            { name: 'Small Business', value: (results.domestic_supply - this.baselineResults.domestic_supply) * 0.5 } // Simplified
        ];
        
        const sorted = [...groups].sort((a, b) => b.value - a.value);
        
        document.getElementById('biggest-winner').textContent = sorted[0].name;
        document.getElementById('biggest-loser').textContent = sorted[sorted.length - 1].name;
        
        // Hidden cost bearer
        if (results.total_dwl > this.baselineResults.total_dwl + 10) {
            document.getElementById('hidden-cost-bearer').textContent = 'Society (via deadweight loss)';
        } else {
            document.getElementById('hidden-cost-bearer').textContent = '—';
        }
        
        // Delayed risk
        if (results.political_influence > 60) {
            document.getElementById('delayed-risk').textContent = 'Political lock-in increasing';
        } else if (results.moat_pressure > 0.5) {
            document.getElementById('delayed-risk').textContent = 'Market concentration rising';
        } else {
            document.getElementById('delayed-risk').textContent = '—';
        }
        
        // Group impacts
        this.updateGroupImpacts(results);
    }
    
    updateGroupImpacts(results) {
        const tariffRate = parseFloat(document.getElementById('tariff-rate').value);
        const subsidyLevel = parseFloat(document.getElementById('subsidy-level').value);
        
        // Household impact
        if (results.domestic_price > this.baselineResults.domestic_price + 1) {
            document.getElementById('household-impact').textContent = 'Purchasing power weakened';
            document.getElementById('household-impact').className = 'group-value negative';
        } else {
            document.getElementById('household-impact').textContent = '—';
            document.getElementById('household-impact').className = 'group-value';
        }
        
        // Small business impact
        if (results.moat_pressure > 0.4) {
            document.getElementById('smallbiz-impact').textContent = 'Input pressure rose; moat widened';
            document.getElementById('smallbiz-impact').className = 'group-value negative';
        } else if (subsidyLevel > 0 && results.domestic_supply > this.baselineResults.domestic_supply) {
            document.getElementById('smallbiz-impact').textContent = 'Production incentives improved';
            document.getElementById('smallbiz-impact').className = 'group-value positive';
        } else {
            document.getElementById('smallbiz-impact').textContent = '—';
            document.getElementById('smallbiz-impact').className = 'group-value';
        }
        
        // Incumbent impact
        if (results.economic_rent > 0 || results.producer_surplus > this.baselineResults.producer_surplus + 10) {
            document.getElementById('incumbent-impact').textContent = 'Protected margins improved';
            document.getElementById('incumbent-impact').className = 'group-value positive';
        } else {
            document.getElementById('incumbent-impact').textContent = '—';
            document.getElementById('incumbent-impact').className = 'group-value';
        }
        
        // Future entrant impact
        if (results.moat_pressure > 0.3) {
            document.getElementById('entrant-impact').textContent = 'Path to entry narrowed';
            document.getElementById('entrant-impact').className = 'group-value negative';
        } else {
            document.getElementById('entrant-impact').textContent = '—';
            document.getElementById('entrant-impact').className = 'group-value';
        }
    }
    
    showNodeInfo(nodeId) {
        const node = this.graph.getNodeById(nodeId);
        if (!node) {
            console.log('No node found with id:', nodeId);
            return;
        }
        
        const modelNode = this.model.getNode(nodeId);
        const result = this.currentResults[nodeId];
        const change = this.changes[nodeId];
        
        // Format value
        let valueStr = '';
        if (result !== undefined) {
            if (modelNode.unit === '$') {
                valueStr = `$${result.toFixed(1)}`;
            } else if (modelNode.unit === '%') {
                valueStr = `${result.toFixed(1)}%`;
            } else {
                valueStr = `${result.toFixed(1)} ${modelNode.unit || ''}`;
            }
        }
        
        // Add change indicator
        let changeHtml = '';
        if (change && Math.abs(change.changePercent) > 0.1) {
            const arrow = change.change > 0 ? '↑' : '↓';
            const color = change.change > 0 ? '#4ade80' : '#f87171';
            changeHtml = `<span style="color: ${color}; margin-left: 8px;">${arrow} ${Math.abs(change.changePercent).toFixed(1)}%</span>`;
        }
        
        // Build explanation
        let explanation = modelNode.description || '';
        if (modelNode.formula) {
            explanation += '<br><br>Formula: ' + modelNode.formula;
        }
        
        // Add context about what this represents
        if (nodeId === 'economic_rent') {
            explanation += '<br><br><em>This is the \"prize\" that motivates rent-seeking. Protected producers earn above-market profits, which incentivizes them to spend resources lobbying to maintain protection.</em>';
        } else if (nodeId === 'lobbying_effort') {
            explanation += '<br><br><em>Resources spent on lobbying are wasted from society\'s perspective — they produce nothing but serve only to capture or defend rents. This is pure deadweight loss.</em>';
        } else if (nodeId === 'political_influence') {
            explanation += '<br><br><em>The trap: influence accumulates and biases future policy, creating path dependence. Protection begets more protection through political feedback loops.</em>';
        }
        
        // Update info panel
        document.getElementById('node-title').innerHTML = `${modelNode.name}${changeHtml}`;
        document.getElementById('node-value').textContent = valueStr;
        document.getElementById('node-explanation').innerHTML = explanation;
        document.getElementById('info-panel').classList.remove('hidden');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing simulator...');
    window.simulator = new EconomicsSimulator();
});