/**
 * Highly efficient and accurate Web Speech API interface for Zenvego Voice Commands.
 * Seamlessly manages browser differences (SpeechRecognition / webkitSpeechRecognition)
 * and outputs clean transcripts with error recovery.
 */

export interface SpeechListenOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
  onStart?: () => void;
  lang?: string;
}

class SpeechService {
  private recognition: any = null;
  private isListeningActive: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  /**
   * Checks if the Web Speech API is supported in the current environment
   */
  public isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Starts a focused listening session
   */
  public listen(options: SpeechListenOptions): () => void {
    if (!this.recognition) {
      if (options.onError) {
        options.onError(new Error('Speech recognition not supported in this browser. Please use Chrome, Safari or Edge.'));
      }
      return () => {};
    }

    // If already active, abort first
    if (this.isListeningActive) {
      this.stop();
    }

    this.isListeningActive = true;

    if (options.lang) {
      this.recognition.lang = options.lang;
    }

    // Set callbacks
    if (options.onStart) {
      this.recognition.onstart = () => {
        options.onStart?.();
      };
    }

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeTranscript = finalTranscript || interimTranscript;
      options.onResult(activeTranscript, !!finalTranscript);
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error event:', event);
      if (options.onError) {
        options.onError(event);
      }
      this.isListeningActive = false;
    };

    this.recognition.onend = () => {
      this.isListeningActive = false;
      if (options.onEnd) {
        options.onEnd();
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      options.onError?.(e);
      this.isListeningActive = false;
    }

    // Return an easy cleanup function
    return () => {
      this.stop();
    };
  }

  /**
   * Stops the active recognition
   */
  public stop() {
    if (this.recognition && this.isListeningActive) {
      try {
        this.recognition.abort();
      } catch (e) {
        console.warn('Silent issue aborting recognition:', e);
      }
      this.isListeningActive = false;
    }
  }
}

export const speechService = new SpeechService();
