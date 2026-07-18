import app from './server';

const start = async () => {
  const port = Number(process.env.PORT || 3000);

  try {
    await app.listen({ host: '0.0.0.0', port });
    console.log(`Backend running on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();