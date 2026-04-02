# Policy Consequence Simulator

## Interactive Causal Graph for Protectionism & Rent-Seeking

A Chicago School economics simulator that visualizes how protectionist policies create economic distortions and rent-seeking behavior. Built with the insight that **every effect must be traceable back to its cause** — if you can't explain *why* something happened, the model has failed.

---

## Philosophy

Inspired by Milton Friedman and Thomas Sowell:

- **Follow the incentives**: Every actor responds rationally to constraints and rewards
- **Second-order effects matter**: The seen vs. the unseen (Bastiat)
- **Tradeoffs are real**: There are no free lunches, only hidden costs
- **Rent-seeking is central**: Protectionism creates artificial profits that motivate wasteful political competition

---

## How to Use

### 1. Policy Controls (Left Panel)
- **Import Tariff Rate** (0-100%): Tax on imported goods
- **Production Subsidy** ($/unit): Government payment to domestic producers  
- **Lobbying Intensity**: Scales how aggressively rents are fought over

### 2. Causal Mechanism Graph (Center, Top)
The fixed left-to-right layout shows:
- **Column 1 (Red)**: Policy inputs you control
- **Column 2 (Blue)**: Price/incentive variables
- **Column 3 (Light Blue)**: Quantity responses
- **Column 4 (Green/Orange)**: Welfare and rent creation
- **Column 5 (Orange)**: Political feedback loops

**Visual encoding:**
- 🔴 Red ring = value decreased
- 🟢 Green ring = value increased
- Number above node = percentage change
- **Blue edges** = positive relationship (A↑ → B↑)
- **Orange edges** = negative relationship (A↑ → B↓)
- Click any node for detailed explanation

### 3. Active Chain Strip
Shows the exact causal path that activated when you moved a slider:
```
Tariff → Import Price ↑ → Domestic Price ↑ → Demand ↓ → Imports ↓ → Rents ↑ → Lobbying ↑
```

### 4. Industry Structure Panel (Center, Bottom)
Shows how protection affects who survives:
- **Large blue circles** = incumbent firms
- **Small orange circles** = small businesses/challengers
- As moat pressure rises: incumbents grow, small firms shrink and exit
- Status summary shows: "3 incumbents gained +X% protected share", "Y of 15 challengers remain viable"

### 5. Tradeoff Snapshot & Metrics (Right Panel)
- Who wins, who loses, hidden costs
- **Who's Affected?** panel shows directional impact on each group
- Key economic indicators update in real-time

---

## Teaching Features

### Explain Mode vs Explore Mode
Toggle the 📚 **Explain Mode** checkbox:

| Explain Mode (default) | Explore Mode |
|------------------------|--------------|
| Slower animation with pauses | Faster updates |
| Callout bubbles explain each step | Minimal callouts |
| Clearer teaching chain visible | Quick exploration |

### What the Graph Teaches Visually

When you move a slider, watch for:
1. **Origin**: Where did the change start? (source node pulses)
2. **Chain**: Which exact path activated? (edges highlight in sequence)
3. **Direction**: Did each variable go up or down? (green/red rings)
4. **Magnitude**: How big was the effect? (percentage badges)
5. **Consequences**: Who benefited and who paid? (tradeoff panel)

---

## What This Simulator Teaches

### The Causal Chain
```
Policy → Price Change → Quantity Response → Rent Creation → Lobbying → Political Influence → Future Policy Bias
```

### Key Insights

1. **Tariffs raise consumer prices** — The basic point most understand
2. **Protection creates economic rents** — Artificial profits for protected producers
3. **Rents motivate lobbying** — Resources spent competing for protection
4. **Lobbying builds political influence** — Which biases future policy
5. **The feedback loop** — Protection begets more protection through politics
6. **Total deadweight loss includes rent-seeking** — Often larger than traditional DWL triangles
7. **Industry structure changes** — Protected markets concentrate; small firms get crowded out

---

## Try This Scenario

1. **Start at free trade** (all sliders at zero/medium)
2. **Increase tariff to 40%** and watch:
   - Green rings appear on producer-side variables
   - Red rings appear on consumer-side variables
   - Orange rent-seeking nodes light up
3. **Watch the Industry Structure panel** — incumbents grow, small firms shrink
4. **Click any glowing node** for detailed explanation
5. **Check Tradeoff Snapshot** — see who won and who lost
6. **Toggle Explain Mode off** to explore faster

---

## Technical Architecture

```
economics-simulator/
├── index.html          # Main entry point with all panels
├── css/
│   └── styles.css      # Dark theme, animations, responsive layout
├── js/
│   ├── model.js        # Causal graph data structure with fixed positions
│   ├── simulation.js   # Chicago school economic math + industry structure vars
│   ├── graph.js        # Fixed-layout D3 visualization with delta rings
│   ├── industry-structure.js  # Firm survival visualization
│   └── app.js          # Application logic, summary generation
└── README.md
```

### Economic Model (Chicago School)

**Supply/Demand:**
- Demand: Qd = 200 - P
- Supply: Qs = -50 + P
- **Autarky equilibrium**: P* = $125, Q* = 75 units (closed economy)
- **World price**: P_w = $100 (exogenous, makes us an importer)

**At World Price ($100):**
- Domestic demand: Qd = 200 - 100 = 100 units
- Domestic supply: Qs = -50 + 100 = 50 units
- **Imports**: 100 - 50 = 50 units ✓ (we're an importer)

**Tariff Effects:**
- Import price with tariff = World Price × (1 + tariff/100)
- Domestic price = min(import price, autarky price) ← **autarky is a CEILING, not floor**
- Producer price = domestic price + subsidy

**Rent Creation (CORRECTED):**
- Economic Rent = Change in producer surplus due to policy
- NOT a crude rectangle — properly accounts for supply curve geometry
- Includes both tariff-induced rent AND subsidy transfers

**Industry Structure Variables:**
- `moatPressure` = f(economic_rent, lobbying_effort, political_influence, tariff)
- `smallBusinessSurvival` = inverse(moatPressure)
- `concentrationIndex` = direct(moatPressure)

---

## Running Locally

Simply open `index.html` in a browser — no server required.

Or deploy to GitHub Pages:
```
git push origin main
```
Then enable GitHub Pages in repository settings.

---

## Planned Extensions

- [ ] Quotas (different rent distribution than tariffs)
- [ ] Multiple sectors with interdependencies
- [ ] Dynamic time simulation showing policy lags
- [ ] Retaliatory tariff modeling
- [ ] Exchange rate effects
- [ ] Additional scenarios: rent control, price controls, minimum wage

---

## License

MIT — Use freely, modify as needed. The ideas belong to Friedman, Sowell, Tullock, Buchanan, and decades of public choice economics.

---

> "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design." — Friedrich Hayek
