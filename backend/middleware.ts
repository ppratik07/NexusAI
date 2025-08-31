import type { NextFunction,Request,Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const middleware =(req: Request,res: Response,next: NextFunction)=>{
    const authToken = req.headers.authorization?.split(" ")[1];
    if (!authToken) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET!);
        req.userId = (decoded as unknown as JwtPayload).userId; 
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    } 
}