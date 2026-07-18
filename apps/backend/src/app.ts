import app from './server';
const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Backend running');
  } catch (err) {
    console.error(err); process.exit(1);
  }
}; start();