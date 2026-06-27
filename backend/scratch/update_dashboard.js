const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/dashboard/page.js', 'utf8');

// 0. Import apiUrl (if not already there)
if (!content.includes('import { apiUrl }')) {
  content = content.replace('import { getChartTheme } from "../../lib/chartTheme";', 'import { getChartTheme } from "../../lib/chartTheme";\nimport { apiUrl } from "../../lib/api";');
}

// 1. Add salesHistory state
content = content.replace('const [user, setUser] = useState(null);', 'const [user, setUser] = useState(null);\n  const [salesHistory, setSalesHistory] = useState([]);');

// 2. Add fetchSalesData in useEffect
content = content.replace('setUser(JSON.parse(userData));\n    }', 'setUser(JSON.parse(userData));\n      fetchSalesData();\n    }');

content = content.replace('}, []);', '}, []);\n\n  const fetchSalesData = async () => {\n    try {\n      const token = localStorage.getItem("token");\n      const res = await fetch(apiUrl("/api/sales/history"), {\n        headers: { Authorization: `Bearer ${token}` }\n      });\n      if (res.ok) {\n        const data = await res.json();\n        setSalesHistory(data);\n      }\n    } catch (err) {\n      console.error(err);\n    }\n  };\n');

// 3. Compute dynamic chart data
const computeData = `
  const revenueByMonth = new Array(12).fill(0);
  const ordersByMonth = new Array(12).fill(0);
  let totalRevenue = 0;
  const categoriesMap = {};

  salesHistory.forEach(order => {
    const month = new Date(order.createdAt).getMonth();
    const amount = parseFloat(order.total_amount) || 0;
    revenueByMonth[month] += amount;
    ordersByMonth[month] += 1;
    totalRevenue += amount;

    if (order.OrderItems) {
       order.OrderItems.forEach(item => {
          const catName = item.Product?.Category?.name || 'Uncategorized';
          categoriesMap[catName] = (categoriesMap[catName] || 0) + item.quantity;
       });
    }
  });
`;

content = content.replace('const lineChartData = {', computeData + '\n  const lineChartData = {');

// 4. Update lineChartData references
content = content.replace('data: [190, 230, 200, 250, 220, 280, 270, 310, 280, 320, 300, 290],', 'data: revenueByMonth,');
content = content.replace('data: [210, 250, 230, 270, 250, 310, 290, 340, 290, 350, 320, 300].map(v => v - 30), // Blue line slightly below', 'data: ordersByMonth,');

// 5. Update scales y
content = content.replace(/min: 180,[\s\S]*?max: 360,[\s\S]*?ticks: {[\s\S]*?stepSize: 20,[\s\S]*?color: chartTheme\.tickColor,[\s\S]*?font: { size: 10, family: 'DM Sans' },[\s\S]*?callback: \(value\) => '₱' \+ value \+ 'k'[\s\S]*?},/, "beginAtZero: true,\n        ticks: {\n          color: chartTheme.tickColor,\n          font: { size: 10, family: 'DM Sans' },\n          callback: (value) => '₱' + value\n        },");

// 6. Update pie chart data
const oldPieCode = /const doughnutData = {[\s\S]*?hoverOffset: 4\r?\n      }\r?\n    \]\r?\n  };/g;

const newPieCode = `
  const catNames = Object.keys(categoriesMap);
  const catData = Object.values(categoriesMap);
  const catColors = catNames.map((_, i) => ['#2563C4', '#F8F9FB', '#FF3B4E', '#BC13FE', '#00F2FF'][i % 5]);

  const doughnutData = {
    labels: catNames.length > 0 ? catNames : ['No Data'],
    datasets: [
      {
        data: catData.length > 0 ? catData : [1],
        backgroundColor: catColors.length > 0 ? catColors : ['#334155'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };
`;
content = content.replace(oldPieCode, newPieCode.trim());

// 7. Update recent orders
const oldRecentCode = /const recentOrders = \[[\s\S]*?\];/g;
const newRecentCode = `
  const recentOrdersList = salesHistory.slice(0, 5).map(order => ({
    id: \`#ORD-\${order.id}\`,
    customer: order.customer_name,
    product: order.OrderItems?.[0]?.Product?.name || 'Multiple Items',
    amount: \`₱\${parseFloat(order.total_amount).toLocaleString()}\`,
    status: order.status || "Delivered",
    date: new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  }));
`;
content = content.replace(oldRecentCode, newRecentCode.trim());

// 8. Update StatCards
content = content.replace('value="₱284,920"', 'value={`₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}');
content = content.replace('subtext="vs last month" \n              icon={DollarSign}', 'subtext="All Time" \n              icon={DollarSign}');
content = content.replace('value="4,821"', 'value={salesHistory.length}');

content = content.replace(/subtext="vs last month" \n            \/>\n            <StatCard \n              title="Active Customers"/g, 'subtext="All Time" \n            />\n            <StatCard \n              title="Active Customers"');

// 9. Update Pie chart legend UI
const oldLegendUI = /<div className="flex justify-center items-center gap-4 mt-8">[\s\S]*?<span className="text-xs text-muted">Other<\/span>[\s\S]*?<\/div>[\s\S]*?<\/div>/g;
const newLegendUI = `<div className="flex justify-center items-center gap-4 mt-8 flex-wrap">
                {catNames.length > 0 ? catNames.map((name, i) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColors[i] }} />
                    <span className="text-xs text-muted">{name}</span>
                  </div>
                )) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#334155]" />
                    <span className="text-xs text-muted">No Data</span>
                  </div>
                )}
              </div>`;

content = content.replace(oldLegendUI, newLegendUI);

// 10. Update recentOrders map
content = content.replace(/recentOrders\.map\(/g, 'recentOrdersList.map(');

fs.writeFileSync('frontend/src/app/dashboard/page.js', content, 'utf8');
console.log('Update Complete');
