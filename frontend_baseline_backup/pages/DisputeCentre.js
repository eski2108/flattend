import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { MessageCircle, Upload, CheckCircle, AlertTriangle, FileText, Image as ImageIcon, File, Send } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://binancelike-ui.preview.emergentagent.com';

function DisputeCentre() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const userData = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
  const userId = userData.user_id;

  useEffect(() => {
    if (disputeId) fetchDispute();
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [disputeId]);

  const fetchDispute = async () => {
    try {
      setLoading(true);
      const apiUrl = `${API}/api/p2p/disputes/${disputeId}?user_id=${userId}`;
      console.log('Fetching dispute from:', apiUrl);
      const response = await axios.get(apiUrl);
      console.log('Dispute response:', response.data);
      if (response.data.success) {
        setDispute(response.data.dispute);
      } else {
        console.error('Invalid dispute response:', response.data);
        toast.error('Dispute not found');
      }
    } catch (error) {
      console.error('Error fetching dispute:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await axios.post(`${API}/api/p2p/disputes/${disputeId}/message`, {
        user_id: userId,
        message: message.trim()
      });
      setMessage('');
      toast.success('Message sent');
      fetchDispute();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images (PNG, JPG) and PDFs are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    try {
      setUploadingFile(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await axios.post(`${API}/api/p2p/disputes/${disputeId}/evidence`, {
            user_id: userId,
            file_name: file.name,
            file_type: file.type,
            file_data: reader.result,
            description: `Evidence uploaded by user`
          });
          toast.success('Evidence uploaded successfully');
          fetchDispute();
        } catch (error) {
          console.error('Error uploading evidence:', error);
          toast.error('Failed to upload evidence');
        } finally {
          setUploadingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
          Loading dispute...
        </div>
      </Layout>
    );
  }

  if (!dispute) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
          <div style={{ color: '#888', fontSize: '16px', marginBottom: '1rem' }}>Dispute not found</div>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #00F0FF, #A855F7)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '700', cursor: 'pointer' }}>
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const cardStyle = {
    padding: '1.5rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '12px'
  };

  return (
    <Layout>
      <div style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF', margin: '0 0 1rem 0' }}>Dispute Centre</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#888', fontSize: '14px' }}>Dispute ID: {dispute.dispute_id}</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: dispute.status === 'open' ? 'rgba(252, 211, 77, 0.15)' : 'rgba(34, 197, 94, 0.15)', border: `1px solid ${dispute.status === 'open' ? 'rgba(252, 211, 77, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`, borderRadius: '6px' }}>
                {dispute.status === 'open' ? <AlertTriangle size={16} color="#FCD34D" /> : <CheckCircle size={16} color="#22C55E" />}
                <span style={{ color: dispute.status === 'open' ? '#FCD34D' : '#22C55E', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>{dispute.status}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 1rem 0' }}>Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Order Created */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={18} color="#22C55E" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.25rem' }}>Order Created</div>
                  <div style={{ color: '#888', fontSize: '13px' }}>{dispute.trade?.created_at ? new Date(dispute.trade.created_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              {/* Payment Marked */}
              {dispute.trade?.payment_marked_at && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={18} color="#22C55E" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.25rem' }}>Payment Marked</div>
                    <div style={{ color: '#888', fontSize: '13px' }}>{new Date(dispute.trade.payment_marked_at).toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* Dispute Opened */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(252, 211, 77, 0.15)', border: '2px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={18} color="#FCD34D" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.25rem' }}>Dispute Opened</div>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.25rem' }}>{new Date(dispute.created_at).toLocaleString()}</div>
                  {dispute.reason && <div style={{ color: '#666', fontSize: '12px' }}>Reason: {dispute.reason}</div>}
                </div>
              </div>

              {/* Admin Decision */}
              {dispute.status === 'resolved' && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={18} color="#22C55E" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.25rem' }}>Admin Decision</div>
                    <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.25rem' }}>{new Date(dispute.resolved_at).toLocaleString()}</div>
                    <div style={{ color: '#22C55E', fontSize: '13px', fontWeight: '600' }}>{dispute.resolution === 'release_to_buyer' ? 'Crypto released to buyer' : 'Funds returned to seller'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat and Evidence Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Chat Section */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '500px', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={18} /> Dispute Chat
              </h3>
              
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', minHeight: isMobile ? '300px' : 'auto' }}>
                {dispute.messages && dispute.messages.length > 0 ? (
                  dispute.messages.map((msg, idx) => {
                    const isCurrentUser = msg.user_id === userId;
                    const isBuyer = msg.user_id === dispute.buyer_id;
                    return (
                      <div key={idx} style={{ padding: '0.875rem', background: isCurrentUser ? 'rgba(0, 240, 255, 0.1)' : 'rgba(168, 85, 247, 0.1)', border: `1px solid ${isCurrentUser ? 'rgba(0, 240, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`, borderRadius: '8px', width: '85%', alignSelf: isCurrentUser ? 'flex-end' : 'flex-start', wordWrap: 'break-word', boxSizing: 'border-box' }}>
                        <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.375rem', fontWeight: '600' }}>{isBuyer ? 'Buyer' : 'Seller'} • {new Date(msg.timestamp).toLocaleTimeString()}</div>
                        <div style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5' }}>{msg.message}</div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '13px' }}>No messages yet. Start the conversation.</div>
                )}
              </div>

              {/* Message Input */}
              {dispute.status === 'open' && (
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type your message..." style={{ flex: 1, padding: '0.875rem', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                  <button onClick={sendMessage} disabled={!message.trim()} style={{ padding: '0.875rem 1.25rem', background: message.trim() ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(100, 100, 100, 0.3)', border: 'none', borderRadius: '8px', color: message.trim() ? '#000' : '#666', fontWeight: '700', cursor: message.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
                    <Send size={16} /> Send
                  </button>
                </div>
              )}
            </div>

            {/* Evidence Section */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '500px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} /> Evidence & Attachments
              </h3>

              {/* Upload Button */}
              {dispute.status === 'open' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.25rem', background: uploadingFile ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', cursor: uploadingFile ? 'not-allowed' : 'pointer', opacity: uploadingFile ? 0.5 : 1, fontSize: '14px' }}>
                    <Upload size={16} /> {uploadingFile ? 'Uploading...' : 'Upload Evidence'}
                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingFile} style={{ display: 'none' }} />
                  </label>
                  <div style={{ color: '#666', fontSize: '11px', marginTop: '0.5rem' }}>Images (PNG, JPG) and PDF • Max 5MB</div>
                </div>
              )}

              {/* Evidence List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: isMobile ? '200px' : 'auto' }}>
                {dispute.evidence && dispute.evidence.length > 0 ? (
                  dispute.evidence.map((ev, idx) => {
                    const isImage = ev.file_type.startsWith('image/');
                    return (
                      <div key={idx} style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: isImage ? 'rgba(0, 240, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isImage ? 'rgba(0, 240, 255, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isImage ? <ImageIcon size={20} color="#00F0FF" /> : <File size={20} color="#EF4444" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '600', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.file_name}</div>
                          <div style={{ color: '#888', fontSize: '11px' }}>Uploaded by {ev.user_id === dispute.buyer_id ? 'Buyer' : 'Seller'}</div>
                          <div style={{ color: '#666', fontSize: '11px' }}>{new Date(ev.uploaded_at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '13px' }}>No evidence uploaded yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default DisputeCentre;