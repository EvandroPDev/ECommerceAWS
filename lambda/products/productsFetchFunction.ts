import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { ProductRepository } from "./layers/productsLayer/nodejs/productRepository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const productsDdb = process.env.PRODUCTS_DDB!;

const ddbClient = DynamoDBDocumentClient.from(new DynamoDB({}));
const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;
  const method = event.httpMethod;

  console.log(
    `API Gateway requestId: ${apiRequestId} - Lambda requestId: ${lambdaRequestId}`
  );
  if (event.resource === "/products") {
    if (method === "GET") {
      const products = await productRepository.getAllProducts();
      console.log("GET /products");
      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    console.log(`GET /products/${productId}`);
    try {
      const product = await productRepository.getProductById(productId);
      return {
        statusCode: 200,
        body: JSON.stringify(product),
      };
    } catch (error) {
      console.error("product not found", error);
      return {
        statusCode: 404,
        body: "product not found",
      };
    }
  }
  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad Request",
    }),
  };
}
