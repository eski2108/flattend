import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IoChatbubbles, IoCheckmark as Check, IoCheckmarkCircle, IoPersonOutline, IoSend, IoTime } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminSupport() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/admin-login');
      return;
    }

    const user = JSON.parse(userData);
    if (!user.is_admin) {
      navigate('/');
      return;
    }

    loadAllChats();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadAllChats, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadAllChats = async () => {
    try {
      const response = await axios.get(`${API}/admin/support-chats`);
      if (response.data.success) {
        setChats(response.data.chats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      toast.error('Failed to load support chats');
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (chatId) => {
    try {
      const response = await axios.get(`${API}/admin/support-chat/${chatId}`);
      if (response.data.success) {
        setMessages(response.data.messages);
        setSelectedChat(chatId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedChat) return;

    try {
      await axios.post(`${API}/admin/support-reply`, {
        chat_id: selectedChat,
        message: replyMessage
      });

      toast.success('Reply sent successfully');
      setReplyMessage('');
      loadChatMessages(selectedChat);
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const markAsResolved = async (chatId) => {
    try {
      await axios.post(`${API}/admin/resolve-chat`, { chat_id: chatId });
      toast.success('Chat marked as resolved');
      loadAllChats();
      setSelectedChat(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to resolve chat:', error);
      toast.error('Failed to resolve chat');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'resolved': return '#10B981';
      case 'closed': return '#6B7280';
      default: return '#888';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div>Loading support chats...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Support Dashboard
            </h1>
            <p style={{ color: '#a0a0a0', fontSize: '16px' }}>
              Manage customer support chats and inquiries
            </p>
          </div>
          <Button onClick={() => navigate('/admin')}>
            Back to Admin
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Chat List */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#00F0FF',
              marginBottom: '1rem'
            }}>
              Active Chats ({chats.length})
            </h2>

            {chats.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                No support chats yet
              </p>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.chat_id}
                  onClick={() => loadChatMessages(chat.chat_id)}
                  style={{
                    background: selectedChat === chat.chat_id 
                      ? 'rgba(0, 240, 255, 0.2)' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: selectedChat === chat.chat_id 
                      ? '2px solid #00F0FF' 
                      : '1px solid rgba(0, 240, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat !== chat.chat_id) {
                      e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat !== chat.chat_id) {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IoPersonOutline size={16} color="#00F0FF" />
                      <span style={{ color: '#fff', fontWeight: '600' }}>
                        {chat.user_name || `User ${chat.user_id.substring(0, 8)}`}
                      </span>
                    </div>
                    <span style={{
                      background: getStatusColor(chat.status),
                      color: '#000',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {chat.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    <IoTime size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {formatDate(chat.created_at)}
                  </div>
                  {chat.last_message && (
                    <div style={{
                      fontSize: '13px',
                      color: '#aaa',
                      marginTop: '0.5rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {chat.last_message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Messages */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh'
          }}>
            {!selectedChat ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#888',
                fontSize: '18px'
              }}>
                <IoChatbubbles size={48} style={{ marginRight: '1rem' }} />
                Select a chat to view messages
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  marginBottom: '1rem',
                  padding: '1rem'
                }}>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-start' : 'flex-end',
                        marginBottom: '1rem'
                      }}
                    >
                      <div style={{
                        background: msg.sender === 'user' 
                          ? 'rgba(0, 240, 255, 0.2)' 
                          : 'rgba(168, 85, 247, 0.2)',
                        border: `1px solid ${msg.sender === 'user' ? '#00F0FF' : '#A855F7'}`,
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        maxWidth: '70%'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: '#888',
                          marginBottom: '0.25rem',
                          fontWeight: '600'
                        }}>
                          {msg.sender === 'user' ? 'Customer' : 'Support Team'}
                        </div>
                        <div style={{ color: '#fff', fontSize: '14px' }}>
                          {msg.message}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#666',
                          marginTop: '0.25rem',
                          textAlign: 'right'
                        }}>
                          {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div style={{ borderTop: '1px solid rgba(0, 240, 255, 0.2)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      style={{
                        flex: 1,
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        color: '#fff',
                        fontSize: '14px',
                        resize: 'none'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleSendReply();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim()}
                      style={{
                        background: replyMessage.trim() 
                          ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
                          : 'rgba(100, 100, 100, 0.3)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: replyMessage.trim() ? 'pointer' : 'not-allowed',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <IoSend size={20} />
                      Send
                    </button>
                  </div>
                  <button
                    onClick={() => markAsResolved(selectedChat)}
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      cursor: 'pointer',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <IoCheckmarkCircle size={16} />
                    Mark as Resolved
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
