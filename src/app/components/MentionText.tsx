// MentionText component for rendering text with clickable mentions
'use client';

import { useState, useEffect } from 'react';
import { ParsedMention, parseTextWithMentions } from '../services/mentionService';
import UserLink from './UserLink';

interface MentionTextProps {
  text: string;
  className?: string;
}

export default function MentionText({ text, className = '' }: MentionTextProps) {
  const [parsedContent, setParsedContent] = useState<ParsedMention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parseContent = async () => {
      setLoading(true);
      try {
        const parsed = await parseTextWithMentions(text);
        setParsedContent(parsed);
      } catch (error) {
        console.error('Error parsing mentions:', error);
        // Fallback to original text
        setParsedContent([{
          type: 'text',
          content: text
        }]);
      } finally {
        setLoading(false);
      }
    };

    parseContent();
  }, [text]);

  if (loading) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parsedContent.map((part, index) => {
        if (part.type === 'mention' && part.username && part.walletAddress) {
          return (
            <UserLink
              key={index}
              username={part.username}
              walletAddress={part.walletAddress}
              className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
              showAt={true}
            />
          );
        } else {
          return (
            <span key={index}>
              {part.content}
            </span>
          );
        }
      })}
    </span>
  );
}
