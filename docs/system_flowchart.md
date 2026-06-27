# PC Alley ERP System Flowchart

This document provides a visual representation of the system architecture and functional workflows of the PC Alley ERP system.

## 1. System Architecture
This diagram shows the high-level technical stack and how data flows between the user interface and the database.

```mermaid
graph TD
    User((User))
    
    subgraph "Frontend (Next.js/React)"
        UI[User Interface]
        State[Layout/Theme/Auth Context]
        API_Call[API Client / Axios]
    end
    
    subgraph "Backend (Node.js/Express)"
        Route[API Routes]
        Middleware[Middleware: JWT Auth / RBAC]
        Controller[Controllers: Business Logic]
        ORM[Sequelize ORM]
    end
    
    subgraph "Database (MySQL)"
        DB[(MySQL Database)]
    end
    
    User <--> UI
    UI <--> State
    State <--> API_Call
    API_Call <--> Route
    Route <--> Middleware
    Middleware <--> Controller
    Controller <--> ORM
    ORM <--> DB
```

---

## 2. Authentication & Authorization (RBAC) Flow
How the system handles user entry and restricts access based on roles.

```mermaid
flowchart TD
    Start([User Opens App]) --> Login{Login Page}
    Login --> Auth[Authenticate via /api/auth/login]
    Auth --> Success{Success?}
    
    Success -- No --> Login
    Success -- Yes --> JWT[Store JWT & Role]
    
    JWT --> RoleCheck{Check User Role}
    
    RoleCheck -- "Super Admin" --> AdminDash[Global Dashboard: All Branches Access]
    RoleCheck -- "Branch Manager" --> BranchDash[Branch Dashboard: Specific Branch Access]
    RoleCheck -- "Staff" --> StaffDash[Limited Access: POS/Sales Only]
    
    AdminDash --> Modules[Access All Modules]
    BranchDash --> Modules
    StaffDash --> POS[Access POS / Sell Only]
```

---

## 3. Core Functional Modules
Detailed view of how different modules interact within the ERP system.

```mermaid
graph LR
    subgraph "Inventory Management"
        Prod[Products]
        Cat[Categories]
        Stock[Stock Levels]
        Supp[Suppliers]
    end
    
    subgraph "Sales & Revenue"
        POS[POS / Sell]
        Sales[Sales Records]
        Customer[Customers]
    end
    
    subgraph "Analytics & reporting"
        Reports[P&L Reports]
        Dashboard[Analytics Dashboard]
        Logs[System Logs]
    end
    
    Prod --> Cat
    Supp --> Prod
    Prod -- "Stock Update" --> POS
    POS --> Sales
    Sales --> Customer
    
    Sales -- "Data Feed" --> Reports
    Sales -- "Data Feed" --> Dashboard
    Stock -- "Low Stock Alerts" --> Dashboard
```

---

## 4. Navigation Structure
Overview of the sidebar navigation available to administrators.

```mermaid
mindmap
  root((Dashboard))
    Inventory
      Products
      Categories
      Stock Transfers
      Suppliers
    Sales
      POS System
      Sales History
      Return Requests
    Management
      Staff / HRM
      Branch Settings
      Role Management
    Financials
      Expenses
      Purchases
      Profit & Loss
    Analytics
      Sales Reports
      Inventory Analytics
      Customer Insights
```
