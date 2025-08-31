import React, { useState } from 'react';

const TokenMetricsDisplay = ({ metrics, timestamp }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTime = (seconds) => {
    if (seconds < 1) {
      return `${(seconds * 1000).toFixed(0)}ms`;
    }
    return `${seconds.toFixed(3)}s`;
  };

  const getPerformanceIndicator = (tokensPerSecond) => {
    if (tokensPerSecond >= 20) return { label: 'Excellent', color: '#10b981', icon: '🚀' };
    if (tokensPerSecond >= 10) return { label: 'Good', color: '#3b82f6', icon: '⚡' };
    if (tokensPerSecond >= 5) return { label: 'Fair', color: '#f59e0b', icon: '⏱️' };
    return { label: 'Slow', color: '#ef4444', icon: '🐌' };
  };

  const sessionMetrics = metrics.session;
  const overallMetrics = metrics.overall;
  const performance = getPerformanceIndicator(sessionMetrics.tokens_per_second);

  return (
    <div className="token-metrics-display">
      <div className="metrics-section">
        <div 
          className="section-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h4>
            <span className="section-icon">
              {isExpanded ? '▼' : '►'}
            </span>
            🔄 Token Generation Performance
            <span className="performance-badge" style={{ backgroundColor: performance.color }}>
              {performance.icon} {performance.label}
            </span>
          </h4>
          <span className="execution-time">{timestamp}</span>
        </div>
        
        {isExpanded && (
          <div className="section-content">
            {/* Session Performance */}
            <div className="metrics-group">
              <h5>📊 Current Session</h5>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Tokens Generated:</span>
                  <span className="metric-value">{sessionMetrics.tokens}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Total Time:</span>
                  <span className="metric-value">{formatTime(sessionMetrics.total_time)}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Tokens/Second:</span>
                  <span className="metric-value highlight">{sessionMetrics.tokens_per_second}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Avg Time/Token:</span>
                  <span className="metric-value">{formatTime(sessionMetrics.avg_time_per_token)}</span>
                </div>
                {sessionMetrics.ttft && (
                  <div className="metric-item">
                    <span className="metric-label">Time to First Token:</span>
                    <span className="metric-value">{formatTime(sessionMetrics.ttft)}</span>
                  </div>
                )}
                <div className="metric-item">
                  <span className="metric-label">Avg Inter-token Time:</span>
                  <span className="metric-value">{formatTime(sessionMetrics.avg_inter_token_time)}</span>
                </div>
              </div>
            </div>

            {/* Overall Performance */}
            <div className="metrics-group">
              <h5>📈 Overall Statistics</h5>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Total Tokens:</span>
                  <span className="metric-value">{overallMetrics.total_tokens.toLocaleString()}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Total Time:</span>
                  <span className="metric-value">{formatTime(overallMetrics.total_time)}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Overall Tokens/Second:</span>
                  <span className="metric-value highlight">{overallMetrics.tokens_per_second}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Overall Avg Time/Token:</span>
                  <span className="metric-value">{formatTime(overallMetrics.avg_time_per_token)}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Rolling Avg Session Time:</span>
                  <span className="metric-value">{formatTime(overallMetrics.rolling_avg_session_time)}</span>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="metrics-group">
              <h5>💡 Performance Insights</h5>
              <div className="insights-content">
                <div className="insight-item">
                  <span className="insight-icon">🎯</span>
                  <span>Current speed: <strong>{sessionMetrics.tokens_per_second} tokens/sec</strong> - {performance.label} performance</span>
                </div>
                {sessionMetrics.ttft && sessionMetrics.ttft > 2 && (
                  <div className="insight-item">
                    <span className="insight-icon">⚠️</span>
                    <span>High time to first token ({formatTime(sessionMetrics.ttft)}) - model may need optimization</span>
                  </div>
                )}
                {sessionMetrics.tokens_per_second < 5 && (
                  <div className="insight-item">
                    <span className="insight-icon">💭</span>
                    <span>Consider reducing model size or checking system resources for better performance</span>
                  </div>
                )}
                {sessionMetrics.tokens_per_second >= 15 && (
                  <div className="insight-item">
                    <span className="insight-icon">✨</span>
                    <span>Excellent performance! Your model is running efficiently</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenMetricsDisplay;