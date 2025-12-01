import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, IoAlertCircle as AlertCircle, IoInformationCircle, IoTrendingUp, IoWallet, Wallet } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function Lend() {
  const { account, user, refreshUser } = useWallet();
  const navigate = useNavigate();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lendAmount, setLendAmount] = useState('');
  const [lendDuration, setLendDuration] = useState('30');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!account) {
      navigate('/');
      return;
    }
    fetchStats();
  }, [account, navigate]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/platform/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/user/deposit`, {
        wallet_address: account,
        amount: parseFloat(depositAmount),
      });

      if (response.data.success) {
        toast.success(`Deposited ${response.data.net_amount.toFixed(4)} ETH (${response.data.fee.toFixed(4)} ETH fee)`);
        setDepositAmount('');
        await refreshUser();
      }
    } catch (error) {
      console.error('Error depositing:', error);
      toast.error(error.response?.data?.detail || 'Failed to deposit');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/user/withdraw`, {
        wallet_address: account,
        amount: parseFloat(withdrawAmount),
      });

      if (response.data.success) {
        toast.success(`Withdrawn ${response.data.amount} ETH (${response.data.fee.toFixed(4)} ETH fee)`);
        setWithdrawAmount('');
        await refreshUser();
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error(error.response?.data?.detail || 'Failed to withdraw');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!lendAmount || parseFloat(lendAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!lendDuration || parseInt(lendDuration) <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/loans/create-offer`, {
        lender_address: account,
        amount: parseFloat(lendAmount),
        duration_days: parseInt(lendDuration),
      });

      if (response.data.success) {
        toast.success('Loan offer created successfully!');
        setLendAmount('');
        setLendDuration('30');
        await refreshUser();
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to create offer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="lend-page" data-testid="lend-page">
        <div className="page-header">
          <div>
            <h1 className="page-title" data-testid="lend-title">Lend & Earn</h1>
            <p className="page-subtitle">Deposit crypto and create lending offers to earn interest</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="balance-card" data-testid="balance-card">
          <div className="balance-content">
            <div className="balance-info">
              <IoWallet size={32} className="balance-icon" />
              <div>
                <p className="balance-label">Available Balance</p>
                <p className="balance-value">{(user?.available_balance || 0).toFixed(4)} ETH</p>
              </div>
            </div>
            <div className="balance-stats">
              <div className="balance-stat">
                <p className="stat-label">Total Deposited</p>
                <p className="stat-value">{(user?.total_deposited || 0).toFixed(4)} ETH</p>
              </div>
              <div className="balance-stat">
                <p className="stat-label">Total Earned</p>
                <p className="stat-value earn">{(user?.total_earned || 0).toFixed(4)} ETH</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="deposit" className="lend-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="deposit" data-testid="deposit-tab">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw" data-testid="withdraw-tab">Withdraw</TabsTrigger>
            <TabsTrigger value="lend" data-testid="lend-tab">Create Offer</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="tab-content">
            <Card className="action-card" data-testid="deposit-card">
              <div className="card-header">
                <h3 className="card-title">Deposit Funds</h3>
                <p className="card-description">Add crypto to your account to start lending</p>
              </div>
              <div className="card-body">
                <div className="info-box">
                  <IoInformationCircle size={20} />
                  <p>Deposit fee: {stats?.config?.deposit_fee_percent || 0.5}%</p>
                </div>
                <div className="input-group">
                  <label htmlFor="deposit-amount">Amount (ETH)</label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="Enter amount to deposit"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    data-testid="deposit-amount-input"
                  />
                </div>
                {depositAmount && (
                  <div className="calculation">
                    <div className="calc-row">
                      <span>Deposit Amount:</span>
                      <span>{parseFloat(depositAmount).toFixed(4)} ETH</span>
                    </div>
                    <div className="calc-row">
                      <span>Fee ({stats?.config?.deposit_fee_percent || 0.5}%):</span>
                      <span>{((parseFloat(depositAmount) * (stats?.config?.deposit_fee_percent || 0.5)) / 100).toFixed(4)} ETH</span>
                    </div>
                    <div className="calc-row total">
                      <span>You'll Receive:</span>
                      <span>
                        {(parseFloat(depositAmount) - (parseFloat(depositAmount) * (stats?.config?.deposit_fee_percent || 0.5)) / 100).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleDeposit}
                  disabled={processing || !depositAmount}
                  className="action-btn"
                  data-testid="deposit-btn"
                >
                  {processing ? 'Processing...' : 'Deposit'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="tab-content">
            <Card className="action-card" data-testid="withdraw-card">
              <div className="card-header">
                <h3 className="card-title">Withdraw Funds</h3>
                <p className="card-description">Withdraw your available balance</p>
              </div>
              <div className="card-body">
                <div className="info-box">
                  <IoInformationCircle size={20} />
                  <p>Withdrawal fee: {stats?.config?.withdraw_fee_percent || 0.5}%</p>
                </div>
                <div className="input-group">
                  <label htmlFor="withdraw-amount">Amount (ETH)</label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Enter amount to withdraw"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    data-testid="withdraw-amount-input"
                  />
                  <p className="input-hint">Available: {(user?.available_balance || 0).toFixed(4)} ETH</p>
                </div>
                {withdrawAmount && (
                  <div className="calculation">
                    <div className="calc-row">
                      <span>Withdraw Amount:</span>
                      <span>{parseFloat(withdrawAmount).toFixed(4)} ETH</span>
                    </div>
                    <div className="calc-row">
                      <span>Fee ({stats?.config?.withdraw_fee_percent || 0.5}%):</span>
                      <span>{((parseFloat(withdrawAmount) * (stats?.config?.withdraw_fee_percent || 0.5)) / 100).toFixed(4)} ETH</span>
                    </div>
                    <div className="calc-row total">
                      <span>Total Deducted:</span>
                      <span>
                        {(parseFloat(withdrawAmount) + (parseFloat(withdrawAmount) * (stats?.config?.withdraw_fee_percent || 0.5)) / 100).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleWithdraw}
                  disabled={processing || !withdrawAmount}
                  className="action-btn"
                  data-testid="withdraw-btn"
                >
                  {processing ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lend" className="tab-content">
            <Card className="action-card" data-testid="lend-offer-card">
              <div className="card-header">
                <h3 className="card-title">Create Lending Offer</h3>
                <p className="card-description">Lock your funds and earn {stats?.config?.lender_interest_rate || 5}% APY</p>
              </div>
              <div className="card-body">
                <div className="info-box earn">
                  <IoTrendingUp size={20} />
                  <p>Earn {stats?.config?.lender_interest_rate || 5}% annual interest on your lending</p>
                </div>
                <div className="input-group">
                  <label htmlFor="lend-amount">Amount to Lend (ETH)</label>
                  <Input
                    id="lend-amount"
                    type="number"
                    placeholder="Enter amount to lend"
                    value={lendAmount}
                    onChange={(e) => setLendAmount(e.target.value)}
                    data-testid="lend-amount-input"
                  />
                  <p className="input-hint">Available: {(user?.available_balance || 0).toFixed(4)} ETH</p>
                </div>
                <div className="input-group">
                  <label htmlFor="lend-duration">Duration (Days)</label>
                  <Input
                    id="lend-duration"
                    type="number"
                    placeholder="Enter loan duration"
                    value={lendDuration}
                    onChange={(e) => setLendDuration(e.target.value)}
                    data-testid="lend-duration-input"
                  />
                </div>
                {lendAmount && lendDuration && (
                  <div className="calculation">
                    <div className="calc-row">
                      <span>Lending Amount:</span>
                      <span>{parseFloat(lendAmount).toFixed(4)} ETH</span>
                    </div>
                    <div className="calc-row">
                      <span>Interest ({stats?.config?.lender_interest_rate || 5}% APY):</span>
                      <span>
                        {(
                          (parseFloat(lendAmount) * (stats?.config?.lender_interest_rate || 5) * parseInt(lendDuration)) /
                          (365 * 100)
                        ).toFixed(4)}{' '}
                        ETH
                      </span>
                    </div>
                    <div className="calc-row total">
                      <span>Expected Return:</span>
                      <span>
                        {(
                          parseFloat(lendAmount) +
                          (parseFloat(lendAmount) * (stats?.config?.lender_interest_rate || 5) * parseInt(lendDuration)) /
                            (365 * 100)
                        ).toFixed(4)}{' '}
                        ETH
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleCreateOffer}
                  disabled={processing || !lendAmount || !lendDuration}
                  className="action-btn"
                  data-testid="create-offer-btn"
                >
                  {processing ? 'Processing...' : 'Create Offer'}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}