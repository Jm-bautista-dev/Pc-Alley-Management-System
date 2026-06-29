# Capstone Defense: Canva Slide Design Guide & Copy-Paste Specification

![Capstone Infographic Flowchart Template](C:/Users/ailod/.gemini/antigravity-ide/brain/04f3b7de-586f-4613-9912-7b547548be95/capstone_system_flowchart_1782144628010.png)

This guide provides a professional layout grid, a curated tech color palette, and copy-paste text blocks to help you build your capstone presentation slides in Canva.

> [!TIP]
> **Edit Mermaid Directly in Canva:**
> You can paste the Mermaid code from [capstone_full_flowchart.md](file:///C:/Users/ailod/.gemini/antigravity-ide/brain/04f3b7de-586f-4613-9912-7b547548be95/capstone_full_flowchart.md) into [mermaid.live](https://mermaid.live), download it as an **SVG**, and upload the SVG to Canva. Canva allows you to ungroup and change the colors, text, and border styles of SVG diagrams directly!

---

## 1. Canva Presentation Design System

Use these professional assets to keep a cohesive, high-quality look across all slides:

### Color Palette (Hex Codes)
* **Primary (Tech Navy):** `#0F172A` (Use for slide backgrounds or header text)
* **Secondary (Slate Blue):** `#1E293B` (Use for container cards and borders)
* **Accent Accent (Teal / Cyan):** `#06B6D4` (Use for highlights, arrows, and start/end tags)
* **Neutral Dark (Charcoal):** `#334155` (Use for normal body text)
* **Neutral Light (Off-White):** `#F8FAFC` (Use for page backgrounds in light mode)

### Typography Pairs (Search these in Canva)
* **Headers:** `Outfit` or `Montserrat` (Set to Bold, size 36–40pt)
* **Body Text:** `Inter` or `Roboto` (Set to Regular, size 14–16pt)

---

## 2. Slide-by-Slide Layout Specification

### Slide 1: High-Level System Overview
* **Canva Slide Layout:** 3-Column horizontal grid with a central vertical path.
* **Colors:** Dark background (`#0F172A`), white cards (`#F8FAFC`).
* **Visual Elements:** 3 large circles representing the roles, connected to a central gateway login card.
* **Copy-Paste Text Fields:**
  * **Header:** `PC Alley: ERP & POS System Overview`
  * **Column 1 Title:** `Super Admin Gate`
  * **Column 1 Text:** `Authorized to manage system catalog, branches, admin accounts, global restocking, and financial analytics.`
  * **Column 2 Title:** `Branch Admin Gate`
  * **Column 2 Text:** `Manages branch-level inventory, registers POS sales checkout, logs local expenses, and submits replenishment requests.`
  * **Column 3 Title:** `Customer Gate`
  * **Column 3 Text:** `Accesses public online catalog, places orders, tracks shipments, and submits warranty claim requests.`

---

### Slide 2: Super Admin Process Flow
* **Canva Slide Layout:** Left column has a list of modules, Right column displays a preview/description block.
* **Colors:** Slate background (`#1E293B`) with accent color lines.
* **Visual Elements:** Use "Process Arrow" shapes in Canva to show sequential stages.
* **Copy-Paste Text Fields:**
  * **Header:** `Super Admin Process Workflow`
  * **Step 1:** `Category Management: Auto-generates SKU Barcode ([Category]-[Brand]-[ID]) upon category assignment.`
  * **Step 2:** `Master Product Catalog: Create, update, archive, and view centralized inventory details.`
  * **Step 3:** `Branch & Account Management: Control physical location parameters and enable/disable Branch Manager accounts.`
  * **Step 4:** `Restock Request Approval: Evaluates manager submissions to authorize purchase orders or transfer surplus stock.`
  * **Step 5:** `Warranty & Claims: Audits customer claims and changes resolution state in the Database.`
  * **Step 6:** `Global Analytics: Monitors total sales, low stock alerts, and branch performance metrics.`

---

### Slide 3: Branch Admin Process Flow
* **Canva Slide Layout:** Zig-zag process timeline.
* **Colors:** Off-white background, Navy blue cards.
* **Visual Elements:** Connecting lines with checkmarks at POS check decisions.
* **Copy-Paste Text Fields:**
  * **Header:** `Branch Admin Process Workflow`
  * **Section A (Restock):** `View Local Inventory → Check Low Stock → Trigger Restock Request to Super Admin.`
  * **Section B (POS Checkout):** `Select Product → Verify Stock Level → Deduct Inventory → Collect Payment → Generate Receipt.`
  * **Section C (Warranty Verification):** `Receive Claim → Search DB Invoice → Check Validity → Forward to Super Admin.`
  * **Section D (Branch Reports):** `Export daily, weekly, and monthly sales charts + local stock levels.`

---

### Slide 4: Staff Process Flow
* **Canva Slide Layout:** 4-stage sequential grid (Attendance → POS Checkout → Warranty Screen → Log History).
* **Colors:** Warm Teal background with Navy Blue containers.
* **Visual Elements:** Clock-in/out toggles and POS transaction flowchart segments.
* **Copy-Paste Text Fields:**
  * **Header:** `Staff Portal & POS Workflow`
  * **Stage 1 (Attendance Logs):** `Clock in and clock out to record shift hours directly in the Attendance database.`
  * **Stage 2 (POS Sales Checkout):** `Select customer, build cart, verify real-time stock levels, collect payment, update DB inventory levels, and print invoices.`
  * **Stage 3 (Warranty Screening):** `Receive and verify physical walk-in purchase receipts; forward valid claims to the Super Admin.`
  * **Stage 4 (Sales History Logs):** `Trace daily local branch order logs and transactions directly from the dashboard.`

---

### Slide 5: Database Schema Mapping (ERD Presentation)
* **Canva Slide Layout:** Grid of 4 columns, representing Table Categories.
* **Colors:** Dark background, cards with accent borders (`#06B6D4`).
* **Visual Elements:** Table cards with bullet lists of key columns.
* **Copy-Paste Text Fields:**
  * **Header:** `Centralized Database Entity Relationships`
  * **Card 1 (Core Identity):**
    * Title: `Users & Access`
    * Details: `User (id, username, password, role, branch_id) | Branch (id, name, location)`
  * **Card 2 (Inventory & Products):**
    * Title: `Catalog Management`
    * Details: `Product (id, sku, name, price) | Category (id, name) | Inventory (id, branch_id, quantity)`
  * **Card 3 (Transactions):**
    * Title: `Sales & POS Orders`
    * Details: `Sale (id, invoiceNumber, totalAmount) | SaleItem (id, saleId, productId) | Customer (id, name)`
  * **Card 4 (Supply Chain & Logistics):**
    * Title: `Procurement`
    * Details: `StockTransfer (id, source, destination) | RestockRequest (id, quantity) | Supplier (id, name)`

---

### Slide 6: System Architecture Diagram
* **Canva Slide Layout:** 3-tier vertical stack (Frontend → Server → Database).
* **Colors:** Dark background, light gradient blocks.
* **Visual Elements:** Connected layers with bidirectional arrows.
* **Copy-Paste Text Fields:**
  * **Header:** `PC Alley: Three-Tier System Architecture`
  * **Tier 1 (Frontend):** `Next.js 14 Web Application | styled with TailwindCSS & Framer Motion | real-time sync via Socket.io Client.`
  * **Tier 2 (API Server & Backend):** `Node.js & Express API Server | Sequelize ORM for database translations | WebSocket Socket.io server.`
  * **Tier 3 (Database Layer):** `Centralized MySQL relational database managing ACID-compliant transactions.`
