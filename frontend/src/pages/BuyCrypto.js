import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Copy, DollarSign, IoAlertCircle, IoCash, IoCheckmark as Check, IoCheckmarkCircle, IoCopy, IoSearch, IoTime, Search } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function BuyCrypto() {
  const { account, refreshUser } = useWallet();
  const navigate = useNavigate();
  const [sellOrders, setSellOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [buyOrderDetails, setBuyOrderDetails] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    if (!account) {
      navigate('/');
      return;
    }
    fetchSellOrders();
  }, [account, navigate]);

  const fetchSellOrders = async () => {
    try {
      const response = await axios.get(`${API}/crypto-market/sell/orders`);
      if (response.data.success) {
        setSellOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching sell orders:', error);
      toast.error('Failed to load sell orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!selectedOrder || !buyAmount) {
      toast.error('Please enter amount');
      return;
    }

    const amount = parseFloat(buyAmount);
    if (amount < selectedOrder.min_purchase || amount > selectedOrder.max_purchase) {
      toast.error(`Amount must be between ${selectedOrder.min_purchase} and ${selectedOrder.max_purchase} ETH`);
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/crypto-market/buy/create`, {
        buyer_address: account,
        sell_order_id: selectedOrder.order_id,
        crypto_amount: amount,
      });

      if (response.data.success) {
        toast.success('Buy order created! Please complete bank transfer');
        setBuyOrderDetails(response.data);
        setSelectedOrder(null);
        setBuyAmount('');
        setShowPaymentDialog(true);
        fetchSellOrders();
      }
    } catch (error) {
      console.error('Error creating buy order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create buy order');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentReference) {
      toast.error('Please enter payment reference');
      return;
    }

    try {
      const response = await axios.post(`${API}/crypto-market/payment/mark-paid`, {
        buyer_address: account,
        order_id: buyOrderDetails.order.order_id,
        payment_reference: paymentReference,
      });

      if (response.data.success) {
        toast.success('✓ Marked as Paid! Seller will be notified to release crypto');
        setShowPaymentDialog(false);
        setBuyOrderDetails(null);
        setPaymentReference('');
        await refreshUser();
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark as paid');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredOrders = sellOrders.filter(
    (order) =>
      order.crypto_amount.toString().includes(searchTerm) ||
      order.seller_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="buy-crypto-page" data-testid="buy-crypto-page">
        <div className="page-header">
          <div>
            <h1 className="page-title" data-testid="buy-crypto-title">Buy Crypto with Bank Transfer</h1>
            <p className="page-subtitle">Purchase crypto directly from lenders using bank transfer</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <IoSearch className="search-icon" size={20} />
            <Input
              placeholder="Search by amount or seller address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Sell Orders Grid */}
        {loading ? (
          <div className="loading-container" data-testid="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="offers-grid">
            {filteredOrders.map((order) => {
              const totalValue = order.crypto_amount * order.price_per_unit;
              return (
                <Card key={order.order_id} className="sell-order-card" data-testid="sell-order-card">
                  <div className="order-header">
                    <div className="order-badge">Available</div>
                    <IoCash size={20} className="order-icon" />
                  </div>
                  <div className="order-amount">
                    <span className="amount-value">{order.crypto_amount || 0}</span>
                    <span className="amount-currency">ETH</span>
                  </div>
                  <div className="order-price">
                    <span className="price-label">Price:</span>
                    <span className="price-value">${(order.price_per_unit || 0).toLocaleString()} / ETH</span>
                  </div>
                  <div className="order-details">
                    <div className="detail-row">
                      <span className="detail-label">Total Value:</span>
                      <span className="detail-value">${isNaN(totalValue) ? '0' : totalValue.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Min Purchase:</span>
                      <span className="detail-value">{order.min_purchase || 0} ETH</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Max Purchase:</span>
                      <span className="detail-value">{order.max_purchase || 0} ETH</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller:</span>
                      <span className="detail-value address">
                        {order.seller_address.slice(0, 6)}...{order.seller_address.slice(-4)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Payment:</span>
                      <span className="detail-value">Bank Transfer</span>
                    </div>
                  </div>
                  <Button
                    className="buy-btn"
                    onClick={() => setSelectedOrder(order)}
                    disabled={order.seller_address === account}
                    data-testid="buy-now-btn"
                  >
                    {order.seller_address === account ? 'Your Order' : 'Buy Now'}
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="empty-state" data-testid="empty-orders">
            <IoAlertCircle size={48} className="empty-icon" />
            <h3>No Sell Orders Available</h3>
            <p>Check back later or create your own sell order</p>
            <Button onClick={() => navigate('/sell-crypto')} data-testid="create-sell-order-btn">Create Sell Order</Button>
          </Card>
        )}
      </div>

      {/* Buy Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="buy-dialog" data-testid="buy-dialog">
          <DialogHeader>
            <DialogTitle>Buy Crypto</DialogTitle>
            <DialogDescription>Enter amount to purchase</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="dialog-content">
              <div className="order-info">
                <div className="info-row">
                  <span>Available:</span>
                  <span className="info-value">{selectedOrder.crypto_amount || 0} ETH</span>
                </div>
                <div className="info-row">
                  <span>Price per ETH:</span>
                  <span className="info-value">${(selectedOrder.price_per_unit || 0).toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <span>Min - Max:</span>
                  <span className="info-value">{selectedOrder.min_purchase || 0} - {selectedOrder.max_purchase || 0} ETH</span>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="buy-amount">Amount (ETH)</label>
                <Input
                  id="buy-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  data-testid="buy-amount-input"
                />
              </div>

              {buyAmount && (
                <div className="calculation">
                  <div className="calc-row">
                    <span>Crypto Amount:</span>
                    <span>{parseFloat(buyAmount).toFixed(4)} ETH</span>
                  </div>
                  <div className="calc-row total">
                    <span>Total to Pay:</span>
                    <span className="highlight">${(parseFloat(buyAmount) * selectedOrder.price_per_unit).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="info-box">
                <IoTime size={20} />
                <p>You'll have 30 minutes to complete the bank transfer</p>
              </div>

              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setSelectedOrder(null)} data-testid="cancel-btn">
                  Cancel
                </Button>
                <Button onClick={handleBuy} disabled={processing} data-testid="confirm-buy-btn">
                  {processing ? 'Processing...' : 'Proceed to Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Instructions Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="payment-dialog" data-testid="payment-dialog">
          <DialogHeader>
            <DialogTitle>Complete Bank Transfer</DialogTitle>
            <DialogDescription>Transfer funds to seller's bank account</DialogDescription>
          </DialogHeader>
          {buyOrderDetails && (
            <div className="dialog-content">
              <div className="payment-timer">
                <IoTime size={24} />
                <div>
                  <p className="timer-label">Payment Deadline</p>
                  <p className="timer-value">{new Date(buyOrderDetails.payment_deadline).toLocaleString()}</p>
                </div>
              </div>

              <div className="bank-details-card">
                <h3>Seller's Bank Details</h3>
                <div className="bank-detail-row">
                  <span>Bank Name:</span>
                  <div className="copy-field">
                    <span>{buyOrderDetails.seller_bank_details.bank_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(buyOrderDetails.seller_bank_details.bank_name)}
                      data-testid="copy-bank-name"
                    >
                      <IoCopy size={16} />
                    </Button>
                  </div>
                </div>
                <div className="bank-detail-row">
                  <span>Account Holder:</span>
                  <div className="copy-field">
                    <span>{buyOrderDetails.seller_bank_details.account_holder}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(buyOrderDetails.seller_bank_details.account_holder)}
                      data-testid="copy-account-holder"
                    >
                      <IoCopy size={16} />
                    </Button>
                  </div>
                </div>
                <div className="bank-detail-row">
                  <span>Account Number:</span>
                  <div className="copy-field">
                    <span>{buyOrderDetails.seller_bank_details.account_number}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(buyOrderDetails.seller_bank_details.account_number)}
                      data-testid="copy-account-number"
                    >
                      <IoCopy size={16} />
                    </Button>
                  </div>
                </div>
                {buyOrderDetails.seller_bank_details.routing_number && (
                  <div className="bank-detail-row">
                    <span>Routing Number:</span>
                    <div className="copy-field">
                      <span>{buyOrderDetails.seller_bank_details.routing_number}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(buyOrderDetails.seller_bank_details.routing_number)}
                        data-testid="copy-routing-number"
                      >
                        <IoCopy size={16} />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="bank-detail-row highlight">
                  <span>Amount to Transfer:</span>
                  <span className="amount-highlight">${buyOrderDetails.order.total_price.toLocaleString()}</span>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="payment-ref">Payment Reference / Transaction ID</label>
                <Input
                  id="payment-ref"
                  placeholder="Enter your bank transfer reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  data-testid="payment-reference-input"
                />
                <p className="input-hint">Enter the transaction ID from your bank transfer</p>
              </div>

              <div className="info-box warn">
                <IoAlertCircle size={20} />
                <p>After making the transfer, confirm payment below. Seller will release crypto once verified.</p>
              </div>

              <div className="dialog-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setBuyOrderDetails(null);
                  }}
                  data-testid="cancel-payment-btn"
                >
                  Cancel
                </Button>
                <Button onClick={handleMarkAsPaid} data-testid="mark-paid-btn" className="mark-paid-btn">
                  <IoCheckmarkCircle size={20} className="mr-2" />
                  Mark as Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}