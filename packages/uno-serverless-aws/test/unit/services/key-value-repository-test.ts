import { AWSError, Response, S3 } from "aws-sdk";
import { expect } from "chai";
import { HealthCheckStatus, HttpStatusCodes, randomStr } from "uno-serverless";
import { S3KeyValueRepository } from "../../../src/services/key-value-repository";
import { S3Client } from "../../../src/services/s3-client";

class S3ClientStub implements S3Client {

  public lastDelete: S3.Types.DeleteObjectRequest | undefined;
  public lastPut: S3.Types.PutObjectRequest | undefined;

  public constructor(private readonly args: {
    getBody?: string,
    getErrorStatusCode?: number,
  } = {}) {}

  public deleteObject(params: S3.Types.DeleteObjectRequest) {
    this.lastDelete = params;

    return {
      promise: async () => ({
        $response: {} as Response<S3.Types.DeleteObjectOutput, AWSError>,
      })};
  }

  public getObject(params: S3.Types.GetObjectRequest) {
    return {
      promise: async () => {
        if (this.args.getErrorStatusCode) {
          throw {
            statusCode: this.args.getErrorStatusCode,
          } as AWSError;
        }
        return ({
          $response: {} as Response<S3.Types.GetObjectOutput, AWSError>,
          Body: this.args.getBody,
        });
      },
    };
  }

  public listObjectsV2(params: S3.Types.ListObjectsV2Output) {
    return {
      promise: async () => {
        return {
          $response: {} as Response<S3.Types.ListObjectsV2Output, AWSError>,
        };
      },
    };
  }

  public putObject(params: S3.Types.PutObjectRequest) {
    this.lastPut = params;
    return {
      promise: async () => ({
        $response: {} as Response<S3.Types.PutObjectOutput, AWSError>,
      })};
  }
}

describe("S3KeyValueRepository", () => {

  it("should delete key", async () => {
    const stub = new S3ClientStub();
    const key = randomStr();
    const keyPath = randomStr();
    const repository = new S3KeyValueRepository({
      bucket: randomStr(),
      path: keyPath,
      s3: stub,
    });

    await repository.delete(key);
    expect(stub.lastDelete!.Key).to.equal(`${keyPath}/${key}`);
  });

  it("should get object", async () => {
    const value = { foo: "bar" };
    const stub = new S3ClientStub({
      getBody: JSON.stringify(value),
    });
    const key = randomStr();
    const keyPath = randomStr();
    const repository = new S3KeyValueRepository({
      bucket: randomStr(),
      path: keyPath,
      s3: stub,
    });

    const result = await repository.get<any>(key);
    expect(result).to.deep.equal(value);
  });

  it("should get undefined object", async () => {
    const stub = new S3ClientStub({
      getErrorStatusCode: HttpStatusCodes.NOT_FOUND,
    });
    const key = randomStr();
    const keyPath = randomStr();
    const repository = new S3KeyValueRepository({
      bucket: randomStr(),
      path: keyPath,
      s3: stub,
    });

    const result = await repository.get<any>(key);
    expect(result).to.be.undefined;
  });

  it("should set object", async () => {
    const stub = new S3ClientStub();
    const key = randomStr();
    const keyPath = randomStr();
    const value = { foo: "bar" };
    const repository = new S3KeyValueRepository({
      bucket: randomStr(),
      path: keyPath,
      s3: stub,
    });

    await repository.set(key, value);
    expect(stub.lastPut!.Key).to.equal(`${keyPath}/${key}`);
    expect(stub.lastPut!.Body).to.equal(JSON.stringify(value));
  });

  it("should check health", async () => {
    const stub = new S3ClientStub({
      getErrorStatusCode: HttpStatusCodes.NOT_FOUND,
    });
    const key = randomStr();
    const keyPath = randomStr();
    const repository = new S3KeyValueRepository({
      bucket: randomStr(),
      path: keyPath,
      s3: stub,
    });

    const result = await repository.checkHealth();
    expect(result.name).to.equal("S3KeyValueRepository");
    expect(result.status).to.equal(HealthCheckStatus.Ok);
  });

});
