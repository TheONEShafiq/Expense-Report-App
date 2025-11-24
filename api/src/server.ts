import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { adminRouter } from './routes/admin.js';
import { reportsRouter } from './routes/reports.js';
import { policyRouter } from './routes/policy.js';
import { usersAdminRouter } from './routes/users.js';
import { approverRouter } from './routes/approver.js';
import { glRouter } from './routes/gl.js';
import { exportsRouter } from './routes/exports.js';
import { meRouter } from './routes/me.js';

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/', express.static(path.join(process.cwd(), 'public')));
app.use('/', adminRouter);
app.use('/', reportsRouter);
app.use('/', policyRouter);
app.use('/', usersAdminRouter);
app.use('/', approverRouter);
app.use('/', glRouter);
app.use('/', exportsRouter);
app.use('/', meRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
