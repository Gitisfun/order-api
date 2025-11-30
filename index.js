import * as dotenv from "dotenv";
dotenv.config();

import express from 'express';
import http from "http";
import cors from 'cors';
import cron from 'node-cron';

import ApiError from "./errors/errors.js";
import errorHandler from "./middleware/errorHandler.js";
import counterRouter from "./routes/counter.js";
import resetCounters from './jobs/index.js';
import { validateApiKey } from './middleware/apiKey.js';
import { CRON_SCHEDULE, TIMEZONE } from './constants/index.js';

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(validateApiKey);

app.use('/api/counter', counterRouter);

app.use((req, res, next) => next(ApiError.notFound("Route not found")));
  
app.use(errorHandler);

// Schedule the counter reset cron job
cron.schedule(CRON_SCHEDULE, resetCounters, {
  scheduled: true,
  timezone: TIMEZONE
});

console.log(`[Cron] Counter reset job scheduled: ${CRON_SCHEDULE} (timezone: ${TIMEZONE})`);

server.listen(port, () => {
  console.log(`Server is running on port ${port}...`);
});