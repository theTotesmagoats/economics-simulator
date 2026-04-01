// Causal Graph Visualization - Teaching-Focused Design
// Fixed layout with delta rings and staged propagation animation

class CausalGraph {
    constructor(containerId, width, height) {
        this.container = d3.select(`#${containerId}`);
        this.width = width;
        this.height = height;
        
        // Layout configuration
        this.layout = {
            columns: 5,
            columnWidth: 140,
            rowHeight: 70,
            nodeRadius: 22,
            margin: { top: 30, right: 30, bottom: 60, left: 40 }
        };
        
        // Color scheme
        this.colors = {
            policy: '#ef4444',      // Red for policies
            market: '#3b82f6',      // Blue for market variables
            quantity: '#60a5fa',    // Lighter blue for quantities
            welfare: '#10b981',     // Green for welfare
            'rent-seeking': '#f59e0b', // Orange for rent-seeking
            political: '#f97316'    // Darker orange for political
        };
        
        this.svg = null;
        this.nodeElements = null;
        this.linkElements = null;
        this.nodeData = [];
        this.activePath = new Set();
    }
    
    init(data) {
        console.log('Initializing causal graph with', data.nodes.length, 'nodes');
        
        // Create SVG
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        // Add background
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', '#16213e');
        
        // Store node data with computed positions
        this.nodeData = data.nodes.map(node => {
            const col = node.column || 0;
            const row = node.row || 0;
            return {
                ...node,
                x: this.layout.margin.left + col * this.layout.columnWidth,
                y: this.layout.margin.top + row * this.layout.rowHeight
            };
        });
        
        // Render graph
        this.render(data.edges);
    }
    
    render(edges) {
        // Draw links first (so they appear behind nodes)
        const linkData = edges.map(edge => ({
            source: this.nodeData.find(n => n.id === edge.from),
            target: this.nodeData.find(n => n.id === edge.to),
            relationship: edge.relationship,
            strength: edge.strength
        })).filter(l => l.source && l.target);
        
        this.linkElements = this.svg.append('g').attr('class', 'links')
            .selectAll('.link')
            .data(linkData)
            .enter().append('line')
            .attr('class', d => `link ${d.relationship}`)
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', '#4a5568')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.4);
        
        // Add arrow markers for direction
        this.linkElements.append('path')
            .attr('class', 'arrowhead')
            .attr('d', this.arrowMarker(6, 6))
            .attr('transform', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                return `translate(${d.target.x}, ${d.target.y}) rotate(${angle})`;
            })
            .attr('fill', '#4a5568')
            .attr('opacity', 0.4);
        
        // Draw nodes
        this.nodeElements = this.svg.append('g').attr('class', 'nodes')
            .selectAll('.node')
            .data(this.nodeData)
            .enter().append('g')
            .attr('class', d => `node node-${d.type}`)
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
        
        // Delta ring (outer circle showing increase/decrease)
        this.nodeElements.append('circle')
            .attr('class', 'delta-ring')
            .attr('r', this.layout.nodeRadius + 6)
            .attr('fill', 'none')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 0);
        
        // Main node circle
        this.nodeElements.append('circle')
            .attr('class', 'node-circle')
            .attr('r', this.layout.nodeRadius)
            .attr('fill', d => this.colors[d.type] || '#667eea');
        
        // Node label
        this.nodeElements.append('text')
            .attr('class', 'node-label')
            .attr('dy', this.layout.nodeRadius + 18)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '10px')
            .style('text-shadow', '0 0 3px #000')
            .text(d => this.truncateLabel(d.name, 14));
        
        // Delta badge (shows +X% or -X%)
        this.nodeElements.append('text')
            .attr('class', 'delta-badge')
            .attr('dy', -this.layout.nodeRadius - 6)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '9px')
            .attr('font-weight', 'bold')
            .style('opacity', 0);
        
        // Make nodes clickable
        this.nodeElements.on('click', (event, d) => {
            event.stopPropagation();
            window.simulator.showNodeInfo(d.id);
        });
    }
    
    arrowMarker(width, height) {
        return `M0,${height/2} L${width},0 L${width},${height} Z`;
    }
    
    truncateLabel(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 1) + '…';
    }
    
    // Update node values and show delta rings
    updateValues(results, changes, sourceNodeId = null) {
        console.log('Updating graph values');
        
        const affectedNodes = [];
        
        // Update each node's data
        this.nodeData.forEach(node => {
            const result = results[node.id];
            const change = changes ? changes[node.id] : null;
            
            if (result !== undefined) {
                node.value = result;
                node.change = change ? change.change : 0;
                node.changePercent = change ? change.changePercent : 0;
                
                // Track affected nodes for animation
                if (Math.abs(node.changePercent) > 1) {
                    affectedNodes.push(node.id);
                }
            }
        });
        
        // Update delta rings and badges
        this.nodeElements.select('.delta-ring')
            .transition().duration(300)
            .attr('stroke', d => {
                if (Math.abs(d.changePercent) < 1) return 'transparent';
                return d.change > 0 ? '#22c55e' : '#ef4444'; // Green or red
            })
            .attr('stroke-opacity', d => Math.min(1, Math.abs(d.changePercent) / 30));
        
        this.nodeElements.select('.delta-badge')
            .text(d => {
                if (Math.abs(d.changePercent) < 1) return '';
                const sign = d.change > 0 ? '+' : '';
                return `${sign}${d.changePercent.toFixed(0)}%`;
            })
            .style('opacity', d => Math.abs(d.changePercent) > 1 ? 1 : 0)
            .style('fill', d => d.change > 0 ? '#22c55e' : (d.change < 0 ? '#ef4444' : '#fff'));
        
        // Animate propagation if source node specified
        if (sourceNodeId && affectedNodes.length > 0) {
            this.animatePropagation(sourceNodeId, affectedNodes);
        }
    }
    
    // Staged animation showing causal chain activation
    animatePropagation(sourceId, affectedNodeIds) {
        console.log('Animating propagation from', sourceId);
        
        // Reset all to dimmed state first
        this.dimInactive();
        
        // Find path from source through affected nodes
        const path = this.findCausalPath(sourceId, affectedNodeIds);
        
        if (path.length === 0) return;
        
        // Animate each node in sequence
        let delay = 0;
        path.forEach((nodeId, index) => {
            setTimeout(() => {
                this.highlightNode(nodeId);
                this.highlightEdgesForNode(nodeId);
            }, delay);
            delay += 200; // 200ms between each node
        });
        
        // After animation completes, restore normal appearance but keep delta rings
        setTimeout(() => {
            this.restoreAppearance();
        }, delay + 500);
    }
    
    findCausalPath(sourceId, affectedIds) {
        // Build adjacency list from edges
        const graph = {};
        this.nodeData.forEach(node => { graph[node.id] = [] });
        
        // Find edges and build directed graph
        this.svg.selectAll('.link').each(function(d) {
            if (graph[d.source.id]) {
                graph[d.source.id].push(d.target.id);
            }
        });
        
        // BFS from source to find path through affected nodes
        const visited = new Set();
        const queue = [[sourceId]];
        const resultPath = [sourceId];
        
        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];
            
            if (visited.has(node)) continue;
            visited.add(node);
            
            // Add to result if this is an affected node
            if (affectedIds.includes(node) && node !== sourceId) {
                resultPath.push(node);
            }
            
            // Continue BFS
            if (graph[node]) {
                graph[node].forEach(neighbor => {
                    queue.push([...path, neighbor]);
                });
            }
        }
        
        return resultPath;
    }
    
    highlightNode(nodeId) {
        const node = this.nodeData.find(n => n.id === nodeId);
        if (!node) return;
        
        // Pulse the node
        d3.select(`.node[data-id="${nodeId}"] .node-circle`)
            .transition().duration(150)
            .attr('r', this.layout.nodeRadius + 4)
            .transition().duration(150)
            .attr('r', this.layout.nodeRadius);
        
        // Brighten the node
        d3.selectAll(`.node-${node.type}`)
            .select('.node-circle')
            .transition().duration(200)
            .attr('fill', '#fff')
            .transition().duration(400)
            .attr('fill', this.colors[node.type]);
    }
    
    highlightEdgesForNode(nodeId) {
        // Find and highlight edges connected to this node
        const node = this.nodeData.find(n => n.id === nodeId);
        if (!node) return;
        
        // Highlight outgoing edges
        d3.selectAll('.link')
            .filter(d => d.source.id === nodeId)
            .transition().duration(200)
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 1)
            .transition().delay(400).duration(400)
            .attr('stroke', '#4a5568')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.4);
    }
    
    dimInactive() {
        // Dim all nodes and edges temporarily
        this.nodeElements.select('.node-circle')
            .transition().duration(200)
            .attr('opacity', 0.3);
        
        this.linkElements
            .transition().duration(200)
            .attr('stroke-opacity', 0.1);
    }
    
    restoreAppearance() {
        // Restore normal appearance
        this.nodeElements.select('.node-circle')
            .transition().duration(300)
            .attr('opacity', 1);
        
        this.linkElements
            .transition().duration(300)
            .attr('stroke-opacity', 0.4);
    }
    
    getNodeById(nodeId) {
        return this.nodeData.find(d => d.id === nodeId);
    }
}