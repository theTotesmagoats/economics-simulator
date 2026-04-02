// Main Application Logic
// Wires up Bastiat X-Ray toggle, delta indicators with context, and pulse animation

class EconomicsApp {
    constructor(model, simulation) {
        this.model = model;
        this.simulation = simulation;
        
        // Initialize components
        this.graph = new CausalGraph('graph-container', model);
        // FIX: Properly initialize industry structure with correct dimensions
        const container = document.getElementById('industry-container');
        this.industryStructure = new IndustryStructure('industry-container', container.clientWidth, container.clientHeight || 300);
        
        // Bind UI elements
        this.bindControls();
        this.bindXRayToggle();
        this.bindNodeInfo();
        
        // Initial render with baseline results
        const baselineResults = simulation.getBaselineResults();
        this.updateAll(baselineResults);
    }
    
    bindControls() {
        // Tariff slider
        const tariffSlider = document.getElementById('tariff-rate');
        const tariffDisplay = document.getElementById('tariff-display');
        
        tariffSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.model.getNode('tariff').value = value;
            tariffDisplay.textContent = `${value}%`;
            this.onPolicyChange('tariff', value);
        });
        
        // Subsidy slider
        const subsidySlider = document.getElementById('subsidy-level');
        const subsidyDisplay = document.getElementById('subsidy-display');
        
        subsidySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.model.getNode('subsidy').value = value;
            subsidyDisplay.textContent = `$${value}`;
            this.onPolicyChange('subsidy', value);
        });
        
        // Lobbying intensity slider
        const lobbyingSlider = document.getElementById('lobbying-intensity');
        const lobbyingDisplay = document.getElementById('lobbying-display');
        const lobbyingLabels = ['Minimal', 'Low', 'Below Average', 'Medium', 'Above Average', 'High', 'Very High', 'Extreme', 'Maximum', 'Pathological'];
        
        lobbyingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.model.getNode('lobbying_intensity').value = value;
            lobbyingDisplay.textContent = lobbyingLabels[Math.min(Math.floor(value - 1), 9)];
            this.onPolicyChange('lobbying', value);
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetToFreeTrade();
        });
    }
    
    bindXRayToggle() {
        const xrayCheckbox = document.getElementById('xray-checkbox');
        const toggleContainer = document.getElementById('bastiat-toggle-container');
        
        xrayCheckbox.addEventListener('change', (e) => {
            const isXRayOn = e.target.checked;
            
            // Toggle body class for CSS effects
            if (isXRayOn) {
                document.body.classList.add('xray-mode');
            } else {
                document.body.classList.remove('xray-mode');
            }
            
            // Update toggle labels visual state
            const labels = toggleContainer.querySelectorAll('.toggle-label');
            labels.forEach(label => {
                if (label.classList.contains('xray-active')) {
                    label.style.opacity = isXRayOn ? '1' : '0.5';
                } else {
                    label.style.opacity = isXRayOn ? '0.5' : '1';
                }
            });
            
            // Show/hide hidden cost elements
            const hiddenCosts = document.querySelectorAll('.hidden-cost');
            hiddenCosts.forEach(el => {
                el.style.display = isXRayOn ? 'flex' : 'none';
            });
            
            // Update graph visualization for X-Ray mode
            if (this.graph) {
                this.graph.toggleXRayMode(isXRayOn);
            }
        });
    }
    
    bindNodeInfo() {
        window.addEventListener('nodeInfo', (e) => {
            const node = e.detail;
            this.showNodeInfo(node);
        });
        
        document.getElementById('close-info').addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });
    }
    
    onPolicyChange(policyType, value) {
        // Run simulation with current policy values
        const results = this.simulation.run();
        
        // Update all displays
        this.updateAll(results);
        
        // Trigger pulse animation along causal path
        const causalPath = this.getCausalPathForPolicy(policyType);
        if (causalPath && causalPath.length > 1) {
            this.graph.triggerPulseAnimation(causalPath);
            this.showChainStrip(causalPath);
        }
    }
    
    getCausalPathForPolicy(policyType) {
        // Define the primary causal chain for each policy
        const paths = {
            'tariff': ['tariff', 'import_price', 'domestic_price', 'consumer_demand', 'consumer_surplus', 'total_dwl'],
            'subsidy': ['subsidy', 'producer_price', 'domestic_supply', 'economic_rent', 'lobbying_effort', 'political_influence'],
            'lobbying': ['lobbying_intensity', 'political_influence', 'tariff', 'import_price', 'consumer_surplus']
        };
        return paths[policyType] || [];
    }
    
    showChainStrip(path) {
        const chainStrip = document.getElementById('chain-strip');
        const chainPath = document.getElementById('chain-path');
        
        // Convert node IDs to readable names
        const pathNames = path.map(id => {
            const node = this.model.getNode(id);
            return node ? node.name : id;
        }).join(' → ');
        
        chainPath.textContent = pathNames;
        chainStrip.classList.remove('hidden');
        
        // Auto-hide after animation
        setTimeout(() => {
            chainStrip.classList.add('hidden');
        }, 3000);
    }
    
    updateAll(results) {
        this.updateDeltaMetrics();
        this.updateTradeoffSnapshot();
        this.updateGroupImpacts();
        this.graph.updateCantillonEffect();
        this.graph.updateDeltaBadges();
        // FIX: Pass results to industry structure render method
        if (results && results.moat_pressure !== undefined) {
            this.industryStructure.render(results.moat_pressure);
            this.industryStructure.updateMetrics(results);
        }
    }
    
    updateDeltaMetrics() {
        const nodes = this.model.getAllNodes();
        
        // Helper to format delta with context
        const formatDelta = (node, baselineKey) => {
            const current = node.value;
            const baseline = node.baselineValue || node[baselineKey] || 100;
            const change = current - baseline;
            const changePercent = baseline !== 0 ? (change / baseline) * 100 : 0;
            
            node.change = change;
            node.changePercent = changePercent;
            
            return { current, change, changePercent };
        };
        
        // Consumer Price
        const priceNode = nodes.find(n => n.id === 'domestic_price');
        if (priceNode) {
            const delta = formatDelta(priceNode);
            const valueEl = document.getElementById('delta-price-val');
            const contextEl = document.getElementById('delta-price-context');
            
            valueEl.innerHTML = `$${delta.current.toFixed(1)} ${delta.change > 0 ? '<span class="delta-up">▲</span>' : delta.change < 0 ? '<span class="delta-down">▼</span>' : ''}`;
            contextEl.textContent = delta.change > 0 
                ? `Inflationary pressure (+${delta.changePercent.toFixed(1)}%)`
                : delta.change < 0
                ? `Deflationary benefit (${delta.changePercent.toFixed(1)}%)`
                : 'At baseline';
        }
        
        // Domestic Production
        const prodNode = nodes.find(n => n.id === 'domestic_supply');
        if (prodNode) {
            const delta = formatDelta(prodNode);
            const valueEl = document.getElementById('delta-prod-val');
            const contextEl = document.getElementById('delta-prod-context');
            
            valueEl.innerHTML = `${delta.current.toFixed(0)} units ${delta.change > 0 ? '<span class="delta-up">▲</span>' : delta.change < 0 ? '<span class="delta-down">▼</span>' : ''}`;
            contextEl.textContent = delta.change > 0 
                ? `Protected production (+${delta.change.toFixed(0)} units)`
                : delta.change < 0
                ? `Reduced domestic output (${delta.change.toFixed(0)} units)`
                : 'At baseline';
        }
        
        // Imports
        const importNode = nodes.find(n => n.id === 'imports');
        if (importNode) {
            const delta = formatDelta(importNode);
            const valueEl = document.getElementById('delta-import-val');
            const contextEl = document.getElementById('delta-import-context');
            
            valueEl.innerHTML = `${delta.current.toFixed(0)} units ${delta.change > 0 ? '<span class="delta-up">▲</span>' : delta.change < 0 ? '<span class="delta-down">▼</span>' : ''}`;
            contextEl.textContent = delta.change > 0 
                ? `Higher import dependence`
                : delta.change < 0
                ? `Import restriction (${delta.change.toFixed(0)} fewer units)`
                : 'At baseline';
        }
        
        // Economic Rents Created
        const rentNode = nodes.find(n => n.id === 'economic_rent');
        if (rentNode) {
            const delta = formatDelta(rentNode);
            const valueEl = document.getElementById('delta-rent-val');
            const contextEl = document.getElementById('delta-rent-context');
            
            valueEl.innerHTML = `$${delta.current.toFixed(0)} ${delta.change > 0 ? '<span class="delta-up">▲</span>' : ''}`;
            contextEl.textContent = delta.change > 0 
                ? `The "prize" motivating rent-seeking behavior`
                : 'No artificial rents created';
        }
        
        // Lobbying Expenditure
        const lobbyNode = nodes.find(n => n.id === 'lobbying_effort');
        if (lobbyNode) {
            const delta = formatDelta(lobbyNode);
            const valueEl = document.getElementById('delta-lobby-val');
            const contextEl = document.getElementById('delta-lobby-context');
            
            valueEl.innerHTML = `$${delta.current.toFixed(0)} ${delta.change > 0 ? '<span class="delta-up">▲</span>' : ''}`;
            contextEl.textContent = delta.change > 0 
                ? `Resources wasted on political competition`
                : 'Minimal rent-seeking activity';
        }
        
        // The Invisible Graveyard (Deadweight Loss)
        const dwlNode = nodes.find(n => n.id === 'total_dwl');
        if (dwlNode) {
            const delta = formatDelta(dwlNode);
            const valueEl = document.getElementById('delta-dwl-val');
            const contextEl = document.getElementById('delta-dwl-context');
            
            valueEl.innerHTML = `$${delta.current.toFixed(0)} ${delta.change > 0 ? '<span class="delta-up">▲</span>' : ''}`;
            contextEl.textContent = delta.change > 0 
                ? `Lost economic opportunity - trades that never happened`
                : 'Market operating efficiently';
        }
    }
    
    updateTradeoffSnapshot() {
        const nodes = this.model.getAllNodes();
        
        // Find biggest winner and loser by welfare change
        let maxGain = { node: null, gain: 0 };
        let maxLoss = { node: null, loss: 0 };
        
        nodes.forEach(node => {
            if (node.type === 'welfare') {
                const change = node.change || 0;
                if (change > maxGain.gain) maxGain = { node, gain: change };
                if (change < -maxLoss.loss) maxLoss = { node, loss: -change };
            }
        });
        
        document.getElementById('biggest-winner').textContent = 
            maxGain.node ? `${maxGain.node.name}: +$${maxGain.gain.toFixed(0)}` : '—';
        document.getElementById('biggest-loser').textContent = 
            maxLoss.node ? `${maxLoss.node.name}: -$${maxLoss.loss.toFixed(0)}` : '—';
        
        // Hidden cost bearer (always consumers in protectionism)
        const consumerNode = nodes.find(n => n.id === 'consumer_surplus');
        if (consumerNode && consumerNode.change < 0) {
            document.getElementById('hidden-cost-bearer').textContent = 
                `Households: -$${Math.abs(consumerNode.change).toFixed(0)} in surplus`;
        } else {
            document.getElementById('hidden-cost-bearer').textContent = '—';
        }
        
        // Delayed risk (political influence buildup)
        const politicalNode = nodes.find(n => n.id === 'political_influence');
        if (politicalNode && politicalNode.value > 60) {
            document.getElementById('delayed-risk').textContent = 
                `Policy lock-in (${politicalNode.value.toFixed(0)} index)`;
        } else if (politicalNode) {
            document.getElementById('delayed-risk').textContent = 'Low';
        }
    }
    
    updateGroupImpacts() {
        const nodes = this.model.getAllNodes();
        
        // Calculate aggregate impacts for each group
        const householdImpact = (nodes.find(n => n.id === 'consumer_surplus')?.change || 0) + 
                                (nodes.find(n => n.id === 'total_dwl')?.change || 0);
        
        const smallBizImpact = (nodes.find(n => n.id === 'domestic_supply')?.change || 0) * 0.3;
        
        const incumbentImpact = (nodes.find(n => n.id === 'producer_surplus')?.change || 0) + 
                                (nodes.find(n => n.id === 'economic_rent')?.change || 0);
        
        const entrantImpact = -(nodes.find(n => n.id === 'political_influence')?.value || 50 - 50) * 2;
        
        // Update displays
        this.updateGroupDisplay('household-impact', householdImpact, 'Households');
        this.updateGroupDisplay('smallbiz-impact', smallBizImpact, 'Small Business');
        this.updateGroupDisplay('incumbent-impact', incumbentImpact, 'Incumbents');
        this.updateGroupDisplay('entrant-impact', entrantImpact, 'Future Entrants');
    }
    
    updateGroupDisplay(elementId, impact, groupName) {
        const el = document.getElementById(elementId);
        if (impact > 10) {
            el.textContent = `+$${impact.toFixed(0)} benefit`;
            el.className = 'group-value positive';
        } else if (impact < -10) {
            el.textContent = `-$${Math.abs(impact).toFixed(0)} harm`;
            el.className = 'group-value negative';
        } else {
            el.textContent = 'Minimal impact';
            el.className = 'group-value';
        }
    }
    
    showNodeInfo(node) {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('node-title');
        const value = document.getElementById('node-value');
        const explanation = document.getElementById('node-explanation');
        
        title.textContent = node.name;
        value.textContent = `${node.unit ? node.unit : ''} ${node.value.toFixed(2)}`;
        explanation.textContent = node.description || 'No description available.';
        
        panel.classList.remove('hidden');
    }
    
    resetToFreeTrade() {
        // Reset all policy sliders
        document.getElementById('tariff-rate').value = 0;
        document.getElementById('subsidy-level').value = 0;
        document.getElementById('lobbying-intensity').value = 5;
        
        // Update displays
        document.getElementById('tariff-display').textContent = '0%';
        document.getElementById('subsidy-display').textContent = '$0';
        document.getElementById('lobbying-display').textContent = 'Medium';
        
        // Reset model values
        this.model.getNode('tariff').value = 0;
        this.model.getNode('subsidy').value = 0;
        this.model.getNode('lobbying_intensity').value = 5;
        
        // Re-run simulation with baseline results
        const baselineResults = this.simulation.getBaselineResults();
        this.updateAll(baselineResults);
    }
}
