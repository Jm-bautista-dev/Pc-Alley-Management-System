const fs = require('fs');
const filePath = 'c:/xampp/htdocs/capstone/frontend/src/app/admin/page.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                  <button 
                    onClick={openProvisionModal}
                    className="btn-premium h-10 px-4 md:px-5"
                  >
                     Create Account
             className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 mb-8 overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">`;

const replaceStr = `                  <button 
                    onClick={openProvisionModal}
                    className="btn-premium h-10 px-4 md:px-5"
                  >
                     Create Account
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                     <tr className="text-[10px] font-black uppercase tracking-widest text-main/40 border-b border-border">
                      <th className="pb-4 pr-4">ID Vector</th>
                      <th className="pb-4 px-4">Personnel</th>
                      <th className="pb-4 px-4">Authorization</th>
                      <th className="pb-4 px-4">Sector</th>
                      <th className="pb-4 pl-4 text-right">Ops</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.map((user, i) => (
                      <tr key={user.id} className="border-b border-border hover:bg-brand-muted/5 transition-colors group cursor-pointer">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-40 truncate uppercase">
                            UID-{user.id.toString().padStart(4, '0')}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-surface border border-border flex items-center justify-center text-[10px] font-bold text-muted group-hover:border-brand-neonblue/30 group-hover:text-brand-neonblue transition-all opacity-60 uppercase">
                              {user.username.substring(0, 2)}
                            </div>
                            <div>
                               <h4 className="text-[13px] font-bold text-main group-hover:text-brand-neonblue transition-colors">{user.username}</h4>
                               <p className="text-[10px] text-muted-40 uppercase tracking-widest mt-0.5">Active Session</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border \${
                            user.role === 'super_admin' ? 'bg-brand-crimson/10 border-brand-crimson/20 text-brand-crimson' : 
                            user.role === 'employee' ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
                            'bg-brand-neonblue/10 border-brand-neonblue/20 text-brand-neonblue'
                          }\`}>
                            {user.role === 'employee' ? 'Staff' : (user.role === 'branch_admin' ? 'Manager' : 'Admin')}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px] text-muted-40 uppercase">
                           {user.Branch ? user.Branch.name : 'Central Core'}
                        </td>
                        <td className="py-4 pl-4 text-right">
                           <button onClick={() => alert("System Notice: Module Not Enabled")} className="p-2.5 bg-brand-surface border border-border rounded-xl text-muted hover:text-main transition-all shadow-sm"><MoreVertical size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

          {/* Comparative Output Section - NEW */}
          {currentUser?.role === 'super_admin' && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.15 }}
               className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 mb-8 overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-orange-400/50 rounded-full" />
                  <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Comparative Output</h3>
                </div>
                <button onClick={() => window.print()} className="btn-ghost px-4 py-1.5 text-[9px]">
                  Export Report
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {comparativeData.map((data) => (
                  <div key={data.branch_id} className="p-5 border border-border bg-main/5 rounded-2xl">
                    <h4 className="text-[13px] font-bold text-main mb-4 uppercase">{data.branch_name}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted uppercase tracking-widest">Total Revenue</span>
                        <span className="text-[12px] text-brand-neonblue font-bold">₱{Number(data.total_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted uppercase tracking-widest">Orders Processed</span>
                        <span className="text-[12px] text-main font-bold">{data.order_count || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted uppercase tracking-widest">Active Stock</span>
                        <span className="text-[12px] text-orange-400 font-bold">{data.total_stock || 0} units</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Branch Registry Section */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 mb-8 overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully replaced content.");
} else {
  console.log("Target string not found in the file.");
}
