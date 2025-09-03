import React, { useState, useRef, useEffect, useCallback } from 'react';
import FormattedResponse from './components/FormattedResponse';
import SqlResultDisplay from './components/SqlResultDisplay';
import TokenMetricsDisplay from './components/TokenMetricsDisplay';
import { domainConfigurations } from './domainConfigurations';

// Responsive sidebar (domain only, closable on all viewports when toggle used)
const Sidebar = ({ isOpen, onClose, domainSetupComplete, domainName, showDomainForm }) => {
  return (
  <div className={`fixed top-0 left-0 h-screen w-72 sm:w-80 bg-edge-white dark:bg-edge-grey-900 border-r border-edge-grey-300 dark:border-edge-grey-700 shadow-xl transform transition-transform duration-300 z-40 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0 md:flex-shrink-0`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge-grey-200 dark:border-edge-grey-700">
        <h2 className="text-lg font-semibold text-edge-black dark:text-edge-white">Control Panel</h2>
  {/* Close button hidden on medium and larger screens */}
  <button onClick={onClose} className="w-8 h-8 rounded-lg bg-edge-grey-200 dark:bg-edge-grey-700 hover:bg-edge-grey-300 dark:hover:bg-edge-grey-600 text-edge-black dark:text-edge-white md:hidden">✖</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-edge-grey-500 mb-2">Domain</h3>
          {domainSetupComplete ? (
            <div className="space-y-3">
              <div className="bg-edge-grey-50 dark:bg-edge-grey-800 border border-edge-grey-200 dark:border-edge-grey-600 rounded-lg p-3">
                <div className="text-sm font-medium text-edge-black dark:text-edge-white mb-1">{domainName}</div>
                <button onClick={showDomainForm} className="text-xs bg-edge-cyan hover:bg-edge-cyan-dark text-edge-white px-2 py-1 rounded-lg font-semibold transition-colors">Edit</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-edge-grey-600 dark:text-edge-grey-400">Complete domain setup to enable tailored SQL generation.</p>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-edge-grey-200 dark:border-edge-grey-700 text-[10px] text-edge-grey-500 leading-tight">
        <div className="mb-1">🔒 Fully Local Processing</div>
        <div>LLaMA 3.2 3B • 8-bit Quantized • Custom Text-to-SQL Fine-tuned</div>
      </div>
    </div>
  );
};

function App() {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [serverStatus, setServerStatus] = useState('Disconnected');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); // Default open on desktop
  const [tokenMetrics, setTokenMetrics] = useState(null); // stored metrics
  const [showTokenMetricsModal, setShowTokenMetricsModal] = useState(false);
  
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
  const suggestionsRef = useRef(null);

  // Drag scroll functionality for suggestions
  const handleMouseDown = (e) => {
    const container = suggestionsRef.current;
    if (!container) return;
    
    let isDown = true;
    let startX = e.pageX - container.offsetLeft;
    let scrollLeft = container.scrollLeft;
    
    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
    };
    
    const handleMouseUp = () => {
      isDown = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      container.style.cursor = 'default';
    };
    
    container.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Helper functions (defined early to avoid hoisting issues)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode]);

  // Helper function to detect if appending content would create duplication
  const isDuplicatingContent = useCallback((currentText, newText) => {
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
  }, []);

  // Helper function to update streaming responses
  const updateStreamingResponse = useCallback((content) => {
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
  }, [isDuplicatingContent]);

  // Helper function to clean up duplicated words in a string
  const removeDuplicatedWords = useCallback((text) => {
    if (!text) return '';
    
    // Split into words, keeping punctuation
    const regex = /(\w+|\s+|[^\w\s]+)/g;
    const tokens = text.match(regex) || [];
    
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      // Skip if this token is a duplicate of the previous non-space token
      if (i > 0 && 
          (tokens[i] === tokens[i-1] || 
          (i > 1 && tokens[i-1].trim() === '' && tokens[i] === tokens[i-2]))) {
        continue;
      }
      result.push(tokens[i]);
    }
    
    return result.join('');
  }, []);

  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    // Prevent multiple connections
    if (isConnected || websocketRef.current) return;
    
    try {
      const ws = new WebSocket('ws://localhost:8000');
      
      ws.onopen = () => {
        setIsConnected(true);
        setServerStatus('Connected');
        // Only show alert if not auto-connecting
        if (!domainSetupComplete || responses.length === 0) {
          alert('Connected to server');
        }
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'status':
            setServerStatus(data.content);
            break;
          case 'hold':
            // Suppress hold messages (no UI output)
            break;
          case 'release_hold':
            // Suppress release_hold messages
            break;
            
          case 'warning':
            setServerStatus(data.content);
            // Show SQL warning in chat if it's about DB connection and SQL detection
            if (data.content && data.content.toLowerCase().includes('sql query detected')) {
              setResponses(prev => [...prev, {
                sender: 'system',
                type: 'sql_warning',
                content: data.content,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
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
            // Store token generation performance metrics locally (not in chat)
            setTokenMetrics(data.metrics);
            try {
              localStorage.setItem('latestTokenMetrics', JSON.stringify(data.metrics));
            } catch (e) { /* ignore */ }
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
  }, [isConnected, domainSetupComplete, responses.length, updateStreamingResponse, removeDuplicatedWords]);

  // Disconnect from WebSocket server
  const disconnectWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  // Generate a random user ID if none exists
  useEffect(() => {
    if (!userId) {
      setUserId(`user_${Math.random().toString(36).substring(2, 10)}`);
    }
  }, [userId]);

  // Adopt system theme dynamically (no persistence)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setIsDarkMode(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  // Apply theme class (no localStorage persistence)
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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

    // Load persisted token metrics
    try {
      const savedMetrics = localStorage.getItem('latestTokenMetrics');
      if (savedMetrics) {
        setTokenMetrics(JSON.parse(savedMetrics));
      }
    } catch (err) { /* ignore */ }
    
    // Handle responsive sidebar
    const handleResize = () => {
      // Only auto-manage sidebar on mobile/tablet, let user control it on desktop
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      // Don't force open on desktop anymore - let user control it
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-connect when domain setup is complete and not already connected
  useEffect(() => {
    if (domainSetupComplete && !isConnected && responses.length === 0) {
      // Add a small delay to ensure state is settled
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [domainSetupComplete, isConnected, responses.length, connectWebSocket]);

  // Scroll to bottom automatically
  useEffect(() => {
    scrollToBottom();
    
    // Save messages to local storage when updated (exclude system messages)
    if (responses.length > 0) {
      const messagesToSave = responses.filter(msg => msg.sender !== 'system');
      localStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
    }
  }, [responses, scrollToBottom]);

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

  // System + current user only (exclude prior history)
  const createMessagePayload = () => {
    let systemContent = `You are a Text-to-SQL query generator. Use ONLY the provided context and THIS single user prompt to reason step-by-step (concise) and produce a correct final SQL query.\n\nContext:\nDomain: ${domainName}\nDomain Description: ${domainDescription}`;
    if (domainSchema && domainSchema.trim()) {
      systemContent += `\nDatabase Schema: ${domainSchema}`;
    }
    return [{ role: 'system', content: systemContent }];
  };

  // Send message to the server
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !isConnected || !domainSetupComplete) return;
    
    // Clear previous chat and add only current user message
    setResponses([{ 
      sender: 'user', 
      content: message, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
    
    // Clear localStorage chat as well
    localStorage.setItem('chatMessages', JSON.stringify([{ 
      sender: 'user', 
      content: message, 
      timestamp: new Date().toLocaleTimeString() 
    }]));
    
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
    <>
    <div className="h-screen w-full bg-slate-50 dark:bg-edge-darker transition-colors flex overflow-hidden">
      {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} className="fixed inset-0 bg-edge-black/50 backdrop-blur-sm z-30 md:hidden" />}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        domainSetupComplete={domainSetupComplete}
        domainName={domainName}
        showDomainForm={showDomainForm}
      />
      <div className="flex flex-col flex-1 min-w-0">
      <header className="bg-edge-white dark:bg-edge-grey-900 p-4 md:p-5 shadow-edge border-b border-edge-grey-300 dark:border-edge-grey-800 flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="w-11 h-11 bg-edge-grey-200 dark:bg-edge-grey-700 hover:bg-edge-grey-300 dark:hover:bg-edge-grey-600 rounded-lg flex items-center justify-center transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '←' : '☰'}
        </button>
        <div className="border-t-4 border-edge-blue absolute top-0 left-0 right-0 rounded-t-xl"></div>
        
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-edge-black dark:text-edge-white tracking-tight">
              EdgeQuery
            </h1>
            <p className="text-sm md:text-base text-edge-grey-600 dark:text-edge-grey-400 mt-0.5">
              Natural Language to SQL Generator and Executor Interface
            </p>
          </div>
          <button 
            className="w-11 h-11 bg-edge-grey-200 dark:bg-edge-grey-700 border border-edge-grey-300 dark:border-edge-grey-600 rounded-lg flex items-center justify-center text-lg hover:bg-edge-grey-300 dark:hover:bg-edge-grey-600 transition-colors"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <div className="flex items-center gap-3 px-4 py-2 bg-edge-grey-50 dark:bg-edge-grey-900 border-b border-edge-grey-200 dark:border-edge-grey-800 text-xs">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-edge-green animate-pulse' : 'bg-edge-red'}`}></div>
          <span className="text-sm text-edge-grey-600 dark:text-edge-grey-400 font-medium">{serverStatus}</span>
          <div className="ml-auto flex gap-2 items-center">
            {!isConnected ? (
              <button 
                className="bg-edge-green hover:bg-edge-green-dark text-edge-white px-4 py-1.5 rounded-lg font-semibold text-xs uppercase tracking-wide transition-colors flex items-center gap-1"
                onClick={connectWebSocket}
              >⚡ Connect</button>
            ) : (
              <button 
                className="bg-edge-red hover:bg-edge-red-dark text-edge-white px-4 py-1.5 rounded-lg font-semibold text-xs uppercase tracking-wide transition-colors flex items-center gap-1"
                onClick={disconnectWebSocket}
              >⏻<span style={{"marginLeft": "1px"}}></span>Disconnect</button>
            )}
            {tokenMetrics && (
              <button
                onClick={() => setShowTokenMetricsModal(true)}
                className="bg-edge-purple hover:bg-edge-purple-dark text-edge-white px-3 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-wide transition-colors"
                title="Token Generation Performance"
              >TGP</button>
            )}
            <button 
              className="bg-edge-yellow hover:bg-edge-yellow-dark text-edge-white px-4 py-1.5 rounded-lg font-semibold text-xs uppercase tracking-wide transition-colors flex items-center gap-1"
              onClick={() => {
                localStorage.setItem('chatMessages', '[]');
                setResponses([]); // do not reload, preserve theme + connection
              }}
            >🗑️ Clear</button>
          </div>
        </div>
      
      {/* Domain Setup Modal */}
      {showDomainSetup && (
        <div className="fixed inset-0 bg-edge-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-edge-white dark:bg-edge-grey-900 rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-edge-lg border border-edge-grey-300 dark:border-edge-grey-700 relative">
            <div className="border-t-4 border-edge-blue absolute top-0 left-0 right-0 rounded-t-xl"></div>
            
            <h2 className="text-2xl font-bold text-edge-black dark:text-edge-white mb-4 text-center">
              🧠 Domain Configuration
            </h2>
            <p className="text-edge-grey-600 dark:text-edge-grey-400 mb-8 text-center">
              Choose from our pre-configured domains or set up a custom domain for intelligent SQL query generation.
            </p>
            
            <div className="flex border-b border-edge-grey-200 dark:border-edge-grey-600 mb-6">
              <button 
                className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${
                  !selectedDomainConfig || selectedDomainConfig !== 'custom' 
                    ? 'bg-edge-blue text-edge-white border-b-2 border-edge-blue' 
                    : 'text-edge-grey-600 dark:text-edge-grey-400 hover:text-edge-grey-800 dark:hover:text-edge-grey-200'
                }`}
                onClick={() => setSelectedDomainConfig(null)}
              >
                <span>🏛️</span> Predefined Domains
              </button>
              <button 
                className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ml-2 ${
                  selectedDomainConfig === 'custom' 
                    ? 'bg-edge-blue text-edge-white border-b-2 border-edge-blue' 
                    : 'text-edge-grey-600 dark:text-edge-grey-400 hover:text-edge-grey-800 dark:hover:text-edge-grey-200'
                }`}
                onClick={() => setSelectedDomainConfig('custom')}
              >
                <span>⚙️</span> Custom Domain
              </button>
            </div>

            {selectedDomainConfig !== 'custom' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domainConfigurations.map((config) => (
                    <div 
                      key={config.id}
                      className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl p-4 cursor-pointer hover:border-edge-blue hover:shadow-edge transition-all bg-edge-grey-50 dark:bg-edge-grey-800"
                      onClick={() => {
                        setDomainName(config.name);
                        setDomainDescription(config.description);
                        setDomainSchema(JSON.stringify(config.schema, null, 2));
                        setSelectedDomainConfig(config);
                      }}
                    >
                      <div className="text-2xl mb-2">{config.icon}</div>
                      <h3 className="font-semibold text-edge-black dark:text-edge-white mb-2">{config.name}</h3>
                      <p className="text-sm text-edge-grey-600 dark:text-edge-grey-400 mb-3">{config.description}</p>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-edge-grey-700 dark:text-edge-grey-300 mb-2 flex items-center gap-1">
                          <span>🗄️</span> Database Schema
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(config.schema?.database_schema || {}).map(([tableName, table]) => (
                            <div key={tableName} className="bg-edge-grey-200 dark:bg-edge-grey-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                              <span>📊</span>
                              {tableName} ({table.columns?.length || 0})
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-edge-grey-500 dark:text-edge-grey-500">
                        {Object.keys(config.schema?.database_schema || {}).length} Tables
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedDomainConfig && selectedDomainConfig !== 'custom' && (
                  <div className="border border-edge-blue rounded-xl p-6 bg-edge-blue bg-opacity-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{selectedDomainConfig.icon}</span>
                      <h3 className="font-semibold text-edge-black dark:text-edge-white">{selectedDomainConfig.name}</h3>
                    </div>
                    <p className="text-edge-grey-600 dark:text-edge-grey-400 mb-4">{selectedDomainConfig.description}</p>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold text-edge-black dark:text-edge-white mb-3">📊 Database Schema:</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedDomainConfig.schema?.database_schema || {}).map(([tableName, table]) => (
                          <div key={tableName} className="bg-edge-grey-100 dark:bg-edge-grey-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <strong className="text-edge-black dark:text-edge-white flex items-center gap-2">
                                🗃️ {tableName}
                              </strong>
                              <span className="text-xs text-edge-grey-500">({table.columns?.length || 0} columns)</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {table.columns?.map((column, index) => (
                                <div key={index} className="bg-edge-white dark:bg-edge-grey-700 px-2 py-1 rounded text-xs">
                                  <div className="font-medium text-edge-black dark:text-edge-white">{column.name}</div>
                                  <div className="text-edge-grey-500">{column.type}</div>
                                  {column.constraints && (
                                    <div className="text-edge-blue text-xs">{column.constraints}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      className="w-full bg-edge-blue hover:bg-edge-blue-dark text-edge-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      onClick={handleDomainSetup}
                    >
                      🚀 Use This Domain
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleDomainSetup} className="space-y-6">
                <div>
                  <label htmlFor="domainName" className="block text-sm font-semibold text-edge-black dark:text-edge-white mb-2">
                    <span>🏷️</span> Domain Name
                  </label>
                  <input
                    type="text"
                    id="domainName"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    placeholder="e.g., E-commerce, Healthcare, Finance"
                    required
                    className="w-full px-4 py-3 border border-edge-grey-300 dark:border-edge-grey-600 rounded-lg bg-edge-white dark:bg-edge-grey-800 text-edge-black dark:text-edge-white focus:border-edge-blue focus:ring-2 focus:ring-edge-blue focus:ring-opacity-20 transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="domainDescription" className="block text-sm font-semibold text-edge-black dark:text-edge-white mb-2">
                    <span>📝</span> Domain Description
                  </label>
                  <textarea
                    id="domainDescription"
                    value={domainDescription}
                    onChange={(e) => setDomainDescription(e.target.value)}
                    placeholder="Provide a comprehensive description of your domain, including business context and key data relationships..."
                    rows={4}
                    required
                    className="w-full px-4 py-3 border border-edge-grey-300 dark:border-edge-grey-600 rounded-lg bg-edge-white dark:bg-edge-grey-800 text-edge-black dark:text-edge-white focus:border-edge-blue focus:ring-2 focus:ring-edge-blue focus:ring-opacity-20 transition-colors resize-y"
                  />
                </div>
                
                <div>
                  <label htmlFor="domainSchema" className="block text-sm font-semibold text-edge-black dark:text-edge-white mb-2">
                    <span>🗄️</span> Database Schema <span className="text-edge-red">*</span>
                  </label>
                  <textarea
                    id="domainSchema"
                    value={domainSchema}
                    onChange={(e) => setDomainSchema(e.target.value)}
                    placeholder="Provide your database schema in JSON format or describe your table structures..."
                    rows={8}
                    required
                    className="w-full px-4 py-3 border border-edge-grey-300 dark:border-edge-grey-600 rounded-lg bg-edge-white dark:bg-edge-grey-800 text-edge-black dark:text-edge-white focus:border-edge-blue focus:ring-2 focus:ring-edge-blue focus:ring-opacity-20 transition-colors resize-y font-mono text-sm"
                  />
                  <p className="text-xs text-edge-grey-500 dark:text-edge-grey-400 mt-2">
                    <strong>Required:</strong> Provide table structures, column names, data types, and relationships to improve query accuracy.
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <button 
                    type="submit" 
                    className="bg-edge-blue hover:bg-edge-blue-dark text-edge-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 min-w-48"
                  >
                    <span>🚀</span> Initialize Custom Domain
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      
  <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 pb-4 pt-2">
      <div className="bg-white dark:bg-edge-grey-900 rounded-xl border border-edge-grey-300 dark:border-edge-grey-700 shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="border-t-2 border-edge-blue"></div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {responses.map((response, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${
                response.sender === 'user' ? 'items-end' : 
                response.sender === 'system' ? 'items-center' : 'items-start'
              } max-w-[85%] ${response.sender === 'user' ? 'ml-auto' : response.sender === 'system' ? 'mx-auto' : 'mr-auto'}`}
            >
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <span className="text-xs font-semibold uppercase tracking-wide text-edge-blue">
                  {response.sender === 'user' ? '👤 You' : 
                   response.sender === 'assistant' ? '🤖 Neural AI' : 
                   '⚙️ System'}
                </span>
                <span className="text-xs text-edge-grey-500 font-mono">{response.timestamp}</span>
              </div>
              
              <div className={`rounded-xl p-4 border shadow-sm max-w-full text-sm leading-relaxed ${
                response.sender === 'user' 
                  ? 'bg-edge-blue text-edge-white border-edge-blue shadow-lg' 
                  : response.sender === 'system'
                  ? 'bg-edge-grey-100 dark:bg-edge-grey-800 border-edge-grey-300 dark:border-edge-grey-600 border-2 border-dashed text-edge-grey-600 dark:text-edge-grey-400 italic text-center text-sm'
                  : 'bg-edge-grey-50 dark:bg-edge-grey-800 border-edge-grey-200 dark:border-edge-grey-600 text-edge-black dark:text-edge-white'
              }`}>
                {/* Handle SQL result messages */}
                {response.type === 'sql_result' ? (
                  <SqlResultDisplay 
                    query={response.query}
                    result={response.result}
                    timestamp={response.timestamp}
                  />
                ) : response.type === 'sql_warning' ? (
                  <div className="text-xs text-edge-yellow font-medium">{response.content}</div>
                ) : response.sender === 'assistant' && hasStructuredContent(response.content) ? (
                  <FormattedResponse 
                    content={response.content} 
                    isStreaming={response.isStreaming} 
                  />
                ) : (
                  <div className="break-words leading-relaxed">
                    {response.sender === 'assistant' && hasStructuredContent(response.content) 
                      ? cleanResponseContent(response.content) 
                      : response.content}
                    {response.isStreaming && (
                      <span className="inline-block ml-2 w-2 h-4 bg-edge-cyan rounded-full animate-pulse"></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
  <form className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-100 dark:bg-edge-grey-800 border-t border-edge-grey-200 dark:border-edge-grey-600" onSubmit={sendMessage}>
          <div className="border-t-2 border-edge-blue absolute top-0 left-6 right-6 opacity-30"></div>
      <textarea
    className="flex-1 px-3 py-2 border-2 border-edge-grey-300 dark:border-edge-grey-600 rounded-lg bg-edge-white dark:bg-edge-grey-700 text-edge-black dark:text-edge-white focus:border-edge-blue focus:ring-2 focus:ring-edge-blue focus:ring-opacity-20 transition-all resize-none min-h-[52px] max-h-[140px] text-sm no-scrollbar"
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
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg font-semibold text-xs uppercase tracking-wide transition-colors flex items-center gap-2 min-w-[110px] h-[52px] justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-grey-800"
          >
            {isStreaming ? (
              <>
                ⏳ Processing
                <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
              </>
            ) : (
              <>
                🚀 Send
                <span className="font-bold">→</span>
              </>
            )}
          </button>
        </form>
        {domainSetupComplete && currentDomainSuggestions.length > 0 && (
          <div className="px-3 sm:px-4 pb-4 pt-2 overflow-x-auto no-scrollbar" 
               ref={suggestionsRef}
               onMouseDown={handleMouseDown}
               style={{ cursor: 'grab', userSelect: 'none' }}>
            <div className="flex gap-2 w-max">
              {currentDomainSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessage(suggestion)}
                  disabled={!isConnected || isStreaming}
                  className="whitespace-nowrap text-left text-xs sm:text-sm bg-edge-white dark:bg-edge-grey-700 border border-edge-grey-200 dark:border-edge-grey-600 rounded-lg px-3 py-1.5 hover:border-edge-blue hover:bg-edge-blue/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
                  style={{ pointerEvents: 'auto' }}
                >{suggestion}</button>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  </div>
  {showTokenMetricsModal && tokenMetrics && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-edge-black/60 backdrop-blur-sm" onClick={()=>setShowTokenMetricsModal(false)}></div>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-edge-white dark:bg-edge-grey-900 rounded-xl border border-edge-grey-300 dark:border-edge-grey-700 shadow-edge-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-edge-black dark:text-edge-white flex items-center gap-2">🔄 Token Generation Performance</h3>
          <button onClick={()=>setShowTokenMetricsModal(false)} className="w-9 h-9 rounded-lg bg-edge-grey-200 dark:bg-edge-grey-700 hover:bg-edge-grey-300 dark:hover:bg-edge-grey-600 text-edge-black dark:text-edge-white">✖</button>
        </div>
        <TokenMetricsDisplay metrics={tokenMetrics} timestamp={new Date().toLocaleTimeString()} />
      </div>
    </div>
  )}
  </>
  );
}

export default App;