import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoAlertCircle, IoChatbubbles, IoCheckmark as Check, IoCheckmarkCircle, IoPersonOutline, IoSend, IoTime as Clock } from 'react-icons/io5';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminSupportChat() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'ai', 'live_agent'
  const [aiSettings, setAiSettings] = useState({ ai_enabled: true, has_custom_api_key: false });
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchAiSettings();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.session_id);
      
      // Poll for new messages in selected session
      const interval = setInterval(() => {
        fetchMessages(selectedSession.session_id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const statusFilter = filter === 'all' ? '' : `?status=${filter}`;
      const response = await axios.get(`${BACKEND_URL}/api/admin/chat/sessions${statusFilter}`);
      
      if (response.data.success) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/chat/history/${sessionId}`);
      
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchAiSettings = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/chat/settings`);
      
      if (response.data.success) {
        setAiSettings({
          ai_enabled: response.data.ai_enabled,
          has_custom_api_key: response.data.has_custom_api_key
        });
      }
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
    }
  };

  const toggleAiEnabled = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/chat/settings`, {
        ai_enabled: !aiSettings.ai_enabled
      });
      
      if (response.data.success) {
        setAiSettings(prev => ({ ...prev, ai_enabled: !prev.ai_enabled }));
        toast.success(`AI Assistant ${!aiSettings.ai_enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const saveCustomApiKey = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${BACKEND_URL}/api/admin/chat/settings`, {
        custom_api_key: customApiKey
      });
      
      if (response.data.success) {
        setAiSettings(prev => ({ ...prev, has_custom_api_key: true }));
        toast.success('API key saved successfully');
        setCustomApiKey('');
        setShowSettings(false);
      }
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedSession) return;

    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/chat/send-message`, {
        session_id: selectedSession.session_id,
        message: replyMessage,
        admin_id: 'ADMIN'
      });

      if (response.data.success) {
        setReplyMessage('');
        fetchMessages(selectedSession.session_id);
        toast.success('Message sent');
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const resolveChat = async (sessionId) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/chat/resolve`, {
        session_id: sessionId
      });

      if (response.data.success) {
        toast.success('Chat marked as resolved');
        fetchSessions();
        if (selectedSession?.session_id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      toast.error('Failed to resolve chat');
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
            Support Chat
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            Manage AI assistant and live agent conversations
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: '0.75rem 1.5rem',
            background: showSettings ? 'rgba(168, 85, 247, 0.2)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
            border: 'none',
            borderRadius: '8px',
            color: showSettings ? '#A855F7' : '#000',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {showSettings ? 'Hide Settings' : 'AI Settings'}
        </button>
      </div>

      {/* AI Settings Panel */}
      {showSettings && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem', color: '#00F0FF', fontSize: '18px', fontWeight: '700' }}>
            AI Assistant Settings
          </h3>

          {/* AI On/Off Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ margin: 0, color: '#E2E8F0', fontWeight: '600', fontSize: '14px' }}>
                AI Assistant
              </p>
              <p style={{ margin: '0.25rem 0 0', color: '#888', fontSize: '13px' }}>
                {aiSettings.ai_enabled ? 'AI will respond first' : 'All chats go directly to live agents'}
              </p>
            </div>
            <button
              onClick={toggleAiEnabled}
              style={{
                width: '60px',
                height: '32px',
                borderRadius: '16px',
                background: aiSettings.ai_enabled ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : '#444',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '4px',
                left: aiSettings.ai_enabled ? '32px' : '4px',
                transition: 'all 0.3s'
              }} />
            </button>
          </div>

          {/* Custom API Key */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '13px', fontWeight: '600' }}>
              Custom AI API Key (Optional)
            </label>
            <p style={{ margin: '0 0 0.75rem', color: '#666', fontSize: '12px' }}>
              Leave empty to use the default key. Add your own OpenAI key for unlimited usage.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="sk-..."
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={saveCustomApiKey}
                disabled={loading || !customApiKey.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading || !customApiKey.trim() ? '#444' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '6px',
                  color: loading || !customApiKey.trim() ? '#888' : '#000',
                  fontWeight: '700',
                  cursor: loading || !customApiKey.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : 'Save Key'}
              </button>
            </div>
            {aiSettings.has_custom_api_key && (
              <p style={{ margin: '0.5rem 0 0', color: '#22C55E', fontSize: '12px' }}>
                ✓ Custom API key configured
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '0.5rem 1rem',
            background: filter === 'all' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${filter === 'all' ? '#00F0FF' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '6px',
            color: filter === 'all' ? '#00F0FF' : '#888',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          All Chats
        </button>
        <button
          onClick={() => setFilter('ai')}
          style={{
            padding: '0.5rem 1rem',
            background: filter === 'ai' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${filter === 'ai' ? '#00F0FF' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '6px',
            color: filter === 'ai' ? '#00F0FF' : '#888',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          AI First
        </button>
        <button
          onClick={() => setFilter('live_agent')}
          style={{
            padding: '0.5rem 1rem',
            background: filter === 'live_agent' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${filter === 'live_agent' ? '#A855F7' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '6px',
            color: filter === 'live_agent' ? '#A855F7' : '#888',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Live Agent
        </button>
      </div>

      {/* Chat Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', height: '600px' }}>
        {/* Sessions List */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          overflow: 'auto'
        }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              <p>No open chat sessions</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.session_id}
                onClick={() => setSelectedSession(session)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  background: selectedSession?.session_id === session.session_id ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {session.status === 'ai' ? (
                      <Bot size={16} color="#00F0FF" />
                    ) : (
                      <IoPersonOutline size={16} color="#A855F7" />
                    )}
                    <span style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '600' }}>
                      {session.user_email || `User ${session.session_id.slice(0, 8)}`}
                    </span>
                  </div>
                  <span style={{ color: '#666', fontSize: '11px' }}>
                    {formatTimestamp(session.last_message_at)}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#888', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.last_message || 'No messages yet'}
                </p>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  {session.escalated && (
                    <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                      ESCALATED
                    </span>
                  )}
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: session.status === 'ai' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: session.status === 'ai' ? '#00F0FF' : '#A855F7',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700'
                  }}>
                    {session.status === 'ai' ? 'AI FIRST' : 'LIVE AGENT'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Messages Panel */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                    {selectedSession.user_email || `Session ${selectedSession.session_id.slice(0, 8)}`}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#888', fontSize: '12px' }}>
                    {selectedSession.status === 'ai' ? 'AI-first mode' : 'Live agent mode'}
                  </p>
                </div>
                <button
                  onClick={() => resolveChat(selectedSession.session_id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '6px',
                    color: '#22C55E',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoCheckmarkCircle size={16} />
                  Mark Resolved
                </button>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                      gap: '0.75rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: msg.sender === 'user' ? 'linear-gradient(135deg, #A855F7, #00F0FF)' :
                                  msg.sender === 'ai' ? 'rgba(0, 240, 255, 0.2)' :
                                  msg.sender === 'agent' ? 'rgba(34, 197, 94, 0.2)' :
                                  'rgba(251, 146, 60, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {msg.sender === 'user' ? <IoPersonOutline size={18} color="#fff" /> :
                       msg.sender === 'ai' ? <Bot size={18} color="#00F0FF" /> :
                       msg.sender === 'agent' ? <IoCheckmarkCircle size={18} color="#22C55E" /> :
                       <IoAlertCircle size={18} color="#FB923C" />}
                    </div>

                    <div style={{
                      maxWidth: '70%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      background: msg.sender === 'user' ? 'linear-gradient(135deg, #A855F7, #00F0FF)' :
                                  'rgba(0, 0, 0, 0.5)',
                      color: msg.sender === 'user' ? '#000' : '#E2E8F0',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      wordWrap: 'break-word'
                    }}>
                      {msg.message}
                      <p style={{ margin: '0.5rem 0 0', fontSize: '11px', opacity: 0.6 }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                  placeholder="Type your reply..."
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={sendReply}
                  disabled={!replyMessage.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: !replyMessage.trim() ? '#444' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    borderRadius: '8px',
                    color: !replyMessage.trim() ? '#888' : '#000',
                    fontWeight: '700',
                    cursor: !replyMessage.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoSend size={16} />
                  Send
                </button>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888'
            }}>
              <IoChatbubbles size={48} color="#444" />
              <p style={{ margin: '1rem 0 0', fontSize: '14px' }}>
                Select a chat to view messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
