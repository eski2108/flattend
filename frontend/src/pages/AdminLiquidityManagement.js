import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import axios from 'axios';
import { IoWallet, IoRefresh, IoCheckmarkCircle, IoClose, IoTrendingUp, IoCash, IoArrowForward } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

// Premium Card Component
const PremiumCard = ({ children, className = '', glow = false }) => (
  <div 
    className={`rounded-2xl border border-cyan-400/25 bg-[#030A14]/80 backdrop-blur-sm ${className}`}
    style={{
      boxShadow: glow 
        ? '0 0 30px rgba(0, 234, 255, 0.2), inset 0 0 30px rgba(0, 234, 255, 0.05)'
        : '0 0 20px rgba(0, 234, 255, 0.1), inset 0 0 20px rgba(0, 234, 255, 0.03)'
    }}
  >
    {children}
  </div>
);

const AdminLiquidityManagement = () => {
  const [nowpaymentsBalances, setNowpaymentsBalances] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [totalRevenueGBP, setTotalRevenueGBP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValueGBP, setTotalValueGBP] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch NOWPayments balances
      const balancesPromise = axios.get(`${API}/api/admin/nowpayments/balances`);
      
      // Fetch revenue data
      const revenuePromise = axios.get(`${API}/api/admin/revenue/summary`);
      
      const [balancesRes, revenueRes] = await Promise.all([balancesPromise, revenuePromise]);
      
      if (balancesRes.data.success) {
        setNowpaymentsBalances(balancesRes.data.balances);
        // Use platform liquidity (not total NOWPayments balance)
        setTotalValueGBP(balancesRes.data.summary?.total_platform_liquidity_gbp || 0);
      }
      
      if (revenueRes.data.success) {
        setRevenueData(revenueRes.data.revenue);
        setTotalRevenueGBP(revenueRes.data.total_revenue_gbp || 0);
      }
      
      toast.success('Data loaded successfully');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Loading NOWPayments Liquidity...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        className="min-h-screen pb-20 px-4 py-8"
        style={{ background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3" style={{ textShadow: '0 0 30px rgba(0, 234, 255, 0.5)' }}>
                Admin Liquidity Management
              </h1>
              <p className="text-gray-400 text-lg">Real-time cryptocurrency balances from NOWPayments</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50"
              style={{
                boxShadow: '0 0 20px rgba(0, 234, 255, 0.4)'
              }}
            >
              <IoRefresh size={20} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Total Balance Card */}
          <PremiumCard className="p-8 mb-8" glow>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-semibold">Platform Liquidity</div>
                <div className="text-5xl font-bold text-cyan-400 mb-2">
                  £{totalValueGBP.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-400">Your Available Funds</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-semibold">Total Assets</div>
                <div className="text-5xl font-bold text-white mb-2">
                  {nowpaymentsBalances.length}
                </div>
                <div className="text-sm text-gray-400">Cryptocurrencies</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-semibold">Status</div>
                <div className="flex items-center justify-center space-x-2 mt-3">
                  <IoCheckmarkCircle size={32} className="text-green-500" />
                  <span className="text-2xl font-bold text-green-500">Connected</span>
                </div>
                <div className="text-sm text-gray-400">Live Data</div>
              </div>
            </div>
          </PremiumCard>

          {/* Info Banner */}
          <PremiumCard className="p-6 mb-8 bg-blue-500/10 border-blue-400/30">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <IoWallet size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">How it works</h3>
                <p className="text-gray-300">
                  These are your <strong>real cryptocurrency holdings</strong> in your NOWPayments account. 
                  When you deposit crypto to your NOWPayments wallet addresses, the balances update here automatically. 
                  This liquidity is used to cover user withdrawals, Instant Buy orders, and platform operations.
                </p>
              </div>
            </div>
          </PremiumCard>

          {/* Combined Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Revenue Card */}
            <PremiumCard className="p-6 bg-green-500/10 border-green-400/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <IoCash size={24} className="text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Platform Revenue</div>
                    <div className="text-3xl font-bold text-green-400">
                      £{totalRevenueGBP.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Total Fees Earned</div>
                  <div className="text-sm text-green-300 mt-1">All Time</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                From P2P trades, swaps, instant buy, and transaction fees
              </div>
            </PremiumCard>

            {/* Liquidity Card */}
            <PremiumCard className="p-6 bg-cyan-500/10 border-cyan-400/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <IoWallet size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Available Liquidity</div>
                    <div className="text-3xl font-bold text-cyan-400">
                      £{totalValueGBP.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">NOWPayments Balance</div>
                  <div className="text-sm text-cyan-300 mt-1">{nowpaymentsBalances.length} Assets</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                Real crypto holdings in your NOWPayments wallet
              </div>
            </PremiumCard>
          </div>

          {/* Revenue Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <IoCash size={32} className="mr-3 text-green-400" />
              Revenue Breakdown by Currency
            </h2>
            
            {!revenueData || revenueData.length === 0 ? (
              <PremiumCard className="p-8">
                <div className="text-center">
                  <p className="text-gray-400">No revenue data yet. Fees will appear here as users make transactions.</p>
                </div>
              </PremiumCard>
            ) : (
              <PremiumCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Currency</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Transaction Fees</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">P2P Commissions</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Swap Fees</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total Fees</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Value (GBP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.map((revenue, index) => (
                        <tr key={index} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-lg font-bold text-white">{revenue.currency}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-base text-gray-300">
                              {revenue.transaction_fees.toFixed(8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-base text-gray-300">
                              {revenue.p2p_fees.toFixed(8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-base text-gray-300">
                              {revenue.swap_fees.toFixed(8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-lg font-bold text-white">
                              {revenue.total_fees.toFixed(8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-xl font-bold text-green-400">
                              £{revenue.value_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-green-500/10">
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-right text-lg font-bold text-gray-300">
                          Total Revenue:
                        </td>
                        <td className="px-6 py-4 text-right text-2xl font-bold text-green-400">
                          £{totalRevenueGBP.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </PremiumCard>
            )}
          </div>

          {/* Balances Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <IoWallet size={32} className="mr-3 text-cyan-400" />
                NOWPayments Live Balances
              </h2>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-gray-400">Live from NOWPayments API</span>
              </div>
            </div>
            
            {nowpaymentsBalances.length === 0 ? (
              <PremiumCard className="p-12">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                    <IoWallet size={48} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Liquidity Yet</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Your NOWPayments account is connected but has no crypto balances. 
                    Deposit crypto to your NOWPayments wallet addresses to add platform liquidity.
                  </p>
                  <a 
                    href="https://nowpayments.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all"
                  >
                    <span>Go to NOWPayments</span>
                    <IoArrowForward size={20} />
                  </a>
                </div>
              </PremiumCard>
            ) : (
              <>
                {/* Card View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {nowpaymentsBalances.map((balance, index) => (
                    <PremiumCard key={index} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                            {balance.currency.substring(0, 1)}
                          </div>
                          <div>
                            <div className="text-xl font-bold text-white">{balance.currency}</div>
                            <div className="text-sm text-gray-400">Cryptocurrency</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Total in NOWPayments</div>
                          <div className="text-xl font-bold text-white">{balance.nowpayments_balance?.toFixed(8) || balance.balance?.toFixed(8)}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-400 mb-1">User Funds (Owed)</div>
                          <div className="text-xl font-semibold text-orange-400">{balance.user_balance?.toFixed(8) || '0.00000000'}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Your Available Liquidity</div>
                          <div className="text-2xl font-bold text-green-400">{balance.platform_liquidity?.toFixed(8) || balance.balance?.toFixed(8)}</div>
                        </div>
                        
                        {balance.pending > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Pending</div>
                            <div className="text-lg font-semibold text-yellow-400">{balance.pending.toFixed(8)}</div>
                          </div>
                        )}
                        
                        <div className="pt-3 border-t border-white/10">
                          <div className="text-xs text-gray-400 mb-1">Platform Liquidity Value</div>
                          <div className="text-2xl font-bold text-cyan-400">
                            £{(balance.platform_liquidity_gbp || balance.value_gbp).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            @ £{balance.price_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })} per {balance.currency}
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  ))}
                </div>
                
                {/* Detailed Table */}
                <details className="group">
                  <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300 mb-4 text-sm font-semibold">
                    Show detailed table view
                  </summary>
                  <PremiumCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Cryptocurrency</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Available Balance</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Pending</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Price (GBP)</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total Value (GBP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nowpaymentsBalances.map((balance, index) => (
                        <tr key={index} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                {balance.currency.substring(0, 1)}
                              </div>
                              <div>
                                <div className="text-lg font-bold text-white">{balance.currency}</div>
                                <div className="text-sm text-gray-400">Cryptocurrency</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-xl font-bold text-white">
                              {balance.balance.toFixed(8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-lg font-semibold text-yellow-400">
                              {balance.pending > 0 ? balance.pending.toFixed(8) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-lg font-semibold text-gray-300">
                              £{balance.price_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-xl font-bold text-cyan-400">
                              £{balance.value_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-white/5">
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-right text-lg font-bold text-gray-300">
                          Total Liquidity:
                        </td>
                        <td className="px-6 py-4 text-right text-2xl font-bold text-cyan-400">
                          £{totalValueGBP.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </PremiumCard>
                </details>
              </>
            )}
          </div>

          {/* Instructions */}
          <PremiumCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">How to Add Liquidity</h3>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                <span>Log in to your NOWPayments account at <a href="https://nowpayments.io" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">nowpayments.io</a></span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                <span>Navigate to your wallet section and find the deposit addresses for each cryptocurrency</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">3</span>
                <span>Send crypto from your personal wallet or exchange to the NOWPayments deposit address</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">4</span>
                <span>Wait for blockchain confirmations (usually 10-30 minutes)</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">5</span>
                <span>Click the <strong>"Refresh"</strong> button above to see your updated balances</span>
              </li>
            </ol>
          </PremiumCard>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLiquidityManagement;
