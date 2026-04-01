// Data Model for Economics Simulator
// Defines the structure of nodes and relationships in our causal graph

class EconomicModel {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.initializeModel();
    }
    
    initializeModel() {
        // Policy Nodes (Red)
        this.addNode('tariff', 'Import Tariff', 'policy', {
            value: 0,
            min: 0,
            max: 100,
            unit: '%',
            description: 'Tax on imported goods, expressed as percentage of world price'
        });
        
        this.addNode('subsidy', 'Production Subsidy', 'policy', {
            value: 0,
            min: 0,
            max: 50,
            unit: '$/unit',
            description: 'Government payment per unit produced domestically'
        });
        
        // Economic Nodes (Blue) - Market Variables
        this.addNode('world_price', 'World Price', 'economic', {
            value: 100,
            fixed: true,
            unit: '$',
            description: 'International market price (exogenous, taken as given)'
        });
        
        this.addNode('import_price', 'Landed Import Price', 'economic', {
            value: 100,
            unit: '$',
            formula: 'world_price × (1 + tariff/100)',
            description: 'Price of imported goods after tariff is applied'
        });
        
        this.addNode('domestic_price', 'Domestic Consumer Price', 'economic', {
            value: 100,
            unit: '$',
            description: 'Price consumers pay in domestic market'
        });
        
        this.addNode('producer_price', 'Effective Producer Price', 'economic', {
            value: 100,
            unit: '$',
            description: 'Price producers receive after subsidies'
        });
        
        this.addNode('consumer_demand', 'Consumer Demand', 'economic', {
            value: 100,
            unit: 'units',
            formula: '200 - domestic_price',
            description: 'Quantity consumers want to buy at given price'
        });
        
        this.addNode('domestic_supply', 'Domestic Production', 'economic', {
            value: 50,
            unit: 'units',
            formula: '-50 + producer_price',
            description: 'Quantity domestic producers supply at given price'
        });
        
        this.addNode('imports', 'Imports', 'economic', {
            value: 50,
            unit: 'units',
            formula: 'max(0, consumer_demand - domestic_supply)',
            description: 'Quantity imported to meet excess demand'
        });
        
        this.addNode('gov_revenue', 'Government Revenue', 'economic', {
            value: 0,
            unit: '$',
            formula: 'tariff × world_price × imports / 100',
            description: 'Tariff revenue collected by government'
        });
        
        this.addNode('subsidy_cost', 'Subsidy Cost', 'economic', {
            value: 0,
            unit: '$',
            formula: 'subsidy × domestic_supply',
            description: 'Total cost of production subsidies'
        });
        
        this.addNode('net_gov_budget', 'Net Government Budget', 'economic', {
            value: 0,
            unit: '$',
            formula: 'gov_revenue - subsidy_cost',
            description: 'Government revenue minus subsidy expenditures'
        });
        
        // Welfare Nodes
        this.addNode('consumer_surplus', 'Consumer Surplus', 'economic', {
            value: 5000,
            unit: '$',
            formula: '(200 - domestic_price)² / 2',
            description: 'Benefit consumers receive above what they pay'
        });
        
        this.addNode('producer_surplus', 'Producer Surplus', 'economic', {
            value: 1250,
            unit: '$',
            formula: '(producer_price - 50)² / 2',
            description: 'Benefit producers receive above their costs'
        });
        
        // Rent-Seeking Nodes (Orange)
        this.addNode('economic_rent', 'Economic Rents Created', 'rent-seeking', {
            value: 0,
            unit: '$',
            description: 'Artificial profits created by protectionist policy'
        });
        
        this.addNode('lobbying_effort', 'Lobbying Expenditure', 'rent-seeking', {
            value: 0,
            unit: '$',
            description: 'Resources spent competing for rents'
        });
        
        this.addNode('political_influence', 'Political Influence', 'rent-seeking', {
            value: 50,
            min: 0,
            max: 100,
            unit: 'index',
            description: 'Accumulated influence affecting future policy'
        });
        
        // Deadweight Loss Nodes
        this.addNode('production_dwl', 'Production DWL', 'economic', {
            value: 0,
            unit: '$',
            description: 'Efficiency loss from distorted production decisions'
        });
        
        this.addNode('consumption_dwl', 'Consumption DWL', 'economic', {
            value: 0,
            unit: '$',
            description: 'Efficiency loss from distorted consumption decisions'
        });
        
        this.addNode('rent_seeking_loss', 'Rent-Seeking Loss', 'rent-seeking', {
            value: 0,
            unit: '$',
            description: 'Resources wasted in political competition'
        });
        
        this.addNode('total_dwl', 'Total Deadweight Loss', 'economic', {
            value: 0,
            unit: '$',
            formula: 'production_dwl + consumption_dwl + rent_seeking_loss',
            description: 'Total efficiency loss to society'
        });
        
        // Define causal relationships (edges)
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
        // Policy → Direct Economic Effects
        this.addEdge('tariff', 'import_price', 'causes', 1);
        this.addEdge('subsidy', 'producer_price', 'causes', 1);
        
        // Price Chain
        this.addEdge('world_price', 'import_price', 'determines', 1);
        this.addEdge('import_price', 'domestic_price', 'influences', 0.8);
        this.addEdge('tariff', 'domestic_price', 'pushes_up', 0.6);
        
        // Producer Price Effects
        this.addEdge('domestic_price', 'producer_price', 'determines_base', 1);
        this.addEdge('subsidy', 'producer_price', 'adds_to', 1);
        
        // Supply/Demand Responses
        this.addEdge('domestic_price', 'consumer_demand', 'reduces', -1);
        this.addEdge('producer_price', 'domestic_supply', 'increases', 1);
        
        // Market Clearing
        this.addEdge('consumer_demand', 'imports', 'determines_need', 1);
        this.addEdge('domestic_supply', 'imports', 'reduces_need', -1);
        
        // Government Accounts
        this.addEdge('tariff', 'gov_revenue', 'generates', 1);
        this.addEdge('imports', 'gov_revenue', 'base_for', 1);
        this.addEdge('subsidy', 'subsidy_cost', 'determines_rate', 1);
        this.addEdge('domestic_supply', 'subsidy_cost', 'determines_base', 1);
        
        // Welfare Calculations
        this.addEdge('domestic_price', 'consumer_surplus', 'reduces', -1);
        this.addEdge('producer_price', 'producer_surplus', 'increases', 1);
        
        // Rent Creation (the key insight!)
        this.addEdge('tariff', 'economic_rent', 'creates', 0.7);
        this.addEdge('subsidy', 'economic_rent', 'creates', 0.5);
        this.addEdge('domestic_supply', 'economic_rent', 'scales', 1);
        
        // Rent-Seeking Chain
        this.addEdge('economic_rent', 'lobbying_effort', 'motivates', 1);
        this.addEdge('lobbying_effort', 'political_influence', 'builds', 0.3);
        
        // Political Feedback Loop (this is the trap!)
        this.addEdge('political_influence', 'tariff', 'biases_toward', 0.2);
        this.addEdge('political_influence', 'subsidy', 'biases_toward', 0.2);
        
        // Deadweight Loss
        this.addEdge('domestic_price', 'production_dwl', 'creates', 1);
        this.addEdge('domestic_supply', 'production_dwl', 'scales', 1);
        this.addEdge('consumer_demand', 'consumption_dwl', 'reduces_from_baseline', -1);
        this.addEdge('lobbying_effort', 'rent_seeking_loss', 'equals', 1);
        
        // Total DWL aggregation
        this.addEdge('production_dwl', 'total_dwl', 'contributes', 1);
        this.addEdge('consumption_dwl', 'total_dwl', 'contributes', 1);
        this.addEdge('rent_seeking_loss', 'total_dwl', 'contributes', 1);
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
}