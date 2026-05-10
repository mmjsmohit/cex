import type { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET!;

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authToken = req.headers.authorization?.split(" ")[1];
  if (!authToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Token is provided, extract the userId from it
  const decoded = jsonwebtoken.verify(authToken, JWT_SECRET);
  // @ts-ignore
  const decodedId = decoded?.userId!;
  req.userId = decodedId;
  console.log("Request from userId " + decodedId + " forwarded");
  next();
}
