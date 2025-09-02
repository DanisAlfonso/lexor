export interface GrammarMatch {
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

export interface GrammarCheckResponse {
  matches: GrammarMatch[];
  language: {
    name: string;
    code: string;
  };
}

export interface GrammarServiceStatus {
  initialized: boolean;
  serverRunning: boolean;
  error?: string;
  javaInstalled?: boolean;
  javaVersion?: string;
}

export class GrammarService {
  private static instance: GrammarService | null = null;
  private status: GrammarServiceStatus = { initialized: false, serverRunning: false };
  private checkCache = new Map<string, { result: GrammarCheckResponse; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private isInitializing = false;

  static getInstance(): GrammarService {
    if (!GrammarService.instance) {
      GrammarService.instance = new GrammarService();
    }
    return GrammarService.instance;
  }

  private constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Check Java installation
      const javaCheck = await window.electronAPI.languageTool.checkJava();
      this.status.javaInstalled = javaCheck.installed;
      this.status.javaVersion = javaCheck.version;

      if (!javaCheck.installed) {
        this.status.error = javaCheck.error || 'Java not installed';
        this.isInitializing = false;
        return;
      }

      console.log('Java found:', javaCheck.version);

      // Initialize LanguageTool server
      const initResult = await window.electronAPI.languageTool.initialize();
      if (!initResult.success) {
        this.status.error = initResult.error || 'Failed to initialize LanguageTool';
        this.isInitializing = false;
        return;
      }

      console.log('LanguageTool initialized successfully');

      // Start the server
      const startResult = await window.electronAPI.languageTool.start();
      if (!startResult.success) {
        this.status.error = startResult.error || 'Failed to start LanguageTool server';
        this.isInitializing = false;
        return;
      }

      console.log('LanguageTool server started successfully');

      this.status.initialized = true;
      this.status.serverRunning = true;
      this.status.error = undefined;
    } catch (error: any) {
      console.error('Failed to initialize grammar service:', error);
      this.status.error = error.message;
    }

    this.isInitializing = false;
  }

  async getStatus(): Promise<GrammarServiceStatus> {
    // Update server status
    try {
      const serverStatus = await window.electronAPI.languageTool.getStatus();
      this.status.serverRunning = serverStatus.running;
    } catch (error) {
      this.status.serverRunning = false;
    }

    return { ...this.status };
  }

  async checkText(text: string, language = 'auto'): Promise<GrammarCheckResponse> {
    if (!this.status.initialized || !this.status.serverRunning) {
      throw new Error('Grammar service not initialized or server not running');
    }

    // Check cache
    const cacheKey = `${text.substring(0, 100)}:${language}`;
    const cached = this.checkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    try {
      const result = await window.electronAPI.languageTool.check(text, language);
      
      // Cache the result
      this.checkCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this.cleanCache();

      return result;
    } catch (error: any) {
      console.error('Grammar check failed:', error);
      throw new Error(`Grammar check failed: ${error.message}`);
    }
  }

  async getSupportedLanguages(): Promise<any[]> {
    if (!this.status.initialized || !this.status.serverRunning) {
      throw new Error('Grammar service not initialized or server not running');
    }

    try {
      return await window.electronAPI.languageTool.getSupportedLanguages();
    } catch (error: any) {
      console.error('Failed to get supported languages:', error);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }

  async restart(): Promise<void> {
    try {
      await window.electronAPI.languageTool.stop();
      this.status.serverRunning = false;
      
      const startResult = await window.electronAPI.languageTool.start();
      if (startResult.success) {
        this.status.serverRunning = true;
        this.status.error = undefined;
      } else {
        this.status.error = startResult.error;
        throw new Error(startResult.error);
      }
    } catch (error: any) {
      this.status.error = error.message;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await window.electronAPI.languageTool.stop();
      this.status.serverRunning = false;
    } catch (error: any) {
      console.error('Failed to stop grammar service:', error);
      throw error;
    }
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.checkCache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.checkCache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.checkCache.clear();
  }

  // Static method to check text without creating/maintaining instance
  static async quickCheck(text: string, language = 'auto'): Promise<GrammarCheckResponse> {
    const service = GrammarService.getInstance();
    return await service.checkText(text, language);
  }
}