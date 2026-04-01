// Data Model for Economics Simulator
// Defines nodes with fixed positions in a causal layout

class EconomicModel {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.initializeModel();
    }
    
    initializeModel() {
        // COLUMN 1: Policy Inputs (Red)
        this.addNode('tariff', 'Import Tariff', 'policy', {
            column: 0, row: 0,
            value: 0, min: 0, max: 100, unit: '%',
            description: 'Tax on imported goods. Raises domestic prices and protects producers.',
            groupImpacts: { households: 'negative', smallBusiness: 'mixed', largeFirms: 'positive', government: 'positive' }
        });
        
        this.addNode('subsidy', 'Production Subsidy', 'policy', {
            column: 0, row: 1,
            value: 0, min: 0, max: 50, unit: '$/unit',
            description: 'Government payment per unit produced. Lowers effective cost for producers.',
            groupImpacts: { households: 'negative', smallBusiness: 'mixed', largeFirms: 'positive', government: 'negative' }
        });
        
        // COLUMN 2: Price/Incentive Variables (Blue)
        this.addNode('world_price', 'World Price', 'market', {
            column: 1, row: 0,
            value: 100, fixed: true, unit: '$',
            description: 'International market price. Exogenous in small open economy.',
            groupImpacts: {}
        });
        
        this.addNode('import_price', 'Landed Import Price', 'market', {
            column: 1, row: 1,
            value: 100, unit: '$',
            formula: 'World Price × (1 + Tariff)',
            description: 'Price of imports after tariff is applied.',
            groupImpacts: { households: 'negative', smallBusiness: 'negative' }
        });
        
        this.addNode('domestic_price', 'Domestic Price', 'market', {
            column: 1, row: 2,
            value: 100, unit: '$',
            description: 'Price consumers pay. Determined by import price or autarky equilibrium.',
            groupImpacts: { households: 'negative', smallBusiness: 'mixed' }
        });
        
        this.addNode('producer_price', 'Producer Price', 'market', {
            column: 1, row: 3,
            value: 100, unit: '$',
            description: 'Effective price producers receive after subsidies.',
            groupImpacts: { largeFirms: 'positive', smallBusiness: 'positive' }
        });
        
        // COLUMN 3: Quantity Variables (Blue)
        this.addNode('consumer_demand', 'Consumer Demand', 'quantity', {
            column: 2, row: 0,
            value: 100, unit: 'units',
            formula: 'Decreases as price rises',
            description: 'Quantity consumers want to buy at the domestic price.',
            groupImpacts: { households: 'positive' }
        });
        
        this.addNode('domestic_supply', 'Domestic Production', 'quantity', {
            column: 2, row: 1,
            value: 50, unit: 'units',
            formula: 'Increases as producer price rises',
            description: 'Quantity domestic producers supply.',
            groupImpacts: { largeFirms: 'positive', smallBusiness: 'mixed' }
        });
        
        this.addNode('imports', 'Imports', 'quantity', {
            column: 2, row: 2,
            value: 50, unit: 'units',
            formula: 'Demand - Domestic Supply',
            description: 'Quantity imported to meet excess demand.',
            groupImpacts: { households: 'positive' }
        });
        
        // COLUMN 4: Welfare/Rent Variables (Blue/Orange)
        this.addNode('consumer_surplus', 'Consumer Surplus', 'welfare', {
            column: 3, row: 0,
            value: 5000, unit: '$',
            description: 'Benefit consumers receive above what they pay.',
            groupImpacts: { households: 'positive' }
        });
        
        this.addNode('producer_surplus', 'Producer Surplus', 'welfare', {
            column: 3, row: 1,
            value: 1250, unit: '$',
            description: 'Benefit producers receive above their costs.',
            groupImpacts: { largeFirms: 'positive', smallBusiness: 'mixed' }
        });
        
        this.addNode('gov_revenue', 'Gov\'t Revenue', 'welfare', {
            column: 3, row: 2,
            value: 0, unit: '$',
            description: 'Tariff revenue collected by government.',
            groupImpacts: { government: 'positive' }
        });
        
        // Rent-seeking nodes (Orange)
        this.addNode('economic_rent', 'Economic Rents', 'rent-seeking', {
            column: 3, row: 3,
            value: 0, unit: '$',
            description: 'Artificial profits created by protection. The "prize" motivating rent-seeking.',
            groupImpacts: { largeFirms: 'positive' }
        });
        
        this.addNode('lobbying_effort', 'Lobbying Effort', 'rent-seeking', {
            column: 4, row: 0,
            value: 0, unit: '$',
            description: 'Resources spent competing for rents. Pure deadweight loss.',
            groupImpacts: { largeFirms: 'negative' }
        });
        
        // COLUMN 5: Political Feedback (Orange)
        this.addNode('political_influence', 'Political Influence', 'political', {
            column: 4, row: 1,
            value: 50, min: 0, max: 100, unit: 'index',
            description: 'Accumulated influence that biases future policy. Creates path dependence.',
            groupImpacts: { largeFirms: 'positive' }
        });
        
        // Deadweight loss
        this.addNode('total_dwl', 'Total DWL', 'welfare', {
            column: 4, row: 2,
            value: 0, unit: '$',
            description: 'Total efficiency loss including rent-seeking waste.',
            groupImpacts: { households: 'negative' }
        });
        
        // Define causal relationships
        this.defineEdges();
    }
    
    addNode(id, name, type, properties = {}) {
        this.nodes.set(id, {
            id,
            name,
            type,
            ...properties,
            baselineValue: properties.value || 0,
            change: 0,
            changePercent: 0
        });
    }
    
    defineEdges() {
        // Policy → Price effects
        this.addEdge('tariff', 'import_price', 'increases', 1);
        this.addEdge('subsidy', 'producer_price', 'increases', 1);
        
        // Price chain
        this.addEdge('world_price', 'import_price', 'determines', 1);
        this.addEdge('import_price', 'domestic_price', 'pushes_up', 0.8);
        this.addEdge('tariff', 'domestic_price', 'increases', 0.6);
        
        // Producer price
        this.addEdge('domestic_price', 'producer_price', 'determines_base', 1);
        this.addEdge('subsidy', 'producer_price', 'adds_to', 1);
        
        // Supply/Demand responses
        this.addEdge('domestic_price', 'consumer_demand', 'reduces', -1);
        this.addEdge('producer_price', 'domestic_supply', 'increases', 1);
        
        // Market clearing
        this.addEdge('consumer_demand', 'imports', 'determines_need', 1);
        this.addEdge('domestic_supply', 'imports', 'reduces_need', -1);
        
        // Welfare calculations
        this.addEdge('domestic_price', 'consumer_surplus', 'reduces', -1);
        this.addEdge('producer_price', 'producer_surplus', 'increases', 1);
        
        // Government accounts
        this.addEdge('tariff', 'gov_revenue', 'generates', 1);
        this.addEdge('imports', 'gov_revenue', 'base_for', 1);
        
        // Rent creation (key insight!)
        this.addEdge('tariff', 'economic_rent', 'creates', 0.7);
        this.addEdge('subsidy', 'economic_rent', 'creates', 0.5);
        this.addEdge('domestic_supply', 'economic_rent', 'scales', 1);
        
        // Rent-seeking chain
        this.addEdge('economic_rent', 'lobbying_effort', 'motivates', 1);
        this.addEdge('lobbying_effort', 'political_influence', 'builds', 0.3);
        
        // Political feedback loop (the trap!)
        this.addEdge('political_influence', 'tariff', 'biases_toward', 0.2);
        this.addEdge('political_influence', 'subsidy', 'biases_toward', 0.2);
        
        // Deadweight loss
        this.addEdge('domestic_price', 'total_dwl', 'increases', 1);
        this.addEdge('lobbying_effort', 'total_dwl', 'adds_to', 1);
    }
    
    addEdge(from, to, relationship, strength = 1) {
        this.edges.push({ from, to, relationship, strength });
    }
    
    getNode(id) {
        return this.nodes.get(id);
    }
    
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    
    getEdgesForNode(nodeId) {
        return {
            incoming: this.edges.filter(e => e.to === nodeId),
            outgoing: this.edges.filter(e => e.from === nodeId)
        };
    }
    
    // Get nodes in causal order (by column)
    getNodesByColumn() {
        const columns = {};
        this.getAllNodes().forEach(node => {
            const col = node.column || 0;
            if (!columns[col]) columns[col] = [];
            columns[col].push(node);
        });
        return Object.keys(columns).sort((a, b) => a - b).map(col => columns[col]);
    }
}