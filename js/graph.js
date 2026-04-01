// Causal Graph Visualization using D3.js
// Renders nodes and edges, handles animations for effect propagation

class CausalGraph {
    constructor(containerId, width, height) {
        this.container = d3.select(`#${containerId}`);
        this.width = width;
        this.height = height;
        
        // Color scheme
        this.colors = {
            policy: '#ff4757',      // Red for policies
            economic: '#667eea',    // Blue for economics  
            'rent-seeking': '#ffa502' // Orange for rent-seeking
        };
        
        // Node sizes by type
        this.nodeSizes = {
            policy: 35,
            economic: 25,
            'rent-seeking': 30
        };
        
        this.svg = null;
        this.simulation = null;
        this.nodeElements = null;  // Store node elements for updates
        this.linkElements = null;  // Store link elements
    }
    
    init(data) {
        console.log('Initializing graph with', data.nodes.length, 'nodes');
        
        // Create SVG
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        // Add background
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', '#16213e');
        
        // Create main group
        const g = this.svg.append('g');
        
        // Prepare node and link data
        const nodes = data.nodes.map(n => ({
            id: n.id,
            name: n.name,
            type: n.type,
            value: n.value || 0,
            baselineValue: n.baselineValue || 0,
            change: 0,
            changePercent: 0
        }));
        
        const links = data.edges.map(e => ({
            source: e.from,
            target: e.to,
            relationship: e.relationship,
            strength: e.strength
        }));
        
        this.render(g, nodes, links);
    }
    
    render(g, nodes, links) {
        // Force simulation
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-800))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collide', d3.forceCollide(d => this.nodeSizes[d.type] + 15));
        
        // Draw links
        this.linkElements = g.append('g')
            .selectAll('.link')
            .data(links)
            .enter().append('line')
            .attr('class', 'link')
            .attr('stroke', '#444')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.5);
        
        // Draw nodes
        this.nodeElements = g.append('g')
            .selectAll('.node')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        // Node circles
        this.nodeElements.append('circle')
            .attr('r', d => this.nodeSizes[d.type])
            .attr('fill', d => this.colors[d.type])
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Node labels
        this.nodeElements.append('text')
            .attr('dy', d => this.nodeSizes[d.type] + 18)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '11px')
            .attr('pointer-events', 'none')
            .style('text-shadow', '0 0 3px #000')
            .text(d => this.truncateLabel(d.name, 14));
        
        // Store node data for later access
        this.nodeData = nodes;
        
        // Update positions on each tick
        this.simulation.on('tick', () => {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            this.nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }
    
    updateValues(results, changes) {
        console.log('Updating values with results:', Object.keys(results).length, 'values');
        
        // Update each node's data and visual properties
        this.nodeElements.each((nodeData, index, elements) => {
            const nodeId = nodeData.id;
            const result = results[nodeId];
            const change = changes ? changes[nodeId] : null;
            
            if (result !== undefined) {
                // Update stored values
                nodeData.value = result;
                nodeData.change = change ? change.change : 0;
                nodeData.changePercent = change ? change.changePercent : 0;
                
                console.log(`Node ${nodeId}: value=${result}, change=${change?.changePercent.toFixed(1)}%`);
            }
        });
        
        // Now update visual properties with transitions
        this.nodeElements.select('circle')
            .transition()
            .duration(400)
            .attr('r', d => {
                const baseSize = this.nodeSizes[d.type];
                // Scale based on change magnitude, capped at 1.3x
                const scale = 1 + Math.min(0.3, Math.abs(d.changePercent || 0) / 150);
                return baseSize * scale;
            })
            .attr('stroke-width', d => {
                // Thicker stroke for policy nodes or significant changes
                if (d.type === 'policy') return 3;
                return Math.abs(d.changePercent || 0) > 10 ? 4 : 2;
            });
    }
    
    getNodeById(nodeId) {
        return this.nodeData.find(d => d.id === nodeId);
    }
    
    truncateLabel(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 1) + '…';
    }
}

// Drag functions for D3
function dragstarted(event, d) {
    if (!event.active) event.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) event.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}