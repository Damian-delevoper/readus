/**
 * Reading Statistics Service
 * Tracks reading sessions and calculates statistics
 */

import { getDatabase, waitForDatabase } from './database';

export interface ReadingSession {
  id: string;
  documentId: string;
  startTime: string;
  endTime: string | null;
  pagesRead: number;
  wordsRead: number;
  durationSeconds: number;
}

export interface ReadingStats {
  totalReadingTime: number; // in seconds
  totalPagesRead: number;
  totalWordsRead: number;
  averageReadingSpeed: number; // words per minute
  readingStreak: number; // consecutive days
  sessionsToday: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  mostReadDocument: {
    id: string;
    title: string;
    timeSpent: number;
  } | null;
}

/**
 * Start a reading session
 */
export async function startReadingSession(documentId: string): Promise<string> {
  await waitForDatabase();
  const database = getDatabase();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.runAsync(
    `INSERT INTO reading_sessions (id, documentId, startTime, pagesRead, wordsRead, durationSeconds)
     VALUES (?, ?, ?, 0, 0, 0)`,
    [sessionId, documentId, new Date().toISOString()]
  );
  
  return sessionId;
}

/**
 * End a reading session
 */
export async function endReadingSession(
  sessionId: string,
  pagesRead: number,
  wordsRead: number
): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  
  // Get start time to calculate duration
  const session = await database.getFirstAsync(
    'SELECT startTime FROM reading_sessions WHERE id = ?',
    [sessionId]
  );
  
  if (session) {
    const startTime = new Date(session.startTime);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    await database.runAsync(
      `UPDATE reading_sessions 
       SET endTime = ?, pagesRead = ?, wordsRead = ?, durationSeconds = ?
       WHERE id = ?`,
      [endTime.toISOString(), pagesRead, wordsRead, durationSeconds, sessionId]
    );
  }
}

/**
 * Get reading statistics
 */
export async function getReadingStats(): Promise<ReadingStats> {
  await waitForDatabase();
  const database = getDatabase();
  
  // Get all sessions
  const allSessions = await database.getAllAsync(
    'SELECT * FROM reading_sessions WHERE endTime IS NOT NULL'
  ) as ReadingSession[];
  
  const totalReadingTime = allSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const totalPagesRead = allSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
  const totalWordsRead = allSessions.reduce((sum, s) => sum + (s.wordsRead || 0), 0);
  
  // Calculate average reading speed (WPM)
  const totalMinutes = totalReadingTime / 60;
  const averageReadingSpeed = totalMinutes > 0 ? Math.round(totalWordsRead / totalMinutes) : 0;
  
  // Calculate reading streak
  const readingStreak = await calculateReadingStreak(database);
  
  // Get sessions for today, this week, this month
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const sessionsToday = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM reading_sessions WHERE startTime >= ?',
    [todayStart]
  ) as { count: number };
  
  const sessionsThisWeek = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM reading_sessions WHERE startTime >= ?',
    [weekStart]
  ) as { count: number };
  
  const sessionsThisMonth = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM reading_sessions WHERE startTime >= ?',
    [monthStart]
  ) as { count: number };
  
  // Get most read document
  const mostRead = await database.getFirstAsync(
    `SELECT d.id, d.title, SUM(rs.durationSeconds) as totalTime
     FROM documents d
     JOIN reading_sessions rs ON rs.documentId = d.id
     WHERE rs.endTime IS NOT NULL
     GROUP BY d.id, d.title
     ORDER BY totalTime DESC
     LIMIT 1`
  ) as { id: string; title: string; totalTime: number } | null;
  
  return {
    totalReadingTime,
    totalPagesRead,
    totalWordsRead,
    averageReadingSpeed,
    readingStreak,
    sessionsToday: sessionsToday?.count || 0,
    sessionsThisWeek: sessionsThisWeek?.count || 0,
    sessionsThisMonth: sessionsThisMonth?.count || 0,
    mostReadDocument: mostRead ? {
      id: mostRead.id,
      title: mostRead.title,
      timeSpent: mostRead.totalTime,
    } : null,
  };
}

/**
 * Calculate reading streak (consecutive days with reading)
 */
async function calculateReadingStreak(database: any): Promise<number> {
  try {
    const sessions = await database.getAllAsync(
      `SELECT DISTINCT DATE(startTime) as date
       FROM reading_sessions
       WHERE endTime IS NOT NULL
       ORDER BY date DESC`
    ) as { date: string }[];
    
    if (sessions.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].date);
      sessionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  } catch (error) {
    console.error('Error calculating reading streak:', error);
    return 0;
  }
}

/**
 * Get reading sessions for a document
 */
export async function getDocumentSessions(documentId: string): Promise<ReadingSession[]> {
  await waitForDatabase();
  const database = getDatabase();
  return await database.getAllAsync(
    'SELECT * FROM reading_sessions WHERE documentId = ? ORDER BY startTime DESC',
    [documentId]
  ) as ReadingSession[];
}

/**
 * Get daily reading time for the last N days
 */
export async function getDailyReadingTime(days: number = 30): Promise<Array<{ date: string; seconds: number }>> {
  await waitForDatabase();
  const database = getDatabase();
  
  const results = await database.getAllAsync(
    `SELECT DATE(startTime) as date, SUM(durationSeconds) as seconds
     FROM reading_sessions
     WHERE endTime IS NOT NULL
       AND startTime >= datetime('now', '-' || ? || ' days')
     GROUP BY DATE(startTime)
     ORDER BY date DESC`,
    [days]
  ) as Array<{ date: string; seconds: number }>;
  
  return results;
}
