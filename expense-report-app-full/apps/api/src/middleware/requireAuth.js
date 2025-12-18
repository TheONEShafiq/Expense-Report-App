import jwt from "jsonwebtoken";
export function requireAuth(req, res, next){
  try{
    const token = req.cookies?.[process.env.COOKIE_NAME || "expense_session"];
    if(!token) return res.status(401).json({ error:"unauthorized" });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    req.user = payload;
    next();
  }catch{ res.status(401).json({ error:"unauthorized" }); }
}
