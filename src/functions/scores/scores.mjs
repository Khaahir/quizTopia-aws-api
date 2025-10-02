// src/functions/scores/addScore.mjs
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import createError from "http-errors";
import { ddb, TABLE } from "../../lib/db/db.mjs";
import { GetCommand, PutCommand , UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authMiddleware } from "../../lib/auth/auth.mjs";

export const addScore = middy(async (event) => {
  const { quizId } = event.pathParameters || {};
  if (!quizId) throw new createError.BadRequest("quizId required");

  const { score } = event.body || {};
  const val = Number(score);
  if (!Number.isFinite(val) || val < 0) {
    throw new createError.BadRequest("score must be a non-negative number");
  }


  const meta = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `QUIZ#${quizId}`, SK: "META" }
  }));
  if (!meta.Item) throw new createError.NotFound("quiz not found");

  const userId = event.requestContext.authorizer.user.sub;
  const ts = Date.now();


  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `QUIZ#${quizId}`,
      SK: `SCORE#${ts}#${userId}`,
      type: "Score",
      quizId,
      userId,
      score: val,
      createdAt: ts
    },
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
  }));

  await ddb.send(new UpdateCommand({
  TableName: TABLE,
  Key: { PK: "QUIZ", SK: `QUIZ#${quizId}` },
  UpdateExpression: "SET lastScore = :s, lastScoreAt = :t",
  ExpressionAttributeValues: {
    ":s": val, 
    ":t": ts    
  }
}));

  return {
    statusCode: 201,
    body: JSON.stringify({ quizId, userId, score: val, createdAt: ts })
  };
})
  .use(authMiddleware())
  .use(httpJsonBodyParser())
  .use(httpErrorHandler())
  .use(httpCors());
