# Capstone Presentation: PC Parts Inventory & Sales Management System

This document separates the core workflows and architecture of the **PC Parts Inventory and Sales Management System** into six clear figures. This modular approach avoids overlapping lines, ensures readability, and follows professional standards for a capstone defense.

---

## Figure 1: System Overview Flowchart (High-Level)

This diagram outlines the high-level system entry gate, credential verification, and role-based routing for **Super Admin**, **Branch Admin**, and **Staff**.

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    StartGate([Start: Open System]) --> OpenLogin[Open Login Page]
    OpenLogin --> LoginInput[/"Input Credentials"/]
    LoginInput --> CheckLogin{"Valid Account?"}
    
    CheckLogin -->|No| LoginError[Display Error Message] --> LoginInput
    CheckLogin -->|Yes| CheckRole{"Check User Role"}

    CheckRole -->|Super Admin| RouteSA[Route to Super Admin Dashboard]
    CheckRole -->|Branch Admin| RouteBA[Route to Branch Admin Dashboard]
    CheckRole -->|Staff / Employee| RouteStaff[Route to Staff Dashboard]
    
    RouteSA --> End([End Session])
    RouteBA --> End
    RouteStaff --> End
```

---

## Figure 2: Super Admin Process Flow

This diagram traces the administrative capabilities of the Super Admin, including catalog management, barcode SKU generation, stock requests, and analytics.

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    StartAdmin([Super Admin Dashboard]) --> Menu{"Select Module"}
    
    %% Categories
    Menu -->|Categories| CatM["Manage Categories"]
    CatM --> CatAction[Add/Edit/Delete Category]
    CatAction --> GenSKU[Auto Generate SKU Barcode]
    noteSKU["Format: [Category]-[Brand]-[ID]"]
    GenSKU -.-> noteSKU
    GenSKU --> UpdateCatDB[Save Category to Database]
    UpdateCatDB --> Menu
    
    %% Products
    Menu -->|Products| ProdM["Manage Products"]
    ProdM --> ProdAction[Add/Update/Archive Product]
    ProdAction --> UpdateProdDB[Save Product to Database]
    UpdateProdDB --> Menu
    
    %% Branches
    Menu -->|Branches| BranchM["Manage Branches"]
    BranchM --> BranchAction[Add/Edit/Activate/Deactivate Branch]
    BranchAction --> UpdateBranchDB[Save Branch Details]
    UpdateBranchDB --> Menu
    
    %% Admin Accounts
    Menu -->|Admin Accounts| AccM["Manage Admin Accounts"]
    AccM --> AccAction[Create/Edit/Disable Branch Accounts]
    AccAction --> UpdateAccDB[Save Account details in DB]
    UpdateAccDB --> Menu
    
    %% Stock Requests
    Menu -->|Stock Requests| ReviewStockReq[View Stock Requests]
    ReviewStockReq --> StockReqDecision{"Approve Request?"}
    StockReqDecision -->|Yes| AppStock[Approve: Update Branch Inventory & Notify]
    StockReqDecision -->|No| RejStock[Reject: Send Rejection Notification]
    AppStock & RejStock --> Menu
    
    %% Warranties
    Menu -->|Warranties| ReviewWarranties[View Warranty Claims]
    ReviewWarranties --> WarrantyDecision{"Approve Claim?"}
    WarrantyDecision -->|Yes| AppClaim[Approve Claim: Update DB Status]
    WarrantyDecision -->|No| RejClaim[Reject Claim: Update DB Status]
    AppClaim & RejClaim --> Menu
    
    %% Reports
    Menu -->|Reports| GenReports[/"Generate: Sales, Inventory & Branch Performance Reports"/]
    GenReports --> Menu
    
    %% Logout
    Menu -->|Logout| AdminLogout([End: Super Admin Logout])
```

---

## Figure 3: Branch Admin Process Flow

This diagram outlines the branch-level administrative processes, stock level monitoring, and local branch reporting. *(Note: Sales and POS checkouts are managed exclusively by Staff).*

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    StartBranch([Branch Admin Dashboard]) --> Menu{"Select Module"}
    
    %% Inventory & Requests
    Menu -->|Check Inventory| CheckStock{"Stock Low?"}
    CheckStock -->|Yes| CreateReq[Create Stock Request]
    CreateReq --> SendReq[/"Send Request to Super Admin"/]
    SendReq --> Menu
    CheckStock -->|No| ContinueOps[Continue Operations] --> Menu
    
    %% Receive Stock
    Menu -->|Receive Stock| ReceiveStock[Receive Approved Stock]
    ReceiveStock --> UpdateQty[Update Stock Quantity]
    UpdateQty --> SaveQty[Save Inventory Updates in DB]
    SaveQty --> Menu
    
    %% Review local expenses
    Menu -->|Branch Expenses| ViewExpenses[Track Local Expenses]
    ViewExpenses --> LogExpense[Log Rent, Utilities, or Incidentals]
    LogExpense --> SaveExpense[Save Expense in DB]
    SaveExpense --> Menu
    
    %% Reports
    Menu -->|Reports| ViewReports[/"Generate: Daily/Weekly/Monthly Sales & Inventory Status"/]
    ViewReports --> Menu
    
    %% Logout
    Menu -->|Logout| BALogout([End: Branch Admin Logout])
```

---

## Figure 4: Staff Process Flow

This diagram maps out the staff workflows, including shifts attendance logging, the Point-of-Sale (POS) checkout process, sales history reviews, and initial customer warranty screenings.

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    StartStaff([Staff Dashboard]) --> Menu{"Select Action"}
    
    %% Attendance Clocking
    Menu -->|Log Attendance| CheckStatus{"Currently Clocked In?"}
    CheckStatus -->|No| ClockIn[Clock In] --> SaveIn[Record Clock-in Timestamp] --> Menu
    CheckStatus -->|Yes| ClockOut[Clock Out] --> SaveOut[Record Clock-out Timestamp] --> Menu
    
    %% Process Sales (POS)
    Menu -->|Process POS Sale| SelectCustomer[Select Customer: Registered or Walk-In]
    SelectCustomer --> POSSelect[Select Product]
    POSSelect --> CheckPOSStock{"Stock Available?"}
    CheckPOSStock -->|No| OutOfStock[Display Out of Stock Error] --> POSSelect
    CheckPOSStock -->|Yes| CheckoutPOS[Process Checkout & Collect Payment]
    CheckoutPOS --> DeductQty[Deduct Branch Stock Quantity]
    DeductQty --> DBOrders[Create Sale and SaleItems in DB]
    DBOrders --> GenReceipt[/"Generate Invoice Receipt & Warranty Registration"/]
    GenReceipt --> Menu
    
    %% Warranty Claims Verification
    Menu -->|Warranty Processing| RecClaim[Receive Claim from Walk-In Customer]
    RecClaim --> VerifyPurchase[Verify Invoice Purchase in DB]
    VerifyPurchase --> ValidateWarranty{"Valid Warranty?"}
    ValidateWarranty -->|Yes| ForwardWarranty[/"Forward Claim to Super Admin"/]
    ValidateWarranty -->|No| RejectWarranty[Reject Claim]
    ForwardWarranty & RejectWarranty --> Menu
    
    %% Sales History
    Menu -->|View Sales History| History[View Local Sales & Transaction Logs]
    History --> Menu
    
    %% Logout
    Menu -->|Logout| StaffLogout([End: Staff Logout])
```

---

## Figure 5: Database Relationship Diagram (ERD)

This diagram shows how tables connect through primary and foreign keys. (Customers are registered in the DB for transaction tracing but do not log in).

```mermaid
erDiagram
    Branch ||--o{ User : employs
    Branch ||--o{ Product : carries
    Branch ||--o{ Inventory : tracks
    Branch ||--o{ Order : processes
    Branch ||--o{ Customer : registers
    Branch ||--o{ Sale : records
    Branch ||--o{ Attendance : logs
    Branch ||--o{ Expense : pays
    
    Category ||--o{ Product : classifies
    Product ||--o{ Inventory : stock_level
    Product ||--o{ OrderItem : details
    Product ||--o{ SaleItem : contains
    Product ||--o{ StockTransferItem : transfers
    Product ||--o{ PurchaseOrderItem : orders
    Product ||--o{ ProductBundle : bundles
    
    User ||--o{ Order : places
    User ||--o{ Sale : logs
    User ||--o{ StockMovement : registers
    User ||--o{ Attendance : clock_in_out
    User ||--o{ Payroll : pays
    User ||--o{ Expense : tracks
    
    Customer ||--o{ Sale : purchases
    Sale ||--o{ SaleItem : contains
    Sale ||--o{ Warranty : guarantees
    
    Supplier ||--o{ Product : supplies
    Supplier ||--o{ PurchaseOrder : delivers
    PurchaseOrder ||--o{ PurchaseOrderItem : details
    
    StockTransfer ||--o{ StockTransferItem : transfers
    RestockRequest }o--|| Product : replenishes
    ProductRequest }o--|| Product : requests
```

---

## Figure 6: System Architecture Diagram

This diagram displays the structural boundary of the system stack, detailing proxy behaviors and data retrieval connections.

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD
    subgraph client_layer ["Client Layer (Frontend)"]
        NextJS["Next.js 14 Client App (Port 3002)"]
        Tailwind["TailwindCSS styling"]
        Framer["Framer Motion animations"]
        SocketClient["Socket.io Client (Real-time updates)"]
    end
    
    subgraph proxy_routing ["Proxy & Routing"]
        NextProxy["Built-in Next.js Rewrite Proxy (Port 3002)"]
    end
    
    subgraph backend_layer ["Application Server Layer (Backend)"]
        Express["Express.js Web Server (Port 5001)"]
        Sequelize["Sequelize ORM"]
        SocketServer["Socket.io WebSocket Server"]
        Multer["Multer File Uploads"]
    end
    
    subgraph db_layer ["Database Layer"]
        MySQL[(MySQL Database Port 3306)]
    end
    
    %% Connections
    NextJS -- "User Interactions" --> NextProxy
    NextProxy -- "HTTP API Requests" --> Express
    SocketClient -- "Bidirectional Sockets" --> SocketServer
    
    Express --> Sequelize
    Sequelize -- "SQL Queries" --> MySQL
```
