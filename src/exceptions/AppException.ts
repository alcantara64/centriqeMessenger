class AppException extends Error {
  name: string;
  details?: string;

  constructor(message: string, details?: string) {
    super(message);
    this.name = 'AppException'
    this.details = details
  }
}


export default AppException;
