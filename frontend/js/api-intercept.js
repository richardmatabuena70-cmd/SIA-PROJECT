// API Fetch Interceptor - Redirects fetch calls to localStorage API
// This allows the existing code to work without major changes

const OriginalFetch = window.fetch;

// Override fetch to intercept API calls
window.fetch = async function(url, options = {}) {
  // Make sure api is available
  if (typeof api === 'undefined') {
    console.error('API not loaded yet');
    return OriginalFetch(url, options);
  }
  
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  // Add auth header if token exists
  if (token && !options.headers) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  // Only intercept API calls
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const endpoint = url.replace('/api/', '');
    const method = options.method || 'GET';
    
    try {
      let result;
      
      // Route to appropriate localStorage API method
      switch (endpoint) {
        // Auth endpoints
        case 'auth/me':
          if (method === 'GET') {
            result = await api.getCurrentUser();
          }
          break;
          
        case 'auth/theme':
          if (method === 'PUT') {
            const body = JSON.parse(options.body || '{}');
            result = await api.updateTheme(body.theme);
          }
          break;
          
        // User endpoints
        case 'users':
          if (method === 'GET') {
            result = await api.getUsers();
          } else if (method === 'DELETE' && !url.includes('/permanent')) {
            // Soft delete - need password from body
            const body = JSON.parse(options.body || '{}');
            result = await api.deleteAccount(body.password);
          }
          break;
          
        case 'users/permanent':
          if (method === 'DELETE') {
            const body = JSON.parse(options.body || '{}');
            result = await api.permanentDeleteAccount(body.password);
          }
          break;
          
        case 'users/restore':
          if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.restoreAccount(body.email, body.password);
          }
          break;
          
        // Stats endpoints  
        case 'stats':
          if (method === 'GET') {
            result = await api.getStats();
          }
          break;
          
        case 'stats/update':
          if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.updateStats(
              body.score, 
              body.correctAnswers, 
              body.totalQuestions, 
              body.difficulty, 
              body.category,
              body.questions
            );
          }
          break;
          
        case 'stats/leaderboard':
        case 'leaderboard':
          result = await api.getLeaderboard();
          break;
          
        // Achievements endpoints
        case 'achievements':
          result = await api.getAchievements();
          break;
          
        // Quiz endpoints
        case 'quiz/generate':
          if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.generateQuiz(body.difficulty, body.count, body.category);
          }
          break;
          
        case 'quiz/start':
          if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.startQuiz(body.difficulty, body.timeLeft);
          }
          break;
          
        case 'quiz/question':
          if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.addQuestion(
              body.sessionId, 
              body.questionNumber, 
              body.question, 
              body.correctAnswer
            );
          }
          break;
          
        case 'quiz/answer':
          if (method === 'PUT') {
            const body = JSON.parse(options.body || '{}');
            result = await api.submitAnswer(
              body.sessionId, 
              body.questionNumber, 
              body.userAnswer
            );
          }
          break;
          
        case 'quiz/finish':
          if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.finishQuiz(body.sessionId, body.score, body.timeLeft);
          }
          break;
          
        case 'quiz/history':
          result = await api.getHistory();
          break;
          
        // Score endpoints
        case 'scores':
          if (method === 'GET') {
            result = await api.getScores();
          } else if (method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            result = await api.saveScore(
              body.score,
              body.correctAnswers,
              body.totalQuestions,
              body.difficulty,
              body.questions
            );
          } else if (method === 'DELETE') {
            result = await api.deleteAllScores();
          }
          break;
          
        case 'scores/latest':
          if (method === 'DELETE') {
            result = await api.deleteLatestScore();
          }
          break;
          
        case 'scores/ranking':
          result = await api.getLeaderboard();
          break;
          
        default:
          // For other endpoints, try to extract ID
          // Match users/anything or quiz/session/anything
          if (endpoint.startsWith('users/')) {
            const id = endpoint.split('/')[1];
            const users = await api.getUsers();
            result = users.find(u => String(u.id) === String(id));
          } else if (endpoint.startsWith('quiz/session/')) {
            const sessionId = endpoint.split('/')[2];
            if (method === 'DELETE') {
              result = await api.deleteSession(sessionId);
            }
          }
      }
      
      // Return a mock response object
      if (result !== undefined) {
        return {
          ok: true,
          json: async () => result
        };
      } else {
        return {
          ok: false,
          json: async () => ({ error: 'Endpoint not handled' })
        };
      }
      
    } catch (error) {
      console.error('API intercept error:', error);
      return {
        ok: false,
        json: async () => ({ error: error.message })
      };
    }
  }
  
  // For non-API calls, use original fetch
  return OriginalFetch(url, options);
};
