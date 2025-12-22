import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IoAdd as Plus, IoSend as Send, IoWallet } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';;
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function WalletPage() {
  const { account, user, refreshUser } = useWallet();
  const navigate = useNavigate();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!account) {
      navigate('/');
    }
  }, [account, navigate]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/user/deposit`, {
        wallet_address: account,
        amount: parseFloat(depositAmount),
      });

      if (response.data.success) {
        toast.success('Deposit successful!');
        setDepositAmount('');
        await refreshUser();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deposit failed');
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
      const response = await axios.post(`${API}/api/user/withdraw`, {
        wallet_address: account,
        amount: parseFloat(withdrawAmount),
      });

      if (response.data.success) {
        toast.success('Withdrawal successful!');
        setWithdrawAmount('');
        await refreshUser();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="fintech-page">
        <div className="page-header-fintech">
          <div>
            <h1 className="page-title-fintech">Wallet</h1>
            <p className="page-subtitle-fintech">Manage your funds and transactions</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="balance-card-fintech">
          <div className="balance-header">
            <div className="balance-icon-wrapper">
              <IoWallet size={24} />
            </div>
            <span className="balance-label">Available Balance</span>
          </div>
          <div className="balance-amount">
            <span className="balance-value">{(user?.available_balance || 0).toFixed(4)}</span>
            <span className="balance-currency">ETH</span>
          </div>
          <div className="balance-stats-row">
            <div className="balance-stat-item">
              <span className="stat-label">Total Deposited</span>
              <span className="stat-value">{(user?.total_deposited || 0).toFixed(4)} ETH</span>
            </div>
            <div className="balance-stat-item">
              <span className="stat-label">Total Earned</span>
              <span className="stat-value success">{(user?.total_earned || 0).toFixed(4)} ETH</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Tabs defaultValue="deposit" className="wallet-tabs-fintech">
          <TabsList className="tabs-list-fintech">
            <TabsTrigger value="deposit" className="tab-trigger-fintech">
              <BiArrowFromTop size={18} />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="tab-trigger-fintech">
              <BiArrowToTop size={18} />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit">
            <Card className="action-card-fintech">
              <div className="action-header">
                <h3>Deposit Funds</h3>
                <p>Add ETH to your wallet</p>
              </div>
              <div className="input-group-fintech">
                <label>Amount (ETH)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-fintech"
                />
              </div>
              <Button
                onClick={handleDeposit}
                disabled={processing}
                className="btn-primary-fintech"
              >
                {processing ? 'Processing...' : 'Deposit'}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <Card className="action-card-fintech">
              <div className="action-header">
                <h3>Withdraw Funds</h3>
                <p>Transfer ETH from your wallet</p>
              </div>
              <div className="input-group-fintech">
                <label>Amount (ETH)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="input-fintech"
                />
                <span className="input-hint-fintech">
                  Available: {(user?.available_balance || 0).toFixed(4)} ETH
                </span>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={processing}
                className="btn-primary-fintech"
              >
                {processing ? 'Processing...' : 'Withdraw'}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
