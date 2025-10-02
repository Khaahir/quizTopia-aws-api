import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import bcrypt from "bcryptjs";
import createError from "http-errors";
import { v4 as uuid } from "uuid";
import { ddb, TABLE } from "../../lib/db/db.mjs"
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { signJwt } from "../../lib/auth/auth.mjs"


export const signup = middy(async (event) => {
  const { email, password } = event.body || {};
  if (!email || !password) throw new createError.BadRequest("email & password required");

  const userId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);


  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: `USER#${userId}`, SK: "PROFILE", type: "User", userId, email, passwordHash },
    ConditionExpression: "attribute_not_exists(PK)", 
  }));


  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: `USEREMAIL#${email}`, SK: "ALIAS", type: "UserAlias", userId },
    ConditionExpression: "attribute_not_exists(PK)", 
  }));


  const token = signJwt({ sub: userId, email });
  return { statusCode: 201, body: JSON.stringify({ userId, token }) };
})
.use(httpJsonBodyParser()).use(httpErrorHandler()).use(httpCors());


export const login = middy(async (event) => {
  const { email, password } = event.body || {};
  if (!email || !password) throw new createError.BadRequest("email & password required");


  
  const alias = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `USEREMAIL#${email}`, SK: "ALIAS" },
  }));
  if (!alias.Item) throw new createError.Unauthorized("Invalid credentials");


  const user = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `USER#${alias.Item.userId}`, SK: "PROFILE" },
  }));
  if (!user.Item) throw new createError.Unauthorized("Invalid credentials");


  
  const ok = await bcrypt.compare(password, user.Item.passwordHash);
  if (!ok) throw new createError.Unauthorized("Invalid credentials");


  
  const token = signJwt({ sub: user.Item.userId, email: user.Item.email });
  return { statusCode: 200, body: JSON.stringify({ userId: user.Item.userId, token }) };
})
.use(httpJsonBodyParser()).use(httpErrorHandler()).use(httpCors());
