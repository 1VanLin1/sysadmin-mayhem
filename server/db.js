import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

class Database {
  constructor() {
    this.users = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((u) => {
            this.users.set(u.username.toLowerCase(), u);
          });
        }
      } else {
        // Add default sample leaderboard entries for atmosphere
        const defaults = [
          { username: 'root_admin', color: '#6366f1', highScore: 1850, totalRepairs: 42, wins: 15, gamesPlayed: 18 },
          { username: 'kernel_panic', color: '#e11d48', highScore: 1420, totalRepairs: 31, wins: 9, gamesPlayed: 14 },
          { username: 'devops_ninja', color: '#10b981', highScore: 1100, totalRepairs: 24, wins: 6, gamesPlayed: 10 }
        ];
        defaults.forEach((d) => {
          const salt = crypto.randomBytes(16).toString('hex');
          const passwordHash = this.hashPassword('123456', salt);
          this.users.set(d.username.toLowerCase(), {
            ...d,
            id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            salt,
            passwordHash,
            createdAt: new Date().toISOString()
          });
        });
        this.save();
      }
    } catch (e) {
      console.error('Error loading DB:', e);
    }
  }

  save() {
    try {
      const data = {
        users: Array.from(this.users.values())
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving DB:', e);
    }
  }

  hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  register(username, password, color = '#6366f1') {
    const cleanUser = (username || '').trim();
    if (!cleanUser || cleanUser.length < 2) {
      return { success: false, error: 'Имя пользователя должно содержать минимум 2 символа' };
    }
    if (!password || password.length < 3) {
      return { success: false, error: 'Пароль должен содержать минимум 3 символа' };
    }

    const key = cleanUser.toLowerCase();
    if (this.users.has(key)) {
      return { success: false, error: 'Пользователь с таким именем уже зарегистрирован' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      salt,
      passwordHash,
      color,
      highScore: 0,
      totalRepairs: 0,
      wins: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString()
    };

    this.users.set(key, user);
    this.save();

    const sanitized = this.sanitizeUser(user);
    return { success: true, user: sanitized };
  }

  login(username, password) {
    const cleanUser = (username || '').trim();
    const key = cleanUser.toLowerCase();
    const user = this.users.get(key);

    if (!user) {
      return { success: false, error: 'Пользователь с таким именем не найден' };
    }

    const checkHash = this.hashPassword(password, user.salt);
    if (checkHash !== user.passwordHash) {
      return { success: false, error: 'Неверный пароль' };
    }

    return { success: true, user: this.sanitizeUser(user) };
  }

  updateStats(username, score = 0, repairs = 0, won = false) {
    if (!username) return;
    const key = username.toLowerCase();
    const user = this.users.get(key);
    if (!user) return;

    user.highScore = Math.max(user.highScore || 0, score);
    user.totalRepairs = (user.totalRepairs || 0) + repairs;
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    if (won) {
      user.wins = (user.wins || 0) + 1;
    }

    this.save();
  }

  getLeaderboard(limit = 25) {
    const list = Array.from(this.users.values()).map((u) => this.sanitizeUser(u));
    list.sort((a, b) => {
      if (b.highScore !== a.highScore) return b.highScore - a.highScore;
      if (b.totalRepairs !== a.totalRepairs) return b.totalRepairs - a.totalRepairs;
      return b.wins - a.wins;
    });
    return list.slice(0, limit);
  }

  sanitizeUser(user) {
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }
}

export const db = new Database();
