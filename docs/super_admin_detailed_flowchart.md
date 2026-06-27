# Super Admin Detailed Workflow (Readable LR View)

This version uses a **Left-to-Right (LR)** layout. This is the only way to ensure the text is large and readable in a narrow preview window while keeping the entire "single tree" structure of your example.

```mermaid
flowchart LR
    %% Root Header
    Title([Super Admin]) --- Start([Start])

    %% Main Branches
    Start --> Logout[Logout] --> End([End])
    Start --> Dashboard[/Dashboard/]
    Start --> ProdMgmt[/Product Management/]
    Start --> Finance[/Finance/]
    Start --> InvMgmt[/Inventory Management/]
    Start --> BranchMgmt[/Branch Management/]
    Start --> UserMgmt[/User Management/]

    %% Dashboard Details
    Dashboard --- DashStats[Active Branches, \n Total Team Members, \n Monthly Revenue, \n Pending Actions, \n Sales Trends]

    %% Product Management Details
    ProdMgmt --- MenuCat[/Categories, Brands, \n Variants, Add-ons/]
    MenuCat --- MenuCatAct[Add, Edit, Delete]
    
    ProdMgmt --- MenuList[/Product List/]
    MenuList --- MenuListAct[Add, View Status, Edit]

    %% Finance Details
    Finance --- Exp[/Expenses/]
    Exp --- ExpInput[/Input Bills/]
    Exp --- ExpCalc[Calculate]
    
    Finance --- FinRep[/Reports & Analytics/]
    FinRep --- FinRepP[Reports of P&L]
    
    Finance --- PayTrans[/Payment Transactions/]
    PayTrans --- ViewTrans[View Online \n Payment Transactions]

    %% Inventory Management Details
    InvMgmt --- Stocks[/Stock Levels/]
    Stocks --- ViewStocks[/View Branch \n Stocks/]
    
    InvMgmt --- Supply[/Supply Distribution/]
    Supply --- SupplyAdd[Add Stock]
    Supply --- SupplyView[View Stock]

    %% Branch Management Details
    BranchMgmt --- BList[/Branch List/]
    BList --- BEdit[Edit]
    BList --- BDel[Delete]
    BList --- BView[View]
    
    BranchMgmt --- BAdd{Add New \n Branch?}
    BAdd -- Yes --> BInput[/Input Branch \n Details/]
    BInput --- BSave[Save Branch]

    %% User Management Details
    UserMgmt --- AdminAcc[/Admin Accounts/]
    AdminAcc --- AdminAct[Add, Edit, \n Delete, Deactivate]
    
    UserMgmt --- StaffAcc[/Staff Accounts/]
    StaffAcc --- StaffAct[Add, Edit, \n Delete, Deactivate]
    
    UserMgmt --- CustAcc[/Customer Accounts/]
    CustAcc --- CustView[View Only]

    %% Styling
    style Title fill:#fff,stroke:#333,stroke-width:2px
    style Start fill:#fff,stroke:#333,stroke-width:2px
    style End fill:#fff,stroke:#333,stroke-width:2px
```
