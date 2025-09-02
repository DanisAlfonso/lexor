import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import { createWriteStream, existsSync, createReadStream } from 'fs';
import { mkdir, access, unlink, readdir, stat } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { Extract } from 'unzipper';
import https from 'https';

interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule: {
    id: string;
    description: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
  language: {
    name: string;
    code: string;
  };
}

export class LanguageToolServer {
  private serverProcess: ChildProcess | null = null;
  private serverPort = 8081;
  private serverUrl = `http://localhost:${this.serverPort}`;
  private isServerRunning = false;
  private languageToolPath: string;
  private languageToolVersion = '6.5';

  constructor() {
    this.languageToolPath = join(app.getPath('userData'), 'languagetool');
  }

  async checkJavaInstalled(): Promise<{ installed: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const java = spawn('java', ['-version']);
      let output = '';
      
      java.stderr.on('data', (data) => {
        output += data.toString();
      });

      java.on('close', (code) => {
        if (code === 0) {
          // Extract Java version from output
          const versionMatch = output.match(/version "(.+?)"/);
          resolve({ 
            installed: true, 
            version: versionMatch ? versionMatch[1] : 'unknown' 
          });
        } else {
          resolve({ 
            installed: false, 
            error: 'Java not found. Please install Java 8 or later.' 
          });
        }
      });

      java.on('error', () => {
        resolve({ 
          installed: false, 
          error: 'Java not found. Please install Java 8 or later.' 
        });
      });
    });
  }

  private async downloadLanguageTool(): Promise<boolean> {
    try {
      // Ensure languagetool directory exists
      await mkdir(this.languageToolPath, { recursive: true });

      const downloadUrl = `https://languagetool.org/download/LanguageTool-${this.languageToolVersion}.zip`;
      const zipPath = join(this.languageToolPath, `LanguageTool-${this.languageToolVersion}.zip`);

      // Check if already downloaded
      if (existsSync(zipPath)) {
        console.log('LanguageTool already downloaded');
        return true;
      }

      console.log('Downloading LanguageTool...');
      
      return new Promise((resolve, reject) => {
        https.get(downloadUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          const fileStream = createWriteStream(zipPath);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            console.log('LanguageTool downloaded successfully');
            resolve(true);
          });

          fileStream.on('error', (err) => {
            reject(err);
          });
        }).on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      console.error('Failed to download LanguageTool:', error);
      return false;
    }
  }

  private async extractLanguageTool(): Promise<boolean> {
    try {
      const zipPath = join(this.languageToolPath, `LanguageTool-${this.languageToolVersion}.zip`);
      const extractPath = this.languageToolPath;

      // Check if already extracted
      const serverJarPath = join(extractPath, `LanguageTool-${this.languageToolVersion}`, 'languagetool-server.jar');
      if (existsSync(serverJarPath)) {
        console.log('LanguageTool already extracted');
        return true;
      }

      console.log('Extracting LanguageTool...');
      
      return new Promise((resolve, reject) => {
        createReadStream(zipPath)
          .pipe(Extract({ path: extractPath }))
          .on('close', () => {
            console.log('LanguageTool extracted successfully');
            resolve(true);
          })
          .on('error', (err) => {
            console.error('Extraction error:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error('Failed to extract LanguageTool:', error);
      return false;
    }
  }

  async initializeServer(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check Java installation
      const javaCheck = await this.checkJavaInstalled();
      if (!javaCheck.installed) {
        return { success: false, error: javaCheck.error };
      }

      console.log(`Java found: ${javaCheck.version}`);

      // Download LanguageTool if needed
      const downloaded = await this.downloadLanguageTool();
      if (!downloaded) {
        return { success: false, error: 'Failed to download LanguageTool' };
      }

      // Extract LanguageTool if needed
      const extracted = await this.extractLanguageTool();
      if (!extracted) {
        return { success: false, error: 'Failed to extract LanguageTool' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to initialize LanguageTool server:', error);
      return { success: false, error: error.message };
    }
  }

  async startServer(): Promise<{ success: boolean; error?: string }> {
    if (this.isServerRunning && this.serverProcess) {
      return { success: true };
    }

    try {
      const serverJarPath = join(
        this.languageToolPath, 
        `LanguageTool-${this.languageToolVersion}`, 
        'languagetool-server.jar'
      );

      if (!existsSync(serverJarPath)) {
        return { success: false, error: 'LanguageTool server jar not found' };
      }

      console.log('Starting LanguageTool server...');
      
      this.serverProcess = spawn('java', [
        '-cp', serverJarPath,
        'org.languagetool.server.HTTPServer',
        '--port', this.serverPort.toString(),
        '--allow-origin', '*',
        '--public'
      ]);

      // Wait for server to start
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 30000);

        this.serverProcess!.stdout?.on('data', (data) => {
          const output = data.toString();
          console.log('LanguageTool:', output);
          
          if (output.includes('Server started')) {
            clearTimeout(timeout);
            this.isServerRunning = true;
            resolve();
          }
        });

        this.serverProcess!.stderr?.on('data', (data) => {
          console.error('LanguageTool error:', data.toString());
        });

        this.serverProcess!.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        this.serverProcess!.on('exit', (code) => {
          console.log(`LanguageTool server exited with code ${code}`);
          this.isServerRunning = false;
          this.serverProcess = null;
        });
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to start LanguageTool server:', error);
      return { success: false, error: error.message };
    }
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      this.isServerRunning = false;
      console.log('LanguageTool server stopped');
    }
  }

  async checkText(text: string, language = 'auto'): Promise<LanguageToolResponse> {
    if (!this.isServerRunning) {
      throw new Error('LanguageTool server is not running');
    }

    const response = await fetch(`${this.serverUrl}/v2/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }

    return response.json();
  }

  async getSupportedLanguages(): Promise<any[]> {
    if (!this.isServerRunning) {
      throw new Error('LanguageTool server is not running');
    }

    const response = await fetch(`${this.serverUrl}/v2/languages`);
    
    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }

    return response.json();
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}