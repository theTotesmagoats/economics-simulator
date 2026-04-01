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
        this.nodes = null;
        this.links = null;
    }
    
    init(data) {
        // Create SVG
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .call(d3.zoom().on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            }));
        
        // Create main group for zoomable content
        this.g = this.svg.append('g');
        
        // Add background
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', '#16213e')
            .attr('pointer-events', 'none');
        
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
        
        this.render(nodes, links);
    }
    
    render(nodes, links) {
        // Force simulation
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collide', d3.forceCollide(d => this.nodeSizes[d.type] + 10));
        
        // Draw links
        this.links = this.g.append('g')
            .selectAll('.link')
            .data(links)
            .enter().append('line')
            .attr('class', 'link')
            .attr('stroke-width', d => Math.max(1, Math.abs(d.strength) * 2));
        
        // Draw nodes
        this.nodes = this.g.append('g')
            .selectAll('.node')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        // Node circles
        this.nodes.append('circle')
            .attr('r', d => this.nodeSizes[d.type])
            .attr('fill', d => this.colors[d.type]);
        
        // Node labels
        this.nodes.append('text')
            .attr('dy', d => this.nodeSizes[d.type] + 15)
            .attr('text-anchor', 'middle')
            .attr('class', 'node-label')
            .text(d => this.truncateLabel(d.name, 15));
        
        // Update positions on each tick
        this.simulation.on('tick', () => {
            this.links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            this.nodes
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }
    
    updateValues(results, changes) {
        // Update node values and animate changes
        this.nodes.each((nodeData, i, nodes) => {
            const result = results[nodeData.id];
            const change = changes[nodeData.id];
            
            if (result !== undefined) {
                nodeData.value = result;
                nodeData.change = change ? change.change : 0;
                nodeData.changePercent = change ? change.changePercent : 0;
                
                // Animate size based on magnitude of change
                d3.select(nodes[i].querySelector('circle'))
                    .transition()
                    .duration(500)
                    .attr('r', d => {
                        const baseSize = this.nodeSizes[d.type];
                        const scale = 1 + Math.min(0.3, Math.abs(change.changePercent) / 200);
                        return baseSize * scale;
                    });
                
                // Pulse animation for significant changes
                if (Math.abs(change.changePercent) > 10) {
                    d3.select(nodes[i]).classed('pulsing', true);
                    setTimeout(() => d3.select(nodes[i]).classed('pulsing', false), 600);
                }
            }
        });
    }
    
    animatePropagation(sourceNodeId, affectedNodes) {
        // Animate wave propagation from source through affected nodes
        const sourceNode = this.nodes.find(d => d.id === sourceNodeId);
        if (!sourceNode) return;
        
        // Find paths from source to each affected node
        affectedNodes.forEach((nodeId, index) => {
            const delay = index * 150;
            
            setTimeout(() => {
                const nodeElement = this.nodes.filter(d => d.id === nodeId)[0];
                if (nodeElement) {
                    // Pulse the node
                    d3.select(nodeElement.querySelector('circle'))
                        .transition()
                        .duration(300)
                        .attr('stroke-width', 6)
                        .transition()
                        .duration(300)
                        .attr('stroke-width', 2);
                }
            }, delay);
        });
    }
    
    highlightNode(nodeId) {
        // Highlight incoming and outgoing edges
        const node = this.nodes.find(d => d.id === nodeId);
        if (!node) return;
        
        // Reset all links first
        this.links.attr('stroke-opacity', 0.6).attr('stroke-width', d => Math.max(1, Math.abs(d.strength) * 2));
        
        // Highlight related links
        this.links.filter(d => d.source.id === nodeId || d.target.id === nodeId)
            .transition()
            .duration(300)
            .attr('stroke', '#fff')
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 3);
        
        // Highlight the node itself
        this.nodes.filter(d => d.id === nodeId)
            .transition()
            .duration(300)
            .select('circle')
            .attr('stroke', '#fff')
            .attr('stroke-width', 4);
    }
    
    resetHighlights() {
        this.links
            .transition().duration(300)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.max(1, Math.abs(d.strength) * 2));
        
        this.nodes.select('circle')
            .transition().duration(300)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
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