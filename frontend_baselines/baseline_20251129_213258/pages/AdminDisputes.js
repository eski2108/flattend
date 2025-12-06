import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { AlertTriangle, CheckCircle, Clock, Eye, MessageCircle, FileText } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://tradepanel-12.preview.emergentagent.com';

function AdminDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('open');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const adminId = localStorage.getItem('user_id');

  useEffect(() => {
    fetchDisputes();
  }, [filterStatus]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/admin/disputes/all?status=${filterStatus}`);
      if (response.data.success) {
        setDisputes(response.data.disputes || []);
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (disputeId, resolution) => {
    if (!window.confirm(`Are you sure you want to ${resolution === 'release_to_buyer' ? 'release funds to buyer' : 'return funds to seller'}?`)) {
      return;
    }

    try {
      await axios.post(`${API}/api/admin/disputes/${disputeId}/resolve`, {
        admin_id: adminId,
        resolution: resolution,
        admin_note: adminNote
      });

      toast.success('Dispute resolved successfully');
      setAdminNote('');
      fetchDisputes();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    }
  };

  const addAdminNote = async (disputeId) => {
    if (!adminNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await axios.post(`${API}/api/admin/disputes/${disputeId}/note`, {
        admin_id: adminId,
        note: adminNote.trim()
      });

      toast.success('Note added');
      setAdminNote('');
      fetchDisputes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  return (
    <Layout>
      <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF', marginBottom: '1.5rem' }}>
          Dispute Management
        </h1>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setFilterStatus('open')}
            style={{
              padding: '0.5rem 1rem',
              background: filterStatus === 'open' ? 'linear-gradient(135deg, #FCD34D, #F59E0B)' : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              color: filterStatus === 'open' ? '#000' : '#888',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Open Disputes
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            style={{
              padding: '0.5rem 1rem',
              background: filterStatus === 'resolved' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              color: filterStatus === 'resolved' ? '#fff' : '#888',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Resolved
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px'
          }}>
            <div style={{ color: '#888', fontSize: '16px' }}>No {filterStatus} disputes</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {disputes.map((dispute) => (
              <div
                key={dispute.dispute_id}
                style={{
                  padding: '1.5rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '12px'
                }}
              >
                {/* Dispute Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>
                        {dispute.dispute_id}
                      </h3>
                      {dispute.status === 'open' ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(252, 211, 77, 0.15)',
                          border: '1px solid rgba(252, 211, 77, 0.4)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#FCD34D'
                        }}>
                          <AlertTriangle size={12} />
                          OPEN
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#22C55E'
                        }}>
                          <CheckCircle size={12} />
                          RESOLVED
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#888', fontSize: '13px' }}>
                      Trade ID: {dispute.trade_id}
                    </div>
                    <div style={{ color: '#888', fontSize: '13px' }}>
                      Opened: {new Date(dispute.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => navigate(`/disputes/${dispute.dispute_id}`)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#00F0FF',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                  </div>
                </div>

                {/* Parties */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>BUYER</div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                      {dispute.buyer_info?.username || dispute.buyer_info?.email || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>SELLER</div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                      {dispute.seller_info?.username || dispute.seller_info?.email || 'Unknown'}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>MESSAGES</div>
                    <div style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '900' }}>
                      {dispute.messages?.length || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>EVIDENCE</div>
                    <div style={{ color: '#A855F7', fontSize: '18px', fontWeight: '900' }}>
                      {dispute.evidence?.length || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>NOTES</div>
                    <div style={{ color: '#FCD34D', fontSize: '18px', fontWeight: '900' }}>
                      {dispute.admin_notes?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Admin Actions (only for open disputes) */}
                {dispute.status === 'open' && (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Add admin note (optional)..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          minHeight: '60px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => resolveDispute(dispute.dispute_id, 'release_to_buyer')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Release to Buyer
                      </button>
                      <button
                        onClick={() => resolveDispute(dispute.dispute_id, 'return_to_seller')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Return to Seller
                      </button>
                      {adminNote.trim() && (
                        <button
                          onClick={() => addAdminNote(dispute.dispute_id)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            borderRadius: '8px',
                            color: '#A855F7',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Add Note
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolution Info (for resolved disputes) */}
                {dispute.status === 'resolved' && (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#22C55E', fontSize: '14px', fontWeight: '700', marginBottom: '0.25rem' }}>
                      {dispute.resolution === 'release_to_buyer' ? '✓ Funds released to buyer' : '✓ Funds returned to seller'}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      Resolved on {new Date(dispute.resolved_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AdminDisputes;
