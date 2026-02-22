// LocalStorage-based API for Math Quiz Game
// All data is stored in browser's localStorage - no server required

const API_URL = '/api';

// ============ LOCALSTORAGE DATABASE ============

const DB = {
  // Get all data from a collection
  get(collection) {
    const data = localStorage.getItem(`mathquiz_${collection}`);
    return data ? JSON.parse(data) : [];
  },

  // Save all data to a collection
  set(collection, data) {
    localStorage.setItem(`mathquiz_${collection}`, JSON.stringify(data));
  },

  // Find item by condition
  find(collection, predicate) {
    const items = this.get(collection);
    return items.find(predicate);
  },

  // Find all items by condition
  filter(collection, predicate) {
    const items = this.get(collection);
    return items.filter(predicate);
  },

  // Add item and return id
  insert(collection, item) {
    const items = this.get(collection);
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    item.id = id;
    item.created_at = new Date().toISOString();
    items.push(item);
    this.set(collection, items);
    return id;
  },

  // Update item by id
  update(collection, id, updates) {
    const items = this.get(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      this.set(collection, items);
      return true;
    }
    return false;
  },

  // Delete item by id
  delete(collection, id) {
    const items = this.get(collection);
    const filtered = items.filter(item => item.id !== id);
    this.set(collection, filtered);
  },

  // Generate unique numeric ID
  generateId() {
    return Date.now();
  }
};

// ============ ACHIEVEMENTS DATA ============

const DEFAULT_ACHIEVEMENTS = [
  { id: 1, name: 'First Steps', description: 'Complete your first quiz', icon: '🎯', requirement_type: 'games', requirement_value: 1, points: 10 },
  { id: 2, name: 'Getting Started', description: 'Complete 10 quizzes', icon: '🌟', requirement_type: 'games', requirement_value: 10, points: 25 },
  { id: 3, name: 'Quiz Master', description: 'Complete 50 quizzes', icon: '🏆', requirement_type: 'games', requirement_value: 50, points: 50 },
  { id: 4, name: 'Math Wizard', description: 'Complete 100 quizzes', icon: '🧙', requirement_type: 'games', requirement_value: 100, points: 100 },
  { id: 5, name: 'Perfect Score', description: 'Get 100% on a quiz', icon: '💯', requirement_type: 'perfect', requirement_value: 1, points: 30 },
  { id: 6, name: 'Streak Starter', description: 'Achieve a 3-day streak', icon: '🔥', requirement_type: 'streak', requirement_value: 3, points: 20 },
  { id: 7, name: 'On Fire', description: 'Achieve a 7-day streak', icon: '💥', requirement_type: 'streak', requirement_value: 7, points: 40 },
  { id: 8, name: 'Unstoppable', description: 'Achieve a 30-day streak', icon: '🚀', requirement_type: 'streak', requirement_value: 30, points: 100 },
  { id: 9, name: 'Speed Demon', description: 'Answer 50 questions correctly', icon: '⚡', requirement_type: 'correct', requirement_value: 50, points: 25 },
  { id: 10, name: 'Math Genius', description: 'Answer 200 questions correctly', icon: '🧠', requirement_type: 'correct', requirement_value: 200, points: 75 },
  { id: 11, name: 'High Scorer', description: 'Score over 80 points in one game', icon: '🎖️', requirement_type: 'score', requirement_value: 80, points: 20 },
  { id: 12, name: 'Addition Expert', description: 'Answer 50 addition questions correctly', icon: '➕', requirement_type: 'addition', requirement_value: 50, points: 30 },
  { id: 13, name: 'Subtraction Expert', description: 'Answer 50 subtraction questions correctly', icon: '➖', requirement_type: 'subtraction', requirement_value: 50, points: 30 },
  { id: 14, name: 'Multiplication Expert', description: 'Answer 50 multiplication questions correctly', icon: '✖️', requirement_type: 'multiplication', requirement_value: 50, points: 30 },
  { id: 15, name: 'Division Expert', description: 'Answer 50 division questions correctly', icon: '➗', requirement_type: 'division', requirement_value: 50, points: 30 }
];

// Initialize achievements in localStorage if not exists
function initAchievements() {
  const achievements = DB.get('achievements');
  if (achievements.length === 0) {
    DB.set('achievements', DEFAULT_ACHIEVEMENTS);
  }
}

// ============ USER MANAGEMENT ============

function hashPassword(password) {
  // Simple hash for localStorage (not secure, but sufficient for local-only app)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function verifyPassword(password, hashed) {
  return hashPassword(password) === hashed;
}

// ============ API OBJECT ============

const api = {
  // Token management
  getToken() {
    return this._token || localStorage.getItem('token');
  },

  setToken(token) {
    this._token = token;
    localStorage.setItem('token', token);
  },

  removeToken() {
    this._token = null;
    localStorage.removeItem('token');
  },

  // User ID management
  getUserId() {
    return this._currentUserId || localStorage.getItem('userId');
  },

  setUserId(userId) {
    this._currentUserId = userId;
    localStorage.setItem('userId', userId);
  },

  // Get current user from storage
  getUserFromStorage() {
    const userId = this.getUserId();
    if (!userId) return null;
    
    const users = DB.get('users');
    return users.find(u => u.id === userId && !u.is_deleted);
  },

  // Authentication
  async register(name, email, password) {
    // Check if email already exists (not deleted)
    const existingUser = DB.find('users', u => u.email.toLowerCase() === email.toLowerCase() && !u.is_deleted);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Check for deleted user with same email
    const deletedUser = DB.find('users', u => u.email.toLowerCase() === email.toLowerCase() && u.is_deleted);
    
    if (deletedUser) {
      // Restore deleted user
      const updates = {
        password: hashPassword(password),
        name: name,
        is_deleted: 0,
        deleted_at: null
      };
      DB.update('users', deletedUser.id, updates);
      
      const token = this._generateToken(deletedUser.id, email);
      this.setToken(token);
      this.setUserId(deletedUser.id);
      
      // Initialize stats
      this._initUserStats(deletedUser.id);
      
      return {
        success: true,
        token,
        user: { id: deletedUser.id, name, email, theme: 'dark' }
      };
    }

    // Create new user
    const userId = DB.insert('users', {
      name: name,
      email: email.toLowerCase(),
      password: hashPassword(password),
      theme: 'dark',
      is_deleted: 0,
      deleted_at: null
    });

    // Initialize user stats
    this._initUserStats(userId);

    const token = this._generateToken(userId, email);
    this.setToken(token);
    this.setUserId(userId);

    return {
      success: true,
      token,
      user: { id: userId, name, email, theme: 'dark' }
    };
  },

  async login(email, password) {
    const user = DB.find('users', u => u.email.toLowerCase() === email.toLowerCase() && !u.is_deleted);
    
    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password');
    }

    const token = this._generateToken(user.id, user.email);
    this.setToken(token);
    this.setUserId(user.id);

    return {
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, theme: user.theme }
    };
  },

  async restoreAccount(email, password) {
    const user = DB.find('users', u => u.email.toLowerCase() === email.toLowerCase() && u.is_deleted);
    
    if (!user) {
      throw new Error('No deleted account found with this email');
    }

    if (!verifyPassword(password, user.password)) {
      throw new Error('Invalid password');
    }

    // Restore account
    DB.update('users', user.id, {
      is_deleted: 0,
      deleted_at: null
    });

    const token = this._generateToken(user.id, user.email);
    this.setToken(token);
    this.setUserId(user.id);

    return {
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, theme: user.theme, is_deleted: 0 }
    };
  },

  logout() {
    this.removeToken();
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
  },

  // Generate simple token
  _generateToken(userId, email) {
    const payload = { id: userId, email, exp: Date.now() + 24 * 60 * 60 * 1000 };
    return btoa(JSON.stringify(payload));
  },

  // Verify token
  _verifyToken() {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now()) {
        this.removeToken();
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  },

  // User management
  async getCurrentUser() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const user = DB.find('users', u => u.id === payload.id);
    if (!user || user.is_deleted) throw new Error('User not found');
    
    return { id: user.id, name: user.name, email: user.email, theme: user.theme };
  },

  async updateTheme(theme) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    if (!['dark', 'light'].includes(theme)) {
      throw new Error('Invalid theme');
    }
    
    DB.update('users', payload.id, { theme });
    return { success: true, theme };
  },

  async getUsers() {
    // Get all users (for admin display)
    const users = DB.get('users');
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      theme: u.theme,
      is_deleted: u.is_deleted,
      deleted_at: u.deleted_at,
      created_at: u.created_at
    }));
  },

  // Delete account (soft delete)
  async deleteAccount(password) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const user = DB.find('users', u => u.id === payload.id);
    if (!user) throw new Error('User not found');
    
    if (!verifyPassword(password, user.password)) {
      throw new Error('Invalid password');
    }
    
    DB.update('users', payload.id, {
      is_deleted: 1,
      deleted_at: new Date().toISOString()
    });
    
    this.removeToken();
    return { success: true, message: 'Account deleted' };
  },

  // Permanent delete account
  async permanentDeleteAccount(password) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const user = DB.find('users', u => u.id === payload.id);
    if (!user) throw new Error('User not found');
    
    if (!verifyPassword(password, user.password)) {
      throw new Error('Invalid password');
    }
    
    // Delete all user data
    const sessions = DB.filter('quiz_sessions', s => s.user_id === payload.id);
    sessions.forEach(s => {
      DB.delete('quiz_questions', s.id);
    });
    DB.set('quiz_sessions', DB.filter('quiz_sessions', s => s.user_id !== payload.id));
    DB.set('user_stats', DB.filter('stats', s => s.user_id !== payload.id));
    DB.set('user_achievements', DB.filter('user_achievements', ua => ua.user_id !== payload.id));
    DB.delete('users', payload.id);
    
    this.removeToken();
    return { success: true, message: 'Account permanently deleted' };
  },

  // ============ QUIZ OPERATIONS ============

  _initUserStats(userId) {
    const stats = DB.get('user_stats');
    const existing = stats.find(s => s.user_id === userId);
    if (!existing) {
      stats.push({
        id: DB.generateId(),
        user_id: userId,
        total_games: 0,
        total_correct: 0,
        total_questions: 0,
        highest_score: 0,
        current_streak: 0,
        longest_streak: 0,
        last_played_date: null,
        // Category-specific stats
        addition_correct: 0,
        subtraction_correct: 0,
        multiplication_correct: 0,
        division_correct: 0
      });
      DB.set('user_stats', stats);
    }
  },

  async startQuiz(difficulty, timeLeft) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new Error('Invalid difficulty level');
    }

    const sessionId = DB.insert('quiz_sessions', {
      user_id: payload.id,
      difficulty: difficulty,
      category: 'mixed',
      score: 0,
      time_left: timeLeft,
      total_questions: 10,
      correct_answers: 0
    });

    return { success: true, sessionId, time_left: timeLeft };
  },

  async addQuestion(sessionId, questionNumber, question, correctAnswer) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    DB.insert('quiz_questions', {
      session_id: sessionId,
      question_number: questionNumber,
      question: question,
      correct_answer: correctAnswer,
      user_answer: null,
      is_correct: 0
    });

    return { success: true };
  },

  async submitAnswer(sessionId, questionNumber, userAnswer) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const questions = DB.filter('quiz_questions', q => q.session_id === sessionId);
    const question = questions.find(q => q.question_number === questionNumber);
    
    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = userAnswer === question.correct_answer ? 1 : 0;
    
    DB.update('quiz_questions', question.id, {
      user_answer: userAnswer,
      is_correct: isCorrect
    });

    return { success: true, is_correct: isCorrect };
  },

  async finishQuiz(sessionId, score, timeLeft) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const sessions = DB.filter('quiz_sessions', s => s.id === sessionId && s.user_id === payload.id);
    if (sessions.length === 0) {
      throw new Error('Session not found');
    }

    // Get questions for this session
    const questions = DB.filter('quiz_questions', q => q.session_id === sessionId);
    const correctAnswers = questions.filter(q => q.is_correct === 1).length;

    // Update session
    DB.update('quiz_sessions', sessionId, {
      score: score,
      time_left: timeLeft,
      correct_answers: correctAnswers
    });

    console.log('Quiz finished - Session:', sessionId, 'Score:', score, 'Time left:', timeLeft, 'Correct:', correctAnswers);

    return { success: true, sessionId, score, time_left: timeLeft };
  },

  async getHistory() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const sessions = DB.filter('quiz_sessions', s => s.user_id === payload.id);
    
    // Add questions to each session
    const sessionsWithQuestions = sessions.map(session => {
      const questions = DB.filter('quiz_questions', q => q.session_id === session.id);
      return {
        ...session,
        questions: questions.map(q => ({
          question_number: q.question_number,
          question: q.question,
          correct_answer: q.correct_answer,
          user_answer: q.user_answer,
          is_correct: q.is_correct
        }))
      };
    });

    // Sort by date descending
    sessionsWithQuestions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return sessionsWithQuestions;
  },

  async deleteSession(sessionId) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    // Delete questions first
    const questions = DB.filter('quiz_questions', q => q.session_id === sessionId);
    questions.forEach(q => DB.delete('quiz_questions', q.id));
    
    // Delete session
    DB.delete('quiz_sessions', sessionId);
    
    return { success: true };
  },

  // Generate quiz questions
  async generateQuiz(difficulty, count = 10, category = 'mixed') {
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new Error('Invalid difficulty level');
    }

    const validCategories = ['addition', 'subtraction', 'multiplication', 'division', 'mixed'];
    if (!validCategories.includes(category)) {
      throw new Error('Invalid category');
    }

    const questionCount = Math.min(Math.max(count, 1), 50);
    let maxNum = 50;
    if (difficulty === 'easy') maxNum = 20;
    else if (difficulty === 'medium') maxNum = 50;
    else maxNum = 100;

    const operations = category === 'mixed'
      ? ['+', '-', '×', '÷']
      : [category === 'addition' ? '+' : category === 'subtraction' ? '-' : category === 'multiplication' ? '×' : '÷'];

    const questions = [];

    for (let i = 0; i < questionCount; i++) {
      let operator, num1, num2, correctAnswer;

      const selectedOp = operations[Math.floor(Math.random() * operations.length)];

      switch (selectedOp) {
        case '+':
          operator = '+';
          num1 = Math.floor(Math.random() * maxNum) + 1;
          num2 = Math.floor(Math.random() * maxNum) + 1;
          correctAnswer = num1 + num2;
          break;
        case '-':
          operator = '−';
          num1 = Math.floor(Math.random() * maxNum) + 1;
          num2 = Math.floor(Math.random() * num1) + 1;
          correctAnswer = num1 - num2;
          break;
        case '×':
          operator = '×';
          const multMax = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 15;
          num1 = Math.floor(Math.random() * multMax) + 1;
          num2 = Math.floor(Math.random() * multMax) + 1;
          correctAnswer = num1 * num2;
          break;
        case '÷':
          operator = '÷';
          const divMax = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 15;
          num2 = Math.floor(Math.random() * divMax) + 1;
          correctAnswer = Math.floor(Math.random() * divMax) + 1;
          num1 = num2 * correctAnswer;
          break;
        default:
          operator = '+';
          num1 = Math.floor(Math.random() * 20) + 1;
          num2 = Math.floor(Math.random() * 20) + 1;
          correctAnswer = num1 + num2;
      }

      questions.push({
        num1,
        num2,
        operator,
        correctAnswer,
        question: `${num1} ${operator} ${num2} = ?`
      });
    }

    return { success: true, questions, category, difficulty };
  },

  // Save quiz score (legacy endpoint)
  async saveScore(score, correctAnswers, totalQuestions, difficulty, questions) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');

    const sessionId = DB.insert('quiz_sessions', {
      user_id: payload.id,
      difficulty: difficulty,
      category: 'mixed',
      score: score,
      time_left: 0,
      total_questions: totalQuestions,
      correct_answers: correctAnswers
    });

    // Save questions if provided
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        DB.insert('quiz_questions', {
          session_id: sessionId,
          question_number: q.questionNumber,
          question: q.question,
          correct_answer: q.correctAnswer,
          user_answer: q.userAnswer,
          is_correct: q.isCorrect ? 1 : 0
        });
      }
    }

    return { success: true, sessionId };
  },

  // Get all scores
  async getScores() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const scores = DB.filter('quiz_sessions', s => s.user_id === payload.id);
    scores.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return scores;
  },

  // Delete all scores
  async deleteAllScores() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    // Delete all sessions and questions
    const sessions = DB.filter('quiz_sessions', s => s.user_id === payload.id);
    sessions.forEach(s => {
      const questions = DB.filter('quiz_questions', q => q.session_id === s.id);
      questions.forEach(q => DB.delete('quiz_questions', q.id));
      DB.delete('quiz_sessions', s.id);
    });
    
    // Reset stats
    const stats = DB.get('user_stats');
    const statIndex = stats.findIndex(s => s.user_id === payload.id);
    if (statIndex !== -1) {
      stats[statIndex] = {
        ...stats[statIndex],
        total_games: 0,
        total_correct: 0,
        total_questions: 0,
        highest_score: 0,
        current_streak: 0,
        longest_streak: 0,
        last_played_date: null,
        addition_correct: 0,
        subtraction_correct: 0,
        multiplication_correct: 0,
        division_correct: 0
      };
      DB.set('user_stats', stats);
    }
    
    // Delete achievements
    const achievements = DB.get('user_achievements');
    DB.set('user_achievements', achievements.filter(a => a.user_id !== payload.id));
    
    return { success: true, message: 'All records, achievements and stats deleted' };
  },

  // Delete latest score
  async deleteLatestScore() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    const sessions = DB.filter('quiz_sessions', s => s.user_id === payload.id);
    if (sessions.length === 0) {
      throw new Error('No score to delete');
    }
    
    // Sort by date and get latest
    sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const latestSession = sessions[0];
    
    // Delete questions
    const questions = DB.filter('quiz_questions', q => q.session_id === latestSession.id);
    questions.forEach(q => DB.delete('quiz_questions', q.id));
    
    // Delete session
    DB.delete('quiz_sessions', latestSession.id);
    
    // Recalculate stats
    await this._recalculateStats(payload.id);
    
    return { success: true, message: 'Latest score deleted and stats updated' };
  },

  // Get leaderboard
  async getLeaderboard() {
    const users = DB.get('users').filter(u => !u.is_deleted);
    const rankings = users.map(user => {
      const sessions = DB.filter('quiz_sessions', s => s.user_id === user.id);
      const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
      return {
        user_id: user.id,
        username: user.name,
        totalScore,
        gamesPlayed: sessions.length
      };
    });
    
    rankings.sort((a, b) => b.totalScore - a.totalScore);
    return rankings.slice(0, 10);
  },

  // ============ STATS & ACHIEVEMENTS ============

  async getStats() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    let stats = DB.find('user_stats', s => s.user_id === payload.id);
    
    if (!stats) {
      this._initUserStats(payload.id);
      stats = DB.find('user_stats', s => s.user_id === payload.id);
    }
    
    const accuracy = stats.total_questions > 0
      ? Math.round((stats.total_correct / stats.total_questions) * 100)
      : 0;
    
    return {
      ...stats,
      accuracy
    };
  },

  async updateStats(score, correctAnswers, totalQuestions, difficulty, category, questions) {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    let stats = DB.find('user_stats', s => s.user_id === payload.id);
    if (!stats) {
      this._initUserStats(payload.id);
      stats = DB.find('user_stats', s => s.user_id === payload.id);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const lastPlayed = stats.last_played_date;
    
    // Calculate streak
    let newStreak = stats.current_streak;
    if (lastPlayed === today) {
      newStreak = stats.current_streak;
    } else if (lastPlayed) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastPlayed === yesterdayStr) {
        newStreak = stats.current_streak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    
    const longestStreak = Math.max(stats.longest_streak, newStreak);
    const highestScore = Math.max(stats.highest_score, score);
    
    // Calculate category-specific stats
    let additionCorrect = stats.addition_correct || 0;
    let subtractionCorrect = stats.subtraction_correct || 0;
    let multiplicationCorrect = stats.multiplication_correct || 0;
    let divisionCorrect = stats.division_correct || 0;
    
    if (questions && Array.isArray(questions)) {
      questions.forEach(q => {
        if (q.isCorrect) {
          switch (q.operation) {
            case 'addition': additionCorrect++; break;
            case 'subtraction': subtractionCorrect++; break;
            case 'multiplication': multiplicationCorrect++; break;
            case 'division': divisionCorrect++; break;
          }
        }
      });
    }
    
    // Update stats
    const newStats = {
      total_games: stats.total_games + 1,
      total_correct: stats.total_correct + correctAnswers,
      total_questions: stats.total_questions + totalQuestions,
      highest_score: highestScore,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_played_date: today,
      addition_correct: additionCorrect,
      subtraction_correct: subtractionCorrect,
      multiplication_correct: multiplicationCorrect,
      division_correct: divisionCorrect
    };
    
    const allStats = DB.get('user_stats');
    const index = allStats.findIndex(s => s.user_id === payload.id);
    if (index !== -1) {
      allStats[index] = { ...allStats[index], ...newStats };
      DB.set('user_stats', allStats);
    }
    
    // Check for new achievements
    const newAchievements = await this._checkAchievements(payload.id, score, correctAnswers, totalQuestions, newStreak, questions);
    
    return {
      success: true,
      stats: {
        totalGames: newStats.total_games,
        totalCorrect: newStats.total_correct,
        totalQuestions: newStats.total_questions,
        highestScore: newStats.highest_score,
        currentStreak: newStreak,
        longestStreak: longestStreak
      },
      newAchievements
    };
  },

  async _recalculateStats(userId) {
    const sessions = DB.filter('quiz_sessions', s => s.user_id === userId);
    
    let totalGames = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    let highestScore = 0;
    
    sessions.forEach(session => {
      totalGames++;
      const questions = DB.filter('quiz_questions', q => q.session_id === session.id);
      questions.forEach(q => {
        totalQuestions++;
        if (q.is_correct) totalCorrect++;
      });
      if (session.score > highestScore) highestScore = session.score;
    });
    
    const stats = DB.get('user_stats');
    const index = stats.findIndex(s => s.user_id === userId);
    if (index !== -1) {
      stats[index] = {
        ...stats[index],
        total_games: totalGames,
        total_correct: totalCorrect,
        total_questions: totalQuestions,
        highest_score: highestScore
      };
      DB.set('user_stats', stats);
    }
  },

  async _checkAchievements(userId, score, correctAnswers, totalQuestions, streak, questions) {
    initAchievements();
    
    const stats = DB.find('user_stats', s => s.user_id === userId);
    const earnedAchievements = [];
    
    // Get current earned achievements
    const userAchievements = DB.get('user_achievements');
    const earnedIds = userAchievements
      .filter(ua => ua.user_id === userId)
      .map(ua => ua.achievement_id);
    
    const allAchievements = DB.get('achievements');
    
    // Check each achievement
    for (const achievement of allAchievements) {
      if (earnedIds.includes(achievement.id)) continue;
      
      let earned = false;
      
      switch (achievement.requirement_type) {
        case 'games':
          earned = (stats.total_games + 1) >= achievement.requirement_value;
          break;
        case 'perfect':
          earned = correctAnswers === totalQuestions && totalQuestions > 0;
          break;
        case 'streak':
          earned = streak >= achievement.requirement_value;
          break;
        case 'correct':
          earned = (stats.total_correct + correctAnswers) >= achievement.requirement_value;
          break;
        case 'score':
          earned = score >= achievement.requirement_value;
          break;
        case 'addition':
          earned = ((stats.addition_correct || 0) + (questions ? questions.filter(q => q.operation === 'addition' && q.isCorrect).length : 0)) >= achievement.requirement_value;
          break;
        case 'subtraction':
          earned = ((stats.subtraction_correct || 0) + (questions ? questions.filter(q => q.operation === 'subtraction' && q.isCorrect).length : 0)) >= achievement.requirement_value;
          break;
        case 'multiplication':
          earned = ((stats.multiplication_correct || 0) + (questions ? questions.filter(q => q.operation === 'multiplication' && q.isCorrect).length : 0)) >= achievement.requirement_value;
          break;
        case 'division':
          earned = ((stats.division_correct || 0) + (questions ? questions.filter(q => q.operation === 'division' && q.isCorrect).length : 0)) >= achievement.requirement_value;
          break;
      }
      
      if (earned) {
        userAchievements.push({
          id: DB.generateId(),
          user_id: userId,
          achievement_id: achievement.id,
          earned_at: new Date().toISOString()
        });
        DB.set('user_achievements', userAchievements);
        earnedAchievements.push(achievement);
      }
    }
    
    return earnedAchievements;
  },

  async getAchievements() {
    const payload = this._verifyToken();
    if (!payload) throw new Error('Not authenticated');
    
    initAchievements();
    
    const allAchievements = DB.get('achievements');
    const userAchievements = DB.get('user_achievements');
    
    return allAchievements.map(a => {
      const userAch = userAchievements.find(
        ua => ua.user_id === payload.id && ua.achievement_id === a.id
      );
      
      return {
        ...a,
        earned: !!userAch,
        earnedAt: userAch ? userAch.earned_at : null
      };
    });
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Initialize database on first load
  init() {
    initAchievements();
    console.log('LocalStorage API initialized');
  }
};

// Initialize on load
api.init();

// Make api available globally
window.api = api;
