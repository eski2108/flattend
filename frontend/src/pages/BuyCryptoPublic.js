import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IoAlertCircle, IoArrowForward, IoCash, IoFlash as Zap, IoSearch, IoShield, IoTime } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function BuyCryptoPublic() {
  const navigate = useNavigate();
  const [sellOrders, setSellOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    fetchSellOrders();
  }, []);

  const fetchSellOrders = async () => {
    try {
      const response = await axios.get(`${API}/api/crypto-market/sell/orders`);
      if (response.data.success) {
        setSellOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching sell orders:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = sellOrders.filter(
    (order) =>
      order.crypto_amount.toString().includes(searchTerm) ||
      order.price_per_unit.toString().includes(searchTerm)
  );

  return (
    <div className="public-buy-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="public-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Coin Hub X" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent', mixBlendMode: 'lighten' }} />
            <span>Coin Hub X</span>
          </div>
          <div className="header-actions">
            <Button variant="outline" onClick={() => navigate('/')}>
              Home
            </Button>
            <Button onClick={() => setShowLoginPrompt(true)} className="login-btn">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="buy-hero">
        <div className="buy-hero-content">
          <h1 className="buy-hero-title">
            Buy Crypto with
            <br />
            <span className="gradient-text">Bank Transfer</span>
          </h1>
          <p className="buy-hero-subtitle">
            Purchase cryptocurrency directly from verified sellers using your bank account.
            <br />
            No crypto wallet required to browse offers!
          </p>
          
          <div className="features-quick">
            <div className="feature-quick">
              <IoShield size={24} />
              <span>Escrow Protected</span>
            </div>
            <div className="feature-quick">
              <IoTime size={24} />
              <span>Fast & Easy</span>
            </div>
            <div className="feature-quick">
              <CheckCircle2 size={24} />
              <span>Verified Sellers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section className="marketplace-section">
        <div className="marketplace-content">
          <div className="section-header-public">
            <div>
              <h2 className="section-title-public">Available Offers</h2>
              <p className="section-subtitle-public">Choose from verified sellers and buy crypto instantly</p>
            </div>
            
            {/* Search */}
            <div className="search-container-public">
              <IoSearch className="search-icon" size={20} />
              <Input
                placeholder="Search by amount or price..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-public"
                data-testid="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="offers-grid-public">
              {filteredOrders.map((order) => {
                const totalValue = order.crypto_amount * order.price_per_unit;
                return (
                  <Card key={order.order_id} className="offer-card-public" data-testid="offer-card">
                    <div className="offer-header-public">
                      <div className="seller-badge">
                        <CheckCircle2 size={16} />
                        <span>Verified Seller</span>
                      </div>
                      <IoCash size={20} className="offer-icon-public" />
                    </div>
                    
                    <div className="offer-amount-public">
                      <span className="amount-value-public">{order.crypto_amount}</span>
                      <span className="amount-currency-public">ETH</span>
                    </div>
                    
                    <div className="offer-price-public">
                      <span className="price-label-public">Price per ETH</span>
                      <span className="price-value-public">${order.price_per_unit.toLocaleString()}</span>
                    </div>
                    
                    <div className="offer-details-public">
                      <div className="detail-row-public">
                        <span>Total Value:</span>
                        <span className="detail-value-public">${totalValue.toLocaleString()}</span>
                      </div>
                      <div className="detail-row-public">
                        <span>Min Purchase:</span>
                        <span className="detail-value-public">{order.min_purchase} ETH</span>
                      </div>
                      <div className="detail-row-public">
                        <span>Max Purchase:</span>
                        <span className="detail-value-public">{order.max_purchase} ETH</span>
                      </div>
                      <div className="detail-row-public">
                        <span>Payment Method:</span>
                        <span className="detail-value-public payment">Bank Transfer</span>
                      </div>
                    </div>
                    
                    <Button
                      className="buy-now-btn-public"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowLoginPrompt(true);
                      }}
                      data-testid="buy-now-btn"
                    >
                      Buy Now <IoArrowForward size={20} />
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="empty-state-public">
              <IoAlertCircle size={48} className="empty-icon" />
              <h3>No Offers Available</h3>
              <p>Check back later for new crypto offers</p>
            </Card>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works-public">
        <div className="how-content-public">
          <h2 className="section-title-public">How It Works</h2>
          <div className="steps-grid-public">
            <div className="step-card-public">
              <div className="step-number-public">1</div>
              <h3>Browse Offers</h3>
              <p>View available crypto from verified sellers. No account needed to browse.</p>
            </div>
            <div className="step-card-public">
              <div className="step-number-public">2</div>
              <h3>Connect & Purchase</h3>
              <p>Connect your wallet, choose amount, and crypto goes into secure escrow.</p>
            </div>
            <div className="step-card-public">
              <div className="step-number-public">3</div>
              <h3>Bank Transfer</h3>
              <p>Make bank transfer to seller, then mark payment as completed.</p>
            </div>
            <div className="step-card-public">
              <div className="step-number-public">4</div>
              <h3>Receive Crypto</h3>
              <p>Seller verifies payment and releases crypto from escrow to your wallet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="login-prompt-dialog">
          <DialogHeader>
            <DialogTitle>Connect Wallet to Continue</DialogTitle>
            <DialogDescription>
              To purchase crypto, you need to connect your wallet for secure escrow
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-content">
            <div className="wallet-info-box">
              <IoShield size={32} />
              <div>
                <p className="info-title-dialog">Secure Escrow Protection</p>
                <p className="info-text-dialog">
                  Your crypto is held safely in escrow until you complete the bank transfer and seller verifies payment.
                </p>
              </div>
            </div>

            {selectedOrder && (
              <div className="selected-offer-info">
                <p className="offer-label">Selected Offer:</p>
                <p className="offer-amount-dialog">{selectedOrder.crypto_amount} ETH</p>
                <p className="offer-price-dialog">${(selectedOrder.crypto_amount * selectedOrder.price_per_unit).toLocaleString()}</p>
              </div>
            )}

            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setShowLoginPrompt(false)}>
                Cancel
              </Button>
              <Button onClick={() => navigate('/')} className="connect-wallet-dialog-btn">
                Connect Wallet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="footer-public">
        <div className="footer-content-public">
          <div className="footer-logo-public" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Coin Hub X" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent', mixBlendMode: 'lighten' }} />
            <span>Coin Hub X</span>
          </div>
          <p className="footer-text-public">Secure P2P Crypto Marketplace</p>
          <p className="footer-copy-public">© 2025 Coin Hub X. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
