import React, { useState, useEffect, useRef } from 'react';

const FormattedResponse = ({ content, isStreaming }) => {
  const [expandedSections, setExpandedSections] = useState({
    reasoning: true,
    explanation: true,
    sql: true
  });

  const [copySuccess, setCopySuccess] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({
    reasoning: false,
    explanation: false,
    sql: false
  });

  const [partialSections, setPartialSections] = useState({
    reasoning: false,
    explanation: false,
    sql: false
  });

  const getPartialContent = () => {
    const sections = {
      reasoning: false,
      explanation: false,
      sql: false
    };

    if (content.includes('<reasoning_start>')) {
      sections.reasoning = true;
    }

    if (content.includes('<reasoning_end>')) {
      sections.explanation = true;
    }

    if (content.includes('<final_sql_query_start>')) {
      sections.sql = true;
    }

    return sections;
  };

  const extractSections = () => {
    let reasoning = '';
    let explanation = '';
    let sql = '';

    const reasoningStartIndex = content.indexOf('<reasoning_start>');
    if (reasoningStartIndex !== -1) {
      const reasoningEndIndex = content.indexOf('<reasoning_end>');
      if (reasoningEndIndex !== -1) {
        reasoning = content.substring(
          reasoningStartIndex + '<reasoning_start>'.length,
          reasoningEndIndex
        ).trim();
      } else if (isStreaming) {
        reasoning = content.substring(
          reasoningStartIndex + '<reasoning_start>'.length
        ).trim();
      }
    }

    // Look for explanation section starting after reasoning_end
    const explanationStartIndex = content.indexOf('<reasoning_end>');
    if (explanationStartIndex !== -1) {
      const explanationEndIndex = content.indexOf('<final_sql_query_start>');
      if (explanationEndIndex !== -1) {
        explanation = content.substring(
          explanationStartIndex + '<reasoning_end>'.length,
          explanationEndIndex
        ).replace(/^Explanation:\s*/i, '').trim();
      } else if (isStreaming) {
        // For streaming, get everything after reasoning_end but clean it up
        let tempExplanation = content.substring(
          explanationStartIndex + '<reasoning_end>'.length
        ).replace(/^Explanation:\s*/i, '').trim();
        
        // Remove any incomplete SQL query parts that might have started
        const sqlStartMatch = tempExplanation.indexOf('<final_sql_query');
        if (sqlStartMatch !== -1) {
          tempExplanation = tempExplanation.substring(0, sqlStartMatch).trim();
        }
        
        explanation = tempExplanation;
      }
    }

    const sqlStartIndex = content.indexOf('<final_sql_query_start>');
    if (sqlStartIndex !== -1) {
      const startOffset = sqlStartIndex + '<final_sql_query_start>'.length;
      const sqlEndIndex = content.indexOf('<final_sql_query_end>', startOffset);
    
      if (sqlEndIndex !== -1) {
        sql = content.substring(startOffset, sqlEndIndex).trim();
      } else {
        sql = content.substring(startOffset).trim();
    
        // Clean up any dangling tags like "<final_sql_query" at the end
        const danglingTagIndex = sql.lastIndexOf('<final_sql_query');
        if (danglingTagIndex !== -1 && danglingTagIndex >= sql.length - 25) {
          sql = sql.substring(0, danglingTagIndex).trim();
        }
      }
    }

    return { reasoning, explanation, sql };
  };

  const { reasoning, explanation, sql } = extractSections();

  const hasReasoning = reasoning !== '';
  const hasExplanation = explanation !== '';
  const hasSql = sql !== '';

  const partial = getPartialContent();

  const reasoningRef = useRef(null);
  const explanationRef = useRef(null);
  const sqlRef = useRef(null);

  useEffect(() => {
    const shouldUpdate = (prev, curr) =>
      (!prev.reasoning && curr.reasoning) ||
      (!prev.explanation && curr.explanation) ||
      (!prev.sql && curr.sql);

    if (isStreaming) {
      if (shouldUpdate(partialSections, partial)) {
        setSectionVisibility(prev => ({
          reasoning: prev.reasoning || partial.reasoning,
          explanation: prev.explanation || partial.explanation,
          sql: prev.sql || partial.sql
        }));

        setPartialSections(partial);
      }
    } else {
      const timers = [];

      if (hasReasoning) {
        timers.push(setTimeout(() => {
          setSectionVisibility(prev => ({ ...prev, reasoning: true }));
        }, 100));
      }

      if (hasExplanation) {
        timers.push(setTimeout(() => {
          setSectionVisibility(prev => ({ ...prev, explanation: true }));
        }, 300));
      }

      if (hasSql) {
        timers.push(setTimeout(() => {
          setSectionVisibility(prev => ({ ...prev, sql: true }));
        }, 500));
      }

      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [isStreaming, hasReasoning, hasExplanation, hasSql, content, partial, partialSections]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  const getSectionIcon = (sectionName) => {
    switch (sectionName) {
      case 'reasoning': return '🧠';
      case 'explanation': return '💡';
      case 'sql': return '⚡';
      default: return '📄';
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {(hasReasoning || (isStreaming && partial.reasoning)) && sectionVisibility.reasoning && (
        <div className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl overflow-hidden bg-edge-grey-50 dark:bg-edge-grey-800 transition-all hover:shadow-edge">
          <div className="border-l-4 border-edge-blue"></div>
          <div 
            className="p-4 cursor-pointer flex items-center justify-between bg-edge-grey-100 dark:bg-edge-grey-700 border-b border-edge-grey-200 dark:border-edge-grey-600 hover:bg-edge-grey-200 dark:hover:bg-edge-grey-600 transition-colors"
            onClick={() => toggleSection('reasoning')}
            aria-expanded={expandedSections.reasoning}
            role="button"
            tabIndex={0}
          >
            <h4 className="font-semibold text-edge-black dark:text-edge-white text-sm uppercase tracking-wide flex items-center gap-3">
              <span className={`transition-transform ${expandedSections.reasoning ? 'rotate-90' : ''}`}>
                ▶
              </span>
              {getSectionIcon('reasoning')} Neural Reasoning
            </h4>
          </div>

          {expandedSections.reasoning && (
            <div 
              ref={reasoningRef}
              className={`p-4 bg-blue-50 dark:bg-blue-900 bg-opacity-20 ${isStreaming ? 'relative' : ''}`}
            >
              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-edge-black dark:text-edge-white">{reasoning}</pre>
              {isStreaming && hasReasoning && (
                <span className="inline-block ml-2 w-2 h-4 bg-edge-blue rounded-full animate-pulse"></span>
              )}
            </div>
          )}
        </div>
      )}

      {(hasExplanation || (isStreaming && partial.explanation)) && sectionVisibility.explanation && (
        <div className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl overflow-hidden bg-edge-grey-50 dark:bg-edge-grey-800 transition-all hover:shadow-edge">
          <div className="border-l-4 border-edge-green"></div>
          <div 
            className="p-4 cursor-pointer flex items-center justify-between bg-edge-grey-100 dark:bg-edge-grey-700 border-b border-edge-grey-200 dark:border-edge-grey-600 hover:bg-edge-grey-200 dark:hover:bg-edge-grey-600 transition-colors"
            onClick={() => toggleSection('explanation')}
            aria-expanded={expandedSections.explanation}
            role="button"
            tabIndex={0}
          >
            <h4 className="font-semibold text-edge-black dark:text-edge-white text-sm uppercase tracking-wide flex items-center gap-3">
              <span className={`transition-transform ${expandedSections.explanation ? 'rotate-90' : ''}`}>
                ▶
              </span>
              {getSectionIcon('explanation')} Query Explanation
            </h4>
          </div>

          {expandedSections.explanation && (
            <div 
              ref={explanationRef}
              className={`p-4 bg-green-50 dark:bg-green-900 bg-opacity-20 ${isStreaming ? 'relative' : ''}`}
            >
              <p className="text-edge-black dark:text-edge-white leading-relaxed">{explanation}</p>
              {isStreaming && hasExplanation && (
                <span className="inline-block ml-2 w-2 h-4 bg-edge-green rounded-full animate-pulse"></span>
              )}
            </div>
          )}
        </div>
      )}

      {(hasSql || (isStreaming && partial.sql)) && sectionVisibility.sql && (
        <div className="border border-edge-grey-300 dark:border-edge-grey-600 rounded-xl overflow-hidden bg-edge-grey-50 dark:bg-edge-grey-800 transition-all hover:shadow-edge">
          <div className="border-l-4 border-edge-purple"></div>
          <div 
            className="p-4 cursor-pointer flex items-center justify-between bg-edge-grey-100 dark:bg-edge-grey-700 border-b border-edge-grey-200 dark:border-edge-grey-600 hover:bg-edge-grey-200 dark:hover:bg-edge-grey-600 transition-colors"
            onClick={() => toggleSection('sql')}
            aria-expanded={expandedSections.sql}
            role="button"
            tabIndex={0}
          >
            <h4 className="font-semibold text-edge-black dark:text-edge-white text-sm uppercase tracking-wide flex items-center gap-3">
              <span className={`transition-transform ${expandedSections.sql ? 'rotate-90' : ''}`}>
                ▶
              </span>
              {getSectionIcon('sql')} Generated Query
            </h4>
            {!isStreaming && hasSql && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  copySuccess 
                    ? 'bg-edge-green text-edge-white' 
                    : 'bg-edge-cyan hover:bg-edge-cyan-dark text-edge-white'
                }`}
                aria-label="Copy SQL query"
              >
                {copySuccess ? '✅ Copied!' : '📋 Copy SQL'}
              </button>
            )}
          </div>

          {expandedSections.sql && (
            <div 
              ref={sqlRef}
              className={`p-4 bg-purple-50 dark:bg-purple-900 bg-opacity-20 ${isStreaming ? 'relative' : ''}`}
            >
              <pre className="font-mono text-sm leading-relaxed p-4 bg-edge-white dark:bg-edge-grey-700 text-edge-black dark:text-edge-white border border-edge-grey-200 dark:border-edge-grey-600 rounded-lg overflow-x-auto whitespace-pre-wrap relative">
                <span className="absolute top-2 right-2 text-xs font-bold text-edge-grey-500 uppercase tracking-widest">SQL</span>
                {sql}
              </pre>
              {isStreaming && hasSql && (
                <span className="inline-block ml-2 w-2 h-4 bg-edge-purple rounded-full animate-pulse"></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormattedResponse;
