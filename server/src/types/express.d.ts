import * as express from 'express';
import { User as CustomUser } from './userType';

declare global {
  namespace Express {
    // We extend the existing User interface used by Express
    interface User extends CustomUser {}

    // We ensure the Request interface uses that specific User
    interface Request {
      user?: User;
    }
  }
}