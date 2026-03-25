# 🗺️ Wandering Merchant — Interactive TSP Visualizer

> A browser-based game that teaches the **Travelling Salesman Problem (TSP)** through hands-on play and real algorithm comparisons.

---

## 📖 Table of Contents

1. [What Is This Project?](#what-is-this-project)
2. [What Is the Travelling Salesman Problem?](#what-is-the-travelling-salesman-problem)
3. [How to Play](#how-to-play)
4. [Features](#features)
5. [Project Structure](#project-structure)
6. [Key Concepts Explained Simply](#key-concepts-explained-simply)
7. [Algorithms Used](#algorithms-used)
8. [Scoring System](#scoring-system)
9. [Game Phases](#game-phases)
10. [Code Walkthrough](#code-walkthrough)
11. [Technologies Used](#technologies-used)
12. [Glossary](#glossary)

---

## What Is This Project?

**Wandering Merchant** is an interactive game built with **React** and **TypeScript**. You play as a merchant who must visit every city on a map exactly once and return home — trying to find the shortest possible route.

After you finish, the game shows you how **two real computer science algorithms** would have solved the same map, and scores you on how close you came to the optimal solution.

It's designed as an educational tool for **Design and Analysis of Algorithms (DAA)** — making a notoriously hard computer science problem fun and visual.

---

## What Is the Travelling Salesman Problem?

Imagine you are a salesman. You have a list of cities to visit, and you want to travel the **shortest possible total distance**, visiting each city **exactly once**, before returning to where you started.

This sounds simple, but it is one of the hardest problems in all of computer science. Here's why:

- With **3 cities**, there are only **6** possible routes to check.
- With **10 cities**, there are **3,628,800** possible routes.
- With **14 cities** (the Hard difficulty), there are over **87 billion** possible routes.

The number of routes grows as **n!** (n factorial), which means it explodes astronomically fast. This is called an **NP-Hard** problem — no known algorithm can find the perfect answer for large inputs in a reasonable amount of time.

---

## How to Play

### Step 1 — Choose Your Difficulty
On the main menu, pick from three difficulty levels:

| Difficulty | Cities | Extra Help |
|------------|--------|------------|
| Easy       | 6      | All possible edges shown as faint lines |
| Medium     | 10     | No hints — the classic challenge |
| Hard       | 14     | Dense map, expert mode |

### Step 2 — Build Your Route
- **Click any city** to set it as your starting point (marked **S**).
- **Click each remaining city** one by one to build your route. A line draws between each city as you click.
- When you have visited **all cities**, click the **[S] start city** again to close the loop and finish.

### Step 3 — See the Results
- Your route stays on screen in **purple**.
- The **Nearest Neighbour** algorithm draws its route in **blue**.
- The **2-Opt** optimized route draws in **green**.
- You receive an **Efficiency Score** comparing your route to the best algorithm's route.

### Extra Controls
| Action | How |
|--------|-----|
| Undo last city | Click **↩ UNDO** button |
| Pause game | Click **⏸ PAUSE** or press **ESC** |
| Resume | Click **▶ Resume** or press **ESC** again |
| Restart | Click **↺ RETRY** |
| Go back to menu | Click **⌂ MENU** |

---

## Features

- 🌌 **Animated starfield background** — stars twinkle using SVG animations.
- 🗺️ **Responsive SVG map** — automatically resizes to fit any screen.
- 📏 **Real-time path drawing** — your route is drawn live as you click cities.
- 🤖 **Two algorithm comparisons** — see Nearest Neighbour and 2-Opt side by side.
- ⏱️ **Live timer** — tracks how long you take.
- ⏸ **Pause/Resume system** — with full stats displayed while paused.
- 📚 **In-game tutorial** — 4-step guide explaining TSP and how to play.
- 🏆 **Scoring system** — rated from "Keep Trying" to "Legendary".
- ↩ **Undo button** — remove your last city click without restarting.
- 💡 **Closing loop preview** — a dashed green line shows the return path when all cities are visited.

---

## Project Structure

The entire game lives in **one React component file**. Here is an overview of every building block:

```
WanderingMerchant (main component)
│
├── Pure Helper Functions (math, no UI)
│   ├── dist()              — distance between two cities
│   ├── totalDist()         — total distance of an entire tour
│   ├── generateCities()    — randomly places cities on the map
│   ├── nearestNeighbour()  — Greedy algorithm
│   └── twoOpt()            — Route improvement algorithm
│
├── UI Components
│   ├── Stars               — animated starfield background
│   ├── Overlay             — blurred dark backdrop for modals
│   ├── GlowBtn             — glowing button used throughout the UI
│   ├── TutorialModal       — 4-step educational popup
│   ├── StartMenu           — main menu screen with difficulty picker
│   └── PauseMenu           — pause screen with stats
│
└── Main Game Logic (inside WanderingMerchant)
    ├── State management     — cities, player tour, phase, timer, results
    ├── handleCityClick()    — processes each click on the map
    ├── finishGame()         — runs algorithms and calculates score
    ├── drawPath()           — renders a route as an SVG polyline
    └── SVG map rendering    — cities, paths, labels, animations
```

---

## Key Concepts Explained Simply

### City
A point on the map. Each city has:
- An **ID number** (0, 1, 2…)
- An **x and y position** on the SVG canvas
- A **fantasy name** (e.g. "Aether", "Boryn", "Crest") displayed beneath it

### Tour
A **tour** is an ordered list of city IDs representing the order they are visited. For example:
```
[0, 3, 5, 1, 4, 2]   → visit city 0, then 3, then 5... then return to 0
```

### Distance
The straight-line (Euclidean) distance between two cities is calculated using the **Pythagorean theorem**:
```
distance = √((x₂ - x₁)² + (y₂ - y₁)²)
```
The **total tour distance** is the sum of all these individual distances, including the final return to the start city.

### NP-Hard
A category of problem where:
- It's easy to **check** whether a given answer is correct.
- But it's incredibly hard to **find** the best answer from scratch.
- The time required grows so fast that even supercomputers can't brute-force large inputs.

---

## Algorithms Used

### 1. Nearest Neighbour (Greedy) — 🔵 Blue Route

**How it works:**
1. Start at city 0.
2. Look at all unvisited cities.
3. Go to the **closest** one.
4. Repeat until all cities are visited.
5. Return to start.

**Why it's called "greedy":** It always makes the locally best choice (the nearest city) without thinking about the big picture. This is fast — it runs in **O(n²)** time — but the result is often far from optimal because early greedy choices can lead to long detours later.

**In the code:** `nearestNeighbour(cities)` in the helper functions section.

---

### 2. 2-Opt Improvement — 🟢 Green Route

**How it works:**
1. Start with the Nearest Neighbour route.
2. Pick any two edges (connections between cities).
3. Try **reversing the segment** between them (removing the crossing).
4. If the new total distance is shorter, keep the change.
5. Repeat until no improvement is possible.

**Why it helps:** Route crossings are always wasteful — uncrossing them always shortens the path. 2-Opt systematically eliminates all crossings.

**In the code:** `twoOpt(tour, cities, maxIter)` — runs up to 300 iterations to keep it fast.

---

### Why Not Find the Perfect Answer?

Finding the absolute best route requires checking **every possible order** of cities — that's n! routes. The code shows this directly in the results panel:

```
With 14 cities → 14! = 87,178,291,200 possible routes
```

Even at a billion checks per second, that's 87 seconds just for 14 cities. At 20 cities it would take **decades**.

---

## Scoring System

After you finish, your **Efficiency Score** is calculated as:

```
Score = (Best Algorithm Distance ÷ Your Distance) × 100%
```

If you matched the 2-Opt route perfectly, your score would be **100%**. In practice:

| Score | Rating |
|-------|--------|
| 95% and above | 🏆 LEGENDARY |
| 85% – 94%     | ⭐ EXCELLENT |
| 70% – 84%     | 👍 GOOD JOB |
| 55% – 69%     | DECENT |
| Below 55%     | KEEP TRYING |

**The score can never exceed 100%** because the 2-Opt route is always at least as good as any greedy approach. (If you somehow beat 2-Opt, your score could technically exceed 100% — the code supports this.)

---

## Game Phases

The game moves through clearly defined **phases** managed by a state machine:

```
MENU → (start) → PLAYING → (all cities clicked) → DONE → REVEAL
                     ↕
                  PAUSED
```

| Phase | What's Happening |
|-------|-----------------|
| `MENU` | Main menu is shown |
| `TUTORIAL` | Tutorial modal is open |
| `PLAYING` | Player is actively clicking cities |
| `PAUSED` | Timer stopped, pause menu visible |
| `DONE` | Player finished, algorithms calculating |
| `REVEAL` | Results animating in (greedy at 0.9s, 2-opt at 1.8s) |

---

## Code Walkthrough

### How Cities Are Generated
```typescript
generateCities(n, W, H)
```
Randomly places `n` cities on the canvas, ensuring no two cities are closer than **55 pixels** apart. This prevents cities from overlapping and makes the map readable.

---

### How Clicks Are Handled
```typescript
handleCityClick(id)
```
- If the city is already visited → ignore it (unless it's the start city and all others are visited — then close the loop).
- Otherwise, add it to `playerTour`.
- If all cities are now visited → automatically finish after a 400ms delay.

---

### How the Map Is Drawn
The map is an **SVG element** rendered inside a responsive container. Each city is an SVG `<g>` (group) containing:
- A **pulsing animation circle** (for the start city)
- A **filled circle** (the city dot)
- A **text number** showing visit order
- A **fantasy name** label underneath

Routes are drawn using SVG `<polyline>` elements — a connected series of points.

---

### How Results Animate In
After the player finishes, a sequence of `setTimeout` calls staggers the reveal:
1. `animStep 1` (0.6s): Results panel appears, player score shown.
2. `animStep 2` (1.5s): Greedy (blue) route fades in on the map.
3. `animStep 3` (2.4s): 2-Opt (green) route fades in on the map.

---

### The Timer
A `setInterval` runs every 1000ms during `PLAYING` phase, incrementing the `elapsed` state variable (in seconds). It is cleared whenever the game is paused, finished, or the player returns to menu.

---

### Random Stars
The starfield is generated **once** using a **seeded pseudo-random number generator** — this ensures the stars look the same every time the component mounts, preventing a "flash" of different stars on re-render. Each star has a random position, size, opacity, and twinkle animation speed.

---

## Technologies Used

| Technology | Role |
|------------|------|
| **React** | UI framework — components, state, effects |
| **TypeScript** | Type safety for cities, tours, phases, props |
| **SVG** | All game graphics — cities, routes, stars, grid |
| **CSS-in-JS (inline styles)** | All styling is done via React's `style` prop |
| No external game libraries | Pure React + browser APIs only |

---

## Glossary

| Term | Meaning |
|------|---------|
| **TSP** | Travelling Salesman Problem — find the shortest route visiting all cities once |
| **NP-Hard** | A class of problems with no known fast perfect solution |
| **O(n²)** | Time complexity — work grows with the square of input size |
| **n!** | n factorial — the number of possible orderings of n items |
| **Greedy Algorithm** | Makes the locally best choice at each step |
| **2-Opt** | Route improvement technique that removes crossing paths |
| **Tour** | A complete ordered route visiting all cities and returning to start |
| **Euclidean Distance** | Straight-line distance between two points (Pythagorean theorem) |
| **SVG** | Scalable Vector Graphics — XML-based format for drawing shapes in browsers |
| **Polyline** | An SVG shape connecting a series of points with straight lines |
| **Seeded Random** | A random number generator that produces the same sequence given the same starting number |
| **State Machine** | A system that moves between defined states (MENU → PLAYING → DONE etc.) |

---

*Built as an educational project for Design & Analysis of Algorithms (DAA). The game makes NP-Hard problems approachable for everyone — from students to curious minds.*
