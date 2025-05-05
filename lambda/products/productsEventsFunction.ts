import { ProductEvent } from "./layers/productEventsLayer/nodejs/productEventsLayer";
import { Callback, Context } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const eventDdb = process.env.EVENTS_DDB!;
const ddbClient = DynamoDBDocumentClient.from(new DynamoDB({}));
export async function handler(
  event: ProductEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  console.log(event);
  console.log(`Lambda requestId: ${context.awsRequestId}`);

  await createEvent(event);

  callback(
    null,
    JSON.stringify({
      producteventCreated: true,
      message: "OK",
    })
  );
}
async function createEvent(event: ProductEvent) {
  const timestamp = Date.now();
  const ttl = ~~(timestamp / 1000 + 5 * 60);
  const command = new UpdateCommand({
    TableName: eventDdb,
    Key: {
      pk: `#product_${event.productCode}`,
      sk: `${event.eventType}#${timestamp}`,
    },
    UpdateExpression:
      "SET email = :email, createdAt = :createdAt, requestId = :requestId, eventType = :eventType, info = :info, #ttl = :ttl",
    ExpressionAttributeNames: {
      "#ttl": "ttl",
    },
    ExpressionAttributeValues: {
      ":email": event.email,
      ":createdAt": timestamp,
      ":requestId": event.requestId,
      ":eventType": event.eventType,
      ":info": {
        productId: event.productId,
        price: event.productPrice,
      },
      ":ttl": ttl,
    },
  });

  return await ddbClient.send(command);
}
