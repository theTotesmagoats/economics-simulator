// Graph Visualization with Cantillon Heatmap & Pulse Animation
// Force-directed layout with neutral path colors, welfare-reserved green/red

class CausalGraph {
    constructor(containerId, model) {
        this.container = document.getElementById(containerId);
        this.model = model;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        // Neutral path colors - blue/orange for causal direction
        // Green/red reserved strictly for welfare gain/loss
        this.colors = {
            policy: '#ef4444',      // Red - intervention source
            market: '#3b82f6',      // Blue - price signals  
            quantity: '#60a5fa',    // Light blue - quantities
            welfare: '#10b981',     // Green - ONLY for positive welfare
            'rent-seeking': '#f59e0b', // Orange - rent creation
            political: '#f97316',   // Dark orange - political feedback
            
            // Edge colors - neutral, no moral signaling
            edgePositive: '#60a5fa',  // Blue arrow - direct relationship
            edgeNegative: '#fb923c',  // Orange arrow - inverse relationship
            
            // Welfare-specific (ONLY for surplus/loss)
            welfareGain: '#22c55e',   // Green - ONLY welfare gain
            welfareLoss: '#ef4444'    // Red - ONLY welfare loss/deadweight
        };
        
        this.svg = null;
        this.nodes = new Map();
        this.edges = [];
        this.activePath = [];
        this.pulseAnimation = null;
        this.xrayMode = false;
        this.nodeElements = null;  // Store references for highlighting
        
        this.init();
    }
    
    init() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create SVG with proper viewBox
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);
        
        // Define markers for arrowheads
        const defs = this.svg.append('defs');
        
        // Blue arrowhead (direct relationship)
        defs.append('marker')
            .attr('id', 'arrow-positive')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', this.colors.edgePositive);
        
        // Orange arrowhead (inverse relationship)
        defs.append('marker')
            .attr('id', 'arrow-negative')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', this.colors.edgeNegative);
        
        // Glow filter for Cantillon effect
        defs.append('filter')
            .attr('id', 'cantillon-glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%')
            .append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        
        const feMerge = defs.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        
        // X-Ray ghost filter for unseen effects
        defs.append('filter')
            .attr('id', 'xray-ghost')
            .append('feColorMatrix')
            .attr('type', 'matrix')
            .attr('values', '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.3 0');
        
        this.render();
    }
    
    render() {
        const nodes = this.model.getAllNodes();
        const edges = this.model.edges;
        
        // Calculate positions using fixed column layout with force-directed refinement
        const nodePositions = this.calculatePositions(nodes);
        
        // Store positions on nodes
        nodes.forEach(node => {
            node.x = nodePositions[node.id].x;
            node.y = nodePositions[node.id].y;
        });
        
        // Create edge group (rendered first so edges are behind nodes)
        const edgeGroup = this.svg.append('g').attr('class', 'edges');
        
        // Render edges with Cantillon heatmap overlay
        this.edges = edgeGroup.selectAll('.edge')
            .data(edges, d => `${d.from}-${d.to}`)
            .enter().append('g')
            .attr('class', 'edge-group')
            .each(d => {
                const fromNode = nodes.find(n => n.id === d.from);
                const toNode = nodes.find(n => n.id === d.to);
                
                // Base edge
                edgeGroup.append('line')
                    .attr('class', 'edge-base')
                    .attr('x1', fromNode.x)
                    .attr('y1', fromNode.y)
                    .attr('x2', toNode.x)
                    .attr('y2', toNode.y)
                    .attr('stroke', d.strength >= 0 ? this.colors.edgePositive : this.colors.edgeNegative)
                    .attr('stroke-width', 1.5)
                    .attr('stroke-opacity', 0.3)
                    .attr('marker-end', `url(#arrow${d.strength >= 0 ? '-positive' : '-negative'})`);
                
                // Cantillon heatmap overlay - thickens based on lobbying intensity
                edgeGroup.append('line')
                    .attr('class', 'edge-cantillon')
                    .attr('x1', fromNode.x)
                    .attr('y1', fromNode.y)
                    .attr('x2', toNode.x)
                    .attr('y2', toNode.y)
                    .attr('stroke', this.colors['rent-seeking'])
                    .attr('stroke-width', 0)
                    .attr('stroke-opacity', 0)
                    .style('filter', 'url(#cantillon-glow)');
                
                // X-Ray ghost edge for unseen effects
                if (d.to === 'total_dwl' || d.to === 'lobbying_effort') {
                    edgeGroup.append('line')
                        .attr('class', 'edge-xray')
                        .attr('x1', fromNode.x)
                        .attr('y1', fromNode.y)
                        .attr('x2', toNode.x)
                        .attr('y2', toNode.y)
                        .attr('stroke', this.colors['rent-seeking'])
                        .attr('stroke-width', 3)
                        .attr('stroke-dasharray', '5,5')
                        .attr('stroke-opacity', 0)
                        .style('filter', 'url(#xray-ghost)');
                }
            });
        
        // Create node group with data-id attributes for highlighting
        const nodeGroup = this.svg.append('g').attr('class', 'nodes');
        
        this.nodeElements = nodeGroup.selectAll('.node')
            .data(nodes, d => d.id)
            .enter().append('g')
            .attr('class', d => `node node-${d.type}`)  // Add type class for targeting
            .attr('data-id', d => d.id)  // FIX: Add data-id attribute for highlighting
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .on('click', (event, d) => this.onNodeClick(event, d))
            .each(function(d) {
                const nodeEl = d3.select(this);
                
                // Node circle with size variation for Cantillon effect
                nodeEl.append('circle')
                    .attr('class', 'node-circle')
                    .attr('r', 16)
                    .attr('fill', d.type === 'welfare' && d.id.includes('surplus') ? 
                        this.colors.welfareGain : 
                        d.type === 'welfare' && d.id.includes('dwl') ?
                        this.colors.welfareLoss :
                        this.colors[d.type] || '#888')
                    .attr('stroke', '#1a1a2e')
                    .attr('stroke-width', 2)
                    .style('filter', null);
                
                // Node label
                nodeEl.append('text')
                    .attr('class', 'node-label')
                    .attr('y', 35)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#e2e8f0')
                    .attr('font-size', '10px')
                    .attr('font-weight', '500')
                    .text(d.name);
                
                // Delta badge (appears when value changes)
                nodeEl.append('text')
                    .attr('class', 'delta-badge')
                    .attr('y', -22)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#fff')
                    .attr('font-size', '9px')
                    .attr('font-weight', 'bold')
                    .style('display', 'none');
            });
        
        // Apply initial Cantillon effect
        this.updateCantillonEffect();
    }
    
    calculatePositions(nodes) {
        const positions = {};
        const columnWidth = this.width / 6; // 6 columns max
        const marginX = 40;
        const marginY = 30;
        
        // Group nodes by column
        const columns = {};
        nodes.forEach(node => {
            const col = node.column || 0;
            if (!columns[col]) columns[col] = [];
            columns[col].push(node);
        });
        
        // Sort column keys
        const sortedCols = Object.keys(columns).sort((a, b) => a - b);
        
        // Calculate positions with high repulsion for clarity
        sortedCols.forEach(col => {
            const colNodes = columns[col];
            const colX = marginX + (parseInt(col) + 0.5) * columnWidth;
            const availableHeight = this.height - 2 * marginY;
            const nodeSpacing = availableHeight / (colNodes.length + 1);
            
            colNodes.forEach((node, idx) => {
                positions[node.id] = {
                    x: colX,
                    y: marginY + (idx + 1) * nodeSpacing
                };
            });
        });
        
        return positions;
    }
    
    updateCantillonEffect() {
        const lobbyingNode = this.model.getNode('lobbying_intensity') || 
                            this.model.getNode('lobbying_effort');
        const lobbyingValue = lobbyingNode ? lobbyingNode.value : 5;
        const lobbyingNormalized = Math.min(lobbyingValue / 10, 1); // 0 to 1
        
        // Define center nodes (benefit from protection) vs periphery (starve)
        const centerNodes = ['producer_surplus', 'economic_rent', 'gov_revenue', 'political_influence'];
        const peripheryNodes = ['consumer_surplus', 'total_dwl', 'imports', 'consumer_demand'];
        
        // Update node sizes and opacity
        this.nodeElements.each(function(node) {  // Use stored reference for proper selection
            const el = d3.select(this);
            const circle = el.select('.node-circle');
            
            if (centerNodes.includes(node.id)) {
                // Center nodes grow with lobbying
                const sizeMultiplier = 1 + lobbyingNormalized * 0.4;
                circle.attr('r', 16 * sizeMultiplier)
                      .style('filter', lobbyingNormalized > 0.3 ? 'url(#cantillon-glow)' : null);
            } else if (peripheryNodes.includes(node.id)) {
                // Periphery nodes fade/starve with lobbying
                const opacity = 1 - lobbyingNormalized * 0.5;
                circle.attr('r', Math.max(10, 16 * (1 - lobbyingNormalized * 0.2)))
                      .attr('opacity', opacity);
            }
        });
        
        // Update edge thickness for Cantillon effect
        // Edges connecting to center nodes thicken with lobbying
        d3.selectAll('.edge-cantillon').each(function(edge) {
            const isCenterEdge = centerNodes.includes(edge.to) || centerNodes.includes(edge.from);
            if (isCenterEdge) {
                const thickness = lobbyingNormalized * 4;
                d3.select(this)
                    .attr('stroke-width', thickness)
                    .attr('stroke-opacity', Math.min(lobbyingNormalized, 0.8));
            } else {
                d3.select(this)
                    .attr('stroke-width', 0)
                    .attr('stroke-opacity', 0);
            }
        });
    }
    
    highlightNode(nodeId, duration = 500) {  // FIX: New method for node highlighting
        const targetNode = this.nodeElements.filter(d => d.id === nodeId);
        if (targetNode.empty()) return;
        
        const circle = targetNode.select('.node-circle');
        const originalStrokeWidth = circle.attr('stroke-width') || 2;
        const originalRadius = circle.attr('r') || 16;
    
        // Pulse effect with glow
        circle.transition()
            .duration(duration / 4)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 6)
            .transition()
            .duration(duration / 4)
            .attr('r', parseFloat(originalRadius) * 1.3)
            .attr('stroke-width', originalStrokeWidth)
            .on('end', () => {
                circle.transition()
                    .duration(duration / 2)
                    .attr('r', originalRadius)
                    .transition()
                    .attr('stroke', null);
            });
    }
    
    toggleXRayMode(enabled) {
        this.xrayMode = enabled;
        
        // Show/hide X-Ray ghost edges
        d3.selectAll('.edge-xray').attr('stroke-opacity', enabled ? 0.6 : 0);
        
        // Highlight deadweight loss node in X-Ray mode
        const dwlNode = this.nodeElements.filter(d => d.id === 'total_dwl')[0];
        if (dwlNode) {
            this.nodeElements.filter(d => d.id === 'total_dwl')
                .select('.node-circle')
                .attr('stroke', enabled ? '#f59e0b' : '#1a1a2e')
                .attr('stroke-width', enabled ? 4 : 2)
                .style('filter', enabled && dwlNode.value > 0 ? 'url(#cantillon-glow)' : null);
        }
    }
    
    triggerPulseAnimation(path) {
        // Clear any existing animation
        if (this.pulseAnimation) {
            clearTimeout(this.pulseAnimation);
        }
        
        this.activePath = path;
        
        // Animate pulse along the path, highlighting nodes as we go
        let step = 0;
        const totalSteps = path.length * 4;  // More frames for smoother animation
        
        const animateStep = () => {
            if (step >= totalSteps) {
                this.resetPulse();
                return;
            }
            
            const edgeIndex = Math.floor(step / 4);
            if (edgeIndex < path.length - 1) {
                // Highlight current edge in pulse
                d3.selectAll('.edge-base')
                    .transition()
                    .duration(100)
                    .attr('stroke-opacity', (d, i) => {
                        const from = d.from;
                        const to = d.to;
                        const isCurrentEdge = edgeIndex < path.length - 1 && 
                            path[edgeIndex] === from && path[edgeIndex + 1] === to;
                        return isCurrentEdge ? 1 : 0.3;
                    });
                
                // Highlight the target node of this edge
                if (path[edgeIndex + 1]) {
                    this.highlightNode(path[edgeIndex + 1], 800);
                }
            }
            
            step++;
            this.pulseAnimation = setTimeout(animateStep, 50);
        };
        
        animateStep();
    }
    
    resetPulse() {
        d3.selectAll('.edge-base')
            .attr('stroke-opacity', 0.3);
        this.activePath = [];
    }
    
    onNodeClick(event, node) {
        // Dispatch custom event for info panel
        window.dispatchEvent(new CustomEvent('nodeInfo', { detail: node }));
    }
    
    updateDeltaBadges() {
        this.nodeElements.each(function(node) {  // Use stored reference
            const badge = d3.select(this).select('.delta-badge');
            const change = node.change || 0;
            
            if (Math.abs(change) > 0.1) {
                const sign = change > 0 ? '▲' : '▼';
                const value = Math.abs(change).toFixed(1);
                badge.text(`${sign}${value}`)
                    .style('display', 'block')
                    .attr('fill', node.type === 'welfare' ? 
                        (change > 0 ? this.colors.welfareGain : this.colors.welfareLoss) : '#fff');
            } else {
                badge.style('display', 'none');
            }
        }, this);
    }
}
