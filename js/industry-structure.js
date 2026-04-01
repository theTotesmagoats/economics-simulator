// Industry Structure Visualization
// Shows how protection affects who survives in the market

class IndustryStructure {
    constructor(containerId, width, height) {
        this.container = d3.select(`#${containerId}`);
        this.width = width;
        this.height = height;
        
        // Color scheme for firms
        this.colors = {
            incumbent: '#667eea',  // Blue-purple for established firms
            challenger: '#ffa502', // Orange for smaller competitors
            entrant: '#4ade80'     // Green for new entrants
        };
        
        // Baseline configuration
        this.config = {
            numIncumbents: 3,
            baselineSmallFirms: 15,
            incumbentBaseRadius: 25,
            smallBaseRadius: 8,
            minSmallRadius: 3,
            maxIncumbentGrowth: 1.8,  // Incumbents can grow up to 1.8x
            padding: 20
        };
        
        this.svg = null;
        this.firmGroups = null;
        this.incumbentData = [];
        this.smallFirmData = [];
        this.currentMoatPressure = 0;
    }
    
    init() {
        // Create SVG
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        // Add background
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'none');
        
        // Initialize firm data
        this.initializeFirms();
        
        // Render initial state
        this.render(0);  // Start with zero moat pressure (free trade)
    }
    
    initializeFirms() {
        // Create incumbent firms (large, established players)
        const incumbentPositions = [
            { x: this.width * 0.25, y: this.height * 0.3 },
            { x: this.width * 0.5, y: this.height * 0.5 },
            { x: this.width * 0.75, y: this.height * 0.3 }
        ];
        
        this.incumbentData = Array.from({ length: this.config.numIncumbents }, (_, i) => ({
            id: `incumbent-${i}`,
            type: 'incumbent',
            x: incumbentPositions[i].x,
            y: incumbentPositions[i].y,
            baseRadius: this.config.incumbentBaseRadius,
            currentRadius: this.config.incumbentBaseRadius,
            marketShare: 20 + Math.random() * 10,  // Start with ~20% each
            name: `Incumbent ${String.fromCharCode(65 + i)}`
        }));
        
        // Create small firms (challengers, small businesses)
        this.smallFirmData = Array.from({ length: this.config.baselineSmallFirms }, (_, i) => {
            const angle = (i / this.config.baselineSmallFirms) * Math.PI * 2;
            const distanceFromCenter = 60 + Math.random() * 80;
            
            return {
                id: `small-${i}`,
                type: 'challenger',
                x: this.width / 2 + Math.cos(angle) * distanceFromCenter,
                y: this.height / 2 + Math.sin(angle) * distanceFromCenter,
                baseRadius: this.config.smallBaseRadius,
                currentRadius: this.config.smallBaseRadius,
                marketShare: 3 + Math.random() * 2,  // Small firms have ~3% each
                alive: true,
                name: `Small Biz ${i + 1}`
            };
        });
    }
    
    render(moatPressure) {
        this.currentMoatPressure = Math.max(0, Math.min(1, moatPressure));
        
        // Calculate derived values
        const incumbentGrowthFactor = 1 + (this.config.maxIncumbentGrowth - 1) * this.currentMoatPressure;
        const smallShrinkFactor = 1 - 0.7 * this.currentMoatPressure;  // Small firms shrink up to 70%
        
        // Update incumbent sizes
        this.incumbentData.forEach(inc => {
            inc.targetRadius = inc.baseRadius * incumbentGrowthFactor;
            inc.marketShareAdvantage = this.currentMoatPressure * 40;  // Up to +40% share
        });
        
        // Update small firm sizes and survival
        const survivingCount = Math.max(1, Math.round(this.config.baselineSmallFirms * (1 - this.currentMoatPressure * 0.85)));
        
        this.smallFirmData.forEach((small, i) => {
            if (i < survivingCount) {
                small.alive = true;
                small.targetRadius = Math.max(this.config.minSmallRadius, small.baseRadius * smallShrinkFactor);
                // Push smaller firms toward edges as moat pressure increases
                const pushFactor = 1 + this.currentMoatPressure * 0.5;
                small.targetX = small.x * pushFactor;
                small.targetY = small.y * pushFactor;
            } else {
                small.alive = false;  // Exit the market
            }
        });
        
        // Create or update incumbent groups
        this.updateFirms(this.incumbentData, 'incumbents');
        this.updateFirms(this.smallFirmData.filter(f => f.alive), 'small-firms');
        
        // Handle exiting firms with fade-out animation
        const exitingFirms = this.smallFirmData.filter(f => !f.alive);
        if (exitingFirms.length > 0) {
            this.animateExits(exitingFirms);
        }
    }
    
    updateFirms(firmData, selector) {
        const groups = this.svg.selectAll(`.${selector}`).data([], d => d.id);
        
        // Remove old firms
        groups.exit()
            .transition().duration(500)
            .style('opacity', 0)
            .remove();
        
        // Add/update firms
        const firmGroups = groups.enter()
            .append('g')
            .attr('class', d => `${selector} ${d.type}`);
        
        // Add circles
        firmGroups.append('circle')
            .attr('r', 0)
            .attr('fill', d => this.colors[d.type])
            .attr('opacity', 0.85)
            .transition().duration(800)
            .attr('r', d => d.targetRadius || d.currentRadius);
        
        // Add labels for incumbents
        firmGroups.filter(d => d.type === 'incumbent')
            .append('text')
            .attr('dy', d => (d.targetRadius || d.currentRadius) + 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '10px')
            .style('text-shadow', '0 0 3px #000')
            .text(d => d.name);
        
        // Position all firms
        firmGroups.attr('transform', d => `translate(${d.x || d.targetX}, ${d.y || d.targetY})`);
        
        // Store for future updates
        this.firmGroups = this.svg.selectAll(`.${selector}`);
    }
    
    animateExits(exitingFirms) {
        const exitGroups = this.svg.selectAll('.exiting')
            .data(exitingFirms)
            .enter()
            .append('g')
            .attr('class', 'exiting');
        
        exitGroups.append('circle')
            .attr('r', d => d.currentRadius || this.config.smallBaseRadius)
            .attr('fill', this.colors.challenger)
            .attr('opacity', 0.85);
        
        exitGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
        
        // Fade out and remove
        exitGroups.transition().duration(1000)
            .style('opacity', 0)
            .attr('transform', d => `translate(${d.x * 1.5}, ${d.y * 1.5})`)  // Move outward while fading
            .on('end', function() {
                d3.select(this).remove();
            });
    }
    
    updateMetrics(results) {
        // Update moat pressure bar
        const moatPercent = Math.round(results.moat_pressure * 100);
        document.getElementById('moat-bar').style.width = `${moatPercent}%`;
        document.getElementById('moat-value').textContent = `${moatPercent}%`;
        
        // Update concentration index
        document.getElementById('concentration-bar').style.width = `${results.concentration_index}%`;
        document.getElementById('concentration-value').textContent = `${results.concentration_index}%`;
        
        // Update small business survival
        document.getElementById('survival-bar').style.width = `${results.small_business_survival}%`;
        document.getElementById('survival-value').textContent = `${results.small_business_survival}%`;
        
        // Update entrant viability
        document.getElementById('entrant-bar').style.width = `${results.entrant_viability}%`;
        document.getElementById('entrant-value').textContent = `${results.entrant_viability}%`;
    }
    
    getHoverText(moatPressure) {
        if (moatPressure < 0.2) {
            return "Free trade conditions. Many competitors can survive and new entrants have good chances.";
        } else if (moatPressure < 0.4) {
            return "Moderate protection. Incumbents gaining advantage, but competition still viable.";
        } else if (moatPressure < 0.6) {
            return "Protected rents are allowing larger firms to strengthen their moat. Smaller competitors losing room.";
        } else if (moatPressure < 0.8) {
            return "High barriers to entry. Small businesses struggling to survive against protected incumbents.";
        } else {
            return "Extreme concentration. Market dominated by a few protected players. Little room for competition.";
        }
    }
}