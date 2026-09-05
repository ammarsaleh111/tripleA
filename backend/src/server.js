import 'dotenv/config';

import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

        app.listen(port, () => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`TripleA backend listening on port ${port}`);
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start the backend server.');
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error(`Startup error: ${error?.statusCode || 'fatal'}`);
    }
    process.exit(1);
  }
};

startServer();
