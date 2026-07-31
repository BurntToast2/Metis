import { app } from 'electron';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: app.isPackaged
    ? path.join(app.getPath('userData'), '.env')
    : path.join(__dirname, '../../.env'),
});