/**
 * Text-to-Speech エンジン
 * クロスプラットフォーム対応（macOS, Windows, Linux）
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

class TTSEngine {
  constructor() {
    this.currentProcess = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.platform = os.platform();

    // プラットフォーム別のデフォルト音声
    if (this.platform === 'win32') {
      this.voice = 'Microsoft Haruka Desktop'; // Windows日本語音声
    } else if (this.platform === 'darwin') {
      this.voice = 'Kyoko'; // macOS日本語音声
    } else {
      this.voice = 'ja'; // Linux (espeak)
    }

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

      try {
        if (this.platform === 'darwin') {
          // macOS - say command
          this.speakMacOS(text, resolve, reject);
        } else if (this.platform === 'win32') {
          // Windows - PowerShell Add-Type System.Speech
          this.speakWindows(text, resolve, reject);
        } else {
          // Linux - espeak or festival
          this.speakLinux(text, resolve, reject);
        }
      } catch (error) {
        this.isPlaying = false;
        if (this.onError) {
          this.onError(error);
        }
        reject(error);
      }
    });
  }

  /**
   * macOSで読み上げ
   */
  speakMacOS(text, resolve, reject) {
    const rate = Math.round(175 * this.speed);
    const escapedText = text.replace(/"/g, '\\"');

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
  }

  /**
   * Windowsで読み上げ
   */
  speakWindows(text, resolve, reject) {
    // PowerShellスクリプトでSpeechSynthesizerを使用
    const rate = Math.round((this.speed - 1) * 10); // -10 to 10
    const escapedText = text.replace(/'/g, "''").replace(/`/g, '``');

    const psScript = `
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.SelectVoice('${this.voice}');
$synth.Rate = ${rate};
$synth.Speak('${escapedText}');
`;

    this.currentProcess = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript
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
        const error = new Error(`PowerShell TTS exited with code ${code}`);
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
  }

  /**
   * Linuxで読み上げ
   */
  speakLinux(text, resolve, reject) {
    // espeak を使用（インストール必要: sudo apt-get install espeak）
    const rate = Math.round(175 * this.speed);

    this.currentProcess = spawn('espeak', [
      '-v', this.voice,
      '-s', rate.toString(),
      text
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
        const error = new Error(`espeak exited with code ${code}`);
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
    const platform = os.platform();

    try {
      if (platform === 'darwin') {
        // macOS
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
      } else if (platform === 'win32') {
        // Windows
        const psScript = `
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
`;
        const { stdout } = await execAsync(`powershell.exe -NoProfile -NonInteractive -Command "${psScript}"`);
        const voices = stdout.split('\n')
          .filter(line => line.trim().length > 0)
          .map(name => ({
            name: name.trim(),
            fullLine: name.trim()
          }));

        return voices.length > 0 ? voices : [
          { name: 'Microsoft Haruka Desktop', fullLine: 'Microsoft Haruka Desktop (Japanese)' },
          { name: 'Microsoft Zira Desktop', fullLine: 'Microsoft Zira Desktop (English)' }
        ];
      } else {
        // Linux
        const { stdout } = await execAsync('espeak --voices');
        const lines = stdout.split('\n').slice(1); // Skip header
        const voices = lines
          .filter(line => line.trim().length > 0)
          .map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              return {
                name: parts[1],
                fullLine: line.trim()
              };
            }
            return null;
          })
          .filter(v => v !== null);

        return voices.length > 0 ? voices : [
          { name: 'ja', fullLine: 'ja (Japanese)' },
          { name: 'en', fullLine: 'en (English)' }
        ];
      }
    } catch (error) {
      console.error('Error getting voices:', error);

      // プラットフォーム別のフォールバック
      if (platform === 'win32') {
        return [
          { name: 'Microsoft Haruka Desktop', fullLine: 'Microsoft Haruka Desktop (Japanese)' },
          { name: 'Microsoft Zira Desktop', fullLine: 'Microsoft Zira Desktop (English)' }
        ];
      } else if (platform === 'darwin') {
        return [
          { name: 'Kyoko', fullLine: 'Kyoko (Japanese)' },
          { name: 'Otoya', fullLine: 'Otoya (Japanese)' },
          { name: 'Alex', fullLine: 'Alex (English)' },
          { name: 'Samantha', fullLine: 'Samantha (English)' }
        ];
      } else {
        return [
          { name: 'ja', fullLine: 'ja (Japanese)' },
          { name: 'en', fullLine: 'en (English)' }
        ];
      }
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
