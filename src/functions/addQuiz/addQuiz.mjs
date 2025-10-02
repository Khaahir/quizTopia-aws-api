// src/functions/addQuiz/addQuiz.mjs
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import createError from "http-errors";
import { v4 as uuid } from "uuid";
import { ddb, TABLE } from "../../lib/db/db.mjs";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { authMiddleware } from "../../lib/auth/auth.mjs";

export const create = middy(async (event) => {
  const user = event.requestContext.authorizer.user;
  const { name } = event.body || {};
  if (!name) throw new createError.BadRequest("name required");

  const quizId = uuid();
  const now = Date.now();


  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: `QUIZ#${quizId}`, SK: "META", type: "Quiz", quizId, name, ownerId: user.sub, createdAt: now },
    ConditionExpression: "attribute_not_exists(PK)"
  }));


  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: "QUIZ", SK: `QUIZ#${quizId}`, type: "QuizIndex", quizId, name, ownerId: user.sub, createdAt: now }
  }));

  return { statusCode: 201, body: JSON.stringify({ quizId, name }) };
})
.use(httpJsonBodyParser())
.use(authMiddleware())
.use(httpErrorHandler())
.use(httpCors());
