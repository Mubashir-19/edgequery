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

    const explanationStartIndex = content.indexOf('<reasoning_end>');
    if (explanationStartIndex !== -1) {
      const explanationEndIndex = content.indexOf('<final_sql_query_start>');
      if (explanationEndIndex !== -1) {
        explanation = content.substring(
          explanationStartIndex + '<reasoning_end>'.length,
          explanationEndIndex
        ).replace('Explanation:', '').trim();
      } else if (isStreaming) {
        explanation = content.substring(
          explanationStartIndex + '<reasoning_end>'.length
        ).replace('Explanation:', '').trim();
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
      !prev.reasoning && curr.reasoning ||
      !prev.explanation && curr.explanation ||
      !prev.sql && curr.sql;

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
    <div className="formatted-response">
      {(hasReasoning || (isStreaming && partial.reasoning)) && sectionVisibility.reasoning && (
        <div className="response-section reasoning-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('reasoning')}
            aria-expanded={expandedSections.reasoning}
            role="button"
            tabIndex={0}
          >
            <h4>
              <span className="section-icon">
                {expandedSections.reasoning ? '▼' : '▶'}
              </span>
              {getSectionIcon('reasoning')} Neural Reasoning
            </h4>
          </div>

          {expandedSections.reasoning && (
            <div 
              ref={reasoningRef}
              className={`section-content reasoning-content ${isStreaming ? 'typing-animation' : ''}`}
            >
              <pre>{reasoning}</pre>
            </div>
          )}
        </div>
      )}

      {(hasExplanation || (isStreaming && partial.explanation)) && sectionVisibility.explanation && (
        <div className="response-section explanation-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('explanation')}
            aria-expanded={expandedSections.explanation}
            role="button"
            tabIndex={0}
          >
            <h4>
              <span className="section-icon">
                {expandedSections.explanation ? '▼' : '▶'}
              </span>
              {getSectionIcon('explanation')} Query Explanation
            </h4>
          </div>

          {expandedSections.explanation && (
            <div 
              ref={explanationRef}
              className={`section-content explanation-content ${isStreaming ? 'typing-animation' : ''}`}
            >
              <p>{explanation}</p>
            </div>
          )}
        </div>
      )}

      {(hasSql || (isStreaming && partial.sql)) && sectionVisibility.sql && (
        <div className="response-section sql-section">
          <div 
            className="section-header sql-header" 
            onClick={() => toggleSection('sql')}
            aria-expanded={expandedSections.sql}
            role="button"
            tabIndex={0}
          >
            <h4>
              <span className="section-icon">
                {expandedSections.sql ? '▼' : '▶'}
              </span>
              {getSectionIcon('sql')} Generated Query
            </h4>
            {!isStreaming && hasSql && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard();
                }}
                className={`copy-btn ${copySuccess ? 'copy-success' : ''}`}
                aria-label="Copy SQL query"
              >
                {copySuccess ? '✅ Copied!' : '📋 Copy SQL'}
              </button>
            )}
          </div>

          {expandedSections.sql && (
            <div 
              ref={sqlRef}
              className={`section-content sql-content ${isStreaming ? 'typing-animation' : ''}`}
            >
              <pre className="sql-code">{sql}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormattedResponse;
