import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

export interface Product {
  id: string;
  productName: string;
  code: string;
  price: string;
  model: string;
  productUrl: string;
}

export class ProductRepository {
  private ddbDocClient: DynamoDBDocumentClient;
  private productsDdb: string;

  constructor(ddbClient: DynamoDBClient, productsDdb: string) {
    this.ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
    this.productsDdb = productsDdb;
  }

  async getAllProducts(): Promise<Product[]> {
    const command = new ScanCommand({ TableName: this.productsDdb });
    const response = await this.ddbDocClient.send(command);
    console.log("response request: ", response);
    return response.Items as Product[];
  }

  async getProductById(id: string): Promise<Product | null> {
    const command = new GetCommand({
      TableName: this.productsDdb,
      Key: { id },
    });
    const response = await this.ddbDocClient.send(command);
    return (response.Item as Product) || null;
  }

  async createProduct(product: Product): Promise<Product> {
    product.id = uuid();
    const command = new PutCommand({
      TableName: this.productsDdb,
      Item: product,
    });
    await this.ddbDocClient.send(command);
    return product;
  }

  async deleteProduct(productId: string): Promise<Product> {
    const product = await this.getProductById(productId);
    if (!product) throw new Error("Product not found");

    const command = new DeleteCommand({
      TableName: this.productsDdb,
      Key: { id: productId },
      ConditionExpression: "attribute_exists(id)",
    });
    await this.ddbDocClient.send(command);
    return product;
  }
  async updateProduct(
    productId: string,
    product: Partial<Product>
  ): Promise<Product> {
    const command = new UpdateCommand({
      TableName: this.productsDdb,
      Key: { id: productId },
      UpdateExpression:
        "SET productName = :productName, code = :code, price = :price, model = :model, productUrl = :productUrl",
      ExpressionAttributeValues: {
        ":productName": product.productName,
        ":code": product.code,
        ":price": product.price,
        ":model": product.model,
        ":productUrl": product.productUrl,
      },
      ReturnValues: "ALL_NEW",
      ConditionExpression: "attribute_exists(id)",
    });

    const response = await this.ddbDocClient.send(command);
    return response.Attributes as Product;
  }
}
