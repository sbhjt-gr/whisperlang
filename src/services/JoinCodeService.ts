// Global map to store active codes
const activeCodes = new Map<string, any>();

export const joinCodeService = {
  generateJoinCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  registerCode(code: string, callData: any): void {
    const registrationData = {
      ...callData,
      createdAt: Date.now(),
      active: true
    };
    activeCodes.set(code, registrationData);
  },

  isValidCode(code: string): boolean {
    const callData = activeCodes.get(code);
    if (!callData) {
      return false;
    }

    const isExpired = Date.now() - callData.createdAt > 3600000;
    if (isExpired) {
      activeCodes.delete(code);
      return false;
    }

    return callData.active;
  },

  getCallData(code: string): any | null {
    if (!this.isValidCode(code)) return null;
    return activeCodes.get(code);
  },

  deactivateCode(code: string): void {
    const callData = activeCodes.get(code);
    if (callData) {
      callData.active = false;
      activeCodes.set(code, callData);
    }
  },

  removeCode(code: string): void {
    activeCodes.delete(code);
  },

  getAllActiveCodes(): string[] {
    const allCodes = Array.from(activeCodes.keys());
    return allCodes.filter(code => {
      const callData = activeCodes.get(code);
      if (!callData) return false;
      const isExpired = Date.now() - callData.createdAt > 3600000;
      return !isExpired && callData.active;
    });
  }
};