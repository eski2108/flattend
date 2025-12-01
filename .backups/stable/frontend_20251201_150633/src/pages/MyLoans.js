import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IoAlertCircle, IoCheckmark as Check, IoCheckmarkCircle, IoTrendingDown, IoTrendingUp, IoWarning as AlertTriangle } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function MyLoans() {
  const { account, refreshUser } = useWallet();
  const navigate = useNavigate();
  const [borrows, setBorrows] = useState([]);
  const [lends, setLends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repaying, setRepaying] = useState(false);
  const [liquidating, setLiquidating] = useState(false);

  useEffect(() => {
    if (!account) {
      navigate('/');
      return;
    }
    fetchLoans();
  }, [account, navigate]);

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API}/user/loans/${account}`);
      if (response.data.success) {
        setBorrows(response.data.borrows);
        setLends(response.data.lends);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (loanId) => {
    setRepaying(true);
    try {
      const response = await axios.post(`${API}/loans/repay`, {
        borrower_address: account,
        loan_id: loanId,
      });

      if (response.data.success) {
        toast.success('Loan repaid successfully!');
        await refreshUser();
        fetchLoans();
        setSelectedLoan(null);
      }
    } catch (error) {
      console.error('Error repaying loan:', error);
      toast.error(error.response?.data?.detail || 'Failed to repay loan');
    } finally {
      setRepaying(false);
    }
  };

  const handleLiquidate = async (loanId) => {
    setLiquidating(true);
    try {
      const response = await axios.post(`${API}/loans/liquidate`, {
        liquidator_address: account,
        loan_id: loanId,
      });

      if (response.data.success) {
        toast.success('Loan liquidated successfully!');
        await refreshUser();
        fetchLoans();
      }
    } catch (error) {
      console.error('Error liquidating loan:', error);
      toast.error(error.response?.data?.detail || 'Failed to liquidate loan');
    } finally {
      setLiquidating(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Active', className: 'status-active', icon: <IoTrendingUp size={16} /> },
      repaid: { label: 'Repaid', className: 'status-repaid', icon: <IoCheckmarkCircle size={16} /> },
      liquidated: { label: 'Liquidated', className: 'status-liquidated', icon: <AlertTriangle size={16} /> },
      defaulted: { label: 'Defaulted', className: 'status-defaulted', icon: <IoAlertCircle size={16} /> },
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`status-badge ${badge.className}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getHealthIndicator = (ratio) => {
    if (ratio >= 150) return { label: 'Healthy', className: 'health-healthy' };
    if (ratio >= 120) return { label: 'Warning', className: 'health-warning' };
    return { label: 'At Risk', className: 'health-risk' };
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
      <div className="my-loans-page" data-testid="my-loans-page">
        <div className="page-header">
          <div>
            <h1 className="page-title" data-testid="my-loans-title">My Loans</h1>
            <p className="page-subtitle">Manage your active lending and borrowing positions</p>
          </div>
        </div>

        <Tabs defaultValue="borrows" className="loans-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="borrows" data-testid="borrows-tab">
              Borrowing ({borrows.length})
            </TabsTrigger>
            <TabsTrigger value="lends" data-testid="lends-tab">
              Lending ({lends.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="borrows" className="tab-content">
            {borrows.length > 0 ? (
              <div className="loans-grid">
                {borrows.map((loan) => {
                  const health = getHealthIndicator(loan.collateral_ratio);
                  const totalToRepay = loan.loan_amount + loan.total_interest + loan.repay_fee;
                  return (
                    <Card key={loan.loan_id} className="loan-card borrow" data-testid="borrow-loan-card">
                      <div className="loan-header">
                        <div className="loan-type">
                          <IoTrendingDown className="type-icon" />
                          <span>Borrowing</span>
                        </div>
                        {getStatusBadge(loan.status)}
                      </div>

                      <div className="loan-amount-section">
                        <p className="amount-label">Loan Amount</p>
                        <p className="amount-value">{loan.loan_amount} ETH</p>
                      </div>

                      <div className="loan-details">
                        <div className="detail-row">
                          <span>Collateral:</span>
                          <span className="detail-value">{loan.collateral_amount} ETH</span>
                        </div>
                        <div className="detail-row">
                          <span>Interest Rate:</span>
                          <span className="detail-value">{loan.interest_rate}%</span>
                        </div>
                        <div className="detail-row">
                          <span>Total Interest:</span>
                          <span className="detail-value">{loan.total_interest.toFixed(4)} ETH</span>
                        </div>
                        <div className="detail-row">
                          <span>Due Date:</span>
                          <span className="detail-value">{new Date(loan.due_date).toLocaleDateString()}</span>
                        </div>
                        {loan.status === 'active' && (
                          <>
                            <div className="detail-row">
                              <span>Health:</span>
                              <span className={`health-badge ${health.className}`}>
                                {loan.collateral_ratio.toFixed(0)}% - {health.label}
                              </span>
                            </div>
                            <div className="detail-row highlight">
                              <span>Total to Repay:</span>
                              <span className="detail-value">{totalToRepay.toFixed(4)} ETH</span>
                            </div>
                          </>
                        )}
                      </div>

                      {loan.status === 'active' && (
                        <div className="loan-actions">
                          <Button
                            onClick={() => setSelectedLoan(loan)}
                            className="repay-btn"
                            data-testid="repay-loan-btn"
                          >
                            Repay Loan
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="empty-state" data-testid="empty-borrows">
                <IoAlertCircle size={48} className="empty-icon" />
                <h3>No Borrowing Activity</h3>
                <p>You haven't borrowed any loans yet</p>
                <Button onClick={() => navigate('/p2p-marketplace')} data-testid="browse-marketplace-btn">Browse Marketplace</Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="lends" className="tab-content">
            {lends.length > 0 ? (
              <div className="loans-grid">
                {lends.map((loan) => {
                  const health = getHealthIndicator(loan.collateral_ratio);
                  return (
                    <Card key={loan.loan_id} className="loan-card lend" data-testid="lend-loan-card">
                      <div className="loan-header">
                        <div className="loan-type">
                          <IoTrendingUp className="type-icon" />
                          <span>Lending</span>
                        </div>
                        {getStatusBadge(loan.status)}
                      </div>

                      <div className="loan-amount-section">
                        <p className="amount-label">Lent Amount</p>
                        <p className="amount-value">{loan.loan_amount} ETH</p>
                      </div>

                      <div className="loan-details">
                        <div className="detail-row">
                          <span>Borrower:</span>
                          <span className="detail-value address">
                            {loan.borrower_address.slice(0, 6)}...{loan.borrower_address.slice(-4)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Collateral:</span>
                          <span className="detail-value">{loan.collateral_amount} ETH</span>
                        </div>
                        <div className="detail-row">
                          <span>Your Interest:</span>
                          <span className="detail-value earn">
                            {((loan.loan_amount * 5 * loan.duration_days) / (365 * 100)).toFixed(4)} ETH
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Due Date:</span>
                          <span className="detail-value">{new Date(loan.due_date).toLocaleDateString()}</span>
                        </div>
                        {loan.status === 'active' && (
                          <div className="detail-row">
                            <span>Loan Health:</span>
                            <span className={`health-badge ${health.className}`}>
                              {loan.collateral_ratio.toFixed(0)}% - {health.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {loan.status === 'active' && loan.collateral_ratio < 120 && (
                        <div className="loan-actions">
                          <Button
                            onClick={() => handleLiquidate(loan.loan_id)}
                            disabled={liquidating}
                            className="liquidate-btn"
                            data-testid="liquidate-loan-btn"
                          >
                            {liquidating ? 'Liquidating...' : 'Liquidate'}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="empty-state" data-testid="empty-lends">
                <IoAlertCircle size={48} className="empty-icon" />
                <h3>No Lending Activity</h3>
                <p>You haven't created any lending offers yet</p>
                <Button onClick={() => navigate('/lend')} data-testid="start-lending-btn">Start Lending</Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Repay Dialog */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="repay-dialog" data-testid="repay-dialog">
          <DialogHeader>
            <DialogTitle>Repay Loan</DialogTitle>
            <DialogDescription>Confirm loan repayment details</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="dialog-content">
              <div className="repay-info">
                <div className="info-row">
                  <span>Loan Amount:</span>
                  <span className="info-value">{selectedLoan.loan_amount} ETH</span>
                </div>
                <div className="info-row">
                  <span>Interest:</span>
                  <span className="info-value">{selectedLoan.total_interest.toFixed(4)} ETH</span>
                </div>
                <div className="info-row">
                  <span>Repay Fee:</span>
                  <span className="info-value">{selectedLoan.repay_fee.toFixed(4)} ETH</span>
                </div>
                <div className="info-row total">
                  <span>Total Payment:</span>
                  <span className="info-value highlight">
                    {(selectedLoan.loan_amount + selectedLoan.total_interest + selectedLoan.repay_fee).toFixed(4)} ETH
                  </span>
                </div>
                <div className="info-row">
                  <span>Collateral Return:</span>
                  <span className="info-value earn">{selectedLoan.collateral_amount} ETH</span>
                </div>
              </div>

              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setSelectedLoan(null)} data-testid="cancel-repay-btn">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRepay(selectedLoan.loan_id)}
                  disabled={repaying}
                  data-testid="confirm-repay-btn"
                >
                  {repaying ? 'Processing...' : 'Confirm Repayment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}