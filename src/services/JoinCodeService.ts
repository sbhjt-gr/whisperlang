export class JoinCodeService {
  private static instance: JoinCodeService;
  private activeCodes: Map<string, any> = new Map();

  static getInstance(): JoinCodeService {
    if (!JoinCodeService.instance) {
      JoinCodeService.instance = new JoinCodeService();
    }
    return JoinCodeService.instance;
  }

  generateJoinCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  registerCode(code: string, callData: any): void {
    this.activeCodes.set(code, {
      ...callData,
      createdAt: Date.now(),
      active: true
    });
  }

  isValidCode(code: string): boolean {
    const callData = this.activeCodes.get(code);
    if (!callData) return false;

    const isExpired = Date.now() - callData.createdAt > 3600000;
    if (isExpired) {
      this.activeCodes.delete(code);
      return false;
    }

    return callData.active;
  }

  getCallData(code: string): any | null {
    if (!this.isValidCode(code)) return null;
    return this.activeCodes.get(code);
  }

  deactivateCode(code: string): void {
    const callData = this.activeCodes.get(code);
    if (callData) {
      callData.active = false;
      this.activeCodes.set(code, callData);
    }
  }

  removeCode(code: string): void {
    this.activeCodes.delete(code);
  }

  getAllActiveCodes(): string[] {
    return Array.from(this.activeCodes.keys()).filter(code => this.isValidCode(code));
  }
}

export const joinCodeService = JoinCodeService.getInstance();