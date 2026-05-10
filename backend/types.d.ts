declare namespace Express {
  interface Request {
    userId: string;
  }
}

declare namespace jsonwebtoken {
  interface JwtPayload {
    userId: string;
  }
}
