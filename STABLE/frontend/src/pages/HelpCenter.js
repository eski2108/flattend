import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API = process.env.REACT_APP_BACKEND_URL;

export default function HelpCenter() {
  const [categories, setCategories] = useState([]);
  const [allFaqs, setAllFaqs] = useState([]);
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchAllFaqs();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, selectedCategory, allFaqs]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/api/faq/categories`);
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllFaqs = async () => {
    try {
      const response = await axios.get(`${API}/api/faq/items`);
      if (response.data.success) {
        setAllFaqs(response.data.items);
        setFilteredFaqs(response.data.items);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let results = [...allFaqs];

    // Filter by category
    if (selectedCategory) {
      results = results.filter(faq => faq.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }

    setFilteredFaqs(results);
  };

  const handleFeedback = async (faqId, helpful) => {
    try {
      await axios.post(`${API}/api/faq/item/${faqId}/feedback`, { helpful });
      // Show a brief success message
      alert(helpful ? 'Thank you for your feedback!' : 'Thanks! We will improve this answer.');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const toggleFaq = (faqId) => {
    if (expandedFaq === faqId) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(faqId);
      // Track view
      axios.get(`${API}/api/faq/item/${faqId}`).catch(err => console.error(err));
    }
  };

  return (
    <Layout>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        padding: '2rem' 
      }}>
        {/* Header */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '700', 
            textAlign: 'center',
            background: 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem'
          }}>
            Help Center
          </h1>
          <p style={{ 
            textAlign: 'center', 
            color: '#888', 
            fontSize: '1.1rem'
          }}>
            Find answers to your questions about our platform
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '3rem' }}>
          <div style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            padding: '0.5rem 1rem',
            border: '1px solid rgba(0, 240, 255, 0.3)'
          }}>
            <span style={{ fontSize: '1.5rem', marginRight: '1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '1.1rem',
                padding: '0.5rem'
              }}
            />
          </div>
        </div>

        {/* Categories */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '3rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem'
          }}>
            {/* All Categories Button */}
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                background: selectedCategory === null 
                  ? 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: selectedCategory === null
                  ? 'none'
                  : '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600', 
                color: '#fff',
                marginBottom: '0.5rem'
              }}>
                All Topics
              </div>
              <div style={{ fontSize: '0.9rem', color: selectedCategory === null ? '#fff' : '#888' }}>
                {allFaqs.length} articles
              </div>
            </button>

            {categories.map(category => (
              <button
                key={category.category_id}
                onClick={() => setSelectedCategory(category.name)}
                style={{
                  background: selectedCategory === category.name 
                    ? 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)'
                    : 'rgba(0, 0, 0, 0.3)',
                  border: selectedCategory === category.name
                    ? 'none'
                    : '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{category.icon}</div>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '600', 
                  color: '#fff',
                  marginBottom: '0.5rem'
                }}>
                  {category.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: selectedCategory === category.name ? '#fff' : '#888' }}>
                  {category.faq_count} articles
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '4rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <div>Loading help articles...</div>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#888', 
              padding: '4rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '16px',
              border: '1px solid rgba(0, 240, 255, 0.3)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No results found</div>
              <div>Try a different search term or browse all categories</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredFaqs.map(faq => (
                <div
                  key={faq.faq_id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    overflow: 'hidden',
                    transition: 'all 0.3s'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(faq.faq_id)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#00F0FF', 
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        {faq.category}
                      </div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: '#fff'
                      }}>
                        {faq.question}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      color: '#00F0FF',
                      transition: 'transform 0.3s',
                      transform: expandedFaq === faq.faq_id ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </div>
                  </button>

                  {expandedFaq === faq.faq_id && (
                    <div style={{ 
                      padding: '0 1.5rem 1.5rem 1.5rem',
                      borderTop: '1px solid rgba(0, 240, 255, 0.1)'
                    }}>
                      <div style={{ 
                        color: '#ccc', 
                        lineHeight: '1.6',
                        marginBottom: '1.5rem',
                        marginTop: '1rem'
                      }}>
                        {faq.answer}
                      </div>

                      {/* Feedback */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        alignItems: 'center',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(0, 240, 255, 0.1)'
                      }}>
                        <span style={{ color: '#888', fontSize: '0.9rem' }}>
                          Was this helpful?
                        </span>
                        <button
                          onClick={() => handleFeedback(faq.faq_id, true)}
                          style={{
                            background: 'rgba(0, 240, 0, 0.1)',
                            border: '1px solid rgba(0, 240, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            color: '#00F000',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s'
                          }}
                        >
                          👍 Yes
                        </button>
                        <button
                          onClick={() => handleFeedback(faq.faq_id, false)}
                          style={{
                            background: 'rgba(240, 0, 0, 0.1)',
                            border: '1px solid rgba(240, 0, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            color: '#F00000',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s'
                          }}
                        >
                          👎 No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div style={{ 
          maxWidth: '800px', 
          margin: '4rem auto 0',
          textAlign: 'center',
          padding: '2rem',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.3)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
          <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Can't find what you're looking for?
          </h3>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>
            Our support team is here to help
          </p>
          <button style={{
            background: 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '1rem 2rem',
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}>
            Contact Support
          </button>
        </div>
      </div>
    </Layout>
  );
}
