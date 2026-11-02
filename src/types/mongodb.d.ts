declare module "mongodb" {
  export type Document = Record<string, unknown>;
  export class MongoClient {
    constructor(uri: string);
    connect(): Promise<MongoClient>;
    close(): Promise<void>;
    db(name?: string): Db;
  }
  export interface Db {
    readonly databaseName: string;
    command(command: Record<string, unknown>): Promise<unknown>;
    createCollection(name: string): Promise<unknown>;
    collection(name: string): Collection;
  }
  export interface Cursor {
    sort(sort: Record<string, 1 | -1>): Cursor;
    limit(amount: number): Cursor;
    toArray(): Promise<any[]>;
  }
  export interface Collection {
    find(filter?: Record<string, any>): Cursor;
    aggregate(pipeline: Record<string, any>[]): Cursor;
    countDocuments(filter?: Record<string, any>): Promise<number>;
    insertOne(document: Record<string, any>): Promise<{insertedId: unknown}>;
    updateOne(filter: Record<string, any>, update: Record<string, any>, options?: Record<string, any>): Promise<unknown>;
    createIndex(keys: Record<string, 1 | -1 | "text">, options?: Record<string, any>): Promise<string>;
  }
}
