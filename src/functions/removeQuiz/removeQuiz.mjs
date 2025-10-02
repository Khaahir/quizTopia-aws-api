// src/functions/removeQuiz/removeQuiz.mjs
import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import createError from "http-errors";
import { ddb, TABLE } from "../../lib/db/db.mjs";
import { GetCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { authMiddleware } from "../../lib/auth/auth.mjs";

export const remove = middy(async (event) => {
  const { quizId } = event.pathParameters || {};
  if (!quizId) throw new createError.BadRequest("quizId required");

  const userId = event.requestContext.authorizer.user.sub;
  const meta = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `QUIZ#${quizId}`, SK: "META" }
  }));
  if (!meta.Item) throw new createError.NotFound("quiz not found");
  if (meta.Item.ownerId !== userId) throw new createError.Forbidden("not your quiz");

  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :p",
    ExpressionAttributeValues: { ":p": `QUIZ#${quizId}` }
  }));


  for (const it of (res.Items || [])) {
    await ddb.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: it.PK, SK: it.SK }
    }));
  }


  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: "QUIZ", SK: `QUIZ#${quizId}` }
  }));

  return { statusCode: 204, body: ` Removed Quiz ${quizId}` };
})
.use(authMiddleware())
.use(httpErrorHandler())
.use(httpCors());
