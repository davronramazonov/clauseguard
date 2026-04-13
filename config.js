module.exports = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 27017,
  DB_NAME: process.env.DB_NAME || 'clauseg',
  JWT_SECRET: process.env.JWT_SECRET || 'clauseg-secret-key-2024',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  PORT: process.env.PORT || 5000,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123'
};
