// Main Application Logic
// Ties together model, simulation, and visualization

class EconomicsSimulator {
    constructor() {
        this.model = new EconomicModel();
        this.simulation = new EconomicSimulation(this.model);
        
        // Get container dimensions
        const vizContainer = document.getElementById('visualization');
        const width = Math.max(600, vizContainer.clientWidth - 40);
        const height = 700;
        
        this.graph = new CausalGraph('graph-container', width, height);
        
        this.baselineResults = null;
        this.currentResults = null;
        this.changes = null;
        
        console.log('EconomicsSimulator initialized');
        this.init();
    }
    
    init() {
        // Initialize graph with model data
        const graphData = {
            nodes: this.model.getAllNodes(),
            edges: this.model.edges
        };
        console.log('Graph data:', graphData.nodes.length, 'nodes,', graphData.edges.length, 'edges');
        this.graph.init(graphData);
        
        // Calculate baseline (free trade)
        this.baselineResults = this.simulation.getBaselineResults();
        this.currentResults = { ...this.baselineResults };
        console.log('Baseline results:', this.baselineResults);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial render of metrics
        this.updateMetrics();
    }
    
    setupEventListeners() {
        const tariffSlider = document.getElementById('tariff-rate');
        const subsidySlider = document.getElementById('subsidy-level');
        const lobbyingSlider = document.getElementById('lobbying-intensity');
        const resetBtn = document.getElementById('reset-btn');
        
        console.log('Setting up event listeners...');
        console.log('Tariff slider:', tariffSlider);
        console.log('Subsidy slider:', subsidySlider);
        console.log('Lobbying slider:', lobbyingSlider);
        
        // Slider change handlers
        tariffSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            console.log('Tariff changed to:', value);
            document.getElementById('tariff-display').textContent = `${value}%`;
            this.runSimulation();
        });
        
        subsidySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            console.log('Subsidy changed to:', value);
            document.getElementById('subsidy-display').textContent = `$${value}`;
            this.runSimulation();
        });
        
        lobbyingSlider.addEventListener('input', (e) => {
            const values = ['Very Low', 'Low', 'Below Average', 'Medium-Low', 'Medium', 
                           'Medium-High', 'High', 'Above Average', 'Very High', 'Extreme'];
            document.getElementById('lobbying-display').textContent = values[e.target.value - 1];
            console.log('Lobbying intensity changed to:', e.target.value);
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
            this.runSimulation();
        });
        
        // Node click for info panel
        setTimeout(() => {
            this.setupNodeClickHandler();
        }, 1500);  // Wait for graph to render
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
        console.log('Changes calculated');
        
        // Update graph with new values
        this.graph.updateValues(this.currentResults, this.changes);
        
        // Update metrics panel
        this.updateMetrics();
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
    
    setupNodeClickHandler() {
        console.log('Setting up node click handlers...');
        const nodeElements = document.querySelectorAll('.node');
        console.log('Found', nodeElements.length, 'node elements');
        
        nodeElements.forEach((element, index) => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Node clicked:', index);
                this.showNodeInfo(index);
            });
        });
    }
    
    showNodeInfo(nodeIndex) {
        // Get node data from graph
        const nodes = this.graph.nodeData;
        if (!nodes || !nodes[nodeIndex]) {
            console.log('No node data at index', nodeIndex);
            return;
        }
        
        const node = nodes[nodeIndex];
        const nodeId = node.id;
        console.log('Showing info for node:', nodeId);
        
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
            explanation += '<br><br><em>This is the "prize" that motivates rent-seeking. Protected producers earn above-market profits, which incentivizes them to spend resources lobbying to maintain protection.</em>';
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