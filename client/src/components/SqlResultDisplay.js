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
        <div className="p-4 text-center text-edge-grey-500">
          <p>No data returned</p>
        </div>
      );
    }

    const columns = Object.keys(data[0]);
    
    return (
      <div className="mt-4 border border-edge-grey-300 dark:border-edge-grey-600 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-sm bg-edge-white dark:bg-edge-grey-800">
          <thead>
            <tr className="bg-edge-grey-100 dark:bg-edge-grey-700">
              {columns.map((column, index) => (
                <th key={index} className="text-left p-3 font-bold text-edge-black dark:text-edge-white border-b-2 border-edge-grey-300 dark:border-edge-grey-600 text-xs uppercase tracking-wide">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-edge-grey-50 dark:hover:bg-edge-grey-700 even:bg-edge-grey-25 dark:even:bg-edge-grey-750 transition-colors">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-3 border-b border-edge-grey-200 dark:border-edge-grey-600 text-edge-black dark:text-edge-white">
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 bg-edge-grey-100 dark:bg-edge-grey-700 border-t border-edge-grey-200 dark:border-edge-grey-600 text-xs text-edge-grey-600 dark:text-edge-grey-400 font-mono">
          {data.length} row{data.length !== 1 ? 's' : ''} returned
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
    <div className="w-full space-y-4">
      {/* Query Section */}
      <div className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl overflow-hidden bg-edge-grey-50 dark:bg-edge-grey-800 shadow-sm">
        <div className="border-l-4 border-edge-cyan"></div>
        <div 
          className="p-4 cursor-pointer flex items-center justify-between bg-edge-grey-100 dark:bg-edge-grey-700 border-b border-edge-grey-200 dark:border-edge-grey-600 hover:bg-edge-grey-200 dark:hover:bg-edge-grey-600 transition-colors"
          onClick={() => setIsQueryExpanded(!isQueryExpanded)}
        >
          <h4 className="font-semibold text-edge-black dark:text-edge-white text-sm uppercase tracking-wide flex items-center gap-3">
            <span className={`transition-transform ${isQueryExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            Executed Query
          </h4>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(query);
            }}
            className="bg-edge-cyan hover:bg-edge-cyan-dark text-edge-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            title="Copy query"
          >
            📋
          </button>
        </div>
        {isQueryExpanded && (
          <div className="p-4">
            <pre className="font-mono text-sm leading-relaxed p-4 bg-edge-white dark:bg-edge-grey-700 text-edge-black dark:text-edge-white border border-edge-grey-200 dark:border-edge-grey-600 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {query}
            </pre>
          </div>
        )}
      </div>

      {/* Result Section */}
      <div className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl overflow-hidden bg-edge-grey-50 dark:bg-edge-grey-800 shadow-sm">
        <div className="border-l-4 border-edge-cyan"></div>
        <div 
          className="p-4 cursor-pointer flex items-center justify-between bg-edge-grey-100 dark:bg-edge-grey-700 border-b border-edge-grey-200 dark:border-edge-grey-600 hover:bg-edge-grey-200 dark:hover:bg-edge-grey-600 transition-colors"
          onClick={() => setIsResultExpanded(!isResultExpanded)}
        >
          <h4 className="font-semibold text-edge-black dark:text-edge-white text-sm uppercase tracking-wide flex items-center gap-3">
            <span className={`transition-transform ${isResultExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            Execution Result
            <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
              result.success 
                ? 'bg-edge-green bg-opacity-20 text-edge-green border border-edge-green' 
                : 'bg-edge-red bg-opacity-20 text-edge-red border border-edge-red'
            }`}>
              {result.success ? '✓' : '✗'}
            </span>
          </h4>
          <span className="text-xs text-edge-grey-500 font-mono">{timestamp}</span>
        </div>
        
        {isResultExpanded && (
          <div className="p-4">
            {result.success ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="bg-edge-green bg-opacity-20 text-edge-green px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-2 border border-edge-green">
                    ✅ Query executed successfully
                  </span>
                  {result.row_count !== undefined && (
                    <span className="bg-edge-blue bg-opacity-20 text-edge-blue px-3 py-1 rounded-lg text-sm font-semibold border border-edge-blue">
                      {result.row_count} rows
                    </span>
                  )}
                  {result.affected_rows !== undefined && (
                    <span className="bg-edge-purple bg-opacity-20 text-edge-purple px-3 py-1 rounded-lg text-sm font-semibold border border-edge-purple">
                      {result.affected_rows} rows affected
                    </span>
                  )}
                </div>
                
                {result.data && result.data.length > 0 && formatDataTable(result.data)}
                
                {result.data && result.data.length === 0 && (
                  <div className="p-6 text-center text-edge-grey-500 bg-edge-grey-100 dark:bg-edge-grey-700 rounded-lg">
                    <p>Query executed successfully but returned no data.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-edge-red bg-opacity-20 text-edge-red px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-2 border border-edge-red w-fit">
                  ❌ Query execution failed
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-edge-black dark:text-edge-white mb-2 flex items-center gap-2">
                      🚨 Error Message
                    </h5>
                    <div className="bg-edge-red bg-opacity-10 border border-edge-red text-edge-red p-4 rounded-lg font-mono text-sm">
                      {formatErrorMessage(result.error)}
                    </div>
                  </div>
                  
                  {(() => {
                    const errorCategory = getErrorCategory(result.error);
                    const suggestion = getErrorSuggestion(result.error, errorCategory);
                    
                    return (
                      <div className="bg-edge-blue bg-opacity-5 border border-edge-blue rounded-lg p-4">
                        <h5 className="font-semibold text-edge-black dark:text-edge-white mb-3 flex items-center gap-2">
                          {suggestion.icon} {suggestion.title}
                        </h5>
                        <p className="text-edge-grey-600 dark:text-edge-grey-400 mb-4">{suggestion.description}</p>
                        
                        <div className="mb-4">
                          <h6 className="font-medium text-edge-black dark:text-edge-white mb-2 flex items-center gap-2">
                            💡 Possible Solutions:
                          </h6>
                          <ul className="space-y-2">
                            {suggestion.solutions.map((solution, index) => (
                              <li key={index} className="text-sm text-edge-grey-600 dark:text-edge-grey-400 flex items-start gap-2">
                                <span className="text-edge-blue mt-1 text-xs">•</span>
                                {solution}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {suggestion.example && (
                          <div className="mb-4">
                            <h6 className="font-medium text-edge-black dark:text-edge-white mb-2 flex items-center gap-2">
                              📝 Example Fix:
                            </h6>
                            <code className="block bg-edge-grey-100 dark:bg-edge-grey-700 text-edge-black dark:text-edge-white p-3 rounded-lg text-sm font-mono">
                              {suggestion.example}
                            </code>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <div className="bg-edge-yellow bg-opacity-10 border border-edge-yellow rounded-lg p-4">
                    <h6 className="font-medium text-edge-black dark:text-edge-white mb-2 flex items-center gap-2">
                      🆘 Need More Help?
                    </h6>
                    <p className="text-sm text-edge-grey-600 dark:text-edge-grey-400">
                      Try rephrasing your question or ask for help with specific SQL concepts. The assistant can provide alternative query approaches.
                    </p>
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