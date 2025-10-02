import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpCors from "@middy/http-cors";
import { ddb, TABLE } from "../../lib/db/db.mjs";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";


export const list = middy(async () => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :p",
    ExpressionAttributeValues: { ":p": "QUIZ" },
    ScanIndexForward: false 
  }));

  const items = (res.Items || []).map(x => ({
    quizId: x.quizId,
    name: x.name,
    ownerId: x.ownerId,
    createdAt: x.createdAt,
    lastScore: x.lastScore ?? null,
    lastScoreAt: x.lastScoreAt ?? null
  }));

  return { statusCode: 200, body: JSON.stringify(items) };
})
.use(httpErrorHandler())
.use(httpCors());
