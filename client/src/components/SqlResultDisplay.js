import React, { useState } from 'react';

const SqlResultDisplay = ({ query, result, timestamp }) => {
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [isResultExpanded, setIsResultExpanded] = useState(true);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const formatDataTable = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="no-data">
          <p>No data returned</p>
        </div>
      );
    }

    const columns = Object.keys(data[0]);
    
    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <td key={colIndex}>{row[column]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-info">
          <span className="row-count">{data.length} row{data.length !== 1 ? 's' : ''} returned</span>
        </div>
      </div>
    );
  };

  const getErrorCategory = (errorMessage) => {
    if (errorMessage.includes('GROUP BY')) return 'groupby';
    if (errorMessage.includes('syntax error')) return 'syntax';
    if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('column')) return 'schema';
    if (errorMessage.includes('permission') || errorMessage.includes('access')) return 'permission';
    if (errorMessage.includes('timeout')) return 'timeout';
    return 'general';
  };

  const getErrorSuggestion = (errorMessage, errorCategory) => {
    const suggestions = {
      groupby: {
        icon: '🔗',
        title: 'GROUP BY Clause Issue',
        description: 'When using aggregate functions (MAX, MIN, SUM, COUNT, AVG), all non-aggregated columns must be included in the GROUP BY clause.',
        solutions: [
          'Add all non-aggregated columns to GROUP BY clause',
          'Remove non-aggregated columns from SELECT if not needed',
          'Use window functions for advanced aggregation',
          'Consider using subqueries for complex grouping'
        ],
        example: 'Example: SELECT astronaut_name, MAX(data_size) FROM table GROUP BY astronaut_name;'
      },
      syntax: {
        icon: '⚠️',
        title: 'Syntax Error',
        description: 'There\'s an issue with the SQL syntax structure.',
        solutions: [
          'Check for missing commas between column names',
          'Verify proper use of SQL keywords',
          'Ensure parentheses are properly matched',
          'Check quotation marks around string values'
        ]
      },
      schema: {
        icon: '🗄️',
        title: 'Schema/Column Issue',
        description: 'The referenced table or column doesn\'t exist or isn\'t accessible.',
        solutions: [
          'Verify the table name is spelled correctly',
          'Check if the column exists in the specified table',
          'Ensure proper schema/database context',
          'Confirm table permissions and access'
        ]
      },
      permission: {
        icon: '🔒',
        title: 'Permission Denied',
        description: 'You don\'t have sufficient permissions to execute this query.',
        solutions: [
          'Contact your database administrator',
          'Check if you have read/write permissions',
          'Verify your user role and privileges'
        ]
      },
      timeout: {
        icon: '⏱️',
        title: 'Query Timeout',
        description: 'The query took too long to execute and was terminated.',
        solutions: [
          'Optimize the query with proper indexes',
          'Add WHERE clauses to limit result set',
          'Consider breaking complex queries into smaller parts',
          'Use LIMIT clause for large datasets'
        ]
      },
      general: {
        icon: '❓',
        title: 'Database Error',
        description: 'An unexpected database error occurred.',
        solutions: [
          'Check the error message for specific details',
          'Verify database connection is stable',
          'Try simplifying the query',
          'Contact support if the issue persists'
        ]
      }
    };

    return suggestions[errorCategory] || suggestions.general;
  };

  const formatErrorMessage = (errorMessage) => {
    // Clean up PostgreSQL error prefixes and make more readable
    let cleanMessage = errorMessage
      .replace(/^PostgreSQL error:\s*/i, '')
      .replace(/^ERROR:\s*/i, '')
      .trim();
    
    // Capitalize first letter
    cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
    
    return cleanMessage;
  };

  return (
    <div className="sql-result-display">
      {/* Query Section */}
      <div className="sql-result-section">
        <div 
          className="section-header"
          onClick={() => setIsQueryExpanded(!isQueryExpanded)}
        >
          <h4>
            <span className="section-icon">
              {isQueryExpanded ? '▼' : '►'}
            </span>
            Executed Query
          </h4>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(query);
            }}
            className="copy-btn"
            title="Copy query"
          >
            📋
          </button>
        </div>
        {isQueryExpanded && (
          <div className="section-content">
            <pre className="sql-query-code">{query}</pre>
          </div>
        )}
      </div>

      {/* Result Section */}
      <div className="sql-result-section">
        <div 
          className="section-header"
          onClick={() => setIsResultExpanded(!isResultExpanded)}
        >
          <h4>
            <span className="section-icon">
              {isResultExpanded ? '▼' : '►'}
            </span>
            Execution Result
            <span className={`result-status ${result.success ? 'success' : 'error'}`}>
              {result.success ? '✓' : '✗'}
            </span>
          </h4>
          <span className="execution-time">{timestamp}</span>
        </div>
        
        {isResultExpanded && (
          <div className="section-content">
            {result.success ? (
              <div className="success-result">
                <div className="result-summary">
                  <span className="success-indicator">✅ Query executed successfully</span>
                  {result.row_count !== undefined && (
                    <span className="row-count-badge">{result.row_count} rows</span>
                  )}
                  {result.affected_rows !== undefined && (
                    <span className="affected-rows-badge">{result.affected_rows} rows affected</span>
                  )}
                </div>
                
                {result.data && result.data.length > 0 && formatDataTable(result.data)}
                
                {result.data && result.data.length === 0 && (
                  <div className="empty-result">
                    <p>Query executed successfully but returned no data.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="error-result">
                <div className="error-summary">
                  <span className="error-indicator">❌ Query execution failed</span>
                </div>
                
                <div className="error-details">
                  <div className="error-message-section">
                    <h5>🚨 Error Message</h5>
                    <div className="error-message">
                      {formatErrorMessage(result.error)}
                    </div>
                  </div>
                  
                  {(() => {
                    const errorCategory = getErrorCategory(result.error);
                    const suggestion = getErrorSuggestion(result.error, errorCategory);
                    
                    return (
                      <div className="error-suggestion">
                        <h5>{suggestion.icon} {suggestion.title}</h5>
                        <p className="suggestion-description">{suggestion.description}</p>
                        
                        <div className="solutions-section">
                          <h6>💡 Possible Solutions:</h6>
                          <ul className="solutions-list">
                            {suggestion.solutions.map((solution, index) => (
                              <li key={index}>{solution}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {suggestion.example && (
                          <div className="example-section">
                            <h6>📝 Example Fix:</h6>
                            <code className="example-code">{suggestion.example}</code>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <div className="help-section">
                    <h6>🆘 Need More Help?</h6>
                    <p>Try rephrasing your question or ask for help with specific SQL concepts. The assistant can provide alternative query approaches.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SqlResultDisplay;