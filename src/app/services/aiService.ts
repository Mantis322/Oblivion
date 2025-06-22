// AI Service for Lucy Assistant
interface LucyResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// Check if a comment mentions @Lucy
export function isLucyMention(text: string): boolean {
  const mentionPattern = /@lucy\b/i;
  return mentionPattern.test(text);
}

// Generate a response from Lucy using QWEN API (existing function for comments)
export async function generateLucyResponse(
  postContent: string,
  userComment: string,
  postAuthor: string,
  commenterUsername: string
): Promise<LucyResponse> {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_QWEN_API_KEY;
    
    if (!apiKey) {
      console.error('QWEN API key not found');
      // Return a fallback response for testing
      return {
        success: true,
        content: "Hi there! I'm Lucy, your AI assistant. I'm here to help!"
      };
    }

    // Create the prompt for Lucy
    const prompt = `You are Lucy, a friendly AI assistant on the Oblivion social media platform. A user mentioned you (@lucy) in their comment and wants your help.

Context:
- Original post by @${postAuthor}: "${postContent}"
- Comment by @${commenterUsername}: "${userComment}"

Please respond as Lucy in a conversational, friendly tone. Keep your response under 180 characters (since you'll be replying to @${commenterUsername}). Be helpful and engaging, but concise. Don't mention that you're an AI unless directly asked. 

IMPORTANT: Do NOT include @${commenterUsername} at the beginning of your response as it will be added automatically when the comment is posted.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://oblivion-social.com",
        "X-Title": "Oblivion Social Platform",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "qwen/qwen3-30b-a3b:free",
        "messages": [
          {
            "role": "system",
            "content": "You are Lucy, a helpful AI assistant on a social media platform. Respond naturally and conversationally in under 200 characters. Do not include @username at the start of your response."
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        "max_tokens": 100,
        "temperature": 0.7
      })
    });

    if (!response.ok) {
      console.error('QWEN API error:', response.status, response.statusText);
      
      // Return a fallback response when API fails
      const fallbackResponses = [
        "Hello! Thanks for mentioning me. How can I help you today?",
        "Hi there! I'm here to assist. What would you like to know?",
        "Hey! Great to connect with you. What's on your mind?",
        "Hello! I'd be happy to help. What can I do for you?",
        "Hi! Thanks for reaching out. How can I assist you?"
      ];
      
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      return {
        success: true,
        content: randomResponse
      };
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      let content = data.choices[0].message.content?.trim() || '';
      
      // If content is empty, check reasoning field (QWEN API sometimes puts response there)
      if (!content && data.choices[0].message.reasoning) {
        const reasoning = data.choices[0].message.reasoning;
        
        // Extract the actual response from reasoning
        const responseMatch = reasoning.match(/response should be something like ["'](.+?)["']/i) ||
                             reasoning.match(/should be something like ["'](.+?)["']/i) ||
                             reasoning.match(/["']([^"']+)["'](?=\s*$)/); // Last quoted text
        if (responseMatch) {
          content = responseMatch[1];
        } else {
          // Try to extract from incomplete sentence pattern
          const incompleteMatch = reasoning.match(/["']([^"']*(?:Hi|Hello|Hey)[^"']*)$/i);
          if (incompleteMatch) {
            content = incompleteMatch[1] + "!";
          } else {
            // Fallback: use a portion of reasoning as response
            const lines = reasoning.split('\n').filter((line: string) => line.trim());
            const lastLine = lines[lines.length - 1];
            if (lastLine && lastLine.length < 200) {
              content = lastLine.replace(/^["']|["']$/g, '').trim();
            }
          }
        }
      }
      
      // If still no content, use fallback
      if (!content) {
        content = "Hi there! I'm here and ready to help. What can I do for you?";
      }
      
      return {
        success: true,
        content: content
      };
    } else {
      // Return a fallback response
      return {
        success: true,
        content: "Hello! I'm Lucy, your friendly AI assistant. Thanks for mentioning me! How can I help?"
      };
    }

  } catch (error) {
    console.error('Error generating Lucy response:', error);
    
    // Return a fallback response on error
    return {
      success: true,
      content: "Hi! I'm Lucy, and I'm here to help. Something went wrong with my main response system, but I'm still here for you!"
    };
  }
}