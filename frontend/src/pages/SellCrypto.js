import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IoAdd, IoAlertCircle, IoCash, IoTime as Clock } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function SellCrypto() {
  const { account, user, refreshUser } = useWallet();
  const navigate = useNavigate();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [myOrders, setMyOrders] = useState({ sell_orders: [], buy_orders: [] });
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedBuyOrder, setSelectedBuyOrder] = useState(null);

  // Bank account form
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  // Sell order form
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [minPurchase, setMinPurchase] = useState('0.01');
  const [maxPurchase, setMaxPurchase] = useState('10');

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!account) {
      navigate('/');
      return;
    }
    fetchData();
  }, [account, navigate]);

  const fetchData = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      let userId = null;
      if (userData) {
        const parsedUser = JSON.parse(userData);
        userId = parsedUser.user_id;
      }

      const requests = [
        axios.get(`${API}/api/bank/accounts/${account}`),
        axios.get(`${API}/api/crypto-market/orders/${account}`)
      ];

      if (userId) {
        requests.push(axios.get(`${API}/api/kyc/status/${userId}`));
      }

      const responses = await Promise.all(requests);
      const [bankResp, ordersResp, kycResp] = responses;

      if (bankResp.data.success) {
        setBankAccounts(bankResp.data.accounts);
      }

      if (ordersResp.data.success) {
        setMyOrders(ordersResp.data);
      }

      if (kycResp) {
        setKycStatus(kycResp.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = async () => {
    if (!bankName || !accountNumber || !accountHolder) {
      toast.error('Please fill all required fields');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/bank/add`, {
        wallet_address: account,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder_name: accountHolder,
        routing_number: routingNumber || null,
      });

      if (response.data.success) {
        toast.success('Bank account added successfully');
        setShowAddBank(false);
        setBankName('');
        setAccountNumber('');
        setAccountHolder('');
        setRoutingNumber('');
        fetchData();
      }
    } catch (error) {
      console.error('Error adding bank:', error);
      toast.error(error.response?.data?.detail || 'Failed to add bank account');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateSellOrder = async () => {
    if (!cryptoAmount || !pricePerUnit) {
      toast.error('Please fill all required fields');
      return;
    }

    if (bankAccounts.length === 0) {
      toast.error('Please add a bank account first');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/crypto-market/sell/create`, {
        seller_address: account,
        crypto_amount: parseFloat(cryptoAmount),
        price_per_unit: parseFloat(pricePerUnit),
        min_purchase: parseFloat(minPurchase),
        max_purchase: parseFloat(maxPurchase),
      });

      if (response.data.success) {
        toast.success('Sell order created successfully');
        setShowCreateOrder(false);
        setCryptoAmount('');
        setPricePerUnit('');
        setMinPurchase('0.01');
        setMaxPurchase('10');
        await refreshUser();
        fetchData();
      }
    } catch (error) {
      console.error('Error creating sell order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create sell order');
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseCrypto = async (orderId) => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/crypto-market/release`, {
        seller_address: account,
        order_id: orderId,
      });

      if (response.data.success) {
        toast.success('Crypto released successfully');
        setSelectedBuyOrder(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error releasing crypto:', error);
      toast.error(error.response?.data?.detail || 'Failed to release crypto');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container" data-testid="loading-spinner">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="sell-crypto-page" data-testid="sell-crypto-page">
        {/* KYC Warning Banner */}
        {kycStatus && !kycStatus.kyc_verified && (
          <Card style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
            border: '2px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <IoAlertCircle size={32} color="#FBB F24" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FBB F24', marginBottom: '0.5rem' }}>
                Complete KYC Verification
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
                Identity verification is required to sell crypto on this platform. Complete your KYC to unlock full trading features.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/kyc-verification')}
              style={{
                background: 'linear-gradient(135deg, #FBB F24, #F59E0B)',
                border: 'none',
                padding: '0.75rem 1.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              Complete KYC
            </Button>
          </Card>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-title" data-testid="sell-crypto-title">Sell Crypto for Fiat</h1>
            <p className="page-subtitle">Create sell orders and receive bank transfers</p>
          </div>
          <Button onClick={() => setShowCreateOrder(true)} data-testid="create-order-btn">
            <IoAdd size={20} className="mr-2" />
            Create Sell Order
          </Button>
        </div>

        {/* Bank Accounts Section */}
        <Card className="bank-section" data-testid="bank-section">
          <div className="section-header">
            <h3>Bank Accounts</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAddBank(true)} data-testid="add-bank-btn">
              <IoAdd size={16} className="mr-2" />
              Add Bank
            </Button>
          </div>
          {bankAccounts.length > 0 ? (
            <div className="bank-list">
              {bankAccounts.map((bank) => (
                <div key={bank.account_id} className="bank-item" data-testid="bank-item">
                  <div className="bank-icon">
                    <IoCash size={24} />
                  </div>
                  <div className="bank-info">
                    <p className="bank-name">{bank.bank_name}</p>
                    <p className="bank-account">****{bank.account_number.slice(-4)}</p>
                    <p className="bank-holder">{bank.account_holder_name}</p>
                  </div>
                  {bank.verified && (
                    <div className="verified-badge">
                      <CheckCircle2 size={16} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-bank">
              <p>No bank accounts added. Add one to start selling crypto.</p>
            </div>
          )}
        </Card>

        {/* Orders Tabs */}
        <Tabs defaultValue="sell" className="orders-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="sell" data-testid="sell-orders-tab">
              My Sell Orders ({myOrders.sell_orders.length})
            </TabsTrigger>
            <TabsTrigger value="buy" data-testid="buy-requests-tab">
              Buy Requests ({myOrders.buy_orders.filter(o => o.seller_address === account && o.status === 'payment_submitted').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sell" className="tab-content">
            {myOrders.sell_orders.length > 0 ? (
              <div className="orders-grid">
                {myOrders.sell_orders.map((order) => (
                  <Card key={order.order_id} className="order-card" data-testid="sell-order-card">
                    <div className="order-header">
                      <div className="order-badge">{order.status}</div>
                      <div className="order-date">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="order-amount-display">
                      <span className="amount">{order.crypto_amount}</span>
                      <span className="currency">ETH</span>
                    </div>
                    <div className="order-details">
                      <div className="detail-row">
                        <span>Price per ETH:</span>
                        <span className="value">${order.price_per_unit.toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span>Total Value:</span>
                        <span className="value">${(order.crypto_amount * order.price_per_unit).toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span>Range:</span>
                        <span className="value">{order.min_purchase} - {order.max_purchase} ETH</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="empty-state" data-testid="empty-sell-orders">
                <IoAlertCircle size={48} className="empty-icon" />
                <h3>No Sell Orders</h3>
                <p>Create a sell order to start selling your crypto</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="buy" className="tab-content">
            {myOrders.buy_orders.filter(o => o.seller_address === account).length > 0 ? (
              <div className="orders-grid">
                {myOrders.buy_orders
                  .filter(o => o.seller_address === account)
                  .map((order) => (
                    <Card key={order.order_id} className="buy-request-card" data-testid="buy-request-card">
                      <div className="order-header">
                        <div className={`status-badge status-${order.status}`}>{order.status.replace('_', ' ')}</div>
                        <div className="order-date">{new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="request-details">
                        <div className="detail-row">
                          <span>Buyer:</span>
                          <span className="address">
                            {order.buyer_address.slice(0, 6)}...{order.buyer_address.slice(-4)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Amount:</span>
                          <span className="value">{order.crypto_amount} ETH</span>
                        </div>
                        <div className="detail-row">
                          <span>Total:</span>
                          <span className="value">${order.total_price.toLocaleString()}</span>
                        </div>
                        {order.payment_reference && (
                          <div className="detail-row">
                            <span>Payment Ref:</span>
                            <span className="value">{order.payment_reference}</span>
                          </div>
                        )}
                      </div>
                      {order.status === 'payment_submitted' && (
                        <Button
                          onClick={() => setSelectedBuyOrder(order)}
                          className="release-btn"
                          data-testid="verify-release-btn"
                        >
                          Verify & Release Crypto
                        </Button>
                      )}
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="empty-state" data-testid="empty-buy-requests">
                <IoAlertCircle size={48} className="empty-icon" />
                <h3>No Buy Requests</h3>
                <p>When buyers purchase from your sell orders, they'll appear here</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Buy Crypto with Card Section */}
        <Card style={{
          marginTop: '2rem',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
          border: '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '1rem'
          }}>
            Need Crypto Fast?
          </h3>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(148, 163, 184, 0.9)',
            marginBottom: '1.5rem',
            maxWidth: '600px',
            margin: '0 auto 1.5rem'
          }}>
            Buy crypto instantly with your debit or credit card through our secure payment partner
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/buy-crypto-card')}
            style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              border: 'none',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              borderRadius: '12px',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 240, 255, 0.6)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            data-testid="buy-with-card-btn"
          >
            Buy Crypto with Card
          </Button>
        </Card>
      </div>

      {/* Add Bank Dialog */}
      <Dialog open={showAddBank} onOpenChange={setShowAddBank}>
        <DialogContent className="add-bank-dialog" data-testid="add-bank-dialog">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>Add your bank details to receive payments</DialogDescription>
          </DialogHeader>
          <div className="dialog-content">
            <div className="input-group">
              <label htmlFor="bank-name">Bank Name *</label>
              <Input
                id="bank-name"
                placeholder="e.g., Chase, Bank of America"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                data-testid="bank-name-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="account-holder">Account Holder Name *</label>
              <Input
                id="account-holder"
                placeholder="Full name on account"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                data-testid="account-holder-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="account-number">Account Number *</label>
              <Input
                id="account-number"
                placeholder="Your account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                data-testid="account-number-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="routing-number">Routing Number (Optional)</label>
              <Input
                id="routing-number"
                placeholder="Bank routing number"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                data-testid="routing-number-input"
              />
            </div>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setShowAddBank(false)} data-testid="cancel-add-bank">
                Cancel
              </Button>
              <Button onClick={handleAddBank} disabled={processing} data-testid="save-bank-btn">
                {processing ? 'Saving...' : 'Add Bank Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sell Order Dialog */}
      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent className="create-order-dialog" data-testid="create-order-dialog">
          <DialogHeader>
            <DialogTitle>Create Sell Order</DialogTitle>
            <DialogDescription>Set your price and terms</DialogDescription>
          </DialogHeader>
          <div className="dialog-content">
            <div className="balance-display">
              <p>Available Balance: {(user?.available_balance || 0).toFixed(4)} ETH</p>
            </div>

            <div className="input-group">
              <label htmlFor="crypto-amount">Crypto Amount (ETH) *</label>
              <Input
                id="crypto-amount"
                type="number"
                placeholder="Amount to sell"
                value={cryptoAmount}
                onChange={(e) => setCryptoAmount(e.target.value)}
                data-testid="crypto-amount-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="price-per-unit">Price per ETH (USD) *</label>
              <Input
                id="price-per-unit"
                type="number"
                placeholder="e.g., 3000"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                data-testid="price-per-unit-input"
              />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label htmlFor="min-purchase">Min Purchase (ETH)</label>
                <Input
                  id="min-purchase"
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  data-testid="min-purchase-input"
                />
              </div>
              <div className="input-group">
                <label htmlFor="max-purchase">Max Purchase (ETH)</label>
                <Input
                  id="max-purchase"
                  type="number"
                  value={maxPurchase}
                  onChange={(e) => setMaxPurchase(e.target.value)}
                  data-testid="max-purchase-input"
                />
              </div>
            </div>

            {cryptoAmount && pricePerUnit && (
              <div className="calculation">
                <div className="calc-row total">
                  <span>Total Value:</span>
                  <span className="highlight">${(parseFloat(cryptoAmount) * parseFloat(pricePerUnit)).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setShowCreateOrder(false)} data-testid="cancel-create-order">
                Cancel
              </Button>
              <Button onClick={handleCreateSellOrder} disabled={processing} data-testid="create-sell-order-btn">
                {processing ? 'Creating...' : 'Create Sell Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Release Crypto Dialog */}
      <Dialog open={!!selectedBuyOrder} onOpenChange={() => setSelectedBuyOrder(null)}>
        <DialogContent className="release-dialog" data-testid="release-dialog">
          <DialogHeader>
            <DialogTitle>Release Crypto</DialogTitle>
            <DialogDescription>Verify payment and release crypto to buyer</DialogDescription>
          </DialogHeader>
          {selectedBuyOrder && (
            <div className="dialog-content">
              <div className="verification-info">
                <h3>Order Details</h3>
                <div className="detail-row">
                  <span>Amount:</span>
                  <span>{selectedBuyOrder.crypto_amount} ETH</span>
                </div>
                <div className="detail-row">
                  <span>Total Payment:</span>
                  <span>${selectedBuyOrder.total_price.toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span>Payment Reference:</span>
                  <span>{selectedBuyOrder.payment_reference}</span>
                </div>
              </div>

              <div className="info-box warn">
                <IoAlertCircle size={20} />
                <p>Only release crypto after verifying the bank transfer in your bank account!</p>
              </div>

              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setSelectedBuyOrder(null)} data-testid="cancel-release">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReleaseCrypto(selectedBuyOrder.order_id)}
                  disabled={processing}
                  data-testid="confirm-release-btn"
                >
                  {processing ? 'Releasing...' : 'Confirm & Release'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}