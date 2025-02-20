import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import {
  Product,
  ProductRepository,
} from "./layers/productsLayer/nodejs/productRepository";
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
    console.log("POST /products");
    const product = JSON.parse(event.body!) as Product;
    const productCreated = await productRepository.createProduct(product);
    return {
      statusCode: 201,
      body: JSON.stringify(productCreated),
    };
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    if (event.httpMethod === "PUT") {
      console.log("PUT /products");
      try {
        const product = JSON.parse(event.body!) as Product;
        const productUpdated = await productRepository.updateProduct(
          productId,
          product
        );
        return {
          statusCode: 201,
          body: JSON.stringify(productUpdated),
        };
      } catch (ConditionalCheckFailedException) {
        return {
          statusCode: 404,
          body: "Product not found",
        };
      }
    } else if (event.httpMethod === "DELETE") {
      console.log("DELETE /products");
      try {
        const product = await productRepository.deleteProduct(productId);
        return {
          statusCode: 201,
          body: JSON.stringify(product),
        };
      } catch (error) {
        return {
          statusCode: 404,
          body: "product not found",
        };
      }
    }
  }

  return {
    statusCode: 200,
    body: "Bad request",
  };
}
