export const signIn = (provider: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = `http://localhost:3000/api/auth/${provider}`;
  }
};
