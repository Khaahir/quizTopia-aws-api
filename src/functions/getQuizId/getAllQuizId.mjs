// src/functions/getQuizId/getAllQuizId.mjs
import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import createError from "http-errors";
import { ddb, TABLE } from "../../lib/db/db.mjs";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

export const get = middy(async (event) => {
  const { quizId } = event.pathParameters || {};
  if (!quizId) throw new createError.BadRequest("quizId required");


  const meta = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `QUIZ#${quizId}`, SK: "META" },
  }));
  if (!meta.Item) throw new createError.NotFound("Quiz not found");


  const qRes = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :q)",
    ExpressionAttributeValues: { ":pk": `QUIZ#${quizId}`, ":q": "QUESTION#" },
  }));
  const questions = (qRes.Items || []).map(({ questionId, text, coords }) => ({
    questionId, text, coords
  }));

  
  const sRes = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :s)",
    ExpressionAttributeValues: { ":pk": `QUIZ#${quizId}`, ":s": "SCORE#" },
    ScanIndexForward: false,
    Limit: 1
  }));
  const latest = (sRes.Items && sRes.Items[0])
    ? { userId: sRes.Items[0].userId, score: sRes.Items[0].score, createdAt: sRes.Items[0].createdAt }
    : null;

  return {
    statusCode: 200,
    body: JSON.stringify({
      quizId,
      name: meta.Item.name,
      ownerId: meta.Item.ownerId,
      questions,
      latestScore: latest
    })
  };
})
.use(httpErrorHandler())
.use(httpCors());



