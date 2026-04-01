// Main Application Logic
// Ties together model, simulation, and visualization

class EconomicsSimulator {
    constructor() {
        this.model = new EconomicModel();
        this.simulation = new EconomicSimulation(this.model);
        
        // Get container dimensions
        const vizContainer = document.getElementById('visualization');
        const width = vizContainer.clientWidth - 40;
        const height = 700;
        
        this.graph = new CausalGraph('graph-container', width, height);
        
        this.baselineResults = null;
        this.currentResults = null;
        this.changes = null;
        
        this.init();
    }
    
    init() {
        // Initialize graph with model data
        const graphData = {
            nodes: this.model.getAllNodes(),
            edges: this.model.edges
        };
        this.graph.init(graphData);
        
        // Calculate baseline (free trade)
        this.baselineResults = this.simulation.getBaselineResults();
        this.currentResults = { ...this.baselineResults };
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial render
        this.updateDisplay();
    }
    
    setupEventListeners() {
        const tariffSlider = document.getElementById('tariff-rate');
        const subsidySlider = document.getElementById('subsidy-level');
        const lobbyingSlider = document.getElementById('lobbying-intensity');
        const resetBtn = document.getElementById('reset-btn');
        
        // Slider change handlers
        tariffSlider.addEventListener('input', (e) => {
            this.updatePolicy('tariff', parseFloat(e.target.value));
            document.getElementById('tariff-display').textContent = `${e.target.value}%`;
        });
        
        subsidySlider.addEventListener('input', (e) => {
            this.updatePolicy('subsidy', parseFloat(e.target.value));
            document.getElementById('subsidy-display').textContent = `$${e.target.value}`;
        });
        
        lobbyingSlider.addEventListener('input', (e) => {
            const values = ['Very Low', 'Low', 'Below Average', 'Medium-Low', 'Medium', 
                           'Medium-High', 'High', 'Above Average', 'Very High', 'Extreme'];
            document.getElementById('lobbying-display').textContent = values[e.target.value - 1];
            this.runSimulation();
        });
        
        // Reset button
        resetBtn.addEventListener('click', () => {
            tariffSlider.value = 0;
            subsidySlider.value = 0;
            lobbyingSlider.value = 5;
            document.getElementById('tariff-display').textContent = '0%';
            document.getElementById('subsidy-display').textContent = '$0';
            document.getElementById('lobbying-display').textContent = 'Medium';
            this.updatePolicy('tariff', 0);
            this.updatePolicy('subsidy', 0);
            this.runSimulation();
        });
        
        // Node click for info panel
        this.setupNodeClickHandler();
        
        // Close info panel
        document.getElementById('close-info').addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
            this.graph.resetHighlights();
        });
    }
    
    updatePolicy(type, value) {
        const node = this.model.getNode(type);
        if (node) {
            node.value = value;
        }
        this.runSimulation();
    }
    
    runSimulation() {
        const tariffRate = parseFloat(document.getElementById('tariff-rate').value);
        const subsidyLevel = parseFloat(document.getElementById('subsidy-level').value);
        const lobbyingIntensity = parseFloat(document.getElementById('lobbying-intensity').value);
        
        this.currentResults = this.simulation.runSimulation(tariffRate, subsidyLevel, lobbyingIntensity);
        this.changes = this.simulation.calculateChanges(this.currentResults, this.baselineResults);
        
        // Update graph with new values
        this.graph.updateValues(this.currentResults, this.changes);
        
        // Find affected nodes for animation
        const affectedNodes = Object.keys(this.changes)
            .filter(key => Math.abs(this.changes[key].changePercent) > 1)
            .filter(key => key !== 'tariff' && key !== 'subsidy');
        
        // Animate propagation from policy nodes
        if (affectedNodes.length > 0) {
            this.graph.animatePropagation('tariff', affectedNodes);
        }
        
        // Update metrics panel
        this.updateMetrics();
    }
    
    updateMetrics() {
        const r = this.currentResults;
        
        document.getElementById('consumer-price').textContent = `$${r.domestic_price.toFixed(1)}`;
        document.getElementById('domestic-production').textContent = `${r.domestic_supply.toFixed(0)} units`;
        document.getElementById('imports').textContent = `${r.imports.toFixed(0)} units`;
        document.getElementById('gov-revenue').textContent = `$${r.gov_revenue.toFixed(0)}`;
        document.getElementById('rents-created').textContent = `$${r.economic_rent.toFixed(0)}`;
        document.getElementById('lobbying-cost').textContent = `$${r.lobbying_effort.toFixed(0)}`;
        document.getElementById('deadweight-loss').textContent = `$${r.total_dwl.toFixed(0)}`;
    }
    
    setupNodeClickHandler() {
        // We'll add click handlers after the graph is rendered
        setTimeout(() => {
            const nodeElements = document.querySelectorAll('.node');
            nodeElements.forEach((element, index) => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showNodeInfo(index);
                });
            });
        }, 100);
    }
    
    showNodeInfo(nodeIndex) {
        const nodes = this.graph.nodes.data();
        const node = nodes[nodeIndex];
        if (!node) return;
        
        const nodeId = node.id;
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
            explanation += `\n\nFormula: ${modelNode.formula}`;
        }
        
        // Add context about what this represents
        if (nodeId === 'economic_rent') {
            explanation += '\n\n<em>This is the "prize" that motivates rent-seeking. Protected producers earn above-market profits, which incentivizes them to spend resources lobbying to maintain protection.</em>';
        } else if (nodeId === 'lobbying_effort') {
            explanation += '\n\n<em>Resources spent on lobbying are wasted from society\'s perspective — they produce nothing but serve only to capture or defend rents. This is pure deadweight loss.</em>';
        } else if (nodeId === 'political_influence') {
            explanation += '\n\n<em>The trap: influence accumulates and biases future policy, creating path dependence. Protection begets more protection through political feedback loops.</em>';
        }
        
        // Update info panel
        document.getElementById('node-title').innerHTML = `${modelNode.name}${changeHtml}`;
        document.getElementById('node-value').textContent = valueStr;
        document.getElementById('node-explanation').innerHTML = explanation.replace(/\n/g, '<br>');
        document.getElementById('info-panel').classList.remove('hidden');
        
        // Highlight node in graph
        this.graph.highlightNode(nodeId);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new EconomicsSimulator();
});