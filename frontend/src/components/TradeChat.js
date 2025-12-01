import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Image, IoClose, IoImage, IoSend, Send } from 'react-icons/io5';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BUYER_PRESETS = [
  "Hi, I've opened the trade. I will make the payment now.",
  "Payment sent. Please check your bank.",
  "I've uploaded the proof of payment.",
  "Please release the crypto once you confirm the money has arrived.",
  "I paid from my personal account, same name as my KYC.",
  "Payment should land instantly, it was Faster Payments.",
  "Still waiting for release.",
  "If you don't respond soon I will open a dispute."
];

const SELLER_PRESETS = [
  "Hi. I will release once I confirm the money in my account.",
  "Please only mark as paid after sending the money.",
  "Send proof of payment once done.",
  "What name did the payment come from?",
  "I haven't received anything yet.",
  "Still not showing. I will check again in a few minutes.",
  "Payment received. Releasing now.",
  "Payment hasn't arrived. Please double-check your transfer.",
  "If payment doesn't arrive soon I will open a dispute."
];

export default function TradeChat({ tradeId, userId, userRole, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const presets = userRole === 'buyer' ? BUYER_PRESETS : SELLER_PRESETS;

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [tradeId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/trade/chat/${tradeId}`, {
        params: { user_id: userId }
      });
      
      if (response.data.success) {
        setMessages(response.data.messages);
        
        // Mark messages as read
        await axios.post(`${API}/trade/chat/mark-read`, {
          trade_id: tradeId,
          user_id: userId
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || newMessage.trim();
    
    if (!textToSend && !selectedImage) return;
    
    setSending(true);
    try {
      await axios.post(`${API}/trade/chat/send`, {
        trade_id: tradeId,
        user_id: userId,
        message: textToSend,
        image_data: selectedImage
      });
      
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setShowPresets(false);
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg) => {
    const isOwnMessage = msg.sender_id === userId;
    const isSeller = msg.sender_type === 'seller';
    const isBuyer = msg.sender_type === 'buyer';
    const isSystem = msg.sender_type === 'system';
    const isAdmin = msg.sender_type === 'admin';

    if (isSystem) {
      return (
        <div key={msg.message_id} style={{
          textAlign: 'center',
          padding: '0.75rem',
          margin: '1rem 0'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: 'rgba(100, 116, 139, 0.2)',
            borderRadius: '12px',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(100, 116, 139, 0.3)'
          }}>
            <span style={{ marginRight: '0.5rem' }}>ℹ️</span>
            {msg.content}
          </div>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '0.25rem'
          }}>
            {formatTimestamp(msg.timestamp)}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.message_id} style={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{
          maxWidth: '70%',
          background: isAdmin 
            ? 'linear-gradient(135deg, #F59E0B, #EF4444)' 
            : isOwnMessage 
              ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
              : 'rgba(51, 65, 85, 0.6)',
          padding: '0.75rem 1rem',
          borderRadius: isOwnMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              color: isAdmin ? '#FFF' : isSeller ? '#10B981' : '#00F0FF',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {isAdmin ? '👮 Admin' : msg.sender_type}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {formatTimestamp(msg.timestamp)}
            </span>
          </div>
          
          {msg.image_data && (
            <img 
              src={msg.image_data} 
              alt="Uploaded" 
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => window.open(msg.image_data, '_blank')}
            />
          )}
          
          <div style={{
            fontSize: '14px',
            color: '#fff',
            wordBreak: 'break-word'
          }}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '450px',
      height: '100vh',
      background: 'rgba(10, 14, 39, 0.98)',
      borderLeft: '2px solid rgba(0, 240, 255, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '2px solid rgba(0, 240, 255, 0.2)',
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '0.25rem'
          }}>
            Trade Chat
          </h3>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            Trade ID: {tradeId.substring(0, 8)}...
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '0.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IoClose size={20} color="#EF4444" />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '2rem'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Presets */}
      {showPresets && (
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '1rem',
          borderTop: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '0.5rem'
          }}>
            Quick Replies:
          </div>
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => sendMessage(preset)}
              disabled={sending}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 240, 255, 0.2)';
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 240, 255, 0.1)';
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.2)';
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{
                maxWidth: '200px',
                maxHeight: '150px',
                borderRadius: '8px'
              }}
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#EF4444',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IoClose size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '1rem',
        borderTop: '2px solid rgba(0, 240, 255, 0.2)',
        background: 'rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <button
            onClick={() => setShowPresets(!showPresets)}
            style={{
              padding: '0.75rem',
              background: showPresets ? 'rgba(0, 240, 255, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              color: '#00F0FF',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            💬 Quick Replies
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '0.75rem',
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IoImage size={18} color="#00F0FF" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            disabled={sending}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || (!newMessage.trim() && !selectedImage)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: (sending || (!newMessage.trim() && !selectedImage)) ? 0.5 : 1
            }}
          >
            <IoSend size={18} color="#fff" />
            <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
              Send
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
