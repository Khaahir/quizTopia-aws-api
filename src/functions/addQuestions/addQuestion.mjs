import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import createError from "http-errors";
import { v4 as uuid } from "uuid";
import { ddb, TABLE } from "../../lib/db/db.mjs";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { authMiddleware } from "../../lib/auth/auth.mjs";


export const add = middy(async (event) => {
  const { quizId } = event.pathParameters;
  const { text, answer, coords } = event.body || {};

  if (!text || !answer || typeof coords?.lat !== "number" || typeof coords?.lng !== "number")
    throw new createError.BadRequest("text, answer, coords.lat, coords.lng required");


  const meta = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `QUIZ#${quizId}`, SK: "META" } }));
  if (!meta.Item) throw new createError.NotFound("Quiz not found");
  if (meta.Item.ownerId !== event.requestContext.authorizer.user.sub) throw new createError.Forbidden("Not owner");


  const questionId = uuid();
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `QUIZ#${quizId}`, SK: `QUESTION#${questionId}`,
      type: "Question", questionId, text, answer, coords
    },
  }));
  return { statusCode: 201, body: JSON.stringify({ questionId }) };
})
.use(httpJsonBodyParser()).use(authMiddleware()).use(httpErrorHandler()).use(httpCors());
