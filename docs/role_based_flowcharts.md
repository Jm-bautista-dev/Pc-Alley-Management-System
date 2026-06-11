# Role-Based System Flowcharts

This document provides separate functional flowcharts for each user role in the PC Alley ERP system.

---

## 1. Admin (Super Admin) Flowchart
The Admin has global oversight and manages the system infrastructure.

```mermaid
flowchart TD
    Start([Start]) --> Login[Login Page]
    Login --> Valid{Is Admin?}
    Valid -- No --> Login
    Valid -- Yes --> GlobalDash[Global Dashboard]
    
    GlobalDash --> BranchMgmt[Branch Management]
    BranchMgmt --> AddBranch[/Add/Edit Branches/]
    AddBranch --> GlobalDash
    
    GlobalDash --> UserMgmt[User Management]
    UserMgmt --> AddUser[/Manage Staff & Managers/]
    AddUser --> GlobalDash
    
    GlobalDash --> GlobalStats[Global Analytics]
    GlobalStats --> ViewAll[/View All Branch Reports/]
    ViewAll --> GlobalDash
    
    GlobalDash --> Logout[Logout]
    Logout --> End([End])

    style Start fill:#f9f,stroke:#333
    style End fill:#f9f,stroke:#333
    style Valid fill:#fff4dd,stroke:#d4a017
```

---

## 2. Manager (Branch Manager) Flowchart
The Manager focuses on branch-specific inventory and operational performance.

```mermaid
flowchart TD
    Start([Start]) --> Login[Login Page]
    Login --> Valid{Is Manager?}
    Valid -- No --> Login
    Valid -- Yes --> BranchDash[Branch Dashboard]
    
    BranchDash --> InvMgmt[Inventory Management]
    InvMgmt --> StockUpd[/Add Products / Adjust Stock/]
    StockUpd --> BranchDash
    
    BranchDash --> SalesMon[Sales Monitoring]
    SalesMon --> ViewSales[/Track Branch Revenue/]
    ViewSales --> BranchDash
    
    BranchDash --> RepMgmt[Reporting]
    RepMgmt --> BranchRep[/Generate Branch P&L/]
    BranchRep --> BranchDash
    
    BranchDash --> Logout[Logout]
    Logout --> End([End])

    style Start fill:#f9f,stroke:#333
    style End fill:#f9f,stroke:#333
    style Valid fill:#fff4dd,stroke:#d4a017
```

---

## 3. Staff Flowchart
The Staff role is focused on customer-facing tasks and day-to-day operations.

```mermaid
flowchart TD
    Start([Start]) --> Login[Login Page]
    Login --> Valid{Is Staff?}
    Valid -- No --> Login
    Valid -- Yes --> StaffDash[Staff Dashboard]
    
    StaffDash --> POS[POS System]
    POS --> Sale[/Process Sales / Generate Receipt/]
    Sale --> StaffDash
    
    StaffDash --> InvView[Inventory View]
    InvView --> CheckStock[/Search & Check Availability/]
    CheckStock --> StaffDash
    
    StaffDash --> DailyRep[Daily Reports]
    DailyRep --> PersonalLog[/View Personal Sales History/]
    PersonalLog --> StaffDash
    
    StaffDash --> Logout[Logout]
    Logout --> End([End])

    style Start fill:#f9f,stroke:#333
    style End fill:#f9f,stroke:#333
    style Valid fill:#fff4dd,stroke:#d4a017
```
