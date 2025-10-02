
import jwt from "jsonwebtoken";
import createError from "http-errors";

export const signJwt = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });


export const verifyJwt = (token) => jwt.verify(token, process.env.JWT_SECRET);



export const authMiddleware = () => ({
  before: async (request) => {
    const auth = request.event.headers?.authorization || request.event.headers?.Authorization;
    if (!auth?.startsWith("Bearer ")) throw new createError.Unauthorized("Missing token");
    try {
      const decoded = verifyJwt(auth.slice(7)); 
      
      request.event.requestContext ??= {};
      request.event.requestContext.authorizer = { user: decoded };
    } catch {
      throw new createError.Unauthorized("Invalid token");
    }
  },
});
