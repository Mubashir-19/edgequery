import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import FormattedResponse from './components/FormattedResponse';
import SqlResultDisplay from './components/SqlResultDisplay';
import TokenMetricsDisplay from './components/TokenMetricsDisplay';
import { domainConfigurations } from './domainConfigurations';

function App() {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [serverStatus, setServerStatus] = useState('Disconnected');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Domain setup state
  const [domainName, setDomainName] = useState('');
  const [domainDescription, setDomainDescription] = useState('');
  const [domainSchema, setDomainSchema] = useState('');
  const [domainSetupComplete, setDomainSetupComplete] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [selectedDomainConfig, setSelectedDomainConfig] = useState(null);
  const [currentDomainSuggestions, setCurrentDomainSuggestions] = useState([]);
  
  const websocketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Generate a random user ID if none exists
  useEffect(() => {
    if (!userId) {
      setUserId(`user_${Math.random().toString(36).substring(2, 10)}`);
    }
  }, [userId]);

  // Check for saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Check for saved domain information on load
  useEffect(() => {
    const savedDomainName = localStorage.getItem('domainName');
    const savedDomainDescription = localStorage.getItem('domainDescription');
    const savedDomainSchema = localStorage.getItem('domainSchema');
    const savedDomainSuggestions = localStorage.getItem('domainSuggestions');
    
    if (savedDomainName && savedDomainDescription) {
      setDomainName(savedDomainName);
      setDomainDescription(savedDomainDescription);
      setDomainSchema(savedDomainSchema || '');
      setDomainSetupComplete(true);
      
      if (savedDomainSuggestions) {
        setCurrentDomainSuggestions(JSON.parse(savedDomainSuggestions));
      }
    } else {
      setShowDomainSetup(true);
    }
    
    // Check for saved messages (only non-system messages)
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      // Filter out system messages when loading
      const filteredMessages = parsedMessages.filter(msg => msg.sender !== 'system');
      setResponses(filteredMessages);
    }
  }, []);

  // Scroll to bottom automatically
  useEffect(() => {
    scrollToBottom();
    
    // Save messages to local storage when updated (exclude system messages)
    if (responses.length > 0) {
      const messagesToSave = responses.filter(msg => msg.sender !== 'system');
      localStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
    }
  }, [responses]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Handle domain setup submission
  const handleDomainSetup = (e) => {
    e.preventDefault();
    
    if (!domainName.trim() || !domainDescription.trim() || !domainSchema.trim()) {
      alert('Please provide domain name, description, and database schema - all fields are required');
      return;
    }
    
    // Save domain information to local storage
    localStorage.setItem('domainName', domainName);
    localStorage.setItem('domainDescription', domainDescription);
    localStorage.setItem('domainSchema', domainSchema);
    
    // Set suggestions based on selected domain config
    if (selectedDomainConfig && selectedDomainConfig.sampleQueries) {
      setCurrentDomainSuggestions(selectedDomainConfig.sampleQueries);
      localStorage.setItem('domainSuggestions', JSON.stringify(selectedDomainConfig.sampleQueries));
    }
    
    setDomainSetupComplete(true);
    setShowDomainSetup(false);
    
    alert(`Domain setup complete: ${domainName}`);
  };

  // Connect to WebSocket server
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000');
      
      ws.onopen = () => {
        setIsConnected(true);
        setServerStatus('Connected');
        alert('Connected to server');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'status':
            setServerStatus(data.content);
            break;
            
          case 'warning':
            setServerStatus(data.content);
            break;
            
          case 'chunk':
            // Handle streaming chunks
            updateStreamingResponse(data.content);
            break;
            
          case 'complete':
            // Mark streaming as complete
            setIsStreaming(false);
            setResponses(prev => {
              const newResponses = [...prev];
              if (newResponses.length > 0 && 
                  newResponses[newResponses.length - 1].sender === 'assistant' && 
                  newResponses[newResponses.length - 1].isStreaming) {
                
                // Remove any duplicate words in the final message
                const finalContent = removeDuplicatedWords(newResponses[newResponses.length - 1].content);
                newResponses[newResponses.length - 1].content = finalContent;
                newResponses[newResponses.length - 1].isStreaming = false;
              }
              return newResponses;
            });
            break;
            
          case 'sql_result':
            // Handle SQL execution results
            setResponses(prev => [...prev, {
              sender: 'system',
              type: 'sql_result',
              query: data.query,
              result: data.result,
              timestamp: new Date().toLocaleTimeString()
            }]);
            break;
            
          case 'generation_metrics':
            // Handle token generation performance metrics
            setResponses(prev => [...prev, {
              sender: 'system',
              type: 'generation_metrics',
              metrics: data.metrics,
              timestamp: new Date().toLocaleTimeString()
            }]);
            break;
            
          case 'error':
            setServerStatus(`Error: ${data.content}`);
            alert(`Error: ${data.content}`);
            break;
            
          default:
            // Handle legacy format or unknown messages
            setResponses(prev => [...prev, { 
              sender: 'assistant', 
              content: typeof data === 'string' ? data : data.content || JSON.stringify(data), 
              timestamp: new Date().toLocaleTimeString() 
            }]);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setServerStatus('Disconnected');
        alert('Disconnected from server');
      };
      
      ws.onerror = (error) => {
        setServerStatus(`WebSocket Error: ${error.message}`);
        alert(`Connection error: ${error.message}`);
      };
      
      websocketRef.current = ws;
    } catch (error) {
      setServerStatus(`Failed to connect: ${error.message}`);
    }
  };

  // Helper function to update streaming responses
  const updateStreamingResponse = (content) => {
    setResponses(prev => {
      const newResponses = [...prev];
      if (newResponses.length > 0 && 
          newResponses[newResponses.length - 1].sender === 'assistant' && 
          newResponses[newResponses.length - 1].isStreaming) {
        
        // Check if the content is already at the end of the message to prevent duplication
        const currentContent = newResponses[newResponses.length - 1].content;
        const appendContent = content;
        
        // Only append if it doesn't create a duplicate
        if (!isDuplicatingContent(currentContent, appendContent)) {
          newResponses[newResponses.length - 1].content += appendContent;
        }
      } else {
        newResponses.push({
          sender: 'assistant',
          content: content,
          timestamp: new Date().toLocaleTimeString(),
          isStreaming: true
        });
      }
      return newResponses;
    });
  };
  
  // Helper function to detect if appending content would create duplication
  const isDuplicatingContent = (currentText, newText) => {
    if (!newText || newText.length === 0) return true;
    
    // Check if the new text would create a duplicate pattern at the end
    const combinedText = currentText + newText;
    const patternLength = newText.length;
    
    // If the content is too short to check for patterns, just return false
    if (combinedText.length < patternLength * 2) return false;
    
    // Check if the new pattern would create a duplicate
    const endOfCurrent = combinedText.substring(combinedText.length - patternLength * 2, combinedText.length - patternLength);
    const newPart = combinedText.substring(combinedText.length - patternLength);
    
    return endOfCurrent === newPart;
  };
  
  // Helper function to clean up duplicated words in a string
  const removeDuplicatedWords = (text) => {
    if (!text) return '';
    
    // Split into words, keeping punctuation
    const regex = /(\w+|\s+|[^\w\s]+)/g;
    const tokens = text.match(regex) || [];
    
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      // Skip if this token is a duplicate of the previous non-space token
      if (i > 0 && 
          tokens[i] === tokens[i-1] || 
          (i > 1 && tokens[i-1].trim() === '' && tokens[i] === tokens[i-2])) {
        continue;
      }
      result.push(tokens[i]);
    }
    
    return result.join('');
  };

  // Disconnect from WebSocket server
  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  };

  // Create formatted message array for server
  const createMessagePayload = () => {
    // Create the system message with domain information
    let systemContent = `You are a Text-to-SQL query generator. Use the given context and user query to reason step-by-step, then produce the final SQL query.\n\nContext:\nDomain: ${domainName}\nDomain Description: ${domainDescription}`;
    
    if (domainSchema && domainSchema.trim()) {
      systemContent += `\nDatabase Schema: ${domainSchema}`;
    }
    
    const systemMessage = {
      role: "system",
      content: systemContent
    };
    
    // Get the most recent user/assistant exchanges (up to 5)
    const recentMessages = [];
    const userAssistantMessages = responses.filter(r => 
      r.sender === 'user' || r.sender === 'assistant'
    );
    
    // Get the 5 most recent messages
    const latestMessages = userAssistantMessages.slice(-10);
    
    // Convert to the required format
    latestMessages.forEach(msg => {
      recentMessages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
    
    // Combine system message with recent exchanges
    return [systemMessage, ...recentMessages];
  };

  // Send message to the server
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !isConnected || !domainSetupComplete) return;
    
    // Add user message to responses
    setResponses(prev => [...prev, { 
      sender: 'user', 
      content: message, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
    
    // Create the messages array with system prompt and chat history
    const messages = createMessagePayload();
    
    // Add current message
    messages.push({
      role: "user",
      content: message
    });
    
    // Send formatted messages array to server with user ID
    const payload = JSON.stringify({
      user_id: userId,
      message: message,
      messages: messages
    });
    
    websocketRef.current.send(payload);
    
    // Start streaming state
    setIsStreaming(true);
    
    // Clear message input
    setMessage('');
  };
  
  // Show domain setup form
  const showDomainForm = () => {
    setShowDomainSetup(true);
  };

  // Determine if a message contains SQL structured content
  const hasStructuredContent = (content) => {
    return content && (
      content.includes('<reasoning_start>') || 
      content.includes('<final_sql_query_start>')
    );
  };
  
  // Helper function to clean the content for display
  const cleanResponseContent = (content) => {
    // If the content has our structured format, extract only the relevant parts for raw display
    if (hasStructuredContent(content)) {
      let cleanedContent = content;
      
      // Remove the tags but keep the content
      cleanedContent = cleanedContent.replace(/<reasoning_start>/g, '')
                                     .replace(/<reasoning_end>/g, '')
                                     .replace(/<final_sql_query_start>/g, '')
                                     .replace(/<final_sql_query_end>/g, '');
                                     
      // Also remove "Explanation:" prefix if present
      cleanedContent = cleanedContent.replace(/Explanation:/g, '');
      
      return cleanedContent;
    }
    
    return content;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-main">
          <h1>EdgeQuery</h1>
          <p className="subtitle">Natural Language to SQL Generator and Executor Interface</p>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <div className="connection-status">
          <span 
            className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
          ></span>
          <span className="status-text">{serverStatus}</span>
        </div>

        <div className='header-body'>
          <div className="connection-controls">
            {!isConnected ? (
              <button className="connect-btn btn" onClick={connectWebSocket}>
                ⚡ Connect
              </button>
            ) : (
              <button className="disconnect-btn btn" onClick={disconnectWebSocket}>
                ⏻ Disconnect
              </button>
            )}
          </div>
          <button 
            className='clear-chat btn' 
            onClick={() => {
              localStorage.setItem("chatMessages", '[]');
              window.location.reload();
            }}
          >
            🗑️ Clear Chat
          </button>
        </div>
      </header>
      
      {/* Domain Setup Modal */}
      {showDomainSetup && (
        <div className="domain-setup-modal">
          <div className="domain-setup-content">
            <h2>🧠 Domain Configuration</h2>
            <p>Choose from our pre-configured domains or set up a custom domain for intelligent SQL query generation.</p>
            
            <div className="domain-tabs">
              <button 
                className={`tab-btn ${!selectedDomainConfig || selectedDomainConfig !== 'custom' ? 'active' : ''}`}
                onClick={() => setSelectedDomainConfig(null)}
              >
                <span>🏛️</span> Predefined Domains
              </button>
              <button 
                className={`tab-btn ${selectedDomainConfig === 'custom' ? 'active' : ''}`}
                onClick={() => setSelectedDomainConfig('custom')}
              >
                <span>⚙️</span> Custom Domain
              </button>
            </div>

            {selectedDomainConfig !== 'custom' ? (
              <div className="predefined-domains">
                <div className="domains-grid">
                  {domainConfigurations.map((config) => (
                    <div 
                      key={config.id}
                      className="domain-card"
                      onClick={() => {
                        setDomainName(config.name);
                        setDomainDescription(config.description);
                        setDomainSchema(JSON.stringify(config.schema, null, 2));
                        setSelectedDomainConfig(config);
                      }}
                      style={{ '--domain-color': config.color }}
                    >
                      <div className="domain-icon" style={{ color: config.color }}>
                        {config.icon}
                      </div>
                      <h3>{config.name}</h3>
                      <p>{config.description}</p>
                      
                      <div className="domain-schema">
                        <h4><span>🗄️</span> Database Schema</h4>
                        <div className="schema-tables">
                          {Object.entries(config.schema?.database_schema || {}).map(([tableName, table]) => (
                            <div key={tableName} className="schema-table-tag">
                              <span>📊</span>
                              {tableName} ({table.columns?.length || 0})
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="domain-stats">
                        <span className="table-count">
                          {Object.keys(config.schema?.database_schema || {}).length} Tables
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedDomainConfig && selectedDomainConfig !== 'custom' && (
                  <div className="selected-domain-preview">
                    <div className="preview-header">
                      <span className="preview-icon">{selectedDomainConfig.icon}</span>
                      <h3>{selectedDomainConfig.name}</h3>
                    </div>
                    <p>{selectedDomainConfig.description}</p>
                    
                    <div className="schema-preview">
                      <h4>📊 Database Schema:</h4>
                      <div className="tables-list">
                        {Object.entries(selectedDomainConfig.schema?.database_schema || {}).map(([tableName, table]) => (
                          <div key={tableName} className="table-item">
                            <strong>{tableName}</strong>
                            <span className="column-count">({table.columns?.length || 0} columns)</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="detailed-schema">
                        {Object.entries(selectedDomainConfig.schema?.database_schema || {}).map(([tableName, table]) => (
                          <div key={tableName} className="table-details">
                            <h5 className="table-name">
                              🗃️ {tableName}
                            </h5>
                            <div className="columns-grid">
                              {table.columns?.map((column, index) => (
                                <div key={index} className="column-info">
                                  <span className="column-name">{column.name}</span>
                                  <span className="column-type">{column.type}</span>
                                  {column.constraints && (
                                    <span className="column-constraint">{column.constraints}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      className="use-domain-btn"
                      onClick={handleDomainSetup}
                    >
                      🚀 Use This Domain
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleDomainSetup}>
                <div className="form-group">
                  <label htmlFor="domainName">
                    <span>🏷️</span> Domain Name
                  </label>
                  <input
                    type="text"
                    id="domainName"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    placeholder="e.g., E-commerce, Healthcare, Finance"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="domainDescription">
                    <span>📝</span> Domain Description
                  </label>
                  <textarea
                    id="domainDescription"
                    value={domainDescription}
                    onChange={(e) => setDomainDescription(e.target.value)}
                    placeholder="Provide a comprehensive description of your domain, including business context and key data relationships..."
                    rows={4}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="domainSchema">
                    <span>🗄️</span> Database Schema <span className="required">*</span>
                  </label>
                  <textarea
                    id="domainSchema"
                    value={domainSchema}
                    onChange={(e) => setDomainSchema(e.target.value)}
                    placeholder="Provide your database schema in JSON format or describe your table structures..."
                    rows={8}
                    required
                  />
                  <small className="form-help">
                    <strong>Required:</strong> Provide table structures, column names, data types, and relationships to improve query accuracy.
                  </small>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="save-domain-btn">
                    <span>🚀</span> Initialize Custom Domain
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      
      <div className="chat-container">
        <div className="messages-container">
          {responses.map((response, index) => (
            <div 
              key={index} 
              className={`message ${response.sender}-message`}
            >
              <div className="message-header">
                <span className="sender">
                  {response.sender === 'user' ? '👤 You' : 
                   response.sender === 'assistant' ? '🤖 Neural AI' : 
                   '⚙️ System'}
                  {response.sender === 'assistant' && response.isStreaming && (
                    <span className="typing-indicator-small"></span>
                  )}
                </span>
                <span className="timestamp">{response.timestamp}</span>
              </div>
              <div className="message-content">
                {/* Handle SQL result messages */}
                {response.type === 'sql_result' ? (
                  <SqlResultDisplay 
                    query={response.query}
                    result={response.result}
                    timestamp={response.timestamp}
                  />
                ) : response.type === 'generation_metrics' ? (
                  <TokenMetricsDisplay 
                    metrics={response.metrics}
                    timestamp={response.timestamp}
                  />
                ) : response.sender === 'assistant' && hasStructuredContent(response.content) ? (
                  <FormattedResponse 
                    content={response.content} 
                    isStreaming={response.isStreaming} 
                  />
                ) : (
                  <>
                    {response.sender === 'assistant' && hasStructuredContent(response.content) 
                      ? cleanResponseContent(response.content) 
                      : response.content}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="message-form" onSubmit={sendMessage}>
          <textarea
            className="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder={domainSetupComplete ? 
              "Ask me anything about SQL... (Shift+Enter for new line)" : 
              "Complete domain setup to start chatting..."}
            disabled={!isConnected || isStreaming || !domainSetupComplete}
            rows="1"
          />
          <button 
            type="submit" 
            disabled={!isConnected || !message.trim() || isStreaming || !domainSetupComplete}
            className="send-btn btn"
          >
            {isStreaming ? '⏳ Processing' : '🚀 Send'}
          </button>
        </form>
        
        {/* Query Suggestions */}
        {domainSetupComplete && currentDomainSuggestions.length > 0 && (
          <div className="suggestions-container">
            <div className="suggestions-header">
              <span className="suggestions-icon">💡</span>
              <h4>Try these sample queries:</h4>
            </div>
            <div className="suggestions-grid">
              {currentDomainSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-chip"
                  onClick={() => setMessage(suggestion)}
                  disabled={!isConnected || isStreaming}
                >
                  <span className="suggestion-text">{suggestion}</span>
                  <span className="suggestion-action">📝</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="user-info">
        <div className="user-id">
          <span>🔑 Session ID:</span>
          <strong>{userId}</strong>
        </div>
        {domainSetupComplete && (
          <div className="domain-info">
            <span>🎯 Active Domain:</span>
            <strong>{domainName}</strong>
            <button className="edit-domain-btn" onClick={showDomainForm}>
              ✏️ Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;