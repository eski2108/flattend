import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import CHXButton from '../CHXButton';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PortfolioGraph = ({ totalValue, userId }) => {
  const [timeRange, setTimeRange] = useState('7D');
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const timeRanges = ['24H', '7D', '30D', '90D'];

  useEffect(() => {
    loadPortfolioHistory(timeRange);
  }, [timeRange, userId]);

  const loadPortfolioHistory = async (range) => {
    setLoading(true);
    try {
      if (!userId) {
        const data = generateMockData(range, totalValue);
        setPortfolioHistory(data);
        setLoading(false);
        return;
      }

      // Use real backend endpoint
      const response = await axios.get(`${API}/api/portfolio/chart/${userId}`, {
        params: { timeframe: range }
      });

      if (response.data.success && response.data.data) {
        // Transform backend data to ApexCharts format
        const chartData = response.data.data.map(point => ({
          x: point.time * 1000,
          y: point.value
        }));
        setPortfolioHistory(chartData);
      } else {
        // Fallback to mock data
        const data = generateMockData(range, totalValue);
        setPortfolioHistory(data);
      }
    } catch (error) {
      console.error('Failed to load portfolio history:', error);
      // Fallback to mock data on error
      const data = generateMockData(range, totalValue);
      setPortfolioHistory(data);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (range, currentValue) => {
    const points = range === '24H' ? 24 : range === '7D' ? 7 : range === '30D' ? 30 : 90;
    const now = Date.now();
    const interval = range === '24H' ? 3600000 : 86400000; // 1 hour or 1 day
    
    return Array.from({ length: points }, (_, i) => {
      const variance = 0.95 + Math.random() * 0.1;
      const value = currentValue * variance;
      const timestamp = now - (points - i - 1) * interval;
      
      return {
        x: timestamp,
        y: parseFloat(value.toFixed(2))
      };
    });
  };

  const chartOptions = {
    chart: {
      type: 'area',
      height: 300,
      background: 'transparent',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#00E5FF']
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: 'rgba(0, 255, 255, 0.4)',
            opacity: 1
          },
          {
            offset: 100,
            color: 'rgba(0, 255, 255, 0.05)',
            opacity: 1
          }
        ]
      }
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.04)',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 10
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: 'rgba(255, 255, 255, 0.55)',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500
        },
        datetimeUTC: false
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'rgba(255, 255, 255, 0.55)',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500
        },
        formatter: (value) => `£${value.toFixed(0)}`
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif'
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const timestamp = w.globals.seriesX[seriesIndex][dataPointIndex];
        const date = new Date(timestamp);
        
        // Calculate approx USD value
        const usdValue = (value * 1.27).toFixed(2);
        
        return `
          <div style="
            background: #0B1020;
            color: #FFFFFF;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid rgba(0, 229, 255, 0.3);
            box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
            font-family: Inter, sans-serif;
          ">
            <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 6px; font-weight: 500;">
              ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style="font-size: 18px; font-weight: 700; color: #00E5FF; margin-bottom: 4px;">
              £${value.toFixed(2)}
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500;">
              ≈ $${usdValue}
            </div>
          </div>
        `;
      }
    },
    markers: {
      size: 0,
      colors: ['#00E5FF'],
      strokeColors: '#FFFFFF',
      strokeWidth: 2,
      shape: 'circle',
      hover: {
        size: 7,
        sizeOffset: 3
      }
    },
    legend: {
      show: false
    }
  };

  const series = [
    {
      name: 'Portfolio Value',
      data: portfolioHistory
    }
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      borderRadius: '18px',
      padding: '20px 16px',
      marginTop: '16px',
      marginBottom: '16px',
      boxShadow: '0 0 35px rgba(0, 229, 255, 0.18)',
      overflow: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#FFFFFF', 
          margin: 0, 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          width: '100%',
          marginBottom: '8px'
        }}>Portfolio Value</h3>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px'
        }}>
          {timeRanges.map(range => (
            <CHXButton
              key={range}
              onClick={() => setTimeRange(range)}
              coinColor="#00E5FF"
              variant={timeRange === range ? 'primary' : 'secondary'}
              size="small"
              style={{ minWidth: '60px', flex: '1' }}
            >
              {range}
            </CHXButton>
          ))}
        </div>
      </div>

      <div style={{ 
        height: '300px',
        marginTop: '12px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid rgba(0, 229, 255, 0.2)',
                borderTop: '3px solid #00E5FF',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Loading chart...
            </div>
          </div>
        ) : (
          <Chart
            options={chartOptions}
            series={series}
            type="area"
            height={300}
            width="100%"
          />
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PortfolioGraph;
