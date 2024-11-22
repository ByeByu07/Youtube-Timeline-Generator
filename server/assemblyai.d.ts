declare module 'assemblyai' {
  export class AssemblyAI {
    constructor(config: { apiKey: string });
    transcribe(params: {
      audio: Int16Array;
      sample_rate: number;
    }): Promise<{
      text: string;
    }>;
  }
}
