export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

export const validatePassword = (password: string): { valid: boolean; message?: string; isWeak?: boolean } => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length < 8) {
    return { 
      valid: true, 
      isWeak: true, 
      message: 'Consider using a longer password for better security' 
    };
  }
  
  return { valid: true };
};

export const validateName = (name: string): boolean => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};