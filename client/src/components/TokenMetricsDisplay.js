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
    if (tokensPerSecond >= 20) return { label: 'Excellent', color: 'bg-edge-green text-edge-white', icon: '🚀' };
    if (tokensPerSecond >= 10) return { label: 'Good', color: 'bg-edge-blue text-edge-white', icon: '⚡' };
    if (tokensPerSecond >= 5) return { label: 'Fair', color: 'bg-edge-yellow text-edge-black', icon: '⏱️' };
    return { label: 'Slow', color: 'bg-edge-red text-edge-white', icon: '🐌' };
  };

  const sessionMetrics = metrics.session;
  const overallMetrics = metrics.overall;
  const performance = getPerformanceIndicator(sessionMetrics.tokens_per_second);

  return (
    <div className="w-full">
      <div className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl overflow-hidden bg-edge-grey-50 dark:bg-edge-grey-800 shadow-sm">
        <div className="border-l-4 border-edge-purple"></div>
        <div 
          className="p-4 cursor-pointer flex items-center justify-between bg-edge-grey-100 dark:bg-edge-grey-700 border-b border-edge-grey-200 dark:border-edge-grey-600 hover:bg-edge-grey-200 dark:hover:bg-edge-grey-600 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h4 className="font-semibold text-edge-black dark:text-edge-white text-sm uppercase tracking-wide flex items-center gap-3">
            <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            🔄 Token Generation Performance
            <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${performance.color}`}>
              {performance.icon} {performance.label}
            </span>
          </h4>
          <span className="text-xs text-edge-grey-500 font-mono">{timestamp}</span>
        </div>
        
        {isExpanded && (
          <div className="p-4 space-y-6">
            {/* Session Performance */}
            <div className="space-y-3">
              <h5 className="font-semibold text-edge-black dark:text-edge-white flex items-center gap-2">
                📊 Current Session
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Tokens Generated:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{sessionMetrics.tokens}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Total Time:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(sessionMetrics.total_time)}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Tokens/Second:</span>
                  <span className="text-edge-purple font-bold font-mono text-lg">{sessionMetrics.tokens_per_second}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Avg Time/Token:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(sessionMetrics.avg_time_per_token)}</span>
                </div>
                {sessionMetrics.ttft && (
                  <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                    <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Time to First Token:</span>
                    <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(sessionMetrics.ttft)}</span>
                  </div>
                )}
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Avg Inter-token Time:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(sessionMetrics.avg_inter_token_time)}</span>
                </div>
              </div>
            </div>

            {/* Overall Performance */}
            <div className="space-y-3">
              <h5 className="font-semibold text-edge-black dark:text-edge-white flex items-center gap-2">
                📈 Overall Statistics
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Total Tokens:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{overallMetrics.total_tokens.toLocaleString()}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Total Time:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(overallMetrics.total_time)}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Overall Tokens/Second:</span>
                  <span className="text-edge-purple font-bold font-mono text-lg">{overallMetrics.tokens_per_second}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Overall Avg Time/Token:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(overallMetrics.avg_time_per_token)}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 bg-opacity-20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex justify-between items-center hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-30 transition-colors">
                  <span className="text-edge-grey-600 dark:text-edge-grey-400 text-sm font-medium uppercase tracking-wide">Rolling Avg Session Time:</span>
                  <span className="text-edge-black dark:text-edge-white font-bold font-mono">{formatTime(overallMetrics.rolling_avg_session_time)}</span>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="space-y-3">
              <h5 className="font-semibold text-edge-black dark:text-edge-white flex items-center gap-2">
                💡 Performance Insights
              </h5>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900 bg-opacity-10 border border-purple-200 dark:border-purple-700 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-800 hover:bg-opacity-20 transition-colors">
                  <span className="text-lg">🎯</span>
                  <span className="text-edge-black dark:text-edge-white">
                    Current speed: <strong className="text-edge-purple">{sessionMetrics.tokens_per_second} tokens/sec</strong> - {performance.label} performance
                  </span>
                </div>
                {sessionMetrics.ttft && sessionMetrics.ttft > 2 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900 bg-opacity-10 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm hover:bg-yellow-100 dark:hover:bg-yellow-800 hover:bg-opacity-20 transition-colors">
                    <span className="text-lg">⚠️</span>
                    <span className="text-edge-black dark:text-edge-white">
                      High time to first token ({formatTime(sessionMetrics.ttft)}) - model may need optimization
                    </span>
                  </div>
                )}
                {sessionMetrics.tokens_per_second < 5 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900 bg-opacity-10 border border-blue-200 dark:border-blue-700 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-800 hover:bg-opacity-20 transition-colors">
                    <span className="text-lg">💭</span>
                    <span className="text-edge-black dark:text-edge-white">
                      Consider reducing model size or checking system resources for better performance
                    </span>
                  </div>
                )}
                {sessionMetrics.tokens_per_second >= 15 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900 bg-opacity-10 border border-green-200 dark:border-green-700 rounded-lg text-sm hover:bg-green-100 dark:hover:bg-green-800 hover:bg-opacity-20 transition-colors">
                    <span className="text-lg">✨</span>
                    <span className="text-edge-black dark:text-edge-white">
                      Excellent performance! Your model is running efficiently
                    </span>
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