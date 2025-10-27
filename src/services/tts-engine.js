/**
 * Text-to-Speech エンジン
 * macOSのsayコマンドを使用してテキストを読み上げ
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class TTSEngine {
  constructor() {
    this.currentProcess = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.voice = 'Kyoko';
    this.speed = 2.0;
    this.onComplete = null;
    this.onError = null;
  }

  /**
   * テキストを読み上げ
   */
  async speak(text) {
    if (this.isPlaying) {
      await this.stop();
    }

    return new Promise((resolve, reject) => {
      if (!text || text.trim().length === 0) {
        resolve();
        return;
      }

      this.isPlaying = true;
      this.isPaused = false;

      // 読み上げ速度を計算（wpm）
      const rate = Math.round(175 * this.speed);

      // テキストをエスケープ
      const escapedText = text.replace(/"/g, '\\"');

      // sayコマンドで読み上げ
      this.currentProcess = spawn('say', [
        '-v', this.voice,
        '-r', rate.toString(),
        escapedText
      ]);

      this.currentProcess.on('close', (code) => {
        this.isPlaying = false;
        this.currentProcess = null;

        if (code === 0) {
          if (this.onComplete) {
            this.onComplete();
          }
          resolve();
        } else {
          const error = new Error(`say command exited with code ${code}`);
          if (this.onError) {
            this.onError(error);
          }
          reject(error);
        }
      });

      this.currentProcess.on('error', (error) => {
        this.isPlaying = false;
        this.currentProcess = null;

        if (this.onError) {
          this.onError(error);
        }
        reject(error);
      });
    });
  }

  /**
   * 読み上げを停止
   */
  async stop() {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }

    this.isPlaying = false;
    this.isPaused = false;
  }

  /**
   * 一時停止（macOS sayコマンドは一時停止非対応なので停止として扱う）
   */
  async pause() {
    await this.stop();
    this.isPaused = true;
  }

  /**
   * 再開（一時停止位置からの再開は非対応）
   */
  async resume() {
    // sayコマンドでは一時停止位置からの再開ができないため
    // アプリケーション側で管理する必要がある
    this.isPaused = false;
  }

  /**
   * 音声を設定
   */
  setVoice(voice) {
    this.voice = voice;
  }

  /**
   * 速度を設定
   */
  setSpeed(speed) {
    this.speed = parseFloat(speed);
  }

  /**
   * 利用可能な音声のリストを取得
   */
  static async getAvailableVoices() {
    try {
      const { stdout } = await execAsync('say -v "?"');
      const voices = stdout.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          const match = line.match(/^(\S+)/);
          if (match) {
            return {
              name: match[1],
              fullLine: line.trim()
            };
          }
          return null;
        })
        .filter(v => v !== null);

      return voices;
    } catch (error) {
      console.error('Error getting voices:', error);
      return [
        { name: 'Kyoko', fullLine: 'Kyoko (Japanese)' },
        { name: 'Otoya', fullLine: 'Otoya (Japanese)' },
        { name: 'Alex', fullLine: 'Alex (English)' },
        { name: 'Samantha', fullLine: 'Samantha (English)' }
      ];
    }
  }

  /**
   * 完了時のコールバックを設定
   */
  setOnComplete(callback) {
    this.onComplete = callback;
  }

  /**
   * エラー時のコールバックを設定
   */
  setOnError(callback) {
    this.onError = callback;
  }

  /**
   * 再生状態を取得
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      voice: this.voice,
      speed: this.speed
    };
  }
}

module.exports = TTSEngine;
