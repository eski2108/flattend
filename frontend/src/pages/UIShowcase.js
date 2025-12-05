 
import React, { useState, useEffect } from 'react';
import { 
  IoQrCodeOutline,
  IoCopyOutline,
  IoLogoWhatsapp,
  IoLogoFacebook,
  IoLogoTwitter,
  IoCheckmarkCircleOutline,
  IoCash,
  IoPieChart as PieChart
} from 'react-icons/io5';
import QRCode from 'qrcode';
import Chart from 'react-apexcharts';

export default function UIShowcase() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Mock portfolio data
  const portfolio = [
    { currency: 'BTC', total_amount: 0.5, current_value_usd: 2500, allocation_percent: 50 },
    { currency: 'ETH', total_amount: 10, current_value_usd: 1500, allocation_percent: 30 },
    { currency: 'USDT', total_amount: 500, current_value_usd: 500, allocation_percent: 10 },
    { currency: 'SOL', total_amount: 20, current_value_usd: 300, allocation_percent: 6 },
    { currency: 'XRP', total_amount: 1000, current_value_usd: 200, allocation_percent: 4 }
  ];

  const totalValue = 5000;
  const referralLink = 'https://coinhubx.com/ref/ABC123';
  const referralCode = 'ABC123';

  useEffect(() => {
    // Generate QR code
    const generateQR = async () => {
      try {
        const qrUrl = await QRCode.toDataURL(referralLink, {
          width: 300,
          margin: 2,
          color: {
            dark: '#00F0FF',
            light: '#0a0b1a'
          },
          errorCorrectionLevel: 'M'
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQR();
  }, []);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(5px) rotate(-1deg); }
          }
          @keyframes scan {
            0% { top: 2rem; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: calc(100% - 4rem); opacity: 0; }
          }
        `}
      </style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem'
            }}>
              🎨 UI Enhancement Showcase
            </h1>
            <p style={{ color: '#A3AEC2', fontSize: '18px', fontWeight: '600' }}>
              Premium Portfolio Pie Chart & QR Code Section
            </p>
          </div>

          {/* Portfolio Allocation Pie Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(0,240,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '3rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated background glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(0,240,255,0.05) 0%, transparent 50%)',
              animation: 'pulse 4s ease-in-out infinite',
              pointerEvents: 'none'
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(0,240,255,0.6)'
              }}>
                <PieChart size={28} style={{ color: '#000' }} />
              </div>
              <div>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                  textShadow: '0 0 30px rgba(0,240,255,0.3)'
                }}>
                  Portfolio Allocation
                </h2>
                <p style={{ 
                  color: '#A3AEC2', 
                  fontSize: '16px', 
                  margin: 0,
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  Asset distribution breakdown
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 400px', 
              gap: '3rem', 
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Pie Chart */}
              <div style={{ position: 'relative' }}>
                <Chart
                  options={{
                    chart: {
                      type: 'pie',
                      background: 'transparent',
                      animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200
                      }
                    },
                    colors: ['#00F0FF', '#A855F7', '#FFD700', '#FF6B6B', '#4ECDC4'],
                    labels: portfolio.map(p => p.currency),
                    legend: { show: false },
                    dataLabels: {
                      enabled: true,
                      style: {
                        fontSize: '16px',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: '900',
                        colors: ['#000']
                      },
                      formatter: function(val) {
                        return val.toFixed(1) + '%';
                      },
                      dropShadow: {
                        enabled: true,
                        top: 2,
                        left: 2,
                        blur: 4,
                        color: '#000',
                        opacity: 0.8
                      }
                    },
                    plotOptions: {
                      pie: {
                        size: 300,
                        expandOnClick: true,
                        customScale: 1.1
                      }
                    },
                    stroke: {
                      show: true,
                      width: 4,
                      colors: ['rgba(10, 14, 39, 0.8)']
                    },
                    tooltip: {
                      enabled: true,
                      theme: 'dark',
                      style: {
                        fontSize: '14px',
                        fontFamily: 'Inter, system-ui, sans-serif'
                      }
                    }
                  }}
                  series={portfolio.map(p => p.allocation_percent)}
                  type="pie"
                  height={350}
                />
              </div>

              {/* Legend with Premium Styling */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {portfolio.map((holding, index) => {
                  const colors = ['#00F0FF', '#A855F7', '#FFD700', '#FF6B6B', '#4ECDC4'];
                  return (
                    <div key={index} style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: `2px solid ${colors[index % colors.length]}40`,
                      borderRadius: '16px',
                      padding: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}>
                      {/* Glow effect */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, transparent, ${colors[index % colors.length]}, transparent)`,
                        opacity: 0.8
                      }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: colors[index % colors.length],
                          boxShadow: `0 0 20px ${colors[index % colors.length]}80`,
                          border: '2px solid rgba(255,255,255,0.2)'
                        }} />
                        <div style={{
                          fontSize: '20px',
                          fontWeight: '900',
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          textShadow: '0 0 10px rgba(255,255,255,0.3)'
                        }}>
                          {holding.currency}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#A3AEC2',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            fontWeight: '700',
                            marginBottom: '4px'
                          }}>
                            VALUE
                          </div>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: '900',
                            background: `linear-gradient(135deg, ${colors[index % colors.length]}, #FFFFFF)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: `0 0 20px ${colors[index % colors.length]}50`
                          }}>
                            £{holding.current_value_usd.toFixed(2)}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#A3AEC2',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            fontWeight: '700',
                            marginBottom: '4px'
                          }}>
                            ALLOCATION
                          </div>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: '900',
                            color: colors[index % colors.length],
                            textShadow: `0 0 20px ${colors[index % colors.length]}50`
                          }}>
                            {holding.allocation_percent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#A3AEC2',
                          textTransform: 'uppercase',
                          letterSpacing: '1.5px',
                          fontWeight: '700',
                          marginBottom: '4px'
                        }}>
                          BALANCE
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#FFFFFF',
                          opacity: 0.9
                        }}>
                          {holding.total_amount.toFixed(8)} {holding.currency}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Premium QR Code & Share Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(168, 85, 247, 0.08))',
            borderRadius: '20px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated background particles */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(0,240,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%)',
              animation: 'float 6s ease-in-out infinite',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(0,240,255,0.6)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  <IoQrCodeOutline size={32} style={{ color: '#000' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0,
                    textShadow: '0 0 30px rgba(0,240,255,0.3)'
                  }}>
                    Share & Earn
                  </h3>
                  <p style={{ 
                    color: '#A3AEC2', 
                    fontSize: '16px', 
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    Scan to join • Lifetime commission
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '300px 1fr', 
                gap: '2rem', 
                alignItems: 'center' 
              }}>
                {/* Premium QR Code Section */}
                <div style={{
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: '20px',
                  padding: '2rem',
                  border: '3px solid transparent',
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), linear-gradient(135deg, #00F0FF, #A855F7)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'content-box, border-box',
                  position: 'relative',
                  textAlign: 'center'
                }}>
                  {/* Scanning animation overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '2rem',
                    left: '2rem',
                    right: '2rem',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)',
                    animation: 'scan 3s ease-in-out infinite',
                    zIndex: 2
                  }} />

                  <div style={{
                    fontSize: '18px',
                    fontWeight: '900',
                    color: '#00F0FF',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    textShadow: '0 0 20px rgba(0,240,255,0.5)'
                  }}>
                    SCAN TO JOIN
                  </div>

                  {qrCodeUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={qrCodeUrl} 
                        alt="Referral QR Code" 
                        style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '12px',
                          border: '2px solid rgba(0,240,255,0.3)',
                          boxShadow: '0 0 30px rgba(0,240,255,0.3)',
                          background: '#0a0b1a'
                        }}
                      />
                      {/* Corner decorations */}
                      <div style={{
                        position: 'absolute',
                        top: '-5px',
                        left: '-5px',
                        width: '30px',
                        height: '30px',
                        border: '3px solid #00F0FF',
                        borderRight: 'none',
                        borderBottom: 'none',
                        borderRadius: '8px 0 0 0'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        width: '30px',
                        height: '30px',
                        border: '3px solid #00F0FF',
                        borderLeft: 'none',
                        borderBottom: 'none',
                        borderRadius: '0 8px 0 0'
                      }} />
                      <div style={{
                        position: 'absolute',
                        bottom: '-5px',
                        left: '-5px',
                        width: '30px',
                        height: '30px',
                        border: '3px solid #00F0FF',
                        borderRight: 'none',
                        borderTop: 'none',
                        borderRadius: '0 0 0 8px'
                      }} />
                      <div style={{
                        position: 'absolute',
                        bottom: '-5px',
                        right: '-5px',
                        width: '30px',
                        height: '30px',
                        border: '3px solid #00F0FF',
                        borderLeft: 'none',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 0'
                      }} />
                    </div>
                  ) : (
                    <div style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '12px',
                      border: '2px dashed rgba(0,240,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00F0FF',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Generating QR...
                    </div>
                  )}

                  <div style={{
                    fontSize: '14px',
                    color: '#A855F7',
                    marginTop: '1rem',
                    fontWeight: '700',
                    textShadow: '0 0 15px rgba(168,85,247,0.5)'
                  }}>
                    Point camera here
                  </div>
                </div>

                {/* Share Options & Links */}
                <div>
                  {/* Social Share Buttons */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '900',
                      color: '#FFFFFF',
                      marginBottom: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Share on Social Media
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '1rem'
                    }}>
                      <button style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(37,211,102,0.4)',
                        transition: 'all 0.3s ease'
                      }}>
                        <IoLogoWhatsapp size={28} />
                      </button>
                      
                      <button style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0088cc, #005577)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: '700',
                        boxShadow: '0 8px 32px rgba(0,136,204,0.4)',
                        transition: 'all 0.3s ease'
                      }}>
                        ✈️
                      </button>
                      
                      <button style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(29,161,242,0.4)',
                        transition: 'all 0.3s ease'
                      }}>
                        <IoLogoTwitter size={28} />
                      </button>
                      
                      <button style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #1877F2, #166fe5)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(24,119,242,0.4)',
                        transition: 'all 0.3s ease'
                      }}>
                        <IoLogoFacebook size={28} />
                      </button>
                      
                      <button
                        onClick={() => copyToClipboard(referralLink, 'link')}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '16px',
                          background: copySuccess === 'link' ? 'linear-gradient(135deg, #00FF88, #00cc6a)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#000',
                          boxShadow: copySuccess === 'link' ? '0 8px 32px rgba(0,255,136,0.4)' : '0 8px 32px rgba(0,240,255,0.4)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {copySuccess === 'link' ? <IoCheckmarkCircleOutline size={28} /> : <IoCopyOutline size={28} />}
                      </button>
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#A3AEC2',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: '700'
                    }}>
                      Your Referral Code
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: 'rgba(0,0,0,0.4)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid rgba(0,240,255,0.3)'
                    }}>
                      <div style={{
                        flex: 1,
                        fontSize: '20px',
                        fontWeight: '900',
                        background: 'linear-gradient(135deg, #00F0FF, #FFFFFF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 20px rgba(0,240,255,0.5)'
                      }}>
                        {referralCode}
                      </div>
                      <button
                        onClick={() => copyToClipboard(referralCode, 'code')}
                        style={{
                          padding: '12px 20px',
                          background: copySuccess === 'code' ? 'linear-gradient(135deg, #00FF88, #00cc6a)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#000',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 16px rgba(0,240,255,0.3)'
                        }}
                      >
                        {copySuccess === 'code' ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>

                  {/* Referral Link */}
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#A3AEC2',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: '700'
                    }}>
                      Your Referral Link
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: 'rgba(0,0,0,0.4)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid rgba(168,85,247,0.3)'
                    }}>
                      <div style={{
                        flex: 1,
                        color: '#A855F7',
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: '600'
                      }}>
                        {referralLink}
                      </div>
                      <button
                        onClick={() => copyToClipboard(referralLink, 'link')}
                        style={{
                          padding: '12px 20px',
                          background: copySuccess === 'link' ? 'linear-gradient(135deg, #00FF88, #00cc6a)' : 'linear-gradient(135deg, #A855F7, #00F0FF)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#000',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 16px rgba(168,85,247,0.3)'
                        }}
                      >
                        {copySuccess === 'link' ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}