# Capstone Defense Demo Script: PC Alley ERP & POS System

This script is designed for a 10-15 minute demonstration. It follows a narrative flow that highlights the system's "Tech Core" aesthetic and its practical utility for multi-branch retail operations.

## Pre-Demo Checklist
- [ ] Backend Server Running (`node src/server.js`)
- [ ] Frontend Running (`npm run dev`)
- [ ] Database seeded with sample data
- [ ] 3 Browser Tabs open:
    - Tab 1: Login Page
    - Tab 2: Super Admin Dashboard (pre-logged in)
    - Tab 3: Branch Staff POS (pre-logged in)

---

## 1. Introduction: The Vision (1 min)
**Action:** Show the Landing Page.
**Script:** 
> "Good morning, panel. Today we present **PC Alley: The Tech Core**. This is more than just an inventory tool—it's a multi-branch ERP and POS ecosystem designed to streamline hardware retail operations. Our goal was to replace fragmented systems with a unified, high-performance 'Logic Core' that handles everything from real-time stock tracking to advanced sales analytics."

---

## 2. Part 1: Personnel Clearance (Authentication) (1 min)
**Action:** Login as Super Admin (`admin@pcalley.com`).
**Script:**
> "Security is paramount. The system uses a role-based access control (RBAC) model. Different personnel—from Super Admins to Branch Staff—access different 'hubs' of information. By entering our Personnel ID and Security Access Key, we bridge the gap between the physical store and our digital matrix."

---

## 3. Part 2: The Command Center (Dashboard) (2 mins)
**Action:** Navigate through the Dashboard. Hover over charts.
**Script:**
> "Welcome to the Command Center. As a Super Admin, I have a bird's-eye view of all authorized hubs. Here, we see real-time 'Matrix Assets'—our total inventory value—alongside dynamic sales trends. 
> 
> Notice the **Dark Glassmorphism** design. We've prioritized visual excellence to ensure that even complex data remains readable and engaging. These micro-animations aren't just for show; they provide immediate feedback on system health and branch performance."

---

## 4. Part 3: Asset Management (Inventory & Products) (3 mins)
**Action:** Go to **Inventory** or **Products**. Show the list. Search for an item (e.g., "RTX 4090").
**Script:**
> "At the heart of PC Alley is Asset Management. We can track every component across multiple branches. 
> 
> *[Action: Click 'Add Product' or 'View Details']*
> 
> We track serial numbers, warranty periods, and batch categories. If a branch is running low on a specific GPU, the system flags it immediately. We've implemented a robust search and filter engine to manage thousands of SKUs without latency."

---

## 5. Part 4: The Frontline (POS / Sell) (3 mins)
**Action:** Switch to the **Sell** or **Sales** module. Simulate a transaction.
**Script:**
> "Now, let's look at the Frontline. Our POS module is designed for speed. 
> 
> *[Action: Add 2-3 items to the cart]*
> 
> Staff can quickly scan items, apply discounts, and select the payment method. Once the 'Transaction Complete' signal is sent, the system automatically decrements local stock and updates the global ledger in real-time. This ensures that a customer in Branch A never buys the last item that was just sold in Branch B."

---

## 6. Part 5: Logistics & Governance (Purchases & HRM) (2 mins)
**Action:** Briefly show **Purchases** (Restock) and **Staff** management.
**Script:**
> "To keep the core running, we have Logistics and Governance. 
> 
> In **Purchases**, we manage supplier relations and restock requests. If a manager needs more stock, they initiate a 'Restock Request' which then flows to the Super Admin for approval.
> 
> In **HRM**, we manage our personnel. We can adjust roles, set permissions, and monitor staff activity to ensure accountability across the entire network."

---

## 7. Conclusion: The Future of PC Alley (1 min)
**Action:** Go back to the Dashboard or a Summary Report.
**Script:**
> "In conclusion, PC Alley: The Tech Core provides a scalable, secure, and visually stunning solution for modern hardware retail. We've built a system that doesn't just record data—it provides the insights needed to grow a multi-branch business in an increasingly competitive market. 
> 
> Thank you. We are now open for your questions regarding the system architecture or implementation."

---

## Technical Appendix (Q&A Prep)
- **Tech Stack:** Next.js 14 (Frontend), Node/Express (Backend), MySQL/Sequelize (Database).
- **Styling:** Vanilla CSS with a focus on Glassmorphism and Framer Motion for high-end animations.
- **State Management:** React Context API for themes and user sessions.
- **Security:** JWT (JSON Web Tokens) for session management and BCrypt for password hashing.
- **Multi-branch:** Data is partitioned by Branch IDs in the database, allowing for isolated or aggregated views.
